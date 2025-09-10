import { verifyToken, extractTokenFromHeader } from './jwt.js';
import { UnauthorizedError } from '../common/errors.js';
import { createAuthLogger } from '../config/logger.js';
const logger = createAuthLogger();
export function requireAuth(req, res, next) {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        const payload = verifyToken(token);
        req.user = payload;
        logger.info({
            userId: payload.userId,
            email: payload.email,
            roles: payload.roles,
            endpoint: req.path,
            method: req.method,
        }, 'Usuario autenticado correctamente');
        next();
    }
    catch (error) {
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
export function optionalAuth(req, _res, next) {
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
    }
    catch (error) {
        logger.debug({
            error: error instanceof Error ? error.message : 'Error desconocido',
            endpoint: req.path,
        }, 'Auth opcional fallida, continuando sin autenticación');
        next();
    }
}
export function requireActiveUser(req, res, next) {
    if (!req.user) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Usuario no autenticado'
            }
        });
        return;
    }
    next();
}
export function requireOwnership(userIdParam = 'id') {
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
        const resourceUserId = parseInt(req.params[userIdParam]);
        const currentUserId = req.user.userId;
        const isAdmin = req.user.roles?.includes('ADMIN') || false;
        if (currentUserId === resourceUserId || isAdmin) {
            next();
        }
        else {
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
export function addUserContext(req, res, next) {
    if (req.user) {
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
//# sourceMappingURL=middlewareAuth.js.map