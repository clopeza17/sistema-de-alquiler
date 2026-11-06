const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const newman = require('newman');
const collection = require('../postman/acs-fase2.postman_collection.json');

const envVar = [
  ['baseUrl', 'ACS_API_BASE_URL'],
  ['adminEmail', 'ACS_TEST_EMAIL'],
  ['adminPassword', 'ACS_TEST_PASSWORD'],
].map(([key, variable]) => {
  const value = process.env[variable];
  if (!value) throw new Error(`Define ${variable} para la instancia desechable de QA`);
  return { key, value };
});

newman.run({
  collection,
  envVar,
  reporters: [],
  timeoutRequest: 15000,
}, (error, summary) => {
  if (error) {
    console.error('Newman no pudo completar la colección:', error.name);
    process.exitCode = 1;
    return;
  }
  const { stats, failures, executions } = summary.run;
  const result = {
    at: new Date().toISOString(),
    requests: stats.requests,
    assertions: stats.assertions,
    steps: executions.map(({ item, response, assertions }) => ({
      name: item.name,
      status: response?.code ?? null,
      assertions: assertions?.map(({ assertion, error }) => ({ name: assertion, passed: !error })) ?? [],
    })),
    failures: failures.map(({ source, error }) => ({
      request: source?.name ?? null,
      check: error?.test ?? error?.name ?? null,
    })),
  };
  const output = resolve(process.env.ACS_API_REPORT || 'quality-results/api.json');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(`Newman: ${stats.requests.total} solicitudes, ${stats.assertions.total} aserciones, ${failures.length} fallos`);
  for (const { request, check } of result.failures) console.error(`- ${request}: ${check}`);
  if (failures.length || stats.requests.total !== collection.item.length || stats.assertions.total < collection.item.length * 3) {
    process.exitCode = 1;
  }
});
