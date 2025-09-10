import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2';
import { generateToken, verifyToken } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { 
  BadRequestError, 
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
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
  created_at: Date;
  updated_at: Date;
}

/**
 * Interfaz para roles de usuario
 */
interface UserRoleRow extends RowDataPacket {
  role_name: string;
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
    'SELECT * FROM usuarios WHERE email = ? AND estado != ?',
    [email, 'INACTIVO']
  );

  if (userRows.length === 0) {
    await auditAction(req, 'LOGIN', 'SESSION', undefined, { email }, false, 'Usuario no encontrado');
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const user = userRows[0];

  // Verificar estado del usuario
  if (user.estado === 'BLOQUEADO') {
    await auditAction(req, 'LOGIN', 'SESSION', user.id, { email }, false, 'Usuario bloqueado');
    throw new UnauthorizedError('Usuario bloqueado. Contacte al administrador');
  }

  // Verificar contraseña
  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    await auditAction(req, 'LOGIN', 'SESSION', user.id, { email }, false, 'Contraseña incorrecta');
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Obtener roles del usuario
  const [roleRows] = await pool.execute<UserRoleRow[]>(
    `SELECT r.nombre as role_name 
     FROM user_roles ur 
     JOIN roles r ON ur.role_id = r.id 
     WHERE ur.user_id = ?`,
    [user.id]
  );

  const roles = roleRows.map(row => row.role_name);

  // Generar tokens
  const accessToken = generateToken({
    userId: user.id,
    email: user.email,
    roles,
  });

  const refreshToken = generateToken({
    userId: user.id,
    type: 'refresh',
  }, '7d');

  // Actualizar último login
  await pool.execute(
    'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
    [user.id]
  );

  // Auditar login exitoso
  await auditAction(req, 'LOGIN', 'SESSION', user.id, { email, roles }, true);

  logger.info({ 
    userId: user.id, 
    email: user.email, 
    roles 
  }, 'Login exitoso');

  res.json({
    message: 'Login exitoso',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono,
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
      'SELECT * FROM usuarios WHERE id = ? AND estado = ?',
      [payload.userId, 'ACTIVO']
    );

    if (userRows.length === 0) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    const user = userRows[0];

    // Obtener roles actualizados
    const [roleRows] = await pool.execute<UserRoleRow[]>(
      `SELECT r.nombre as role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = ?`,
      [user.id]
    );

    const roles = roleRows.map(row => row.role_name);

    // Generar nuevo access token
    const newAccessToken = generateToken({
      userId: user.id,
      email: user.email,
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
    'SELECT id FROM usuarios WHERE email = ?',
    [userData.email]
  );

  if (existingUsers.length > 0) {
    throw new ConflictError('El email ya está registrado');
  }

  // Hash de la contraseña
  const hashedPassword = await hashPassword(userData.password);

  // Crear usuario
  const [result] = await pool.execute(
    `INSERT INTO usuarios (email, password, nombres, apellidos, telefono, estado, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'ACTIVO', NOW(), NOW())`,
    [
      userData.email,
      hashedPassword,
      userData.nombres,
      userData.apellidos,
      userData.telefono || null,
    ]
  );

  const userId = (result as any).insertId;

  // Asignar rol por defecto (INQUILINO)
  const [roleRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM roles WHERE nombre = ?',
    ['INQUILINO']
  );

  if (roleRows.length > 0) {
    await pool.execute(
      'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, NOW())',
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
        nombres: userData.nombres,
        apellidos: userData.apellidos,
        telefono: userData.telefono,
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
    'SELECT id, email, nombres, apellidos, telefono, estado, ultimo_login FROM usuarios WHERE id = ?',
    [userId]
  );

  if (userRows.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const user = userRows[0];

  // Obtener roles
  const [roleRows] = await pool.execute<UserRoleRow[]>(
    `SELECT r.nombre as role_name 
     FROM user_roles ur 
     JOIN roles r ON ur.role_id = r.id 
     WHERE ur.user_id = ?`,
    [userId]
  );

  const roles = roleRows.map(row => row.role_name);

  res.json({
    message: 'Perfil obtenido exitosamente',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono,
        estado: user.estado,
        roles,
        ultimoLogin: user.ultimo_login,
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
