import { randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';

/**
 * Número de salt rounds para bcrypt (recomendado: 10-12)
 */
const SALT_ROUNDS = 12;

/**
 * Hash de una contraseña usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    throw new Error('Error al crear hash de contraseña');
  }
}

/**
 * Verificar contraseña contra hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Error al verificar contraseña');
  }
}

/**
 * Generar contraseña temporal aleatoria
 */
export function generateTemporaryPassword(length: number = 12): string {
  const groups = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    '!@#$%^&*',
  ];
  const allChars = groups.join('');
  const characters = groups.map((group) => group[randomInt(group.length)]);

  while (characters.length < length) {
    characters.push(allChars[randomInt(allChars.length)]);
  }

  for (let i = characters.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters.join('');
}

/**
 * Validar fortaleza de contraseña
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
} {
  const errors: string[] = [];
  let score = 0;
  
  // Longitud mínima
  if (password.length < 8) {
    errors.push('Contraseña debe tener al menos 8 caracteres');
  } else {
    score += 20;
  }
  
  // Longitud bonus
  if (password.length >= 12) {
    score += 10;
  }
  
  // Mayúsculas
  if (!/[A-Z]/.test(password)) {
    errors.push('Contraseña debe contener al menos una letra mayúscula');
  } else {
    score += 20;
  }
  
  // Minúsculas
  if (!/[a-z]/.test(password)) {
    errors.push('Contraseña debe contener al menos una letra minúscula');
  } else {
    score += 20;
  }
  
  // Números
  if (!/[0-9]/.test(password)) {
    errors.push('Contraseña debe contener al menos un número');
  } else {
    score += 15;
  }
  
  // Símbolos
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Contraseña debe contener al menos un símbolo especial');
  } else {
    score += 15;
  }
  
  // Patrones comunes (penalización)
  const commonPatterns = [
    /123456/,
    /password/i,
    /admin/i,
    /qwerty/i,
    /(.)\1{2,}/, // caracteres repetidos
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

/**
 * Verificar si una contraseña ha sido comprometida (simulado)
 * En producción, esto podría integrar con APIs como HaveIBeenPwned
 */
export async function checkPasswordBreach(password: string): Promise<boolean> {
  // Lista básica de contraseñas comunes comprometidas
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
