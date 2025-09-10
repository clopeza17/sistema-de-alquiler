import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('8080').transform(Number),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.string().default('3306').transform(Number),
    DB_NAME: z.string().default('sistema_alquiler'),
    DB_USER: z.string().default('app_user'),
    DB_PASSWORD: z.string().default('app_password'),
    DB_TIMEZONE: z.string().default('-06:00'),
    DB_CONNECTION_LIMIT: z.string().default('10').transform(Number),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('8h'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    LOG_FILE: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
    RATE_LIMIT_MAX: z.string().default('120').transform(Number),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    UPLOAD_MAX_SIZE: z.string().default('5242880').transform(Number),
    UPLOAD_ALLOWED_TYPES: z.string().default('image/jpeg,image/png,image/webp'),
});
export const env = envSchema.parse(process.env);
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export default env;
//# sourceMappingURL=env.js.map