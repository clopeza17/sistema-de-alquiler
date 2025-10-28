import express from 'express';

import { requireAuth, addUserContext } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import {
  listarGastos,
  obtenerGasto,
  crearGasto,
  actualizarGasto,
  eliminarGasto,
  catalogoTiposGasto,
} from '../controllers/gastosController.js';

const router = express.Router();

router.use(requireAuth);
router.use(addUserContext);

router.get('/catalogo/tipos', requireRoles('ADMIN', 'OPER'), catalogoTiposGasto);
router.get('/', requireRoles('ADMIN', 'OPER'), listarGastos);
router.get('/:id', requireRoles('ADMIN', 'OPER'), obtenerGasto);
router.post('/', requireRoles('ADMIN', 'OPER'), crearGasto);
router.put('/:id', requireRoles('ADMIN', 'OPER'), actualizarGasto);
router.delete('/:id', requireRoles('ADMIN'), eliminarGasto);

export default router;
