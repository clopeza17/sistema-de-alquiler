import express from 'express';

import { requireAuth, addUserContext } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import {
  listarSolicitudes,
  obtenerSolicitud,
  crearSolicitud,
  actualizarSolicitud,
  cancelarSolicitud,
} from '../controllers/mantenimientoController.js';

const router = express.Router();

router.use(requireAuth);
router.use(addUserContext);

router.get('/', requireRoles('ADMIN', 'OPER'), listarSolicitudes);
router.post('/', requireRoles('ADMIN', 'OPER'), crearSolicitud);
router.get('/:id', requireRoles('ADMIN', 'OPER'), obtenerSolicitud);
router.patch('/:id', requireRoles('ADMIN', 'OPER'), actualizarSolicitud);
router.delete('/:id', requireRoles('ADMIN'), cancelarSolicitud);

export default router;
