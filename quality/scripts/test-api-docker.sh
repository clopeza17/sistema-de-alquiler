#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
project="acs-api-$(openssl rand -hex 6)"
config="$(mktemp)"
umask 077
email=qa-acs@example.invalid
password="$(openssl rand -hex 24)"

{
  printf '%s\n' 'MYSQL_DATABASE=sistema_alquiler' 'MYSQL_USER=acs_qa'
  printf '%s\n' 'MYSQL_PORT=127.0.0.1:' 'BACKEND_PORT=127.0.0.1:'
  printf 'MYSQL_PASSWORD='; openssl rand -hex 24
  printf 'MYSQL_ROOT_PASSWORD='; openssl rand -hex 24
  printf 'JWT_SECRET='; openssl rand -hex 32
} > "$config"

compose() { docker compose --project-name "$project" --env-file "$config" "$@"; }
cleanup() {
  compose down --volumes > /dev/null 2>&1 || true
  rm -f "$config"
}
trap cleanup EXIT
compose up -d --build --wait --wait-timeout 180 mysql backend
printf '%s\n%s\n' "$email" "$password" | compose exec -T backend node scripts/create-admin.mjs
address="$(compose port backend 3001)"
ACS_API_BASE_URL="http://$address" ACS_TEST_EMAIL="$email" ACS_TEST_PASSWORD="$password" node quality/runner/run-api.cjs
