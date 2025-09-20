import { Router } from 'express';

import { requireAuth, addUserContext } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import { generarFacturasMensuales } from '../controllers/facturacionController.js';

const router = Router();

router.use(requireAuth);
router.use(addUserContext);

router.post('/generar', requireRoles('ADMIN'), generarFacturasMensuales);

export default router;

