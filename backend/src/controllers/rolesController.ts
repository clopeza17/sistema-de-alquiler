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
  codigo: string;
  nombre: string;
  descripcion: string;
  creado_el: Date;
}

/**
 * GET /roles
 * Obtener catálogo completo de roles
 */
export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  const [roles] = await pool.execute<RoleRow[]>(
    'SELECT id, codigo, nombre, descripcion, creado_el FROM roles ORDER BY nombre'
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
        codigo: role.codigo,
        nombre: role.nombre,
        descripcion: role.descripcion,
        createdAt: role.creado_el,
      })),
    },
  });
});

export default {
  getRoles,
};
