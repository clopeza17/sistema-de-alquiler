import { Router } from 'express';
import { getContratos, getContratoById, createContrato, updateContrato, deleteContrato, finalizarContrato, renovarContrato, getFacturasContrato } from '../controllers/contratosController.js';
import { requireAuth } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
const router = Router();
router.use(requireAuth);
router.get('/', requireRoles('ADMIN', 'AGENTE'), getContratos);
router.get('/:id', requireRoles('ADMIN', 'AGENTE'), getContratoById);
router.post('/', requireRoles('ADMIN', 'AGENTE'), createContrato);
router.put('/:id', requireRoles('ADMIN', 'AGENTE'), updateContrato);
router.put('/:id/finalizar', requireRoles('ADMIN', 'AGENTE'), finalizarContrato);
router.put('/:id/renovar', requireRoles('ADMIN', 'AGENTE'), renovarContrato);
router.get('/:id/facturas', requireRoles('ADMIN', 'AGENTE'), getFacturasContrato);
router.delete('/:id', requireRoles('ADMIN'), deleteContrato);
export default router;
//# sourceMappingURL=contratosRoutes.js.map