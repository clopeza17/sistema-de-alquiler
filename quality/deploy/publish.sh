#!/usr/bin/env bash
set -euo pipefail

environment="${1:?Uso: publish.sh qa|dev|prod}"
case "$environment" in dev|qa|prod) ;; *) echo 'Ambiente inválido' >&2; exit 2 ;; esac
host="${ACS_DEPLOY_HOST:?Define el destino SSH del ambiente}"
if [[ ! "$host" =~ ^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$ ]]; then
  echo 'Usa el destino SSH usuario@host.' >&2
  exit 2
fi
cd "$(git rev-parse --show-toplevel)"
revision="$(git rev-parse HEAD)"
archive="$(mktemp)"
trap 'rm -f "$archive"' EXIT
git archive --format=tar.gz -o "$archive" "$revision"

ssh_options=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
remote_archive="$(ssh "${ssh_options[@]}" "$host" 'mktemp /tmp/acs-release.XXXXXXXX')"
[[ "$remote_archive" =~ ^/tmp/acs-release\.[a-zA-Z0-9]+$ ]]
scp "${ssh_options[@]}" "$archive" "$host:$remote_archive"
ssh "${ssh_options[@]}" "$host" "bash -s -- $environment $revision $remote_archive" < quality/deploy/activate.sh
