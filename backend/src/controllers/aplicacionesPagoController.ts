import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';

import { pool } from '../config/db.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
import { ConflictError, NotFoundError } from '../common/errors.js';
import { idSchema, amountSchema } from '../common/validators.js';

const logger = createDbLogger();

const aplicarPagoSchema = z.object({
  factura_id: z.coerce.number().int().positive('Factura inválida'),
  monto_aplicado: amountSchema.refine((v) => v > 0, 'Monto debe ser mayor a 0'),
});

interface FacturaRow extends RowDataPacket {
  id: number;
  saldo_pendiente: number;
  estado: 'ABIERTA' | 'PARCIAL' | 'PAGADA' | 'VENCIDA' | 'ANULADA';
}

interface PagoRow extends RowDataPacket {
  id: number;
  saldo_no_aplicado: number;
}

export const aplicarPago = asyncHandler(async (req: Request, res: Response) => {
  const pagoId = idSchema.parse(req.params.id);
  const payload = aplicarPagoSchema.parse(req.body);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Leer pago y factura con FOR UPDATE para evitar condiciones de carrera
    const [pagoRows] = await connection.execute<PagoRow[]>(
      'SELECT id, saldo_no_aplicado FROM pagos WHERE id = ? FOR UPDATE',
      [pagoId],
    );
    const pago = pagoRows[0];
    if (!pago) throw new NotFoundError('Pago no encontrado');

    const [facturaRows] = await connection.execute<FacturaRow[]>(
      'SELECT id, saldo_pendiente, estado FROM facturas WHERE id = ? FOR UPDATE',
      [payload.factura_id],
    );
    const factura = facturaRows[0];
    if (!factura) throw new NotFoundError('Factura no encontrada');
    if (factura.estado === 'ANULADA') {
      throw new ConflictError('No se puede aplicar a una factura anulada');
    }

    if (payload.monto_aplicado > pago.saldo_no_aplicado) {
      throw new ConflictError('Monto excede el saldo no aplicado del pago');
    }
    if (payload.monto_aplicado > factura.saldo_pendiente) {
      throw new ConflictError('Monto excede el saldo pendiente de la factura');
    }

    // Insertar aplicación
    await connection.execute(
      `INSERT INTO aplicaciones_pago (pago_id, factura_id, monto_aplicado)
       VALUES (?, ?, ?)`,
      [pagoId, payload.factura_id, payload.monto_aplicado],
    );

    // Actualizar saldos
    const nuevoSaldoPago = +(pago.saldo_no_aplicado - payload.monto_aplicado).toFixed(2);
    await connection.execute(
      'UPDATE pagos SET saldo_no_aplicado = ? WHERE id = ?',
      [nuevoSaldoPago, pagoId],
    );

    const nuevoSaldoFactura = +(factura.saldo_pendiente - payload.monto_aplicado).toFixed(2);
    const nuevoEstadoFactura = nuevoSaldoFactura <= 0 ? 'PAGADA' : 'PARCIAL';
    await connection.execute(
      `UPDATE facturas SET saldo_pendiente = ?, estado = ?, actualizado_el = NOW() WHERE id = ?`,
      [nuevoSaldoFactura, nuevoEstadoFactura, payload.factura_id],
    );

    await connection.commit();

    await auditAction(req, 'UPDATE', 'INVOICE', payload.factura_id, {
      pago_id: pagoId,
      aplicado: payload.monto_aplicado,
    });

    res.status(201).json({
      message: 'Pago aplicado exitosamente',
      data: {
        pago_id: pagoId,
        factura_id: payload.factura_id,
        monto_aplicado: payload.monto_aplicado,
      },
    });
  } catch (error) {
    await connection.rollback();
    logger.error({ error, payload, pagoId }, 'Error al aplicar pago');
    throw error;
  } finally {
    connection.release();
  }
});

export const listarAplicacionesDePago = asyncHandler(async (req: Request, res: Response) => {
  const pagoId = idSchema.parse(req.params.id);
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ap.id, ap.factura_id, ap.monto_aplicado, f.estado AS factura_estado
     FROM aplicaciones_pago ap
     INNER JOIN facturas f ON f.id = ap.factura_id
     WHERE ap.pago_id = ?
     ORDER BY ap.id DESC`,
    [pagoId],
  );
  await auditAction(req, 'READ', 'PAYMENT', pagoId, { tipo: 'aplicaciones' });
  res.json({ data: rows });
});

export const revertirAplicacion = asyncHandler(async (req: Request, res: Response) => {
  const pagoId = idSchema.parse(req.params.id);
  const aplId = idSchema.parse(req.params.aplId);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [aplRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, pago_id, factura_id, monto_aplicado FROM aplicaciones_pago WHERE id = ? AND pago_id = ? FOR UPDATE',
      [aplId, pagoId],
    );
    const apl = (aplRows as any[])[0];
    if (!apl) throw new NotFoundError('Aplicación no encontrada');

    const [pagoRows] = await connection.execute<PagoRow[]>(
      'SELECT id, saldo_no_aplicado FROM pagos WHERE id = ? FOR UPDATE',
      [pagoId],
    );
    const pago = pagoRows[0];
    if (!pago) throw new NotFoundError('Pago no encontrado');

    const [facturaRows] = await connection.execute<FacturaRow[]>(
      'SELECT id, saldo_pendiente, estado FROM facturas WHERE id = ? FOR UPDATE',
      [apl.factura_id],
    );
    const factura = facturaRows[0];
    if (!factura) throw new NotFoundError('Factura no encontrada');

    // Revertir saldos
    const nuevoSaldoPago = +(pago.saldo_no_aplicado + apl.monto_aplicado).toFixed(2);
    await connection.execute('UPDATE pagos SET saldo_no_aplicado = ? WHERE id = ?', [nuevoSaldoPago, pagoId]);

    const nuevoSaldoFactura = +(factura.saldo_pendiente + apl.monto_aplicado).toFixed(2);
    const nuevoEstadoFactura = nuevoSaldoFactura > 0 ? 'PARCIAL' : 'PAGADA';
    await connection.execute(
      'UPDATE facturas SET saldo_pendiente = ?, estado = ?, actualizado_el = NOW() WHERE id = ?',
      [nuevoSaldoFactura, nuevoEstadoFactura, apl.factura_id],
    );

    // Eliminar aplicación
    await connection.execute('DELETE FROM aplicaciones_pago WHERE id = ?', [aplId]);

    await connection.commit();

    await auditAction(req, 'UPDATE', 'INVOICE', apl.factura_id, {
      pago_id: pagoId,
      revertido: apl.monto_aplicado,
    });

    res.json({ message: 'Aplicación revertida' });
  } catch (error) {
    await connection.rollback();
    logger.error({ error, pagoId, aplId }, 'Error al revertir aplicación');
    throw error;
  } finally {
    connection.release();
  }
});

