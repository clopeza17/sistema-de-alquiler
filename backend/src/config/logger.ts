import pino from 'pino';
import { env } from './env.js';

// Configuración del logger
const loggerConfig: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  serializers: pino.stdSerializers,
};

// Configuración diferente para desarrollo y producción
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

// Crear instancia del logger
const logger = pino(loggerConfig);

// Función para log de requests HTTP
export const createRequestLogger = () => {
  return logger.child({ 
    name: 'http-request',
    requestId: Math.random().toString(36).substr(2, 9)
  });
};

// Función para log de base de datos
export const createDbLogger = () => {
  return logger.child({ name: 'database' });
};

// Función para log de autenticación
export const createAuthLogger = () => {
  return logger.child({ name: 'auth' });
};

// Función para log de módulos de negocio
export const createBusinessLogger = (module: string) => {
  return logger.child({ name: `business-${module}` });
};

export default logger;
