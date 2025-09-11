import pino from 'pino';
import { env } from './env.js';
const loggerConfig = {
    level: env.LOG_LEVEL,
    serializers: pino.stdSerializers,
};
if (env.NODE_ENV === 'development') {
    loggerConfig.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
        },
    };
}
const logger = pino(loggerConfig);
export const createRequestLogger = () => {
    return logger.child({
        name: 'http-request',
        requestId: Math.random().toString(36).substr(2, 9)
    });
};
export const createDbLogger = () => {
    return logger.child({ name: 'database' });
};
export const createAuthLogger = () => {
    return logger.child({ name: 'auth' });
};
export const createBusinessLogger = (module) => {
    return logger.child({ name: `business-${module}` });
};
export default logger;
//# sourceMappingURL=logger.js.map