export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
export declare function generateTemporaryPassword(length?: number): string;
export declare function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
};
export declare function checkPasswordBreach(password: string): Promise<boolean>;
declare const _default: {
    hashPassword: typeof hashPassword;
    verifyPassword: typeof verifyPassword;
    generateTemporaryPassword: typeof generateTemporaryPassword;
    validatePasswordStrength: typeof validatePasswordStrength;
    checkPasswordBreach: typeof checkPasswordBreach;
};
export default _default;
//# sourceMappingURL=password.d.ts.map