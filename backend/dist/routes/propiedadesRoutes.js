import { Router } from 'express';
import { getPropiedades, getPropiedadById, createPropiedad, updatePropiedad, deletePropiedad, getImagenesPropiedad, addImagenPropiedad, deleteImagenPropiedad } from '../controllers/propiedadesController.js';
import { requireAuth } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import { auditMiddleware } from '../middlewares/audit.js';
const router = Router();
router.use(requireAuth);
router.use(auditMiddleware);
router.get('/', requireRoles('ADMIN', 'OPERADOR'), getPropiedades);
router.get('/:id', requireRoles('ADMIN', 'OPERADOR'), getPropiedadById);
router.post('/', requireRoles('ADMIN', 'OPERADOR'), createPropiedad);
router.put('/:id', requireRoles('ADMIN', 'OPERADOR'), updatePropiedad);
router.delete('/:id', requireRoles('ADMIN'), deletePropiedad);
router.get('/:id/imagenes', requireRoles('ADMIN', 'OPERADOR'), getImagenesPropiedad);
router.post('/:id/imagenes', requireRoles('ADMIN', 'OPERADOR'), addImagenPropiedad);
router.delete('/:id/imagenes/:imagenId', requireRoles('ADMIN', 'OPERADOR'), deleteImagenPropiedad);
export default router;
//# sourceMappingURL=propiedadesRoutes.js.map