import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-only-signing-key-never-used-in-deployments',
      LOG_LEVEL: 'fatal',
    },
    coverage: {
      all: true,
      include: [
        'src/controllers/contratosController.ts',
        'src/controllers/facturacionController.ts',
        'src/controllers/pagosController.ts',
        'src/controllers/aplicacionesPagoController.ts',
      ],
      reporter: ['text', 'json-summary', 'lcov'],
    },
  },
});
