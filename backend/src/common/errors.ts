/**
 * Códigos de error estandardizados
 */
export enum ErrorCode {
  // Errores de autenticación
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Errores de validación
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Errores de recursos
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Errores de negocio
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  PROPERTY_NOT_AVAILABLE = 'PROPERTY_NOT_AVAILABLE',
  CONTRACT_OVERLAP = 'CONTRACT_OVERLAP',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  
  // Errores del sistema
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate limiting
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
}

/**
 * Clase base para errores HTTP personalizados
 */
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: any;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: any
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Mantener el stack trace correctamente
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convertir error a formato JSON para respuesta
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Error 400 - Bad Request
 */
export class BadRequestError extends HttpError {
  constructor(message: string = 'Solicitud inválida', details?: any) {
    super(400, ErrorCode.BAD_REQUEST, message, details);
    this.name = 'BadRequestError';
  }
}

/**
 * Error 401 - Unauthorized
 */
export class UnauthorizedError extends HttpError {
  constructor(message: string = 'No autorizado', details?: any) {
    super(401, ErrorCode.UNAUTHORIZED, message, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error 403 - Forbidden
 */
export class ForbiddenError extends HttpError {
  constructor(message: string = 'Acceso prohibido', details?: any) {
    super(403, ErrorCode.FORBIDDEN, message, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Error 404 - Not Found
 */
export class NotFoundError extends HttpError {
  constructor(message: string = 'Recurso no encontrado', details?: any) {
    super(404, ErrorCode.NOT_FOUND, message, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Error 409 - Conflict
 */
export class ConflictError extends HttpError {
  constructor(message: string = 'Conflicto en la operación', details?: any) {
    super(409, ErrorCode.CONFLICT, message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Error 422 - Unprocessable Entity (reglas de negocio)
 */
export class BusinessRuleError extends HttpError {
  constructor(message: string = 'Violación de regla de negocio', details?: any) {
    super(422, ErrorCode.BUSINESS_RULE_VIOLATION, message, details);
    this.name = 'BusinessRuleError';
  }
}

/**
 * Error 500 - Internal Server Error
 */
export class InternalServerError extends HttpError {
  constructor(message: string = 'Error interno del servidor', details?: any) {
    super(500, ErrorCode.INTERNAL_SERVER_ERROR, message, details);
    this.name = 'InternalServerError';
  }
}

/**
 * Factory de respuestas exitosas estandardizadas
 */
export class ResponseFactory {
  /**
   * Respuesta exitosa estándar
   */
  static success<T>(data: T, meta?: any) {
    return {
      data,
      ...(meta && { meta }),
    };
  }

  /**
   * Respuesta para listas con paginación
   */
  static paginated<T>(data: T[], pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  }) {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    
    return {
      data,
      meta: {
        pagination: {
          ...pagination,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
      },
    };
  }

  /**
   * Respuesta para operaciones sin datos
   */
  static noContent(message: string = 'Operación exitosa') {
    return {
      message,
    };
  }

  /**
   * Respuesta para creación de recursos
   */
  static created<T>(data: T, message: string = 'Recurso creado exitosamente') {
    return {
      message,
      data,
    };
  }
}

/**
 * Función helper para envolver errores de base de datos
 */
export function wrapDatabaseError(error: any): HttpError {
  // Errores comunes de MySQL
  if (error.code === 'ER_DUP_ENTRY') {
    return new ConflictError('El registro ya existe', { originalError: error.message });
  }
  
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return new BadRequestError('Referencia inválida', { originalError: error.message });
  }
  
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new ConflictError('No se puede eliminar, el registro está siendo utilizado', { originalError: error.message });
  }

  // Error genérico de base de datos
  return new InternalServerError('Error en la base de datos', { originalError: error.message });
}
