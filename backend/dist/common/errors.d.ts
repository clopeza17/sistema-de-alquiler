export declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    TOKEN_INVALID = "TOKEN_INVALID",
    BAD_REQUEST = "BAD_REQUEST",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    NOT_FOUND = "NOT_FOUND",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    CONFLICT = "CONFLICT",
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
    PROPERTY_NOT_AVAILABLE = "PROPERTY_NOT_AVAILABLE",
    CONTRACT_OVERLAP = "CONTRACT_OVERLAP",
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS"
}
export declare class HttpError extends Error {
    readonly statusCode: number;
    readonly code: ErrorCode;
    readonly details?: any;
    constructor(statusCode: number, code: ErrorCode, message: string, details?: any);
    toJSON(): {
        error: any;
    };
}
export declare class BadRequestError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class UnauthorizedError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class ForbiddenError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class NotFoundError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class ConflictError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class BusinessRuleError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class InternalServerError extends HttpError {
    constructor(message?: string, details?: any);
}
export declare class ResponseFactory {
    static success<T>(data: T, meta?: any): any;
    static paginated<T>(data: T[], pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages?: number;
    }): {
        data: T[];
        meta: {
            pagination: {
                totalPages: number;
                hasNext: boolean;
                hasPrev: boolean;
                page: number;
                limit: number;
                total: number;
            };
        };
    };
    static noContent(message?: string): {
        message: string;
    };
    static created<T>(data: T, message?: string): {
        message: string;
        data: T;
    };
}
export declare function wrapDatabaseError(error: any): HttpError;
//# sourceMappingURL=errors.d.ts.map