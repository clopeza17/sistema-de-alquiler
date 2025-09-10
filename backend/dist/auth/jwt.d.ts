export interface JwtPayload {
    userId: number;
    email: string;
    roles: string[];
    iat?: number;
    exp?: number;
}
export interface AuthResponse {
    token: string;
    refreshToken?: string;
    expiresIn: string;
    user: {
        id: number;
        email: string;
        nombre_completo: string;
        roles: string[];
    };
}
export declare function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string;
export declare function generateRefreshToken(userId: number): string;
export declare function verifyToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): {
    userId: number;
    type: string;
};
export declare function extractTokenFromHeader(authHeader?: string): string;
export declare function decodeTokenUnsafe(token: string): any;
export declare function getTokenExpiration(token: string): Date | null;
export declare function isTokenNearExpiration(token: string): boolean;
declare const _default: {
    generateToken: typeof generateToken;
    generateRefreshToken: typeof generateRefreshToken;
    verifyToken: typeof verifyToken;
    verifyRefreshToken: typeof verifyRefreshToken;
    extractTokenFromHeader: typeof extractTokenFromHeader;
    decodeTokenUnsafe: typeof decodeTokenUnsafe;
    getTokenExpiration: typeof getTokenExpiration;
    isTokenNearExpiration: typeof isTokenNearExpiration;
};
export default _default;
//# sourceMappingURL=jwt.d.ts.map