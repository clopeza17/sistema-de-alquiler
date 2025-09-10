import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import defaultLogger from '../config/logger.js';
import { env } from '../config/env.js';

const logger = defaultLogger.child({ name: 'security' });

/**
 * Configuración de CORS
 */
export const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (como aplicaciones móviles) en desarrollo
    if (!origin && env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Lista de origins permitidos
    const allowedOrigins = [
      'http://localhost:3000',    // React dev server
      'http://localhost:5173',    // Vite dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'file://',                  // Para archivos locales HTML
    ];

    // En producción, agregar el dominio real
    if (env.NODE_ENV === 'production') {
      allowedOrigins.push(
        // 'https://midominio.com',
        // 'https://www.midominio.com'
      );
    }

    // En desarrollo, ser más permisivo con file:// origins
    if (env.NODE_ENV === 'development' && origin && origin.startsWith('file://')) {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
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

/**
 * Rate limiting general
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana por IP
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

/**
 * Rate limiting para autenticación (más estricto)
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por ventana por IP
  message: {
    error: {
      code: 'TOO_MANY_AUTH_ATTEMPTS',
      message: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
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

/**
 * Rate limiting para API endpoints sensibles
 */
export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 requests por hora por IP
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

/**
 * Configuración de Helmet para seguridad
 */
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
  crossOriginEmbedderPolicy: false, // Puede causar problemas con ciertos recursos
});

/**
 * Middleware para validar API Key si se requiere
 */
export function validateApiKey(_req: Request, _res: Response, next: NextFunction): void {
  // Por ahora no validamos API key, pero dejamos la estructura
  // TODO: Agregar API_KEY al archivo de configuración si se necesita
  next();
}

/**
 * Middleware para sanitizar datos de entrada
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Función para limpiar strings recursivamente
  function cleanString(str: string): string {
    return str
      .trim()
      .replace(/[<>]/g, '') // Remover caracteres HTML básicos
      .substring(0, 10000); // Limitar longitud máxima
  }

  // Función para procesar objetos recursivamente
  function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return cleanString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj !== null && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Limpiar también las claves
        const cleanKey = cleanString(key);
        cleaned[cleanKey] = sanitizeObject(value);
      }
      return cleaned;
    }
    
    return obj;
  }

  // Sanitizar body, query y params
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

/**
 * Middleware para logging de seguridad
 */
export function securityLogger(req: Request, _res: Response, next: NextFunction): void {
  // Log de requests sospechosos
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection
    /or.*1.*=.*1/i,   // SQL injection
  ];

  const fullUrl = req.originalUrl;
  const body = JSON.stringify(req.body);
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(fullUrl) || pattern.test(body)
  );

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

/**
 * Middleware para bloquear IPs sospechosas
 * En un entorno real, esto podría conectarse a una base de datos de IPs bloqueadas
 */
export function ipBlocker(req: Request, res: Response, next: NextFunction): void {
  const blockedIPs: string[] = [
    // '192.168.1.100', // Ejemplo de IP bloqueada
  ];

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
