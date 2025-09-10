import mysql from 'mysql2/promise';
import { env } from './env.js';
import logger from './logger.js';
const poolConfig = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    timezone: env.DB_TIMEZONE,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: false,
    multipleStatements: false,
    namedPlaceholders: true,
};
export const pool = mysql.createPool(poolConfig);
export async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        logger.info('✅ Conexión a MySQL establecida correctamente');
        return true;
    }
    catch (error) {
        logger.error('❌ Error al conectar con MySQL:', error);
        return false;
    }
}
export async function executeQuery(query, params) {
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    }
    catch (error) {
        logger.error('Error en consulta SQL:', { query, params, error });
        throw error;
    }
}
export async function executeTransaction(callback) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    }
    catch (error) {
        await connection.rollback();
        logger.error('Error en transacción:', error);
        throw error;
    }
    finally {
        connection.release();
    }
}
export async function closePool() {
    try {
        await pool.end();
        logger.info('Pool de conexiones cerrado');
    }
    catch (error) {
        logger.error('Error al cerrar pool de conexiones:', error);
    }
}
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);
export default pool;
//# sourceMappingURL=db.js.map