import bcrypt from 'bcrypt';
const SALT_ROUNDS = 12;
export async function hashPassword(password) {
    try {
        return await bcrypt.hash(password, SALT_ROUNDS);
    }
    catch (error) {
        throw new Error('Error al crear hash de contraseña');
    }
}
export async function verifyPassword(password, hashedPassword) {
    try {
        return await bcrypt.compare(password, hashedPassword);
    }
    catch (error) {
        throw new Error('Error al verificar contraseña');
    }
}
export function generateTemporaryPassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
export function validatePasswordStrength(password) {
    const errors = [];
    let score = 0;
    if (password.length < 8) {
        errors.push('Contraseña debe tener al menos 8 caracteres');
    }
    else {
        score += 20;
    }
    if (password.length >= 12) {
        score += 10;
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Contraseña debe contener al menos una letra mayúscula');
    }
    else {
        score += 20;
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Contraseña debe contener al menos una letra minúscula');
    }
    else {
        score += 20;
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Contraseña debe contener al menos un número');
    }
    else {
        score += 15;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Contraseña debe contener al menos un símbolo especial');
    }
    else {
        score += 15;
    }
    const commonPatterns = [
        /123456/,
        /password/i,
        /admin/i,
        /qwerty/i,
        /(.)\1{2,}/,
    ];
    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            score -= 10;
            errors.push('Contraseña contiene patrones comunes o inseguros');
            break;
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        score: Math.max(0, Math.min(100, score)),
    };
}
export async function checkPasswordBreach(password) {
    const commonPasswords = [
        '123456',
        'password',
        '123456789',
        '12345678',
        '12345',
        '1234567',
        '1234567890',
        'qwerty',
        'abc123',
        'admin',
        'password123',
        '123123',
        'welcome',
        'login',
    ];
    return commonPasswords.includes(password.toLowerCase());
}
export default {
    hashPassword,
    verifyPassword,
    generateTemporaryPassword,
    validatePasswordStrength,
    checkPasswordBreach,
};
//# sourceMappingURL=password.js.map