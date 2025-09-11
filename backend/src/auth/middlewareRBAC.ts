import { Request, Response, NextFunction } from 'express';
import { createAuthLogger } from '../config/logger.js';

const logger = createAuthLogger();

/**
 * Tipos de roles del sistema
 */
export type SystemRole = 'ADMIN' | 'PROPIETARIO' | 'INQUILINO' | 'AGENTE';

/**
 * Mapeo de roles de base de datos a roles del sistema
 */
const DB_ROLE_MAPPING: Record<string, SystemRole> = {
  'Administrador': 'ADMIN',
  'ADMIN': 'ADMIN',
  'Agente': 'AGENTE',
  'AGENTE': 'AGENTE',
  'Propietario': 'PROPIETARIO',
  'PROPIETARIO': 'PROPIETARIO',
  'Inquilino': 'INQUILINO',
  'INQUILINO': 'INQUILINO'
};

/**
 * Normaliza un rol de la base de datos al rol del sistema
 */
function normalizeRole(dbRole: string): SystemRole | undefined {
  return DB_ROLE_MAPPING[dbRole];
}

/**
 * Permisos específicos del sistema
 */
export type Permission = 
  // Usuarios
  | 'users.read' | 'users.create' | 'users.update' | 'users.delete'
  // Propiedades
  | 'properties.read' | 'properties.create' | 'properties.update' | 'properties.delete'
  // Contratos
  | 'contracts.read' | 'contracts.create' | 'contracts.update' | 'contracts.delete'
  // Pagos
  | 'payments.read' | 'payments.create' | 'payments.update' | 'payments.delete'
  // Documentos
  | 'documents.read' | 'documents.create' | 'documents.update' | 'documents.delete'
  // Auditoría
  | 'audit.read'
  // Sistema
  | 'system.admin';

/**
 * Mapa de permisos por rol
 */
const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  ADMIN: [
    // Acceso total a todo
    'users.read', 'users.create', 'users.update', 'users.delete',
    'properties.read', 'properties.create', 'properties.update', 'properties.delete',
    'contracts.read', 'contracts.create', 'contracts.update', 'contracts.delete',
    'payments.read', 'payments.create', 'payments.update', 'payments.delete',
    'documents.read', 'documents.create', 'documents.update', 'documents.delete',
    'audit.read',
    'system.admin'
  ],
  
  PROPIETARIO: [
    // Puede ver usuarios básico, gestionar sus propiedades y contratos
    'users.read',
    'properties.read', 'properties.create', 'properties.update',
    'contracts.read', 'contracts.create', 'contracts.update',
    'payments.read', 'payments.create', 'payments.update',
    'documents.read', 'documents.create', 'documents.update'
  ],
  
  INQUILINO: [
    // Solo puede ver información relacionada con sus contratos
    'properties.read',
    'contracts.read',
    'payments.read', 'payments.create',
    'documents.read', 'documents.create'
  ],
  
  AGENTE: [
    // Puede gestionar propiedades y contratos para facilitar transacciones
    'users.read',
    'properties.read', 'properties.create', 'properties.update',
    'contracts.read', 'contracts.create', 'contracts.update',
    'payments.read',
    'documents.read', 'documents.create'
  ]
};

/**
 * Verificar si un rol tiene un permiso específico
 */
export function hasPermission(roles: SystemRole[], permission: Permission): boolean {
  return roles.some(role => ROLE_PERMISSIONS[role]?.includes(permission));
}

/**
 * Middleware para requerir roles específicos
 */
export function requireRoles(...requiredRoles: SystemRole[]) {
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

    // Normalizar roles del usuario desde la BD al formato del sistema
    const rawUserRoles = req.user.roles as string[];
    const userRoles = rawUserRoles
      .map(role => normalizeRole(role))
      .filter((role): role is SystemRole => role !== undefined);
    
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn({
        userId: req.user.userId,
        rawUserRoles,
        normalizedUserRoles: userRoles,
        requiredRoles,
        endpoint: req.path,
        method: req.method,
      }, 'Acceso denegado por rol insuficiente');

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`
        }
      });
      return;
    }

    logger.debug({
      userId: req.user.userId,
      rawUserRoles,
      normalizedUserRoles: userRoles,
      requiredRoles,
      endpoint: req.path,
    }, 'Acceso autorizado por rol');

    next();
  };
}

/**
 * Middleware para requerir permisos específicos
 */
export function requirePermissions(...requiredPermissions: Permission[]) {
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

    // Normalizar roles del usuario desde la BD al formato del sistema
    const rawUserRoles = req.user.roles as string[];
    const userRoles = rawUserRoles
      .map(role => normalizeRole(role))
      .filter((role): role is SystemRole => role !== undefined);
    
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(userRoles, permission)
    );

    if (!hasAllPermissions) {
      logger.warn({
        userId: req.user.userId,
        rawUserRoles,
        normalizedUserRoles: userRoles,
        requiredPermissions,
        endpoint: req.path,
        method: req.method,
      }, 'Acceso denegado por permisos insuficientes');

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes los permisos necesarios para realizar esta acción'
        }
      });
      return;
    }

    logger.debug({
      userId: req.user.userId,
      normalizedUserRoles: userRoles,
      requiredPermissions,
      endpoint: req.path,
    }, 'Acceso autorizado por permisos');

    next();
  };
}

/**
 * Middleware para verificar si el usuario es administrador
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRoles('ADMIN')(req, res, next);
}

/**
 * Middleware para verificar que el usuario sea propietario o admin
 */
export function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRoles('PROPIETARIO', 'ADMIN')(req, res, next);
}

/**
 * Middleware condicional: permite acceso a propietarios de sus propios recursos
 * o a admins para cualquier recurso
 */
export function requireOwnershipOrAdmin(resourceUserIdField: string = 'userId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado'
        }
      });
      return;
    }

    const userRoles = req.user.roles as SystemRole[];
    const isAdmin = userRoles.includes('ADMIN');

    // Si es admin, permitir acceso
    if (isAdmin) {
      next();
      return;
    }

    // Verificar ownership del recurso
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'No se pudo determinar el propietario del recurso'
        }
      });
      return;
    }

    const currentUserId = req.user.userId;

    if (parseInt(resourceUserId) === currentUserId) {
      next();
    } else {
      logger.warn({
        currentUserId,
        resourceUserId,
        endpoint: req.path,
      }, 'Intento de acceso no autorizado a recurso de otro usuario');

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Solo puedes acceder a tus propios recursos'
        }
      });
    }
  };
}

/**
 * Verificar si el usuario actual puede acceder a una propiedad específica
 * (Propietario de la propiedad, inquilino con contrato activo, o admin)
 */
export function requirePropertyAccess(propertyIdField: string = 'propertyId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuario no autenticado'
        }
      });
      return;
    }

    const userRoles = req.user.roles as SystemRole[];
    const isAdmin = userRoles.includes('ADMIN');

    // Si es admin, permitir acceso
    if (isAdmin) {
      next();
      return;
    }

    // Aquí se podría implementar lógica para verificar en la BD
    // si el usuario es propietario o inquilino de la propiedad
    // Por ahora, solo permitimos el acceso y logeamos la verificación
    
    const propertyId = req.params[propertyIdField];
    
    logger.debug({
      userId: req.user.userId,
      propertyId,
      userRoles,
      endpoint: req.path,
    }, 'Verificando acceso a propiedad (implementación pendiente)');

    // TODO: Implementar verificación real contra la base de datos
    next();
  };
}

export default {
  hasPermission,
  requireRoles,
  requirePermissions,
  requireAdmin,
  requireOwnerOrAdmin,
  requireOwnershipOrAdmin,
  requirePropertyAccess,
  ROLE_PERMISSIONS,
};
