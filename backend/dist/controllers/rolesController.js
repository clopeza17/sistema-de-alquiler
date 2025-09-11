import { pool } from '../config/db.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
const logger = createDbLogger();
export const getRoles = asyncHandler(async (req, res) => {
    const [roles] = await pool.execute('SELECT id, nombre, descripcion, created_at FROM roles ORDER BY nombre');
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
//# sourceMappingURL=rolesController.js.map