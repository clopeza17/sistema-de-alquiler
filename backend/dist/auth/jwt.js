import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../common/errors.js';
export function generateToken(payload) {
    try {
        const options = { expiresIn: env.JWT_EXPIRES_IN };
        return jwt.sign(payload, env.JWT_SECRET, options);
    }
    catch (error) {
        throw new Error('Error al generar token JWT');
    }
}
export function generateRefreshToken(userId) {
    try {
        const payload = { userId, type: 'refresh' };
        const options = { expiresIn: env.JWT_REFRESH_EXPIRES_IN };
        return jwt.sign(payload, env.JWT_SECRET, options);
    }
    catch (error) {
        throw new Error('Error al generar refresh token');
    }
}
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ['HS256'],
        });
        if (!decoded.userId || !decoded.email || !Array.isArray(decoded.roles)) {
            throw new UnauthorizedError('Token con estructura inválida');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token expirado');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Token inválido');
        }
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw new UnauthorizedError('Error al verificar token');
    }
}
export function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ['HS256'],
        });
        if (decoded.type !== 'refresh' || !decoded.userId) {
            throw new UnauthorizedError('Refresh token inválido');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Refresh token expirado');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Refresh token inválido');
        }
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw new UnauthorizedError('Error al verificar refresh token');
    }
}
export function extractTokenFromHeader(authHeader) {
    if (!authHeader) {
        throw new UnauthorizedError('Header Authorization requerido');
    }
    if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Formato de token inválido. Use: Bearer <token>');
    }
    const token = authHeader.substring(7);
    if (!token) {
        throw new UnauthorizedError('Token no proporcionado');
    }
    return token;
}
export function decodeTokenUnsafe(token) {
    try {
        return jwt.decode(token);
    }
    catch {
        return null;
    }
}
export function getTokenExpiration(token) {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            return new Date(decoded.exp * 1000);
        }
        return null;
    }
    catch {
        return null;
    }
}
export function isTokenNearExpiration(token) {
    const expiration = getTokenExpiration(token);
    if (!expiration)
        return false;
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    return expiration <= fiveMinutesFromNow;
}
export default {
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken,
    extractTokenFromHeader,
    decodeTokenUnsafe,
    getTokenExpiration,
    isTokenNearExpiration,
};
//# sourceMappingURL=jwt.js.map