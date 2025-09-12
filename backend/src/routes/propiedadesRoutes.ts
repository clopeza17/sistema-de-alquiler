import express from 'express'
import { addUserContext, requireAuth } from '../auth/middlewareAuth.js'
import { listPropiedades, createPropiedad, getPropiedad, updatePropiedad, changeEstadoPropiedad, deletePropiedad } from '../controllers/propiedadesController.js'

const router = express.Router()

router.use(requireAuth)
router.use(addUserContext)

router.get('/', listPropiedades)
router.post('/', createPropiedad)
router.get('/:id', getPropiedad)
router.put('/:id', updatePropiedad)
router.patch('/:id/estado', changeEstadoPropiedad)
router.delete('/:id', deletePropiedad)

export default router

