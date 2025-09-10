-- Script de inicialización para el sistema de alquiler
-- Este archivo se ejecutará automáticamente cuando se cree el contenedor

USE sistema_alquiler;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    tipo_usuario ENUM('propietario', 'inquilino', 'admin') DEFAULT 'inquilino',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de propiedades
CREATE TABLE IF NOT EXISTS propiedades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    propietario_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(255) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    tipo_propiedad ENUM('casa', 'apartamento', 'oficina', 'local') NOT NULL,
    precio_mensual DECIMAL(10,2) NOT NULL,
    habitaciones INT,
    banos INT,
    metros_cuadrados DECIMAL(8,2),
    disponible BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propietario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de alquileres
CREATE TABLE IF NOT EXISTS alquileres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    propiedad_id INT NOT NULL,
    inquilino_id INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    precio_acordado DECIMAL(10,2) NOT NULL,
    deposito DECIMAL(10,2),
    estado ENUM('activo', 'terminado', 'cancelado') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE,
    FOREIGN KEY (inquilino_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alquiler_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    metodo_pago ENUM('efectivo', 'transferencia', 'tarjeta') NOT NULL,
    estado ENUM('pendiente', 'pagado', 'vencido') DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alquiler_id) REFERENCES alquileres(id) ON DELETE CASCADE
);

-- Insertar datos de ejemplo
INSERT INTO usuarios (nombre, email, telefono, password_hash, tipo_usuario) VALUES
('Admin Sistema', 'admin@sistema.com', '1234567890', '$2y$10$example_hash', 'admin'),
('Juan Pérez', 'juan@email.com', '1234567891', '$2y$10$example_hash', 'propietario'),
('María García', 'maria@email.com', '1234567892', '$2y$10$example_hash', 'inquilino');

INSERT INTO propiedades (propietario_id, titulo, descripcion, direccion, ciudad, tipo_propiedad, precio_mensual, habitaciones, banos, metros_cuadrados) VALUES
(2, 'Apartamento céntrico', 'Hermoso apartamento en el centro de la ciudad', 'Calle Principal 123', 'Ciudad Central', 'apartamento', 800.00, 2, 1, 75.50),
(2, 'Casa familiar', 'Casa grande ideal para familias', 'Avenida Familiar 456', 'Ciudad Central', 'casa', 1200.00, 3, 2, 120.00);
