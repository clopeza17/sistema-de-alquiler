import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2';
import { generateToken } from '../auth/jwt.js';
import { verifyPassword } from '../auth/password.js';
import { UnauthorizedError } from '../common/errors.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

interface UserRow extends RowDataPacket {
  id: number;
  correo: string;
  contrasena_hash: string;
  nombre_completo: string;
  activo: number;
}

interface UserRoleRow extends RowDataPacket {
  nombre: string;
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new UnauthorizedError('Email y contraseña son requeridos');
  }

  const [userRows] = await pool.execute<UserRow[]>(
    'SELECT * FROM usuarios WHERE correo = ? AND activo = ?',
    [email, 1]
  );

  if (userRows.length === 0) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const user = userRows[0];

  const isPasswordValid = await verifyPassword(password, user.contrasena_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const [roleRows] = await pool.execute<UserRoleRow[]>(
    `SELECT r.nombre 
     FROM usuarios_roles ur 
     JOIN roles r ON ur.rol_id = r.id 
     WHERE ur.usuario_id = ?`,
    [user.id]
  );

  const roles = roleRows.map(row => row.nombre);

  const accessToken = generateToken({
    userId: user.id,
    email: user.correo,
    roles,
  });

  res.json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: {
        id: user.id,
        email: user.correo,
        nombre_completo: user.nombre_completo,
        roles,
      },
      token: accessToken,
    }
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Refresh endpoint - en desarrollo' });
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Register endpoint - en desarrollo' });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logout exitoso' });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Profile endpoint - en desarrollo' });
});
