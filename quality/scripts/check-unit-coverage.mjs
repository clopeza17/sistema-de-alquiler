import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const readJson = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const baseline = readJson('../baseline/unit-coverage.json');
const report = readJson('../../backend/coverage/coverage-summary.json');
const current = Object.fromEntries(Object.entries(report).map(([path, metrics]) => [basename(path), metrics]));

const modules = [
  ['Contratos', ['contratosController.ts']],
  ['Facturación', ['facturacionController.ts']],
  ['Pagos', ['pagosController.ts', 'aplicacionesPagoController.ts']],
];

function percentage(report, files) {
  const lines = files.map((file) => {
    if (!report[file]?.lines?.total) throw new Error(`Faltan datos de cobertura para ${file}`);
    return report[file].lines;
  });
  return 100 * lines.reduce((sum, file) => sum + file.covered, 0)
    / lines.reduce((sum, file) => sum + file.total, 0);
}

for (const [name, files] of modules) {
  const initial = percentage(baseline, files);
  const final = percentage(current, files);
  const delta = final - initial;
  console.log(`${name}: ${initial.toFixed(2)} % → ${final.toFixed(2)} % (+${delta.toFixed(2)} pp)`);
  if (delta < 20 || final < 70) process.exitCode = 1;
}
