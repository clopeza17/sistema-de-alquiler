import { Request, Response } from 'express'
import { pool } from '../config/db.js'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { createDbLogger } from '../config/logger.js'
import { BadRequestError, NotFoundError } from '../common/errors.js'
import { idSchema, paginationSchema, propiedadCreateSchema, propiedadUpdateSchema } from '../common/validators.js'

const logger = createDbLogger()

interface PropRow extends RowDataPacket {
  id: number
  codigo: string
  tipo: 'APARTAMENTO' | 'CASA' | 'ESTUDIO' | 'OTRO'
  titulo: string
  direccion: string
  dormitorios: number
  banos: number
  area_m2: number | null
  renta_mensual: number
  deposito: number
  estado: 'DISPONIBLE' | 'OCUPADA' | 'MANTENIMIENTO' | 'INACTIVA'
  notas: string | null
  creado_el: Date
  actualizado_el: Date
}

export const listPropiedades = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query)
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const offset = (page - 1) * limit

  const where: string[] = []
  const params: any[] = []
  if (search) {
    where.push('(p.codigo LIKE ? OR p.titulo LIKE ? OR p.direccion LIKE ?)')
    const p = `%${search}%`
    params.push(p, p, p)
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const [countRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) as total FROM propiedades p ${whereClause}`, params)
  const total = Number(countRows[0].total) || 0

  const [rows] = await pool.execute<PropRow[]>(
    `SELECT p.* FROM propiedades p ${whereClause} ORDER BY p.creado_el DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  res.json({
    message: 'Propiedades obtenidas',
    data: { items: rows, total, page, limit },
  })
})

function sanitizePropiedadPayload(body: any) {
  const normalizeString = (value: any) => {
    if (value === undefined || value === null) return undefined
    const trimmed = String(value).trim()
    return trimmed === '' ? undefined : trimmed
  }

  const normalizeNumber = (value: any) => {
    if (value === undefined || value === null || value === '') return undefined
    const num = Number(value)
    return Number.isNaN(num) ? undefined : num
  }

  return {
    codigo: normalizeString(body.codigo),
    tipo: normalizeString(body.tipo),
    titulo: normalizeString(body.titulo),
    direccion: normalizeString(body.direccion),
    dormitorios: normalizeNumber(body.dormitorios),
    banos: normalizeNumber(body.banos),
    area_m2: normalizeNumber(body.area_m2),
    renta_mensual: normalizeNumber(body.renta_mensual),
    deposito: normalizeNumber(body.deposito),
    notas: normalizeString(body.notas),
  }
}

export const createPropiedad = asyncHandler(async (req: Request, res: Response) => {
  const sanitized = sanitizePropiedadPayload(req.body)
  const data = propiedadCreateSchema.parse(sanitized)

  const [dup] = await pool.execute<RowDataPacket[]>(`SELECT id FROM propiedades WHERE codigo = ?`, [data.codigo])
  if (dup.length > 0) throw new BadRequestError('Código de propiedad ya existe')

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO propiedades (codigo, tipo, titulo, direccion, dormitorios, banos, area_m2, renta_mensual, deposito, estado, notas, creado_el, actualizado_el)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DISPONIBLE', NULL, NOW(), NOW())`,
    [
      data.codigo,
      data.tipo,
      data.titulo,
      data.direccion,
      data.dormitorios ?? 0,
      data.banos ?? 0,
      data.area_m2 ?? null,
      data.renta_mensual,
      data.deposito ?? 0,
    ]
  )

  res.status(201).json({ message: 'Propiedad creada', data: { id: result.insertId } })
})

export const getPropiedad = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const [rows] = await pool.execute<PropRow[]>(`SELECT * FROM propiedades WHERE id = ?`, [id])
  if (rows.length === 0) throw new NotFoundError('Propiedad no encontrada')
  res.json({ message: 'Propiedad obtenida', data: rows[0] })
})

export const updatePropiedad = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const sanitized = sanitizePropiedadPayload(req.body)
  const data = propiedadUpdateSchema.parse(sanitized)

  const [exists] = await pool.execute<RowDataPacket[]>(`SELECT id FROM propiedades WHERE id = ?`, [id])
  if (exists.length === 0) throw new NotFoundError('Propiedad no encontrada')

  const fields: string[] = []
  const values: any[] = []
  if (data.codigo !== undefined) { fields.push('codigo = ?'); values.push(data.codigo) }
  if (data.tipo !== undefined) { fields.push('tipo = ?'); values.push(data.tipo) }
  if (data.titulo !== undefined) { fields.push('titulo = ?'); values.push(data.titulo) }
  if (data.direccion !== undefined) { fields.push('direccion = ?'); values.push(data.direccion) }
  if (data.dormitorios !== undefined) { fields.push('dormitorios = ?'); values.push(data.dormitorios ?? 0) }
  if (data.banos !== undefined) { fields.push('banos = ?'); values.push(data.banos ?? 0) }
  if (data.area_m2 !== undefined) { fields.push('area_m2 = ?'); values.push(data.area_m2 ?? null) }
  if (data.renta_mensual !== undefined) { fields.push('renta_mensual = ?'); values.push(data.renta_mensual) }
  if (data.deposito !== undefined) { fields.push('deposito = ?'); values.push(data.deposito ?? 0) }
  if (data.notas !== undefined) { fields.push('notas = ?'); values.push(data.notas ?? null) }

  if (fields.length === 0) throw new BadRequestError('No hay cambios')
  fields.push('actualizado_el = NOW()')
  values.push(id)
  await pool.execute(`UPDATE propiedades SET ${fields.join(', ')} WHERE id = ?`, values)
  res.json({ message: 'Propiedad actualizada', data: { id } })
})

export const changeEstadoPropiedad = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const estado = String((req.body as any)?.estado || '')
  if (!['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO', 'INACTIVA'].includes(estado)) throw new BadRequestError('Estado inválido')
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT id FROM propiedades WHERE id = ?`, [id])
  if (rows.length === 0) throw new NotFoundError('Propiedad no encontrada')
  await pool.execute(`UPDATE propiedades SET estado = ?, actualizado_el = NOW() WHERE id = ?`, [estado, id])
  res.json({ message: 'Estado actualizado', data: { id, estado } })
})

export const deletePropiedad = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id)
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT id FROM propiedades WHERE id = ?`, [id])
  if (rows.length === 0) throw new NotFoundError('Propiedad no encontrada')
  await pool.execute(`UPDATE propiedades SET estado = 'INACTIVA', actualizado_el = NOW() WHERE id = ?`, [id])
  res.json({ message: 'Propiedad eliminada', data: { id } })
})

export default {
  listPropiedades,
  createPropiedad,
  getPropiedad,
  updatePropiedad,
  changeEstadoPropiedad,
  deletePropiedad,
}
