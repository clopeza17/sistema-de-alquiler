-- Datos sintéticos para medir las dos consultas críticas con el volumen definido en E1.
-- Ejecutar en el esquema QA y con una cuenta de pruebas qa-acs@example.invalid ya creada.
START TRANSACTION;

INSERT IGNORE INTO propiedades (codigo, titulo, direccion, renta_mensual, estado)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 100)
SELECT CONCAT('ACS-LT-', LPAD(i, 3, '0')), CONCAT('Propiedad sintética ', i),
       'Dirección sintética de QA', 1000, 'OCUPADA'
FROM n;

INSERT IGNORE INTO inquilinos (nombre_completo, correo)
WITH RECURSIVE n AS (SELECT 1 AS i UNION ALL SELECT i+1 FROM n WHERE i < 100)
SELECT CONCAT('Inquilino sintético ', i), CONCAT('acs-lt-', LPAD(i, 3, '0'), '@example.invalid')
FROM n;

-- Separar la selección porque el trigger de contratos actualiza propiedades.
CREATE TEMPORARY TABLE acs_lt_contratos AS
SELECT p.id AS propiedad_id, i.id AS inquilino_id, u.id AS creado_por
FROM propiedades p
JOIN inquilinos i ON i.correo = CONCAT('acs-lt-', RIGHT(p.codigo, 3), '@example.invalid')
JOIN usuarios u ON u.correo = 'qa-acs@example.invalid'
WHERE p.codigo LIKE 'ACS-LT-%'
  AND NOT EXISTS (SELECT 1 FROM contratos c WHERE c.propiedad_id = p.id);

INSERT INTO contratos (propiedad_id, inquilino_id, fecha_inicio, fecha_fin, renta_mensual, estado, creado_por)
SELECT propiedad_id, inquilino_id, '2026-01-01', '2028-12-31', 1000, 'ACTIVO', creado_por
FROM acs_lt_contratos;
DROP TEMPORARY TABLE acs_lt_contratos;

INSERT IGNORE INTO facturas (
  contrato_id, anio_periodo, mes_periodo, fecha_emision, fecha_vencimiento,
  detalle, monto_total, saldo_pendiente, estado
)
SELECT c.id, 2026, 11, '2026-11-01', '2026-11-08', 'Factura sintética QA',
       c.renta_mensual, c.renta_mensual, 'ABIERTA'
FROM contratos c
JOIN propiedades p ON p.id = c.propiedad_id
WHERE p.codigo LIKE 'ACS-LT-%';

COMMIT;

SELECT 'propiedades', COUNT(*) FROM propiedades WHERE codigo LIKE 'ACS-LT-%'
UNION ALL
SELECT 'inquilinos', COUNT(*) FROM inquilinos WHERE correo LIKE 'acs-lt-%@example.invalid'
UNION ALL
SELECT 'contratos', COUNT(*) FROM contratos c JOIN propiedades p ON p.id = c.propiedad_id WHERE p.codigo LIKE 'ACS-LT-%'
UNION ALL
SELECT 'facturas', COUNT(*) FROM facturas f JOIN contratos c ON c.id = f.contrato_id
JOIN propiedades p ON p.id = c.propiedad_id WHERE p.codigo LIKE 'ACS-LT-%' AND f.anio_periodo = 2026 AND f.mes_periodo = 11;
