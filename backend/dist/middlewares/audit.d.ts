import { Request, Response, NextFunction } from 'express';
export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'PAYMENT_CREATED' | 'CONTRACT_SIGNED' | 'PROPERTY_PUBLISHED';
export type ResourceType = 'USER' | 'PROPERTY' | 'CONTRACT' | 'PAYMENT' | 'DOCUMENT' | 'ROLE' | 'SESSION' | 'INQUILINO';
export declare function auditMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function auditAuth(action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE'): (req: Request, res: Response, next: NextFunction) => void;
export declare function auditAction(req: Request, action: AuditAction, resourceType: ResourceType, resourceId?: number, details?: Record<string, any>, success?: boolean, errorMessage?: string): Promise<void>;
export declare function getAuditLogs(filters: {
    userId?: number;
    action?: AuditAction;
    resourceType?: ResourceType;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}): Promise<any[]>;
declare const _default: {
    auditMiddleware: typeof auditMiddleware;
    auditAuth: typeof auditAuth;
    auditAction: typeof auditAction;
    getAuditLogs: typeof getAuditLogs;
};
export default _default;
//# sourceMappingURL=audit.d.ts.map