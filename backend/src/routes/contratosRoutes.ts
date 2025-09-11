import { Router } from 'express';
import { 
  getContratos,
  getContrato,
  createContrato,
  updateContrato,
  deleteContrato,
  finalizarContrato,
  renovarContrato,
  getFacturasContrato
} from '../controllers/contratosController.js';
import { requireAuth } from '../auth/middlewareAuth.js';
import { requireRoles } from '../auth/middlewareRBAC.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

/**
 * GET /api/v1/contratos - Obtener lista de contratos
 * Acceso: ADMIN, OPERADOR
 */
router.get('/', 
  requireRoles('ADMIN', 'AGENTE'),
  getContratos
);

/**
 * GET /api/v1/contratos/:id - Obtener contrato por ID
 * Acceso: ADMIN, AGENTE
 */
router.get('/:id', 
  requireRoles('ADMIN', 'AGENTE'),
  getContrato
);

/**
 * POST /api/v1/contratos - Crear nuevo contrato
 * Acceso: ADMIN, AGENTE
 */
router.post('/', 
  requireRoles('ADMIN', 'AGENTE'),
  createContrato
);

/**
 * PUT /api/v1/contratos/:id - Actualizar contrato
 * Acceso: ADMIN, AGENTE
 */
router.put('/:id', 
  requireRoles('ADMIN', 'AGENTE'),
  updateContrato
);

/**
 * PUT /api/v1/contratos/:id/finalizar - Finalizar contrato
 * Acceso: ADMIN, AGENTE
 */
router.put('/:id/finalizar', 
  requireRoles('ADMIN', 'AGENTE'),
  finalizarContrato
);

/**
 * PUT /api/v1/contratos/:id/renovar - Renovar contrato
 * Acceso: ADMIN, AGENTE
 */
router.put('/:id/renovar', 
  requireRoles('ADMIN', 'AGENTE'),
  renovarContrato
);

/**
 * GET /api/v1/contratos/:id/facturas - Obtener facturas del contrato
 * Acceso: ADMIN, AGENTE
 */
router.get('/:id/facturas', 
  requireRoles('ADMIN', 'AGENTE'),
  getFacturasContrato
);

/**
 * DELETE /api/v1/contratos/:id - Eliminar contrato
 * Acceso: ADMIN solamente
 */
router.delete('/:id', 
  requireRoles('ADMIN'),
  deleteContrato
);

export default router;
