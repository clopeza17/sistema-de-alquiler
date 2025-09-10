import mysql from 'mysql2/promise';
import { env } from './env.js';
import logger from './logger.js';

// Configuración del pool de conexiones
const poolConfig: mysql.PoolOptions = {
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

// Crear pool de conexiones
export const pool = mysql.createPool(poolConfig);

// Función para probar la conexión
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('✅ Conexión a MySQL establecida correctamente');
    return true;
  } catch (error) {
    logger.error('❌ Error al conectar con MySQL:', error);
    return false;
  }
}

// Función para ejecutar consultas con manejo de errores
export async function executeQuery<T = any>(
  query: string,
  params?: any[]
): Promise<T[]> {
  try {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  } catch (error) {
    logger.error('Error en consulta SQL:', { query, params, error });
    throw error;
  }
}

// Función para transacciones
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Error en transacción:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Función para cerrar el pool (útil para testing)
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('Pool de conexiones cerrado');
  } catch (error) {
    logger.error('Error al cerrar pool de conexiones:', error);
  }
}

// Manejo de señales para cerrar conexiones gracefully
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);

export default pool;
