import startServer from './server.js';
startServer().catch((error) => {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map