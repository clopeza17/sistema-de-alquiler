import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../common/errors.js';

/**
 * Payload del JWT
 */
export interface JwtPayload {
  userId: number;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

/**
 * Respuesta de autenticación
 */
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn: string;
  user: {
    id: number;
    email: string;
    nombre_completo: string;
    roles: string[];
  };
}

/**
 * Generar token JWT
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  try {
    const options: any = { expiresIn: env.JWT_EXPIRES_IN };
    return jwt.sign(payload, env.JWT_SECRET, options);
  } catch (error) {
    throw new Error('Error al generar token JWT');
  }
}

/**
 * Generar refresh token (opcional, con mayor duración)
 */
export function generateRefreshToken(userId: number): string {
  try {
    const payload = { userId, type: 'refresh' };
    const options: any = { expiresIn: env.JWT_REFRESH_EXPIRES_IN };
    return jwt.sign(payload, env.JWT_SECRET, options);
  } catch (error) {
    throw new Error('Error al generar refresh token');
  }
}

/**
 * Verificar y decodificar token JWT
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JwtPayload;

    // Validar que el payload tenga la estructura esperada
    if (!decoded.userId || !decoded.email || !Array.isArray(decoded.roles)) {
      throw new UnauthorizedError('Token con estructura inválida');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expirado');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Token inválido');
    }

    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError('Error al verificar token');
  }
}

/**
 * Verificar refresh token
 */
export function verifyRefreshToken(token: string): { userId: number; type: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as any;

    if (decoded.type !== 'refresh' || !decoded.userId) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expirado');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    if (error instanceof UnauthorizedError) {
      throw error;
    }

    throw new UnauthorizedError('Error al verificar refresh token');
  }
}

/**
 * Extraer token del header Authorization
 */
export function extractTokenFromHeader(authHeader?: string): string {
  if (!authHeader) {
    throw new UnauthorizedError('Header Authorization requerido');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Formato de token inválido. Use: Bearer <token>');
  }

  const token = authHeader.substring(7); // Remover "Bearer "
  
  if (!token) {
    throw new UnauthorizedError('Token no proporcionado');
  }

  return token;
}

/**
 * Decodificar token sin verificar (para debugging)
 */
export function decodeTokenUnsafe(token: string): any {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

/**
 * Obtener tiempo de expiración de un token
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verificar si un token está próximo a expirar (dentro de 5 minutos)
 */
export function isTokenNearExpiration(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return false;

  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  return expiration <= fiveMinutesFromNow;
}

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  decodeTokenUnsafe,
  getTokenExpiration,
  isTokenNearExpiration,
};
