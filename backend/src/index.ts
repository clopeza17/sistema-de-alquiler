import startServer from './server.js';

// Ejecutar el servidor
startServer().catch((error) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});
