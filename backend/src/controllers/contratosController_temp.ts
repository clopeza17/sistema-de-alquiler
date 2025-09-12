import { Request, Response } from 'express';
import { pool } from '../config/db.js';

export const getContratos = async (_req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = _req.query;
    const offset = (page - 1) * limit;
    
    const [rows] = await pool.execute(`
      SELECT c.*, p.direccion, i.nombre as inquilino_nombre
      FROM contratos c
      LEFT JOIN propiedades p ON c.propiedad_id = p.id
      LEFT JOIN inquilinos i ON c.inquilino_id = i.id
      ORDER BY c.creado_el DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: rows.length
      }
    });
    
  } catch (error) {
    console.error('Error al listar contratos', error);
    throw error;
  }
};
