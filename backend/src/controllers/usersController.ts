import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { hashPassword } from '../auth/password.js';
import { 
  NotFoundError, 
  ConflictError,
  BadRequestError,
} from '../common/errors.js';
import { 
  idSchema,
  emailSchema,
  nameSchema,
  phoneSchema,
  passwordSchema,
} from '../common/validators.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
import { z } from 'zod';

const logger = createDbLogger();

/**
 * Interfaces para tipos de datos
 */
interface UserRow extends RowDataPacket {
  id: number;
  correo: string;
  contrasena_hash: string;
  nombre_completo: string;
  activo: number;
  ultimo_acceso_el?: Date;
  creado_el: Date;
  actualizado_el: Date;
}

interface RoleRow extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface UserRoleRow extends RowDataPacket {
  rol_id: number;
  role_name: string;
}

/**
 * Esquemas de validación específicos para usuarios
 */
const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nombre_completo: nameSchema.optional(),
  nombres: nameSchema.optional(),
  apellidos: nameSchema.optional(),
  telefono: phoneSchema.optional(),
  roles: z.array(idSchema).min(1, 'Usuario debe tener al menos un rol'),
}).refine((d) => !!d.nombre_completo || (!!d.nombres && !!d.apellidos), {
  message: 'Debe proporcionar nombre_completo o nombres y apellidos',
  path: ['nombre_completo']
});

const updateUserSchema = z.object({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  nombre_completo: nameSchema.optional(),
  nombres: nameSchema.optional(),
  apellidos: nameSchema.optional(),
  telefono: phoneSchema.optional(),
  roles: z.array(idSchema).min(1, 'Usuario debe tener al menos un rol').optional(),
}).refine((d) => d.nombre_completo !== undefined || d.nombres !== undefined || d.apellidos !== undefined || d.email !== undefined || d.password !== undefined || d.telefono !== undefined || d.roles !== undefined, {
  message: 'No hay cambios para actualizar',
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'BLOQUEADO']).optional(),
  role: z.string().optional(),
});

/**
 * GET /usuarios
 * Listar usuarios con paginación y filtros
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, estado, role } = paginationSchema.parse(req.query);
  
  const offset = (page - 1) * limit;
  
  // Construir query base
  let whereConditions = ['1=1'];
  let queryParams: any[] = [];
  
  // Filtro por búsqueda (nombre completo o correo)
  if (search) {
    whereConditions.push('(u.nombre_completo LIKE ? OR u.correo LIKE ?)');
    const searchPattern = `%${search}%`;
    queryParams.push(searchPattern, searchPattern);
  }
  
  // Filtro por estado
  if (estado) {
    whereConditions.push('u.activo = ?');
    queryParams.push(estado === 'ACTIVO' ? 1 : 0);
  }
  
  // Filtro por rol
  if (role) {
    whereConditions.push('EXISTS (SELECT 1 FROM usuarios_roles ur JOIN roles r ON ur.rol_id = r.id WHERE ur.usuario_id = u.id AND r.nombre = ?)');
    queryParams.push(role);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Query para contar total
  const countQuery = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM usuarios u
    WHERE ${whereClause}
  `;
  
  // Query para obtener datos
  const dataQuery = `
    SELECT 
      u.id,
      u.correo,
      u.nombre_completo,
      u.activo,
      u.ultimo_acceso_el,
      u.creado_el,
      u.actualizado_el,
      GROUP_CONCAT(r.nombre) as roles
    FROM usuarios u
    LEFT JOIN usuarios_roles ur ON u.id = ur.usuario_id
    LEFT JOIN roles r ON ur.rol_id = r.id
    WHERE ${whereClause}
    GROUP BY u.id, u.correo, u.nombre_completo, u.activo, u.ultimo_acceso_el, u.creado_el, u.actualizado_el
    ORDER BY u.creado_el DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  // Ejecutar queries
  const [countResult] = await pool.execute<RowDataPacket[]>(countQuery, queryParams);
  const total = countResult[0].total;
  
  const [users] = await pool.execute<RowDataPacket[]>(dataQuery, queryParams);
  
  // Formatear datos
  const formattedUsers = users.map((user: any) => ({
    id: user.id,
    email: user.correo,
    nombres: (user.nombre_completo || '').split(' ').slice(0, -1).join(' ') || user.nombre_completo,
    apellidos: (user.nombre_completo || '').split(' ').slice(-1).join(' '),
    telefono: null,
    estado: user.activo === 1 ? 'ACTIVO' : 'INACTIVO',
    ultimoLogin: user.ultimo_acceso_el,
    roles: user.roles ? String(user.roles).split(',') : [],
    createdAt: user.creado_el,
    updatedAt: user.actualizado_el,
  }));
  
  const totalPages = Math.ceil(total / limit);
  
  logger.info({
    userId: req.user?.userId,
    total,
    page,
    filters: { search, estado, role },
  }, 'Usuarios listados');

  res.json({
    message: 'Usuarios obtenidos exitosamente',
    data: {
      items: formattedUsers,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});

/**
 * POST /usuarios
 * Crear nuevo usuario con roles
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const userData = createUserSchema.parse(req.body);
  
  // Verificar si el email ya existe
  const [existingUsers] = await pool.execute<UserRow[]>(
    'SELECT id FROM usuarios WHERE correo = ?',
    [userData.email]
  );
  
  if (existingUsers.length > 0) {
    throw new ConflictError('El email ya está registrado');
  }
  
  // Verificar que todos los roles existen
  const roleIds = userData.roles;
  const [roles] = await pool.execute<RoleRow[]>(
    `SELECT id, nombre FROM roles WHERE id IN (${roleIds.map(() => '?').join(',')})`,
    roleIds
  );
  
  if (roles.length !== roleIds.length) {
    throw new BadRequestError('Uno o más roles especificados no existen');
  }
  
  // Hash de la contraseña
  const hashedPassword = await hashPassword(userData.password);
  
  // Iniciar transacción
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // Crear usuario
    const nombreCompleto = (userData.nombre_completo ?? `${userData.nombres ?? ''} ${userData.apellidos ?? ''}`.trim());
    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, activo, creado_el, actualizado_el)
       VALUES (?, ?, ?, 1, NOW(), NOW())`,
      [
        userData.email,
        hashedPassword,
        nombreCompleto,
      ]
    );
    
    const userId = userResult.insertId;
    
    // Asignar roles
    for (const roleId of roleIds) {
      await connection.execute(
        'INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)',
        [userId, roleId]
      );
    }
    
    await connection.commit();
    
    // Auditar creación
    await auditAction(req, 'CREATE', 'USER', userId, {
      email: userData.email,
      nombres: userData.nombres,
      roles: roles.map(r => r.nombre),
    }, true);
    
    logger.info({
      userId: req.user?.userId,
      createdUserId: userId,
      email: userData.email,
      roles: roles.map(r => r.nombre),
    }, 'Usuario creado exitosamente');
    
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      data: {
        user: {
          id: userId,
          email: userData.email,
          nombres: userData.nombres,
          apellidos: userData.apellidos,
          telefono: userData.telefono,
          estado: 'ACTIVO',
          roles: roles.map(r => r.nombre),
        },
      },
    });
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * GET /usuarios/:id
 * Obtener usuario específico
 */
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = idSchema.parse(req.params.id);
  
  // Obtener usuario
  const [users] = await pool.execute<UserRow[]>(
    'SELECT * FROM usuarios WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }
  
  const user = users[0];
  
  // Obtener roles
  const [userRoles] = await pool.execute<UserRoleRow[]>(
    `SELECT r.id as rol_id, r.nombre as role_name
     FROM usuarios_roles ur
     JOIN roles r ON ur.rol_id = r.id
     WHERE ur.usuario_id = ?`,
    [userId]
  );
  
  res.json({
    message: 'Usuario obtenido exitosamente',
    data: {
      user: {
        id: user.id,
        email: user.correo,
        nombres: (user.nombre_completo || '').split(' ').slice(0, -1).join(' ') || user.nombre_completo,
        apellidos: (user.nombre_completo || '').split(' ').slice(-1).join(' '),
        telefono: null,
        estado: user.activo === 1 ? 'ACTIVO' : 'INACTIVO',
        ultimoLogin: user.ultimo_acceso_el,
        roles: userRoles.map(ur => ({
          id: ur.rol_id,
          nombre: ur.role_name,
        })),
        createdAt: user.creado_el,
        updatedAt: user.actualizado_el,
      },
    },
  });
});

/**
 * PUT /usuarios/:id
 * Actualizar usuario
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = idSchema.parse(req.params.id);
  const userData = updateUserSchema.parse(req.body);
  
  // Verificar que el usuario existe
  const [users] = await pool.execute<UserRow[]>(
    'SELECT * FROM usuarios WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }
  
  const currentUser = users[0];
  
  // Si se actualiza el email, verificar que no esté en uso
  if (userData.email && userData.email !== currentUser.correo) {
    const [existingUsers] = await pool.execute<UserRow[]>(
      'SELECT id FROM usuarios WHERE correo = ? AND id != ?',
      [userData.email, userId]
    );
    
    if (existingUsers.length > 0) {
      throw new ConflictError('El email ya está en uso por otro usuario');
    }
  }
  
  // Si se actualizan roles, verificar que existen
  let roleNames: string[] = [];
  if (userData.roles) {
    const [roles] = await pool.execute<RoleRow[]>(
      `SELECT id, nombre FROM roles WHERE id IN (${userData.roles.map(() => '?').join(',')})`,
      userData.roles
    );
    
    if (roles.length !== userData.roles.length) {
      throw new BadRequestError('Uno o más roles especificados no existen');
    }
    
    roleNames = roles.map(r => r.nombre);
  }
  
  // Iniciar transacción
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // Actualizar datos del usuario
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (userData.email) {
      updateFields.push('correo = ?');
      updateValues.push(userData.email);
    }
    const nombreCompletoUpdate = userData.nombre_completo ?? ((userData.nombres || userData.apellidos) ? `${userData.nombres ?? ''} ${userData.apellidos ?? ''}`.trim() : undefined);
    if (nombreCompletoUpdate !== undefined) {
      const nombreCompleto = nombreCompletoUpdate || currentUser.nombre_completo;
      updateFields.push('nombre_completo = ?');
      updateValues.push(nombreCompleto);
    }
    
    // Cambio de contraseña (opcional)
    if (userData.password) {
      const hashed = await hashPassword(userData.password)
      updateFields.push('contrasena_hash = ?')
      updateValues.push(hashed)
    }

    if (updateFields.length > 0) {
      updateFields.push('actualizado_el = NOW()');
      updateValues.push(userId);
      
      await connection.execute(
        `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    
    // Actualizar roles si se especificaron
    if (userData.roles) {
      // Eliminar roles actuales
      await connection.execute('DELETE FROM usuarios_roles WHERE usuario_id = ?', [userId]);
      
      // Asignar nuevos roles
      for (const roleId of userData.roles) {
        await connection.execute(
        'INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)',
        [userId, roleId]
      );
    }
    }
    
    await connection.commit();
    
    // Auditar actualización
    await auditAction(req, 'UPDATE', 'USER', userId, {
      changes: userData,
      newRoles: roleNames,
    }, true);
    
    logger.info({
      userId: req.user?.userId,
      updatedUserId: userId,
      changes: userData,
    }, 'Usuario actualizado exitosamente');
    
    res.json({
      message: 'Usuario actualizado exitosamente',
      data: {
        userId,
        changes: Object.keys(userData),
      },
    });
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * PATCH /usuarios/:id/estado
 * Cambiar estado del usuario (activar/desactivar/bloquear)
 */
export const changeUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = idSchema.parse(req.params.id);
  const { estado } = z.object({
    estado: z.enum(['ACTIVO', 'INACTIVO']),
  }).parse(req.body);
  
  // Verificar que el usuario existe
  const [users] = await pool.execute<UserRow[]>(
    'SELECT * FROM usuarios WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }
  
  const currentUser = users[0];
  
  // No permitir cambiar el estado del propio usuario admin
  if (req.user?.userId === userId && estado !== 'ACTIVO') {
    throw new BadRequestError('No puedes desactivar tu propia cuenta');
  }
  
  // Actualizar estado
  await pool.execute(
    'UPDATE usuarios SET activo = ?, actualizado_el = NOW() WHERE id = ?',
    [estado === 'ACTIVO' ? 1 : 0, userId]
  );
  
  // Auditar cambio de estado
  await auditAction(req, 'UPDATE', 'USER', userId, {
    estadoAnterior: currentUser.activo === 1 ? 'ACTIVO' : 'INACTIVO',
    estadoNuevo: estado,
  }, true);
  
  logger.info({
    userId: req.user?.userId,
    targetUserId: userId,
    estadoAnterior: currentUser.activo === 1 ? 'ACTIVO' : 'INACTIVO',
    estadoNuevo: estado,
  }, 'Estado de usuario cambiado');
  
  res.json({
    message: 'Estado de usuario actualizado exitosamente',
    data: {
      userId,
      estadoAnterior: currentUser.activo === 1 ? 'ACTIVO' : 'INACTIVO',
      estadoNuevo: estado,
    },
  });
});

/**
 * DELETE /usuarios/:id
 * Eliminar usuario (soft delete - cambiar estado a INACTIVO)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = idSchema.parse(req.params.id);
  
  // Verificar que el usuario existe
  const [users] = await pool.execute<UserRow[]>(
    'SELECT * FROM usuarios WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }
  
  // No permitir eliminar el propio usuario
  if (req.user?.userId === userId) {
    throw new BadRequestError('No puedes eliminar tu propia cuenta');
  }
  
  // Soft delete - cambiar estado a INACTIVO
  await pool.execute(
    'UPDATE usuarios SET activo = 0, actualizado_el = NOW() WHERE id = ?',
    [userId]
  );
  
  // Auditar eliminación
  await auditAction(req, 'DELETE', 'USER', userId, {
    email: users[0].correo,
    nombres: users[0].nombre_completo,
  }, true);
  
  logger.info({
    userId: req.user?.userId,
    deletedUserId: userId,
    email: users[0].correo,
  }, 'Usuario eliminado (soft delete)');
  
  res.json({
    message: 'Usuario eliminado exitosamente',
    data: {
      userId,
    },
  });
});

export default {
  getUsers,
  createUser,
  getUser,
  updateUser,
  changeUserStatus,
  deleteUser,
};
