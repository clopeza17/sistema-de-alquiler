import { readFileSync } from 'node:fs';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const input = readFileSync(0, 'utf8');
const firstNewline = input.indexOf('\n');
const secondNewline = input.indexOf('\n', firstNewline + 1);
const email = input.slice(0, firstNewline).trim();
const password = input.slice(firstNewline + 1, secondNewline);

if (firstNewline < 1 || secondNewline < 0 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
  throw new Error('Correo o contraseña inválidos.');
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  await connection.beginTransaction();

  const [[adminRole]] = await connection.execute('SELECT id FROM roles WHERE codigo = ?', ['ADMIN']);
  if (!adminRole) throw new Error('No existe el rol ADMIN en la base de datos.');

  const hash = await bcrypt.hash(password, 12);
  const [users] = await connection.execute('SELECT id FROM usuarios WHERE correo = ? FOR UPDATE', [email]);
  let userId;

  if (users.length > 0) {
    userId = users[0].id;
    await connection.execute(
      'UPDATE usuarios SET contrasena_hash = ?, activo = 1 WHERE id = ?',
      [hash, userId],
    );
  } else {
    const [result] = await connection.execute(
      'INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, activo) VALUES (?, ?, ?, 1)',
      [email, hash, 'Administrador'],
    );
    userId = result.insertId;
  }

  await connection.execute(
    'INSERT IGNORE INTO usuarios_roles (usuario_id, rol_id) VALUES (?, ?)',
    [userId, adminRole.id],
  );
  await connection.commit();
  console.log(`Administrador ${email} listo con rol ADMIN.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
