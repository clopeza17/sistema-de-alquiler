import pino from 'pino';
declare const logger: import("pino").Logger<never>;
export declare const createRequestLogger: () => pino.Logger<never>;
export declare const createDbLogger: () => pino.Logger<never>;
export declare const createAuthLogger: () => pino.Logger<never>;
export declare const createBusinessLogger: (module: string) => pino.Logger<never>;
export default logger;
//# sourceMappingURL=logger.d.ts.map