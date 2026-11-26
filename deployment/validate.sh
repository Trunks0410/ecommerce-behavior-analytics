#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="${SCRIPT_DIR}/env"
if [ ! -f "$ENV_FILE" ] && [ -f "${SCRIPT_DIR}/.env" ]; then
  ENV_FILE="${SCRIPT_DIR}/.env"
fi

CONTAINERS="datn-analyze-server datn-analyze-gui datn-shipment-server datn-shipment-gui datn-ecommerce-server datn-ecommerce-gui datn-nginx-proxy"
if [ "${DEPLOY_MODEL:-false}" = "true" ]; then
  CONTAINERS="${CONTAINERS} datn-qwen-inference"
fi
MAX_WAIT_SECONDS="${VALIDATE_WAIT_SECONDS:-45}"

wait_for_container() {
  local name="$1"
  local elapsed=0

  while [ "$elapsed" -lt "$MAX_WAIT_SECONDS" ]; do
    local running
    local health
    running=$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo "false")
    health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo "none")

    if [ "$running" = "true" ] && { [ "$health" = "healthy" ] || [ "$health" = "none" ]; }; then
      echo "OK: $name (running=$running, health=$health)"
      return 0
    fi

    sleep 3
    elapsed=$((elapsed + 3))
  done

  echo "ERROR: $name failed check (running=$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo 'missing'), health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo 'none'))"
  docker logs --tail 30 "$name" || true
  return 1
}

check_http() {
  local label="$1"
  local host_header="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -H "Host: ${host_header}" "http://localhost:80/" || echo "000")
  if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    echo "OK: $label ($host_header -> HTTP $code)"
    return 0
  fi
  echo "ERROR: $label ($host_header -> HTTP $code)"
  return 1
}

docker compose -f "${SCRIPT_DIR}/docker-compose.yaml" --env-file "${ENV_FILE}" ps

for c in $CONTAINERS; do
  wait_for_container "$c"
done

check_http "ecommerce-gui" "www.meemart.click"
check_http "analyze-gui" "analytics.meemart.click"
check_http "shipment-gui" "ute-express.meemart.click"

echo "Validation passed."
