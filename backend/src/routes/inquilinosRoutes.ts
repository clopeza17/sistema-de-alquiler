import { Router } from 'express';
import { requireAuth } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import {
  getInquilinos,
  getInquilino,
  createInquilino,
  updateInquilino,
  deleteInquilino,
  reactivateInquilino,
} from '../controllers/inquilinosController.js';

const router = Router();

/**
 * Todas las rutas de inquilinos requieren autenticación
 */
router.use(requireAuth);

/**
 * GET /api/inquilinos
 * Obtener lista de inquilinos con paginación y filtros
 * Roles permitidos: ADMIN, OPERADOR
 */
router.get('/', requireRoles('ADMIN', 'OPERADOR'), getInquilinos);

/**
 * GET /api/inquilinos/:id
 * Obtener un inquilino específico por ID
 * Roles permitidos: ADMIN, OPERADOR
 */
router.get('/:id', requireRoles('ADMIN', 'OPERADOR'), getInquilino);

/**
 * POST /api/inquilinos
 * Crear nuevo inquilino
 * Roles permitidos: ADMIN, OPERADOR
 */
router.post('/', requireRoles('ADMIN', 'OPERADOR'), createInquilino);

/**
 * PUT /api/inquilinos/:id
 * Actualizar inquilino existente
 * Roles permitidos: ADMIN, OPERADOR
 */
router.put('/:id', requireRoles('ADMIN', 'OPERADOR'), updateInquilino);

/**
 * DELETE /api/inquilinos/:id
 * Eliminar inquilino (soft delete)
 * Solo administradores pueden eliminar
 */
router.delete('/:id', requireRoles('ADMIN'), deleteInquilino);

/**
 * POST /api/inquilinos/:id/reactivar
 * Reactivar inquilino eliminado
 * Solo administradores pueden reactivar
 */
router.post('/:id/reactivar', requireRoles('ADMIN'), reactivateInquilino);

export default router;
