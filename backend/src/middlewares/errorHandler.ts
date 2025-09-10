import { Request, Response, NextFunction } from 'express';
import { HttpError, InternalServerError } from '../common/errors.js';
import defaultLogger from '../config/logger.js';

const logger = defaultLogger.child({ name: 'error-handler' });

/**
 * Interfaz para errores de validación
 */
interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Middleware principal de manejo de errores
 * Debe ser el último middleware en la cadena
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Si las headers ya fueron enviadas, delegar al handler por defecto de Express
  if (res.headersSent) {
    next(error);
    return;
  }

  // Log del error con contexto
  const errorContext = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
      },
      body: req.method !== 'GET' ? req.body : undefined,
      params: req.params,
      query: req.query,
      ip: req.ip,
    },
    user: req.user ? {
      userId: req.user.userId,
      email: req.user.email,
      roles: req.user.roles,
    } : null,
  };

  // Manejar diferentes tipos de errores
  if (error instanceof HttpError) {
    // Errores HTTP personalizados
    logger.warn(errorContext, `HTTP Error ${error.statusCode}: ${error.message}`);
    
    res.status(error.statusCode).json(error.toJSON());
    return;
  }

  // Errores de validación de Zod
  if (error.name === 'ZodError') {
    const validationErrors: ValidationError[] = error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    logger.warn({
      ...errorContext,
      validationErrors,
    }, 'Error de validación de datos');

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos proporcionados no son válidos',
        details: validationErrors,
      }
    });
    return;
  }

  // Errores de base de datos MySQL
  if (error.code) {
    switch (error.code) {
      case 'ER_DUP_ENTRY':
        logger.warn(errorContext, 'Error de duplicado en base de datos');
        res.status(409).json({
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Ya existe un registro con estos datos',
          }
        });
        return;

      case 'ER_NO_REFERENCED_ROW_2':
        logger.warn(errorContext, 'Error de referencia en base de datos');
        res.status(400).json({
          error: {
            code: 'INVALID_REFERENCE',
            message: 'Los datos referenciados no existen',
          }
        });
        return;

      case 'ER_ROW_IS_REFERENCED_2':
        logger.warn(errorContext, 'Error de eliminación por referencia');
        res.status(409).json({
          error: {
            code: 'REFERENCED_RECORD',
            message: 'No se puede eliminar el registro porque está siendo referenciado',
          }
        });
        return;

      case 'ECONNREFUSED':
        logger.error(errorContext, 'Error de conexión a la base de datos');
        res.status(503).json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Servicio temporalmente no disponible',
          }
        });
        return;
    }
  }

  // Errores de JWT
  if (error.name === 'JsonWebTokenError') {
    logger.warn(errorContext, 'Error de token JWT');
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token de autenticación inválido',
      }
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    logger.warn(errorContext, 'Token JWT expirado');
    res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token de autenticación expirado',
      }
    });
    return;
  }

  // Errores de sintaxis JSON
  if (error instanceof SyntaxError && 'body' in error) {
    logger.warn(errorContext, 'Error de sintaxis JSON');
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'El formato JSON proporcionado no es válido',
      }
    });
    return;
  }

  // Errores genéricos no manejados
  logger.error(errorContext, 'Error interno no manejado');

  // En producción, no exponer detalles del error
  const isProduction = process.env.NODE_ENV === 'production';
  
  const internalError = new InternalServerError(
    isProduction ? undefined : error.message
  );

  res.status(500).json(internalError.toJSON());
}

/**
 * Middleware para manejar rutas no encontradas (404)
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn({
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    user: req.user ? {
      userId: req.user.userId,
      email: req.user.email,
    } : null,
  }, 'Ruta no encontrada');

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'La ruta solicitada no existe',
      path: req.url,
    }
  });
}

/**
 * Wrapper para funciones async que maneja automáticamente errores
 * Evita tener que escribir try/catch en cada controlador
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (...args: T): Promise<R> => {
    const result = fn(...args);
    const [, , next] = args;
    return Promise.resolve(result).catch(next);
  };
}

/**
 * Middleware para logging de requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log de request entrante
  logger.info({
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
    },
    user: req.user ? {
      userId: req.user.userId,
      email: req.user.email,
    } : null,
  }, 'Request entrante');

  // Interceptar el final de la response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - start;
    
    logger.info({
      request: {
        method: req.method,
        url: req.url,
      },
      response: {
        statusCode: res.statusCode,
        contentLength: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data || ''),
        duration,
      },
      user: req.user ? {
        userId: req.user.userId,
        email: req.user.email,
      } : null,
    }, 'Request completado');

    return originalSend.call(this, data);
  };

  next();
}

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestLogger,
};
