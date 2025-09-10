import { createDbLogger } from '../config/logger.js';
import { pool } from '../config/db.js';
const logger = createDbLogger();
async function createAuditEntry(auditData) {
    try {
        const query = `
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        details, ip_address, user_agent, success, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
        const values = [
            auditData.userId || null,
            auditData.action,
            auditData.resourceType,
            auditData.resourceId || null,
            auditData.details ? JSON.stringify(auditData.details) : null,
            auditData.ipAddress || null,
            auditData.userAgent || null,
            auditData.success,
            auditData.errorMessage || null,
        ];
        await pool.execute(query, values);
        logger.debug({
            userId: auditData.userId,
            action: auditData.action,
            resourceType: auditData.resourceType,
            success: auditData.success,
        }, 'Entrada de auditoría creada');
    }
    catch (error) {
        logger.error({
            error: error instanceof Error ? error.message : 'Error desconocido',
            auditData,
        }, 'Error al crear entrada de auditoría');
    }
}
export function auditMiddleware(req, res, next) {
    const originalSend = res.send;
    const startTime = Date.now();
    res.send = function (data) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;
        let action = 'READ';
        switch (req.method) {
            case 'POST':
                action = 'CREATE';
                break;
            case 'PUT':
            case 'PATCH':
                action = 'UPDATE';
                break;
            case 'DELETE':
                action = 'DELETE';
                break;
            default:
                action = 'READ';
        }
        const resourceType = getResourceTypeFromPath(req.path);
        const auditData = {
            userId: req.user?.userId,
            action,
            resourceType,
            resourceId: extractResourceId(req),
            details: {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                query: Object.keys(req.query).length > 0 ? req.query : undefined,
                body: shouldLogBody(req) ? sanitizeBody(req.body) : undefined,
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success,
            errorMessage: success ? undefined : getErrorMessage(data),
        };
        if (shouldAudit(req.path)) {
            createAuditEntry(auditData).catch(error => {
                logger.error('Error en auditoría asíncrona:', error);
            });
        }
        return originalSend.call(this, data);
    };
    next();
}
export function auditAuth(action) {
    return (req, res, next) => {
        const originalSend = res.send;
        res.send = function (data) {
            const success = res.statusCode < 400;
            const auditData = {
                userId: req.user?.userId || extractUserIdFromBody(req.body),
                action,
                resourceType: 'SESSION',
                details: {
                    email: req.body?.email || req.user?.email,
                    loginAttempt: action === 'LOGIN',
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                success,
                errorMessage: success ? undefined : getErrorMessage(data),
            };
            createAuditEntry(auditData).catch(error => {
                logger.error('Error en auditoría de auth:', error);
            });
            return originalSend.call(this, data);
        };
        next();
    };
}
export async function auditAction(req, action, resourceType, resourceId, details, success = true, errorMessage) {
    const auditData = {
        userId: req.user?.userId,
        action,
        resourceType,
        resourceId,
        details,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success,
        errorMessage,
    };
    await createAuditEntry(auditData);
}
export async function getAuditLogs(filters) {
    let query = `
    SELECT 
      al.*,
      u.email as user_email,
      u.nombres as user_name
    FROM audit_logs al
    LEFT JOIN usuarios u ON al.user_id = u.id
    WHERE 1=1
  `;
    const params = [];
    if (filters.userId) {
        query += ' AND al.user_id = ?';
        params.push(filters.userId);
    }
    if (filters.action) {
        query += ' AND al.action = ?';
        params.push(filters.action);
    }
    if (filters.resourceType) {
        query += ' AND al.resource_type = ?';
        params.push(filters.resourceType);
    }
    if (filters.dateFrom) {
        query += ' AND al.created_at >= ?';
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        query += ' AND al.created_at <= ?';
        params.push(filters.dateTo);
    }
    query += ' ORDER BY al.created_at DESC';
    if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
    }
    if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
    }
    const [rows] = await pool.execute(query, params);
    return rows;
}
function getResourceTypeFromPath(path) {
    if (path.includes('/usuarios') || path.includes('/users'))
        return 'USER';
    if (path.includes('/propiedades') || path.includes('/properties'))
        return 'PROPERTY';
    if (path.includes('/contratos') || path.includes('/contracts'))
        return 'CONTRACT';
    if (path.includes('/pagos') || path.includes('/payments'))
        return 'PAYMENT';
    if (path.includes('/documentos') || path.includes('/documents'))
        return 'DOCUMENT';
    if (path.includes('/roles'))
        return 'ROLE';
    if (path.includes('/auth'))
        return 'SESSION';
    return 'USER';
}
function extractResourceId(req) {
    const id = req.params.id || req.body.id;
    return id ? parseInt(id, 10) : undefined;
}
function extractUserIdFromBody(body) {
    return body?.userId ? parseInt(body.userId, 10) : undefined;
}
function shouldAudit(path) {
    const excludedPaths = ['/health', '/favicon.ico', '/static'];
    return !excludedPaths.some(excluded => path.includes(excluded));
}
function shouldLogBody(req) {
    const sensitiveEndpoints = ['/auth/login', '/auth/password'];
    return !sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
}
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token'];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });
    return sanitized;
}
function getErrorMessage(responseData) {
    try {
        if (typeof responseData === 'string') {
            const parsed = JSON.parse(responseData);
            return parsed?.error?.message;
        }
        return responseData?.error?.message;
    }
    catch {
        return undefined;
    }
}
export default {
    auditMiddleware,
    auditAuth,
    auditAction,
    getAuditLogs,
};
//# sourceMappingURL=audit.js.map