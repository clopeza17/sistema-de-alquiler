import { Router } from 'express';
import { getContratos, getContratoById, createContrato, updateContrato, deleteContrato, finalizarContrato, renovarContrato, getFacturasContrato } from '../controllers/contratosController.js';
import { requireAuth } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
const router = Router();
router.use(requireAuth);
router.get('/', requireRoles('ADMIN', 'OPERADOR'), getContratos);
router.get('/:id', requireRoles('ADMIN', 'OPERADOR'), getContratoById);
router.post('/', requireRoles('ADMIN', 'OPERADOR'), createContrato);
router.put('/:id', requireRoles('ADMIN', 'OPERADOR'), updateContrato);
router.post('/:id/finalizar', requireRoles('ADMIN', 'OPERADOR'), finalizarContrato);
router.post('/:id/renovar', requireRoles('ADMIN', 'OPERADOR'), renovarContrato);
router.get('/:id/facturas', requireRoles('ADMIN', 'OPERADOR'), getFacturasContrato);
router.delete('/:id', requireRoles('ADMIN'), deleteContrato);
export default router;
//# sourceMappingURL=contratosRoutes.js.map