import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2';
import { generateToken, verifyToken } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { 
  UnauthorizedError, 
  NotFoundError, 
  ConflictError 
} from '../common/errors.js';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema 
} from '../common/validators.js';
import { createAuthLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';

const logger = createAuthLogger();

/**
 * Interfaz para usuario de la base de datos
 */
interface UserRow extends RowDataPacket {
  id: number;
  correo: string;
  contrasena_hash: string;
  nombre_completo: string;
  activo: boolean;
  ultimo_acceso_el: Date;
  creado_el: Date;
  actualizado_el: Date;
}

/**
 * Interfaz para roles de usuario
 */
interface UserRoleRow extends RowDataPacket {
  nombre: string;
}

/**
 * POST /auth/login
 * Autenticar usuario y generar JWT
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  // Validar datos de entrada
  const { email, password } = loginSchema.parse(req.body);

  logger.info({ email }, 'Intento de login');

  // Buscar usuario por email
  const [userRows] = await pool.execute<UserRow[]>(
    'SELECT * FROM usuarios WHERE correo = ? AND activo = 1',
    [email]
  );

  if (userRows.length === 0) {
    await auditAction(req, 'LOGIN', 'SESSION', undefined, { email }, false, 'Usuario no encontrado');
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const user = userRows[0];

  // Verificar contraseña
  const isPasswordValid = await verifyPassword(password, user.contrasena_hash);
  if (!isPasswordValid) {
    await auditAction(req, 'LOGIN', 'SESSION', user.id, { email }, false, 'Contraseña incorrecta');
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Obtener roles del usuario
  const [roleRows] = await pool.execute<UserRoleRow[]>(
    `SELECT r.nombre 
     FROM usuarios_roles ur 
     JOIN roles r ON ur.rol_id = r.id 
     WHERE ur.usuario_id = ?`,
    [user.id]
  );

  const roles = roleRows.map(row => row.nombre);

  // Generar tokens
  const accessToken = generateToken({
    userId: user.id,
    email: user.correo,
    roles,
  });

  const refreshToken = generateToken({
    userId: user.id,
    type: 'refresh',
  }, '7d');

  // Actualizar último login
  await pool.execute(
    'UPDATE usuarios SET ultimo_acceso_el = NOW() WHERE id = ?',
    [user.id]
  );

  // Auditar login exitoso
  await auditAction(req, 'LOGIN', 'SESSION', user.id, { email, roles }, true);

  logger.info({ 
    userId: user.id, 
    email: user.correo, 
    roles 
  }, 'Login exitoso');

  res.json({
    message: 'Login exitoso',
    data: {
      user: {
        id: user.id,
        email: user.correo,
        nombre: user.nombre_completo,
        roles,
        ultimoLogin: new Date(),
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: '1h',
      },
    },
  });
});

/**
 * POST /auth/refresh
 * Renovar token de acceso usando refresh token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);

  try {
    // Verificar refresh token
    const payload = verifyToken(refreshToken);
    
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Token de refresh inválido');
    }

    // Verificar que el usuario sigue existiendo y activo
    const [userRows] = await pool.execute<UserRow[]>(
      'SELECT * FROM usuarios WHERE id = ? AND activo = 1',
      [payload.userId]
    );

    if (userRows.length === 0) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    const user = userRows[0];

    // Obtener roles actualizados
    const [roleRows] = await pool.execute<UserRoleRow[]>(
      `SELECT r.nombre 
       FROM usuarios_roles ur 
       JOIN roles r ON ur.rol_id = r.id 
       WHERE ur.usuario_id = ?`,
      [user.id]
    );

    const roles = roleRows.map(row => row.nombre);

    // Generar nuevo access token
    const newAccessToken = generateToken({
      userId: user.id,
      email: user.correo,
      roles,
    });

    logger.info({ userId: user.id }, 'Token renovado exitosamente');

    res.json({
      message: 'Token renovado exitosamente',
      data: {
        accessToken: newAccessToken,
        expiresIn: '1h',
      },
    });

  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : 'Error desconocido' }, 'Error renovando token');
    throw new UnauthorizedError('Token de refresh inválido o expirado');
  }
});

/**
 * POST /auth/logout
 * Cerrar sesión (invalidar tokens)
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (userId) {
    // En una implementación completa, aquí se invalidarían los tokens
    // Por ejemplo, agregándolos a una blacklist en Redis
    // Por ahora solo auditamos el logout
    
    await auditAction(req, 'LOGOUT', 'SESSION', userId, {}, true);
    
    logger.info({ userId }, 'Logout exitoso');
  }

  res.json({
    message: 'Logout exitoso'
  });
});

/**
 * POST /auth/register
 * Registrar nuevo usuario (solo para admins o registro público si está habilitado)
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const userData = registerSchema.parse(req.body);

  // Verificar si el email ya existe
  const [existingUsers] = await pool.execute<UserRow[]>(
    'SELECT id FROM usuarios WHERE correo = ?',
    [userData.email]
  );

  if (existingUsers.length > 0) {
    throw new ConflictError('El email ya está registrado');
  }

  // Hash de la contraseña
  const hashedPassword = await hashPassword(userData.password);

  // Crear usuario
  const [result] = await pool.execute(
    `INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, activo, created_at, updated_at)
     VALUES (?, ?, ?, 1, NOW(), NOW())`,
    [
      userData.email,
      hashedPassword,
      `${userData.nombres} ${userData.apellidos}`,
    ]
  );

  const userId = (result as any).insertId;

  // Asignar rol por defecto (INQUILINO)
  const [roleRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM roles WHERE codigo = ?',
    ['INQUILINO']
  );

  if (roleRows.length > 0) {
    await pool.execute(
      'INSERT INTO usuarios_roles (usuario_id, rol_id, created_at) VALUES (?, ?, NOW())',
      [userId, roleRows[0].id]
    );
  }

  // Auditar registro
  await auditAction(req, 'CREATE', 'USER', userId, { 
    email: userData.email,
    nombres: userData.nombres 
  }, true);

  logger.info({ 
    userId, 
    email: userData.email 
  }, 'Usuario registrado exitosamente');

  res.status(201).json({
    message: 'Usuario registrado exitosamente',
    data: {
      user: {
        id: userId,
        email: userData.email,
        nombre: `${userData.nombres} ${userData.apellidos}`,
        roles: ['INQUILINO'],
      },
    },
  });
});

/**
 * GET /auth/me
 * Obtener información del usuario autenticado
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Obtener información del usuario
  const [userRows] = await pool.execute<UserRow[]>(
    'SELECT id, correo, nombre_completo, activo, ultimo_acceso_el FROM usuarios WHERE id = ?',
    [userId]
  );

  if (userRows.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const user = userRows[0];

  // Obtener roles
  const [roleRows] = await pool.execute<UserRoleRow[]>(
    `SELECT r.nombre 
     FROM usuarios_roles ur 
     JOIN roles r ON ur.rol_id = r.id 
     WHERE ur.usuario_id = ?`,
    [userId]
  );

  const roles = roleRows.map(row => row.nombre);

  res.json({
    message: 'Perfil obtenido exitosamente',
    data: {
      user: {
        id: user.id,
        email: user.correo,
        nombre: user.nombre_completo,
        activo: user.activo,
        roles,
        ultimoLogin: user.ultimo_acceso_el,
      },
    },
  });
});

export default {
  login,
  refresh,
  logout,
  register,
  getProfile,
};
