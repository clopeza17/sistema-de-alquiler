
-- =========================================================
-- ERP DE ALQUILER - ESQUEMA COMPLETO EN ESPAÑOL (MySQL 8 / MariaDB 10.4+)
-- Fecha: 2025-09-09
-- =========================================================

SET NAMES utf8mb4;
SET time_zone = '-06:00';

CREATE DATABASE IF NOT EXISTS sistema_alquiler
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish2_ci;

USE sistema_alquiler;

-- =========================================================
-- 1) Seguridad / Autorización
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(32) NOT NULL COMMENT 'Código del rol (ADMIN, OPER)',
  nombre VARCHAR(80) NOT NULL COMMENT 'Nombre legible del rol',
  descripcion VARCHAR(255) NULL COMMENT 'Descripción opcional del rol',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de roles del sistema';

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  correo VARCHAR(180) NOT NULL COMMENT 'Correo único del usuario',
  contrasena_hash VARCHAR(255) NOT NULL COMMENT 'Hash de la contraseña',
  nombre_completo VARCHAR(120) NOT NULL COMMENT 'Nombre completo',
  activo TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Activo, 0=Inactivo',
  ultimo_acceso_el DATETIME NULL COMMENT 'Último acceso',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuarios del sistema';

CREATE TABLE IF NOT EXISTS usuarios_roles (
  usuario_id BIGINT UNSIGNED NOT NULL,
  rol_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (usuario_id, rol_id),
  CONSTRAINT fk_usuarios_roles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_usuarios_roles_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relación N:M entre usuarios y roles';

-- =========================================================
-- 2) Catálogos
-- =========================================================

CREATE TABLE IF NOT EXISTS tipos_gasto (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL COMMENT 'Nombre del gasto: Agua, Luz, Basura, etc.',
  descripcion VARCHAR(255) NULL COMMENT 'Descripción opcional',
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipos_gasto_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tipos de gasto fijo por propiedad';

CREATE TABLE IF NOT EXISTS formas_pago (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(32) NOT NULL COMMENT 'Código del método: EFECTIVO, TRF, TDC, CHEQ',
  nombre VARCHAR(80) NOT NULL COMMENT 'Nombre legible del método',
  PRIMARY KEY (id),
  UNIQUE KEY uq_formas_pago_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Métodos de pago aceptados';

-- =========================================================
-- 3) Entidades de negocio
-- =========================================================

CREATE TABLE IF NOT EXISTS inquilinos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  doc_identidad VARCHAR(40) NULL COMMENT 'DPI/NIT/Pasaporte (opcional, único)',
  nombre_completo VARCHAR(140) NOT NULL COMMENT 'Nombre completo del inquilino',
  telefono VARCHAR(30) NULL COMMENT 'Teléfono',
  correo VARCHAR(120) NULL COMMENT 'Correo (único opcional)',
  direccion VARCHAR(255) NULL COMMENT 'Dirección',
  activo TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Activo, 0=Inactivo',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inquilinos_doc (doc_identidad),
  UNIQUE KEY uq_inquilinos_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inquilinos';

CREATE TABLE IF NOT EXISTS propiedades (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo VARCHAR(40) NOT NULL COMMENT 'Código interno: PROP-0001',
  tipo ENUM('APARTAMENTO','CASA','ESTUDIO','OTRO') NOT NULL DEFAULT 'APARTAMENTO' COMMENT 'Tipo de inmueble',
  titulo VARCHAR(160) NOT NULL COMMENT 'Título o nombre comercial',
  direccion VARCHAR(255) NOT NULL COMMENT 'Dirección',
  dormitorios TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Cantidad de dormitorios',
  banos TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Cantidad de baños',
  area_m2 DECIMAL(10,2) NULL COMMENT 'Área en m²',
  renta_mensual DECIMAL(12,2) NOT NULL COMMENT 'Renta mensual de lista',
  deposito DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Depósito referencial',
  estado ENUM('DISPONIBLE','OCUPADA','MANTENIMIENTO','INACTIVA') NOT NULL DEFAULT 'DISPONIBLE' COMMENT 'Estado actual',
  notas TEXT NULL COMMENT 'Notas generales',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_propiedades_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Propiedades en administración';

CREATE TABLE IF NOT EXISTS imagenes_propiedad (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  propiedad_id BIGINT UNSIGNED NOT NULL,
  url VARCHAR(400) NOT NULL COMMENT 'URL pública o relativa de la imagen',
  principal TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=Imagen principal',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_imagenes_propiedad_prop (propiedad_id),
  CONSTRAINT fk_imagenes_propiedad_prop FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Imágenes por propiedad';

CREATE TABLE IF NOT EXISTS contratos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  propiedad_id BIGINT UNSIGNED NOT NULL,
  inquilino_id BIGINT UNSIGNED NOT NULL,
  fecha_inicio DATE NOT NULL COMMENT 'Fecha de inicio del contrato',
  fecha_fin DATE NOT NULL COMMENT 'Fecha de finalización',
  renta_mensual DECIMAL(12,2) NOT NULL COMMENT 'Renta pactada (puede diferir del listado)',
  deposito DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Depósito pactado',
  estado ENUM('ACTIVO','FINALIZADO','CANCELADO','PENDIENTE') NOT NULL DEFAULT 'ACTIVO' COMMENT 'Estado del contrato',
  creado_por BIGINT UNSIGNED NOT NULL COMMENT 'Usuario que registró el contrato',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contratos_periodo (fecha_inicio, fecha_fin),
  KEY idx_contratos_propiedad (propiedad_id),
  KEY idx_contratos_inquilino (inquilino_id),
  CONSTRAINT fk_contrato_propiedad FOREIGN KEY (propiedad_id) REFERENCES propiedades(id),
  CONSTRAINT fk_contrato_inquilino FOREIGN KEY (inquilino_id) REFERENCES inquilinos(id),
  CONSTRAINT fk_contrato_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contratos por propiedad e inquilino';

CREATE TABLE IF NOT EXISTS facturas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contrato_id BIGINT UNSIGNED NOT NULL,
  anio_periodo SMALLINT NOT NULL COMMENT 'Año del periodo (YYYY)',
  mes_periodo TINYINT NOT NULL COMMENT 'Mes del periodo (1..12)',
  fecha_emision DATE NOT NULL COMMENT 'Fecha de emisión',
  fecha_vencimiento DATE NOT NULL COMMENT 'Fecha de vencimiento',
  numero_factura VARCHAR(40) NULL COMMENT 'Número fiscal/serie si aplica',
  nit VARCHAR(30) NULL COMMENT 'NIT/DPI receptor si aplica',
  detalle VARCHAR(200) NOT NULL COMMENT 'Detalle del cargo (renta mes X)',
  monto_total DECIMAL(12,2) NOT NULL COMMENT 'Monto total del cargo',
  saldo_pendiente DECIMAL(12,2) NOT NULL COMMENT 'Saldo pendiente (se actualiza con pagos)',
  estado ENUM('ABIERTA','PARCIAL','PAGADA','VENCIDA','ANULADA') NOT NULL DEFAULT 'ABIERTA' COMMENT 'Estado del cobro',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_factura_periodo (contrato_id, anio_periodo, mes_periodo),
  KEY idx_facturas_estado_venc (estado, fecha_vencimiento),
  CONSTRAINT fk_factura_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cuentas por cobrar mensuales por contrato';

CREATE TABLE IF NOT EXISTS pagos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contrato_id BIGINT UNSIGNED NOT NULL,
  forma_pago_id BIGINT UNSIGNED NOT NULL,
  fecha_pago DATE NOT NULL COMMENT 'Fecha de pago',
  referencia VARCHAR(80) NULL COMMENT 'Referencia (boleta, transferencia, etc.)',
  monto DECIMAL(12,2) NOT NULL COMMENT 'Monto del pago',
  saldo_no_aplicado DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Saldo no aplicado (crédito)',
  notas VARCHAR(255) NULL COMMENT 'Notas adicionales',
  creado_por BIGINT UNSIGNED NOT NULL COMMENT 'Usuario que registró el pago',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pagos_fecha (fecha_pago),
  CONSTRAINT fk_pago_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  CONSTRAINT fk_pago_forma FOREIGN KEY (forma_pago_id) REFERENCES formas_pago(id),
  CONSTRAINT fk_pago_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pagos recibidos';

CREATE TABLE IF NOT EXISTS aplicaciones_pago (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pago_id BIGINT UNSIGNED NOT NULL,
  factura_id BIGINT UNSIGNED NOT NULL,
  monto_aplicado DECIMAL(12,2) NOT NULL COMMENT 'Monto aplicado a la factura',
  PRIMARY KEY (id),
  UNIQUE KEY uq_aplicacion_unica (pago_id, factura_id),
  CONSTRAINT fk_apl_pago FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE CASCADE,
  CONSTRAINT fk_apl_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Aplicaciones de pagos a facturas';

CREATE TABLE IF NOT EXISTS gastos_fijos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  propiedad_id BIGINT UNSIGNED NOT NULL,
  tipo_gasto_id BIGINT UNSIGNED NOT NULL,
  fecha_gasto DATE NOT NULL COMMENT 'Fecha del gasto',
  detalle VARCHAR(200) NULL COMMENT 'Detalle del gasto',
  monto DECIMAL(12,2) NOT NULL COMMENT 'Monto del gasto',
  creado_por BIGINT UNSIGNED NOT NULL COMMENT 'Usuario que registró',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gf_fecha (fecha_gasto),
  CONSTRAINT fk_gf_propiedad FOREIGN KEY (propiedad_id) REFERENCES propiedades(id),
  CONSTRAINT fk_gf_tipo FOREIGN KEY (tipo_gasto_id) REFERENCES tipos_gasto(id),
  CONSTRAINT fk_gf_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gastos fijos por propiedad';

-- Tickets de mantenimiento / incidencias
CREATE TABLE IF NOT EXISTS solicitudes_mantenimiento (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  propiedad_id BIGINT UNSIGNED NOT NULL,
  contrato_id BIGINT UNSIGNED NULL,
  reportado_por VARCHAR(140) NULL COMMENT 'Nombre del reportante si no es el inquilino',
  asunto VARCHAR(160) NOT NULL COMMENT 'Asunto',
  descripcion TEXT NULL COMMENT 'Descripción del problema',
  estado ENUM('ABIERTA','EN_PROCESO','EN_ESPERA','RESUELTA','CANCELADA') NOT NULL DEFAULT 'ABIERTA' COMMENT 'Estado',
  prioridad ENUM('BAJA','MEDIA','ALTA','CRITICA') NOT NULL DEFAULT 'MEDIA' COMMENT 'Prioridad',
  abierta_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrada_el DATETIME NULL,
  creado_por BIGINT UNSIGNED NOT NULL,
  actualizado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sm_propiedad (propiedad_id),
  KEY idx_sm_estado (estado),
  CONSTRAINT fk_sm_prop FOREIGN KEY (propiedad_id) REFERENCES propiedades(id),
  CONSTRAINT fk_sm_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  CONSTRAINT fk_sm_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Solicitudes de mantenimiento';

-- Historial de contratos (revisiones)
CREATE TABLE IF NOT EXISTS historial_contratos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contrato_id BIGINT UNSIGNED NOT NULL,
  cambiado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cambiado_por BIGINT UNSIGNED NOT NULL,
  renta_anterior DECIMAL(12,2) NULL,
  renta_nueva DECIMAL(12,2) NULL,
  deposito_anterior DECIMAL(12,2) NULL,
  deposito_nuevo DECIMAL(12,2) NULL,
  estado_anterior ENUM('ACTIVO','FINALIZADO','CANCELADO','PENDIENTE') NULL,
  estado_nuevo ENUM('ACTIVO','FINALIZADO','CANCELADO','PENDIENTE') NULL,
  notas VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_hc_contrato (contrato_id, cambiado_el),
  CONSTRAINT fk_hc_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  CONSTRAINT fk_hc_usuario FOREIGN KEY (cambiado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de cambios en contratos';

-- Créditos a favor (por pagos no aplicados, notas de crédito, ajustes)
CREATE TABLE IF NOT EXISTS notas_credito (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contrato_id BIGINT UNSIGNED NOT NULL,
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_por BIGINT UNSIGNED NOT NULL,
  monto DECIMAL(12,2) NOT NULL COMMENT 'Monto del crédito (+)',
  motivo VARCHAR(200) NULL COMMENT 'Motivo',
  saldo_disponible DECIMAL(12,2) NOT NULL COMMENT 'Saldo disponible del crédito',
  PRIMARY KEY (id),
  KEY idx_nc_contrato (contrato_id),
  CONSTRAINT fk_nc_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  CONSTRAINT fk_nc_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Créditos a favor por contrato';

-- Auditoría
CREATE TABLE IF NOT EXISTS eventos_auditoria (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NULL,
  tipo_evento VARCHAR(60) NOT NULL COMMENT 'Tipo: LOGIN, CREAR_CONTRATO, etc.',
  entidad VARCHAR(60) NULL COMMENT 'Tabla/entidad',
  entidad_id BIGINT UNSIGNED NULL COMMENT 'ID de la entidad afectada',
  datos JSON NULL COMMENT 'Datos adicionales (JSON)',
  creado_el DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_tipo_fecha (tipo_evento, creado_el),
  CONSTRAINT fk_aud_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bitácora de eventos';

-- =========================================================
-- 4) Triggers (consistencia)
-- =========================================================
DELIMITER $$

-- Actualizar factura y saldo del pago al aplicar aplicaciones_pago
CREATE TRIGGER trg_aplicaciones_pago_ai AFTER INSERT ON aplicaciones_pago
FOR EACH ROW
BEGIN
  UPDATE facturas
     SET saldo_pendiente = GREATEST(saldo_pendiente - NEW.monto_aplicado, 0),
         estado = CASE
                   WHEN saldo_pendiente - NEW.monto_aplicado <= 0 THEN 'PAGADA'
                   WHEN fecha_vencimiento < CURDATE() THEN 'VENCIDA'
                   ELSE 'PARCIAL'
                 END
   WHERE id = NEW.factura_id;

  UPDATE pagos
     SET saldo_no_aplicado = GREATEST(saldo_no_aplicado - NEW.monto_aplicado, 0)
   WHERE id = NEW.pago_id;
END$$

CREATE TRIGGER trg_aplicaciones_pago_ad AFTER DELETE ON aplicaciones_pago
FOR EACH ROW
BEGIN
  UPDATE facturas
     SET saldo_pendiente = saldo_pendiente + OLD.monto_aplicado,
         estado = CASE
                   WHEN saldo_pendiente + OLD.monto_aplicado = monto_total THEN
                        CASE WHEN fecha_vencimiento < CURDATE() THEN 'VENCIDA' ELSE 'ABIERTA' END
                   ELSE 'PARCIAL'
                 END
   WHERE id = OLD.factura_id;

  UPDATE pagos
     SET saldo_no_aplicado = saldo_no_aplicado + OLD.monto_aplicado
   WHERE id = OLD.pago_id;
END$$

-- Al insertar pagos, inicializar saldo_no_aplicado = monto
CREATE TRIGGER trg_pagos_bi BEFORE INSERT ON pagos
FOR EACH ROW
BEGIN
  SET NEW.saldo_no_aplicado = IFNULL(NEW.monto,0);
END$$

-- Marcar propiedad como OCUPADA al crear contrato ACTIVO
CREATE TRIGGER trg_contratos_ai AFTER INSERT ON contratos
FOR EACH ROW
BEGIN
  IF NEW.estado = 'ACTIVO' THEN
    UPDATE propiedades SET estado = 'OCUPADA' WHERE id = NEW.propiedad_id;
  END IF;
END$$

-- Cambios en contrato: registrar historial y ajustar estado de propiedad
CREATE TRIGGER trg_contratos_au AFTER UPDATE ON contratos
FOR EACH ROW
BEGIN
  IF (OLD.renta_mensual <> NEW.renta_mensual) OR (OLD.deposito <> NEW.deposito) OR (OLD.estado <> NEW.estado) THEN
    INSERT INTO historial_contratos (contrato_id, cambiado_por, renta_anterior, renta_nueva, deposito_anterior, deposito_nuevo, estado_anterior, estado_nuevo, notas)
    VALUES (NEW.id, NEW.creado_por, OLD.renta_mensual, NEW.renta_mensual, OLD.deposito, NEW.deposito, OLD.estado, NEW.estado, 'Actualización de contrato');
  END IF;

  IF NEW.estado = 'ACTIVO' THEN
    UPDATE propiedades SET estado = 'OCUPADA' WHERE id = NEW.propiedad_id;
  ELSEIF NEW.estado IN ('FINALIZADO','CANCELADO') THEN
    IF (SELECT COUNT(*) FROM contratos c WHERE c.propiedad_id = NEW.propiedad_id AND c.estado = 'ACTIVO') = 0 THEN
      UPDATE propiedades SET estado = 'DISPONIBLE' WHERE id = NEW.propiedad_id;
    END IF;
  END IF;
END$$

DELIMITER ;

-- =========================================================
-- 5) Índices extra
-- =========================================================
CREATE INDEX idx_contratos_estado ON contratos (estado);
CREATE INDEX idx_propiedades_estado ON propiedades (estado);

-- =========================================================
-- 6) Vistas para reportes
-- =========================================================

CREATE OR REPLACE VIEW v_resumen_cxc AS
SELECT
  c.id AS contrato_id,
  p.codigo AS propiedad_codigo,
  t.nombre_completo AS inquilino,
  SUM(CASE WHEN f.estado IN ('ABIERTA','PARCIAL','VENCIDA') THEN f.saldo_pendiente ELSE 0 END) AS saldo_pendiente,
  SUM(f.monto_total) AS total_facturado,
  SUM(f.monto_total - f.saldo_pendiente) AS total_pagado
FROM contratos c
JOIN propiedades p ON p.id = c.propiedad_id
JOIN inquilinos t ON t.id = c.inquilino_id
LEFT JOIN facturas f ON f.contrato_id = c.id
GROUP BY c.id, p.codigo, t.nombre_completo;

CREATE OR REPLACE VIEW v_rentabilidad_propiedad AS
SELECT
  p.id AS propiedad_id,
  p.codigo AS propiedad_codigo,
  COALESCE(SUM(CASE WHEN f.estado = 'PAGADA' THEN f.monto_total ELSE 0 END),0) AS ingresos_cobrados,
  COALESCE((SELECT SUM(gf.monto) FROM gastos_fijos gf WHERE gf.propiedad_id = p.id),0) AS gastos_fijos,
  COALESCE(SUM(CASE WHEN f.estado = 'PAGADA' THEN f.monto_total ELSE 0 END),0) -
  COALESCE((SELECT SUM(gf.monto) FROM gastos_fijos gf WHERE gf.propiedad_id = p.id),0) AS utilidad
FROM propiedades p
LEFT JOIN contratos c ON c.propiedad_id = p.id
LEFT JOIN facturas f ON f.contrato_id = c.id
GROUP BY p.id, p.codigo;

CREATE OR REPLACE VIEW v_ocupacion AS
SELECT
  p.id AS propiedad_id,
  p.codigo AS propiedad_codigo,
  p.estado AS estado,
  COUNT(c.id) AS contratos_totales,
  SUM(CASE WHEN c.estado='ACTIVO' THEN 1 ELSE 0 END) AS contratos_activos
FROM propiedades p
LEFT JOIN contratos c ON c.propiedad_id = p.id
GROUP BY p.id, p.codigo, p.estado;

-- =========================================================
-- 7) Procedimiento: Generar facturas mensuales
-- =========================================================
DELIMITER $$
CREATE PROCEDURE sp_generar_facturas_mensuales (
  IN p_anio SMALLINT,
  IN p_mes TINYINT,
  IN p_emision DATE,
  IN p_vencimiento DATE,
  IN p_usuario BIGINT
)
BEGIN
  DECLARE fin INT DEFAULT 0;
  DECLARE v_contrato BIGINT;
  DECLARE cur CURSOR FOR
    SELECT id FROM contratos
    WHERE estado='ACTIVO'
      AND fecha_inicio <= LAST_DAY(MAKEDATE(p_anio, 1) + INTERVAL (p_mes-1) MONTH)
      AND fecha_fin >= MAKEDATE(p_anio, 1) + INTERVAL (p_mes-1) MONTH;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin = 1;

  OPEN cur;
  leer: LOOP
    FETCH cur INTO v_contrato;
    IF fin = 1 THEN LEAVE leer; END IF;

    IF (SELECT COUNT(*) FROM facturas
        WHERE contrato_id = v_contrato AND anio_periodo = p_anio AND mes_periodo = p_mes) = 0 THEN
      INSERT INTO facturas (contrato_id, anio_periodo, mes_periodo, fecha_emision, fecha_vencimiento, detalle, monto_total, saldo_pendiente, estado)
      SELECT
        c.id, p_anio, p_mes, p_emision, p_vencimiento,
        CONCAT('Renta ', LPAD(p_mes,2,'0'), '/', p_anio),
        c.renta_mensual, c.renta_mensual, 'ABIERTA'
      FROM contratos c WHERE c.id = v_contrato;
    END IF;
  END LOOP;
  CLOSE cur;

  INSERT INTO eventos_auditoria (usuario_id, tipo_evento, entidad, datos)
  VALUES (p_usuario, 'GENERAR_FACTURAS', 'facturas', JSON_OBJECT('anio', p_anio, 'mes', p_mes));
END$$
DELIMITER ;

-- =========================================================
-- 8) Datos semilla (opcionales)
-- =========================================================

INSERT INTO roles (codigo, nombre) VALUES
  ('ADMIN','Administrador'),
  ('OPER','Operador')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO formas_pago (codigo, nombre) VALUES
  ('EFECTIVO','Efectivo'), ('TRF','Transferencia'), ('TDC','Tarjeta'), ('CHEQ','Cheque')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO tipos_gasto (nombre, descripcion) VALUES
  ('Agua','Servicio de agua potable'),
  ('Luz','Energía eléctrica'),
  ('Basura','Recolección de basura'),
  ('Internet','Conectividad')
ON DUPLICATE KEY UPDATE descripcion=VALUES(descripcion);

INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, activo)
VALUES ('admin@example.com', '$2y$10$hash_fake_usa_bcrypt', 'Administrador', 1)
ON DUPLICATE KEY UPDATE nombre_completo=VALUES(nombre_completo);

-- =========================================================
-- 9) Consultas ejemplo
-- =========================================================
-- SELECT * FROM v_resumen_cxc ORDER BY saldo_pendiente DESC;
-- SELECT * FROM v_rentabilidad_propiedad ORDER BY utilidad DESC;
-- SELECT * FROM v_ocupacion ORDER BY estado, propiedad_codigo;
-- CALL sp_generar_facturas_mensuales(2025, 9, '2025-09-01', '2025-09-10', 1);

-- Fin del script (ES)
