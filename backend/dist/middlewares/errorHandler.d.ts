import { Request, Response, NextFunction } from 'express';
export declare function errorHandler(error: any, req: Request, res: Response, next: NextFunction): void;
export declare function notFoundHandler(req: Request, res: Response): void;
export declare function asyncHandler<T extends any[], R>(fn: (...args: T) => Promise<R>): (...args: T) => Promise<R>;
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
declare const _default: {
    errorHandler: typeof errorHandler;
    notFoundHandler: typeof notFoundHandler;
    asyncHandler: typeof asyncHandler;
    requestLogger: typeof requestLogger;
};
export default _default;
//# sourceMappingURL=errorHandler.d.ts.map