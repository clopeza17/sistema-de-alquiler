import { Router } from 'express';
import { 
  getPropiedades,
  getPropiedadById,
  createPropiedad,
  updatePropiedad,
  deletePropiedad,
  getImagenesPropiedad,
  addImagenPropiedad,
  deleteImagenPropiedad
} from '../controllers/propiedadesController.js';
import { requireAuth } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';
import { auditMiddleware } from '../middlewares/audit.js';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(requireAuth);

// Middleware de auditoría automática
router.use(auditMiddleware);

/**
 * Rutas CRUD de propiedades
 */

// GET /api/v1/propiedades - Listar propiedades con filtros y paginación
router.get(
  '/', 
  requireRoles('ADMIN', 'OPERADOR'), 
  getPropiedades
);

// GET /api/v1/propiedades/:id - Obtener propiedad específica
router.get(
  '/:id', 
  requireRoles('ADMIN', 'OPERADOR'), 
  getPropiedadById
);

// POST /api/v1/propiedades - Crear nueva propiedad
router.post(
  '/', 
  requireRoles('ADMIN', 'OPERADOR'), 
  createPropiedad
);

// PUT /api/v1/propiedades/:id - Actualizar propiedad
router.put(
  '/:id', 
  requireRoles('ADMIN', 'OPERADOR'), 
  updatePropiedad
);

// DELETE /api/v1/propiedades/:id - Eliminar propiedad
router.delete(
  '/:id', 
  requireRoles('ADMIN'), // Solo administradores pueden eliminar
  deletePropiedad
);

/**
 * Rutas de gestión de imágenes
 */

// GET /api/v1/propiedades/:id/imagenes - Obtener imágenes de propiedad
router.get(
  '/:id/imagenes', 
  requireRoles('ADMIN', 'OPERADOR'), 
  getImagenesPropiedad
);

// POST /api/v1/propiedades/:id/imagenes - Agregar imagen a propiedad
router.post(
  '/:id/imagenes', 
  requireRoles('ADMIN', 'OPERADOR'), 
  addImagenPropiedad
);

// DELETE /api/v1/propiedades/:id/imagenes/:imagenId - Eliminar imagen de propiedad
router.delete(
  '/:id/imagenes/:imagenId', 
  requireRoles('ADMIN', 'OPERADOR'), 
  deleteImagenPropiedad
);

export default router;
