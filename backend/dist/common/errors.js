export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["TOKEN_INVALID"] = "TOKEN_INVALID";
    ErrorCode["BAD_REQUEST"] = "BAD_REQUEST";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["ALREADY_EXISTS"] = "ALREADY_EXISTS";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["BUSINESS_RULE_VIOLATION"] = "BUSINESS_RULE_VIOLATION";
    ErrorCode["PROPERTY_NOT_AVAILABLE"] = "PROPERTY_NOT_AVAILABLE";
    ErrorCode["CONTRACT_OVERLAP"] = "CONTRACT_OVERLAP";
    ErrorCode["INSUFFICIENT_BALANCE"] = "INSUFFICIENT_BALANCE";
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ErrorCode["TOO_MANY_REQUESTS"] = "TOO_MANY_REQUESTS";
})(ErrorCode || (ErrorCode = {}));
export class HttpError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
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
export class BadRequestError extends HttpError {
    constructor(message = 'Solicitud inválida', details) {
        super(400, ErrorCode.BAD_REQUEST, message, details);
        this.name = 'BadRequestError';
    }
}
export class UnauthorizedError extends HttpError {
    constructor(message = 'No autorizado', details) {
        super(401, ErrorCode.UNAUTHORIZED, message, details);
        this.name = 'UnauthorizedError';
    }
}
export class ForbiddenError extends HttpError {
    constructor(message = 'Acceso prohibido', details) {
        super(403, ErrorCode.FORBIDDEN, message, details);
        this.name = 'ForbiddenError';
    }
}
export class NotFoundError extends HttpError {
    constructor(message = 'Recurso no encontrado', details) {
        super(404, ErrorCode.NOT_FOUND, message, details);
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends HttpError {
    constructor(message = 'Conflicto en la operación', details) {
        super(409, ErrorCode.CONFLICT, message, details);
        this.name = 'ConflictError';
    }
}
export class BusinessRuleError extends HttpError {
    constructor(message = 'Violación de regla de negocio', details) {
        super(422, ErrorCode.BUSINESS_RULE_VIOLATION, message, details);
        this.name = 'BusinessRuleError';
    }
}
export class InternalServerError extends HttpError {
    constructor(message = 'Error interno del servidor', details) {
        super(500, ErrorCode.INTERNAL_SERVER_ERROR, message, details);
        this.name = 'InternalServerError';
    }
}
export class ResponseFactory {
    static success(data, meta) {
        return {
            data,
            ...(meta && { meta }),
        };
    }
    static paginated(data, pagination) {
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
    static noContent(message = 'Operación exitosa') {
        return {
            message,
        };
    }
    static created(data, message = 'Recurso creado exitosamente') {
        return {
            message,
            data,
        };
    }
}
export function wrapDatabaseError(error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return new ConflictError('El registro ya existe', { originalError: error.message });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return new BadRequestError('Referencia inválida', { originalError: error.message });
    }
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return new ConflictError('No se puede eliminar, el registro está siendo utilizado', { originalError: error.message });
    }
    return new InternalServerError('Error en la base de datos', { originalError: error.message });
}
//# sourceMappingURL=errors.js.map