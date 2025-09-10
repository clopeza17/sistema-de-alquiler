import express from 'express';
import {
  getUsers,
  createUser,
  getUser,
  updateUser,
  changeUserStatus,
  deleteUser,
} from '../controllers/usersController.js';
import { getRoles } from '../controllers/rolesController.js';
import { 
  requireAuth,
  addUserContext,
} from '../auth/middlewareAuth.js';
import { 
  requireAdmin,
  requirePermissions,
} from '../auth/middlewareRBAC.js';
import { sensitiveRateLimit } from '../middlewares/security.js';

const router = express.Router();

// Middleware común para todas las rutas de usuarios
router.use(requireAuth);          // Requiere autenticación
router.use(addUserContext);       // Agregar contexto de usuario

/**
 * GET /usuarios
 * Listar usuarios con paginación y filtros
 * Requiere permisos de lectura de usuarios
 */
router.get('/', 
  requirePermissions('users.read'),
  getUsers
);

/**
 * POST /usuarios
 * Crear nuevo usuario
 * Requiere permisos de creación de usuarios y rate limiting
 */
router.post('/', 
  sensitiveRateLimit,               // Rate limiting para operaciones sensibles
  requirePermissions('users.create'),
  createUser
);

/**
 * GET /usuarios/:id
 * Obtener usuario específico
 * Requiere permisos de lectura de usuarios
 */
router.get('/:id', 
  requirePermissions('users.read'),
  getUser
);

/**
 * PUT /usuarios/:id
 * Actualizar usuario completo
 * Requiere permisos de actualización de usuarios
 */
router.put('/:id', 
  sensitiveRateLimit,               // Rate limiting para operaciones sensibles
  requirePermissions('users.update'),
  updateUser
);

/**
 * PATCH /usuarios/:id/estado
 * Cambiar estado del usuario (activar/desactivar/bloquear)
 * Requiere permisos de actualización de usuarios
 */
router.patch('/:id/estado', 
  sensitiveRateLimit,               // Rate limiting para operaciones sensibles
  requirePermissions('users.update'),
  changeUserStatus
);

/**
 * DELETE /usuarios/:id
 * Eliminar usuario (soft delete)
 * Requiere permisos de eliminación de usuarios
 */
router.delete('/:id', 
  sensitiveRateLimit,               // Rate limiting para operaciones sensibles
  requirePermissions('users.delete'),
  deleteUser
);

/**
 * GET /roles
 * Obtener catálogo de roles (para formularios)
 * Solo requiere ser admin
 */
router.get('/catalogo/roles', 
  requireAdmin,
  getRoles
);

export default router;
