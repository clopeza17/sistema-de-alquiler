export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_TIMEZONE: string;
    DB_CONNECTION_LIMIT: number;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX: number;
    CORS_ORIGIN: string;
    UPLOAD_MAX_SIZE: number;
    UPLOAD_ALLOWED_TYPES: string;
    LOG_FILE?: string | undefined;
};
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
export default env;
//# sourceMappingURL=env.d.ts.map