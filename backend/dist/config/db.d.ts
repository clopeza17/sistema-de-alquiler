import mysql from 'mysql2/promise';
export declare const pool: mysql.Pool;
export declare function testConnection(): Promise<boolean>;
export declare function executeQuery<T = any>(query: string, params?: any[]): Promise<T[]>;
export declare function executeTransaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T>;
export declare function closePool(): Promise<void>;
export default pool;
//# sourceMappingURL=db.d.ts.map