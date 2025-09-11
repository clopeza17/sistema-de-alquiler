import { Request, Response, NextFunction } from 'express';
export type SystemRole = 'ADMIN' | 'PROPIETARIO' | 'INQUILINO' | 'AGENTE' | 'OPERADOR';
export type Permission = 'users.read' | 'users.create' | 'users.update' | 'users.delete' | 'properties.read' | 'properties.create' | 'properties.update' | 'properties.delete' | 'contracts.read' | 'contracts.create' | 'contracts.update' | 'contracts.delete' | 'payments.read' | 'payments.create' | 'payments.update' | 'payments.delete' | 'documents.read' | 'documents.create' | 'documents.update' | 'documents.delete' | 'audit.read' | 'system.admin';
export declare function hasPermission(roles: SystemRole[], permission: Permission): boolean;
export declare function requireRoles(...requiredRoles: SystemRole[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requirePermissions(...requiredPermissions: Permission[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
export declare function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction): void;
export declare function requireOwnershipOrAdmin(resourceUserIdField?: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare function requirePropertyAccess(propertyIdField?: string): (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    hasPermission: typeof hasPermission;
    requireRoles: typeof requireRoles;
    requirePermissions: typeof requirePermissions;
    requireAdmin: typeof requireAdmin;
    requireOwnerOrAdmin: typeof requireOwnerOrAdmin;
    requireOwnershipOrAdmin: typeof requireOwnershipOrAdmin;
    requirePropertyAccess: typeof requirePropertyAccess;
    ROLE_PERMISSIONS: Record<SystemRole, Permission[]>;
};
export default _default;
//# sourceMappingURL=middlewareRBAC.d.ts.map