import { Request, Response } from 'express'
import { pool } from '../config/db.js'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { createDbLogger } from '../config/logger.js'
import { BadRequestError, NotFoundError } from '../common/errors.js'
import { idSchema, paginationSchema, inquilinoCreateSchema, inquilinoUpdateSchema } from '../common/validators.js'

const logger = createDbLogger()

interface InqRow extends RowDataPacket {
  id: number
  doc_identidad: string | null
  nombre_completo: string
  telefono: string | null
  correo: string | null
  direccion: string | null
  activo: number
  creado_el: Date
  actualizado_el: Date
}

export const listInquilinos = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const offset = (page - 1) * limit

  const where: string[] = []
  const params: any[] = []
  if (search) {
    where.push('(i.nombre_completo LIKE ? OR i.correo LIKE ? OR i.doc_identidad LIKE ?)')
    const p = `%${search}%`
    params.push(p, p, p)
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countSql = `SELECT COUNT(*) as total FROM inquilinos i ${whereClause}`
  const [countRows] = await pool.execute<RowDataPacket[]>(countSql, params)
  const total = Number(countRows[0].total) || 0

  const dataSql = `
    SELECT i.id, i.doc_identidad, i.nombre_completo, i.telefono, i.correo, i.direccion, i.activo, i.creado_el, i.actualizado_el
    FROM inquilinos i
    ${whereClause}
    ORDER BY i.creado_el DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  const [rows] = await pool.execute<InqRow[]>(dataSql, params)

  res.json({
    message: 'Inquilinos obtenidos',
    data: {
      items: rows.map(r => ({
        id: r.id,
        doc_identidad: r.doc_identidad,
        nombre_completo: r.nombre_completo,
        telefono: r.telefono,
        correo: r.correo,
        direccion: r.direccion,
        activo: r.activo === 1,
        creado_el: r.creado_el,
        actualizado_el: r.actualizado_el,
      })),
      total,
      page,
      limit,
    },
  })
})

export const createInquilino = asyncHandler(async (req: Request, res: Response) => {
  const data = inquilinoCreateSchema.parse(req.body)

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO inquilinos (doc_identidad, nombre_completo, telefono, correo, direccion, activo, creado_el, actualizado_el)
     VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [data.doc_identidad || null, data.nombre_completo, data.telefono || null, data.correo || null, data.direccion || null]
  )

  res.status(201).json({
    message: 'Inquilino creado',
    data: { id: result.insertId },
  })
})

export const getInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const [rows] = await pool.execute<InqRow[]>(`SELECT * FROM inquilinos WHERE id = ?`, [id])
  if (rows.length === 0) throw new NotFoundError('Inquilino no encontrado')
  const r = rows[0]
  res.json({
    message: 'Inquilino obtenido',
    data: {
      id: r.id,
      doc_identidad: r.doc_identidad,
      nombre_completo: r.nombre_completo,
      telefono: r.telefono,
      correo: r.correo,
      direccion: r.direccion,
      activo: r.activo === 1,
      creado_el: r.creado_el,
      actualizado_el: r.actualizado_el,
    },
  })
})

export const updateInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const data = inquilinoUpdateSchema.parse(req.body)

  const [exists] = await pool.execute<RowDataPacket[]>(`SELECT id FROM inquilinos WHERE id = ?`, [id])
  if ((exists as any).length === 0) throw new NotFoundError('Inquilino no encontrado')

  const fields: string[] = []
  const values: any[] = []
  if (data.doc_identidad !== undefined) { fields.push('doc_identidad = ?'); values.push(data.doc_identidad || null) }
  if (data.nombre_completo !== undefined) { fields.push('nombre_completo = ?'); values.push(data.nombre_completo) }
  if (data.telefono !== undefined) { fields.push('telefono = ?'); values.push(data.telefono || null) }
  if (data.correo !== undefined) { fields.push('correo = ?'); values.push(data.correo || null) }
  if (data.direccion !== undefined) { fields.push('direccion = ?'); values.push(data.direccion || null) }

  if (fields.length === 0) throw new BadRequestError('No hay cambios para actualizar')
  fields.push('actualizado_el = NOW()')
  values.push(id)
  await pool.execute(`UPDATE inquilinos SET ${fields.join(', ')} WHERE id = ?`, values)

  res.json({ message: 'Inquilino actualizado', data: { id } })
})

export const changeEstadoInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const body = req.body as any
  const activo = typeof body.activo === 'boolean' ? body.activo : undefined
  if (activo === undefined) throw new BadRequestError('Campo "activo" requerido')
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT activo FROM inquilinos WHERE id = ?`, [id])
  if (rows.length === 0) throw new NotFoundError('Inquilino no encontrado')
  await pool.execute(`UPDATE inquilinos SET activo = ?, actualizado_el = NOW() WHERE id = ?`, [activo ? 1 : 0, id])
  res.json({ message: 'Estado actualizado', data: { id, activo } })
})

export const deleteInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT id FROM inquilinos WHERE id = ?`, [id])
  if (rows.length === 0) throw new NotFoundError('Inquilino no encontrado')
  await pool.execute(`UPDATE inquilinos SET activo = 0, actualizado_el = NOW() WHERE id = ?`, [id])
  res.json({ message: 'Inquilino eliminado', data: { id } })
})

export default {
  listInquilinos,
  createInquilino,
  getInquilino,
  updateInquilino,
  changeEstadoInquilino,
  deleteInquilino,
}

