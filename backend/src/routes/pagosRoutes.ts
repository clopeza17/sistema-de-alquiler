import { Router } from 'express';

import { requireAuth, addUserContext } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import {
  crearPago,
  listarPagos,
  obtenerPago,
  actualizarPago,
  eliminarPago,
  catalogoFormasPago,
} from '../controllers/pagosController.js';
import {
  aplicarPago,
  listarAplicacionesDePago,
  revertirAplicacion,
} from '../controllers/aplicacionesPagoController.js';

const router = Router();

router.use(requireAuth);
router.use(addUserContext);

// Pagos
router.get('/', requireRoles('ADMIN', 'OPER'), listarPagos);
router.post('/', requireRoles('ADMIN', 'OPER'), crearPago);
router.get('/catalogo/formas-pago', requireRoles('ADMIN', 'OPER'), catalogoFormasPago);
router.get('/:id', requireRoles('ADMIN', 'OPER'), obtenerPago);
router.patch('/:id', requireRoles('ADMIN', 'OPER'), actualizarPago);
router.delete('/:id', requireRoles('ADMIN'), eliminarPago);

// Aplicaciones de pago
router.get('/:id/aplicaciones', requireRoles('ADMIN', 'OPER'), listarAplicacionesDePago);
router.post('/:id/aplicar', requireRoles('ADMIN', 'OPER'), aplicarPago);
router.delete('/:id/aplicaciones/:aplId', requireRoles('ADMIN', 'OPER'), revertirAplicacion);

export default router;
