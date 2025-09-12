import express from 'express'
import { addUserContext, requireAuth } from '../auth/middlewareAuth.js'
import { listInquilinos, createInquilino, getInquilino, updateInquilino, changeEstadoInquilino, deleteInquilino } from '../controllers/inquilinosController.js'

const router = express.Router()

router.use(requireAuth)
router.use(addUserContext)

router.get('/', listInquilinos)
router.post('/', createInquilino)
router.get('/:id', getInquilino)
router.put('/:id', updateInquilino)
router.patch('/:id/estado', changeEstadoInquilino)
router.delete('/:id', deleteInquilino)

export default router

