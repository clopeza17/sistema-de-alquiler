import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
export declare const corsOptions: cors.CorsOptions;
export declare const generalRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const sensitiveRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const helmetConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare function validateApiKey(_req: Request, _res: Response, next: NextFunction): void;
export declare function sanitizeInput(req: Request, _res: Response, next: NextFunction): void;
export declare function securityLogger(req: Request, _res: Response, next: NextFunction): void;
export declare function ipBlocker(req: Request, res: Response, next: NextFunction): void;
declare const _default: {
    corsOptions: cors.CorsOptions;
    generalRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    sensitiveRateLimit: import("express-rate-limit").RateLimitRequestHandler;
    helmetConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    validateApiKey: typeof validateApiKey;
    sanitizeInput: typeof sanitizeInput;
    securityLogger: typeof securityLogger;
    ipBlocker: typeof ipBlocker;
};
export default _default;
//# sourceMappingURL=security.d.ts.map