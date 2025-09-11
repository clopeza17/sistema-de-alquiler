import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const logger = createDbLogger();

/**
 * Interface para roles
 */
interface RoleRow extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string;
  created_at: Date;
}

/**
 * GET /roles
 * Obtener catálogo completo de roles
 */
export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  const [roles] = await pool.execute<RoleRow[]>(
    'SELECT id, nombre, descripcion, created_at FROM roles ORDER BY nombre'
  );
  
  logger.info({
    userId: req.user?.userId,
    totalRoles: roles.length,
  }, 'Catálogo de roles obtenido');
  
  res.json({
    message: 'Roles obtenidos exitosamente',
    data: {
      roles: roles.map(role => ({
        id: role.id,
        nombre: role.nombre,
        descripcion: role.descripcion,
        createdAt: role.created_at,
      })),
    },
  });
});

export default {
  getRoles,
};
