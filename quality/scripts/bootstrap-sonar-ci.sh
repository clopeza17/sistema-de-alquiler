#!/usr/bin/env bash
set -euo pipefail

url="${SONAR_HOST_URL:?Falta URL del SonarQube desechable}"
[[ "$url" == 'http://127.0.0.1:9000' ]] || { echo 'Ejecutar solo contra SonarQube CI en loopback.' >&2; exit 2; }
project=acs-sistema-alquiler
gate='ACS Fase 2'
for attempt in $(seq 1 90); do
  if curl -fsS "$url/api/system/status" 2>/dev/null | jq -e '.status == "UP"' >/dev/null; then break; fi
  if [[ "$attempt" == 90 ]]; then echo 'SonarQube no inició dentro del tiempo previsto.' >&2; exit 1; fi
  sleep 2
done
post() { local action="$1"; shift; curl -fsS -u admin:admin -X POST "$url/api/$action" "$@"; }
post projects/create --data "project=$project" --data-urlencode 'name=ACS Sistema de Alquiler' > /dev/null
post qualitygates/create --data-urlencode "name=$gate" > /dev/null
for metric in blocker_violations critical_violations vulnerabilities; do
  post qualitygates/create_condition --data-urlencode "gateName=$gate" --data "metric=$metric&op=GT&error=0" > /dev/null
done
post qualitygates/select --data-urlencode "gateName=$gate" --data "projectKey=$project" > /dev/null
post user_tokens/generate --data "name=ci-scan&type=PROJECT_ANALYSIS_TOKEN&projectKey=$project" | jq -er '.token'
