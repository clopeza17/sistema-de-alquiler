import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import defaultLogger from '../config/logger.js';
import { env } from '../config/env.js';
const logger = defaultLogger.child({ name: 'security' });
export const corsOptions = {
    origin: function (origin, callback) {
        if (!origin && env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'file://',
        ];
        if (env.NODE_ENV === 'production') {
            allowedOrigins.push();
        }
        if (env.NODE_ENV === 'development' && origin && origin.startsWith('file://')) {
            return callback(null, true);
        }
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            logger.warn({ origin }, 'CORS: Origin no permitido');
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key'
    ],
    exposedHeaders: ['X-Total-Count'],
};
export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn({
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
        }, 'Rate limit excedido - general');
        res.status(429).json({
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Demasiadas solicitudes, intenta de nuevo más tarde'
            }
        });
    },
});
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: {
            code: 'TOO_MANY_AUTH_ATTEMPTS',
            message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        logger.warn({
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
        }, 'Rate limit excedido - autenticación');
        res.status(429).json({
            error: {
                code: 'TOO_MANY_AUTH_ATTEMPTS',
                message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos'
            }
        });
    },
});
export const sensitiveRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Límite de solicitudes alcanzado para esta operación'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn({
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
        }, 'Rate limit excedido - endpoint sensible');
        res.status(429).json({
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Límite de solicitudes alcanzado para esta operación'
            }
        });
    },
});
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
});
export function validateApiKey(_req, _res, next) {
    next();
}
export function sanitizeInput(req, _res, next) {
    function cleanString(str) {
        return str
            .trim()
            .replace(/[<>]/g, '')
            .substring(0, 10000);
    }
    function sanitizeObject(obj) {
        if (typeof obj === 'string') {
            return cleanString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        if (obj !== null && typeof obj === 'object') {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                const cleanKey = cleanString(key);
                cleaned[cleanKey] = sanitizeObject(value);
            }
            return cleaned;
        }
        return obj;
    }
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    next();
}
export function securityLogger(req, _res, next) {
    const suspiciousPatterns = [
        /\.\./,
        /<script/i,
        /union.*select/i,
        /or.*1.*=.*1/i,
    ];
    const fullUrl = req.originalUrl;
    const body = JSON.stringify(req.body);
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(fullUrl) || pattern.test(body));
    if (isSuspicious) {
        logger.warn({
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: fullUrl,
            body: req.body,
            headers: {
                referer: req.get('Referer'),
                origin: req.get('Origin'),
            },
        }, 'Request sospechoso detectado');
    }
    next();
}
export function ipBlocker(req, res, next) {
    const blockedIPs = [];
    if (req.ip && blockedIPs.includes(req.ip)) {
        logger.warn({
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
        }, 'Acceso bloqueado - IP en lista negra');
        res.status(403).json({
            error: {
                code: 'IP_BLOCKED',
                message: 'Acceso denegado'
            }
        });
        return;
    }
    next();
}
export default {
    corsOptions,
    generalRateLimit,
    authRateLimit,
    sensitiveRateLimit,
    helmetConfig,
    validateApiKey,
    sanitizeInput,
    securityLogger,
    ipBlocker,
};
//# sourceMappingURL=security.js.map