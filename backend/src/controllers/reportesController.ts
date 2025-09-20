import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';

const logger = createDbLogger();

export const reporteCXC = asyncHandler(async (req: Request, res: Response) => {
  const { contrato_id } = req.query;
  let query = 'SELECT * FROM v_resumen_cxc';
  const params: any[] = [];
  if (contrato_id) {
    query += ' WHERE contrato_id = ?';
    params.push(Number(contrato_id));
  }
  query += ' ORDER BY saldo_pendiente DESC';

  const [rows] = await pool.execute<RowDataPacket[]>(query, params);
  await auditAction(req, 'READ', 'INVOICE', undefined, { reporte: 'cxc', contrato_id });
  res.json({ data: rows });
  logger.info({ total: (rows as any[]).length }, 'Reporte CxC generado');
});

export const reporteRentabilidad = asyncHandler(async (_req: Request, res: Response) => {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM v_rentabilidad_propiedad ORDER BY utilidad DESC');
  await auditAction(_req, 'READ', 'PROPERTY', undefined, { reporte: 'rentabilidad' });
  res.json({ data: rows });
});

export const reporteOcupacion = asyncHandler(async (_req: Request, res: Response) => {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM v_ocupacion ORDER BY estado, propiedad_codigo');
  await auditAction(_req, 'READ', 'PROPERTY', undefined, { reporte: 'ocupacion' });
  res.json({ data: rows });
});

export const kpis = asyncHandler(async (_req: Request, res: Response) => {
  const [propRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total_propiedades FROM propiedades'
  );
  const total_propiedades = Number(propRows[0]?.total_propiedades || 0);

  const [ocupRows] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS ocupadas FROM propiedades WHERE estado <> 'DISPONIBLE'"
  );
  const ocupadas = Number(ocupRows[0]?.ocupadas || 0);

  const [contrRows] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS contratos_activos FROM contratos WHERE estado = 'ACTIVO'"
  );
  const contratos_activos = Number(contrRows[0]?.contratos_activos || 0);

  const [factRows] = await pool.execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS facturas_vencidas FROM facturas WHERE estado = 'VENCIDA'"
  );
  const facturas_vencidas = Number(factRows[0]?.facturas_vencidas || 0);

  const data = {
    total_propiedades,
    ocupadas,
    contratos_activos,
    facturas_vencidas,
    ocupacion_pct: total_propiedades ? Number(((ocupadas / total_propiedades) * 100).toFixed(2)) : 0,
  };

  await auditAction(_req, 'READ', 'PROPERTY', undefined, { reporte: 'kpis' });
  res.json({ data });
});
