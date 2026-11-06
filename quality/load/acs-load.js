import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const serverErrors = new Rate('acs_server_errors');
const rateLimited = new Rate('acs_rate_limited');
const successfulLatency = new Trend('acs_success_latency', true);
const routes = ['/api/v1/contratos', '/api/v1/facturas'];
const baseUrl = (__ENV.ACS_LOAD_BASE_URL || '').replace(/\/$/, '');
const smoke = __ENV.ACS_LOAD_SMOKE === '1';

const routeThresholds = Object.fromEntries(routes.flatMap((route) => [
  [`http_req_duration{route:${route},phase:steady}`, ['p(95)<=2000']],
  [`http_reqs{route:${route},phase:steady}`, ['count>0']],
  [`acs_success_latency{route:${route},phase:steady}`, ['p(95)<=2000']],
]));

export const options = {
  summaryTrendStats: ['avg', 'med', 'p(95)', 'max', 'count'],
  scenarios: {
    acs: smoke ? { executor: 'shared-iterations', vus: 1, iterations: 1 } : {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: smoke ? { checks: ['rate==1'] } : {
    ...routeThresholds,
    'acs_server_errors{phase:steady}': ['rate<0.01'],
    'http_req_failed{phase:steady}': ['rate<0.01'],
    'acs_rate_limited{phase:steady}': ['rate==0'],
  },
};

export function setup() {
  if (!baseUrl || !__ENV.ACS_LOAD_EMAIL || !__ENV.ACS_LOAD_PASSWORD) {
    throw new Error('Define ACS_LOAD_BASE_URL, ACS_LOAD_EMAIL y ACS_LOAD_PASSWORD de la instancia QA.');
  }
  const response = http.post(`${baseUrl}/api/v1/auth/login`, JSON.stringify({
    email: __ENV.ACS_LOAD_EMAIL,
    password: __ENV.ACS_LOAD_PASSWORD,
  }), { headers: { 'Content-Type': 'application/json' }, tags: { phase: 'setup' } });
  if (response.status !== 200) throw new Error(`Login de QA: HTTP ${response.status}`);
  const token = response.json('data.token');
  if (!token) throw new Error('El login de QA no devolvió token.');
  return { token };
}

export default function ({ token }) {
  const elapsed = Date.now() - exec.scenario.startTime;
  const phase = smoke || elapsed < 60000 ? 'ramp' : elapsed < 360000 ? 'steady' : 'down';
  const headers = { Authorization: `Bearer ${token}` };
  for (const route of routes) {
    const tags = { route, phase };
    const response = http.get(`${baseUrl}${route}?page=1&limit=10`, { headers, tags, timeout: '10s' });
    const ok = check(response, { 'consulta responde 200': (res) => res.status === 200 }, tags);
    serverErrors.add(response.status >= 500 && response.status < 600, tags);
    rateLimited.add(response.status === 429, tags);
    if (ok) successfulLatency.add(response.timings.duration, tags);
  }
  if (!smoke) sleep(1);
}

export function handleSummary(data) {
  const stats = Object.fromEntries(Object.entries(data.metrics).map(([key, metric]) => [key, metric.values]));
  return {
    [__ENV.ACS_LOAD_REPORT || 'quality-results/load.json']: JSON.stringify({
      environment: __ENV.ACS_LOAD_ENV || 'sin identificar',
      profile: smoke ? 'smoke' : '0 → 50 VU (1 min), 50 VU (5 min), 50 → 0 VU (30 s)',
      state: data.state,
      stats,
      thresholds: Object.fromEntries(Object.entries(data.metrics)
        .filter(([, metric]) => metric.thresholds)
        .map(([key, metric]) => [key, metric.thresholds])),
    }, null, 2) + '\n',
    stdout: `k6 terminó con ${data.metrics.http_reqs.values.count} solicitudes\n`,
  };
}
