import { Router } from 'express';

import { requireAuth, addUserContext } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import {
  listarFacturas,
  obtenerFactura,
  anularFactura,
  catalogoEstadosFacturas,
} from '../controllers/facturacionController.js';

const router = Router();

router.use(requireAuth);
router.use(addUserContext);

router.get('/', requireRoles('ADMIN', 'OPER'), listarFacturas);
router.get('/catalogo/estados', requireRoles('ADMIN', 'OPER'), catalogoEstadosFacturas);
router.get('/:id', requireRoles('ADMIN', 'OPER'), obtenerFactura);
router.patch('/:id/anular', requireRoles('ADMIN'), anularFactura);

export default router;

