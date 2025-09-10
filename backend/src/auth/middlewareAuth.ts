import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JwtPayload } from './jwt.js';
import { UnauthorizedError } from '../common/errors.js';
import { createAuthLogger } from '../config/logger.js';

const logger = createAuthLogger();

/**
 * Extender la interfaz Request para incluir user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware de autenticación JWT
 * Verifica que el usuario esté autenticado con un token válido
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extraer token del header Authorization
    const token = extractTokenFromHeader(req.headers.authorization);
    
    // Verificar y decodificar el token
    const payload = verifyToken(token);
    
    // Agregar información del usuario al request
    req.user = payload;
    
    // Log de autenticación exitosa
    logger.info({
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
      endpoint: req.path,
      method: req.method,
    }, 'Usuario autenticado correctamente');
    
    next();
  } catch (error) {
    // Log de intento de autenticación fallido
    logger.warn({
      error: error instanceof Error ? error.message : 'Error desconocido',
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    }, 'Intento de autenticación fallido');

    if (error instanceof UnauthorizedError) {
      res.status(401).json(error.toJSON());
      return;
    }

    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token de autenticación inválido'
      }
    });
  }
}

/**
 * Middleware de autenticación opcional
 * Decodifica el token si está presente, pero no requiere autenticación
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      const payload = verifyToken(token);
      req.user = payload;
      
      logger.debug({
        userId: payload.userId,
        email: payload.email,
      }, 'Usuario autenticado opcionalmente');
    }
    
    next();
  } catch (error) {
    // En auth opcional, continuamos sin autenticación si hay error
    logger.debug({
      error: error instanceof Error ? error.message : 'Error desconocido',
      endpoint: req.path,
    }, 'Auth opcional fallida, continuando sin autenticación');
    
    next();
  }
}

/**
 * Middleware para verificar si el usuario está activo
 * Requiere que se ejecute después de requireAuth
 */
export function requireActiveUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Usuario no autenticado'
      }
    });
    return;
  }

  // Aquí podrías hacer una consulta a la BD para verificar si el usuario sigue activo
  // Por ahora asumimos que si el token es válido, el usuario está activo
  next();
}

/**
 * Middleware para verificar ownership de recursos
 * Verifica que el usuario sea dueño del recurso o sea admin
 */
export function requireOwnership(userIdParam: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado'
        }
      });
      return;
    }

    const resourceUserId = parseInt(req.params[userIdParam]);
    const currentUserId = req.user.userId;
    const isAdmin = req.user.roles.includes('ADMIN');

    if (currentUserId === resourceUserId || isAdmin) {
      next();
    } else {
      logger.warn({
        currentUserId,
        resourceUserId,
        endpoint: req.path,
      }, 'Intento de acceso no autorizado a recurso');

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para acceder a este recurso'
        }
      });
    }
  };
}

/**
 * Middleware para extraer información del usuario para logging
 */
export function addUserContext(req: Request, res: Response, next: NextFunction): void {
  if (req.user) {
    // Agregar contexto del usuario para logging posterior
    res.locals.userId = req.user.userId;
    res.locals.userEmail = req.user.email;
    res.locals.userRoles = req.user.roles;
  }
  
  next();
}

export default {
  requireAuth,
  optionalAuth,
  requireActiveUser,
  requireOwnership,
  addUserContext,
};
