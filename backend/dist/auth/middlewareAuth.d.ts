import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from './jwt.js';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
export declare function requireActiveUser(req: Request, res: Response, next: NextFunction): void;
export declare function requireOwnership(userIdParam?: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function addUserContext(req: Request, res: Response, next: NextFunction): void;
declare const _default: {
    requireAuth: typeof requireAuth;
    optionalAuth: typeof optionalAuth;
    requireActiveUser: typeof requireActiveUser;
    requireOwnership: typeof requireOwnership;
    addUserContext: typeof addUserContext;
};
export default _default;
//# sourceMappingURL=middlewareAuth.d.ts.map