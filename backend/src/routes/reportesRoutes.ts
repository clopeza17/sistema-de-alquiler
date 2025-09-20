import { Router } from 'express';
import { requireAuth, addUserContext } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import { reporteCXC, reporteRentabilidad, reporteOcupacion, kpis } from '../controllers/reportesController.js';

const router = Router();

router.use(requireAuth);
router.use(addUserContext);

router.get('/cxc', requireRoles('ADMIN', 'OPER'), reporteCXC);
router.get('/rentabilidad', requireRoles('ADMIN', 'OPER'), reporteRentabilidad);
router.get('/ocupacion', requireRoles('ADMIN', 'OPER'), reporteOcupacion);
router.get('/kpis', requireRoles('ADMIN', 'OPER'), kpis);

export default router;

