import { Router } from 'express';
import { requireAuth } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import { getInquilinos, getInquilino, createInquilino, updateInquilino, deleteInquilino, reactivateInquilino, } from '../controllers/inquilinosController.js';
const router = Router();
router.use(requireAuth);
router.get('/', requireRoles('ADMIN', 'OPERADOR'), getInquilinos);
router.get('/:id', requireRoles('ADMIN', 'OPERADOR'), getInquilino);
router.post('/', requireRoles('ADMIN', 'OPERADOR'), createInquilino);
router.put('/:id', requireRoles('ADMIN', 'OPERADOR'), updateInquilino);
router.delete('/:id', requireRoles('ADMIN'), deleteInquilino);
router.post('/:id/reactivar', requireRoles('ADMIN'), reactivateInquilino);
export default router;
//# sourceMappingURL=inquilinosRoutes.js.map