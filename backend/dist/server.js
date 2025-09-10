import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';
import logger from './config/logger.js';
async function startServer() {
    try {
        const dbConnected = await testConnection();
        if (!dbConnected) {
            logger.error('❌ No se pudo conectar a la base de datos. Abortando...');
            process.exit(1);
        }
        const server = app.listen(env.PORT, () => {
            logger.info(`🚀 Servidor iniciado correctamente`);
            logger.info(`📡 URL: http://localhost:${env.PORT}`);
            logger.info(`🌍 Entorno: ${env.NODE_ENV}`);
            logger.info(`🗄️  Base de datos: ${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT}`);
        });
        const gracefulShutdown = () => {
            logger.info('🔄 Cerrando servidor gracefully...');
            server.close(() => {
                logger.info('✅ Servidor cerrado correctamente');
                process.exit(0);
            });
            setTimeout(() => {
                logger.error('⚠️ Forzando cierre del servidor');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        process.on('uncaughtException', (error) => {
            logger.error('💥 Excepción no capturada:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('💥 Promise rechazada no manejada:', { reason, promise });
            process.exit(1);
        });
    }
    catch (error) {
        logger.error('💥 Error al iniciar el servidor:', error);
        process.exit(1);
    }
}
export default startServer;
//# sourceMappingURL=server.js.map