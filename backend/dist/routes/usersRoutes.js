import express from 'express';
import { getUsers, createUser, getUser, updateUser, changeUserStatus, deleteUser, } from '../controllers/usersController.js';
import { getRoles } from '../controllers/rolesController.js';
import { requireAuth, addUserContext, } from '../auth/middlewareAuth.js';
import { requireAdmin, requirePermissions, } from '../auth/middlewareRBAC.js';
import { sensitiveRateLimit } from '../middlewares/security.js';
const router = express.Router();
router.use(requireAuth);
router.use(addUserContext);
router.get('/', requirePermissions('users.read'), getUsers);
router.post('/', sensitiveRateLimit, requirePermissions('users.create'), createUser);
router.get('/:id', requirePermissions('users.read'), getUser);
router.put('/:id', sensitiveRateLimit, requirePermissions('users.update'), updateUser);
router.patch('/:id/estado', sensitiveRateLimit, requirePermissions('users.update'), changeUserStatus);
router.delete('/:id', sensitiveRateLimit, requirePermissions('users.delete'), deleteUser);
router.get('/catalogo/roles', requireAdmin, getRoles);
export default router;
//# sourceMappingURL=usersRoutes.js.map