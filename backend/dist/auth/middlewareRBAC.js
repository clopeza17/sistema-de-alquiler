import { createAuthLogger } from '../config/logger.js';
const logger = createAuthLogger();
const DB_ROLE_MAPPING = {
    'Administrador': 'ADMIN',
    'ADMIN': 'ADMIN',
    'Agente': 'AGENTE',
    'AGENTE': 'AGENTE',
    'Propietario': 'PROPIETARIO',
    'PROPIETARIO': 'PROPIETARIO',
    'Inquilino': 'INQUILINO',
    'INQUILINO': 'INQUILINO'
};
function normalizeRole(dbRole) {
    return DB_ROLE_MAPPING[dbRole];
}
const ROLE_PERMISSIONS = {
    ADMIN: [
        'users.read', 'users.create', 'users.update', 'users.delete',
        'properties.read', 'properties.create', 'properties.update', 'properties.delete',
        'contracts.read', 'contracts.create', 'contracts.update', 'contracts.delete',
        'payments.read', 'payments.create', 'payments.update', 'payments.delete',
        'documents.read', 'documents.create', 'documents.update', 'documents.delete',
        'audit.read',
        'system.admin'
    ],
    PROPIETARIO: [
        'users.read',
        'properties.read', 'properties.create', 'properties.update',
        'contracts.read', 'contracts.create', 'contracts.update',
        'payments.read', 'payments.create', 'payments.update',
        'documents.read', 'documents.create', 'documents.update'
    ],
    INQUILINO: [
        'properties.read',
        'contracts.read',
        'payments.read', 'payments.create',
        'documents.read', 'documents.create'
    ],
    AGENTE: [
        'users.read',
        'properties.read', 'properties.create', 'properties.update',
        'contracts.read', 'contracts.create', 'contracts.update',
        'payments.read',
        'documents.read', 'documents.create'
    ]
};
export function hasPermission(roles, permission) {
    return roles.some(role => ROLE_PERMISSIONS[role]?.includes(permission));
}
export function requireRoles(...requiredRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Usuario no autenticado'
                }
            });
            return;
        }
        const rawUserRoles = req.user.roles;
        const userRoles = rawUserRoles
            .map(role => normalizeRole(role))
            .filter((role) => role !== undefined);
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
export function requirePermissions(...requiredPermissions) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Usuario no autenticado'
                }
            });
            return;
        }
        const rawUserRoles = req.user.roles;
        const userRoles = rawUserRoles
            .map(role => normalizeRole(role))
            .filter((role) => role !== undefined);
        const hasAllPermissions = requiredPermissions.every(permission => hasPermission(userRoles, permission));
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
export function requireAdmin(req, res, next) {
    requireRoles('ADMIN')(req, res, next);
}
export function requireOwnerOrAdmin(req, res, next) {
    requireRoles('PROPIETARIO', 'ADMIN')(req, res, next);
}
export function requireOwnershipOrAdmin(resourceUserIdField = 'userId') {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Usuario no autenticado'
                }
            });
            return;
        }
        const userRoles = req.user.roles;
        const isAdmin = userRoles.includes('ADMIN');
        if (isAdmin) {
            next();
            return;
        }
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
        }
        else {
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
export function requirePropertyAccess(propertyIdField = 'propertyId') {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Usuario no autenticado'
                }
            });
            return;
        }
        const userRoles = req.user.roles;
        const isAdmin = userRoles.includes('ADMIN');
        if (isAdmin) {
            next();
            return;
        }
        const propertyId = req.params[propertyIdField];
        logger.debug({
            userId: req.user.userId,
            propertyId,
            userRoles,
            endpoint: req.path,
        }, 'Verificando acceso a propiedad (implementación pendiente)');
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
//# sourceMappingURL=middlewareRBAC.js.map