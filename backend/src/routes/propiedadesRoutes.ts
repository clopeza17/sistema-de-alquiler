import express from 'express'
import { addUserContext, requireAuth } from '../auth/middlewareAuth.js'
import { requireRoles } from '../auth/middlewareRBAC.js'
import { listPropiedades, createPropiedad, getPropiedad, updatePropiedad, changeEstadoPropiedad, deletePropiedad } from '../controllers/propiedadesController.js'

const router = express.Router()

router.use(requireAuth)
router.use(addUserContext)

router.get('/', requireRoles('ADMIN','OPER'), listPropiedades)
router.post('/', requireRoles('ADMIN','OPER'), createPropiedad)
router.get('/:id', requireRoles('ADMIN','OPER'), getPropiedad)
router.put('/:id', requireRoles('ADMIN','OPER'), updatePropiedad)
router.patch('/:id/estado', requireRoles('ADMIN','OPER'), changeEstadoPropiedad)
router.delete('/:id', requireRoles('ADMIN'), deletePropiedad)

export default router
