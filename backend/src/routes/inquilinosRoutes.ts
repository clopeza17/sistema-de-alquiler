import express from 'express'
import { addUserContext, requireAuth } from '../auth/middlewareAuth.js'
import { requireRoles } from '../auth/middlewareRBAC.js'
import { listInquilinos, createInquilino, getInquilino, updateInquilino, changeEstadoInquilino, deleteInquilino } from '../controllers/inquilinosController.js'

const router = express.Router()

router.use(requireAuth)
router.use(addUserContext)

router.get('/', requireRoles('ADMIN','OPER'), listInquilinos)
router.post('/', requireRoles('ADMIN','OPER'), createInquilino)
router.get('/:id', requireRoles('ADMIN','OPER'), getInquilino)
router.put('/:id', requireRoles('ADMIN','OPER'), updateInquilino)
router.patch('/:id/estado', requireRoles('ADMIN','OPER'), changeEstadoInquilino)
router.delete('/:id', requireRoles('ADMIN'), deleteInquilino)

export default router
