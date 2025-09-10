import { pool } from '../config/db.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
const logger = createDbLogger();
export const getRoles = asyncHandler(async (req, res) => {
    const [roles] = await pool.execute('SELECT id, codigo, nombre, descripcion, creado_el FROM roles ORDER BY nombre');
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
//# sourceMappingURL=rolesController.js.map