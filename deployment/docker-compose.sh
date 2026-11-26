#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="${SCRIPT_DIR}/env"
if [ ! -f "$ENV_FILE" ] && [ -f "${SCRIPT_DIR}/.env" ]; then
  ENV_FILE="${SCRIPT_DIR}/.env"
fi
COMPOSE_YAML="${SCRIPT_DIR}/docker-compose.yaml"
NGINX_YAML="${SCRIPT_DIR}/docker-compose.nginx.yaml"

ensure_env() {
  if [ ! -f "$ENV_FILE" ]; then
    cp "${SCRIPT_DIR}/env.example" "$ENV_FILE"
    echo "Created ${ENV_FILE} from env.example. Update secrets before running."
    exit 1
  fi
}

clear_old_containers() {
  docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" --profile model down --remove-orphans || true
}

reload_nginx_if_running() {
  if [ "$(docker inspect -f '{{.State.Running}}' datn-nginx-proxy 2>/dev/null || echo 'false')" = "true" ]; then
    docker exec datn-nginx-proxy nginx -s reload >/dev/null 2>&1 || true
  fi
}

init_swap() {
  if swapon --show | grep -q '/swapfile'; then
    echo "Swap /swapfile already enabled."
    return 0
  fi
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
}

CMD="${1:-help}"
shift || true

case "$CMD" in
  setup-env)
    if [ ! -f "$ENV_FILE" ]; then
      cp "${SCRIPT_DIR}/env.example" "$ENV_FILE"
      echo "Created ${ENV_FILE}"
    fi
    ;;
  init-swap)
    init_swap
    ;;
  nginx-up)
    docker compose -f "$NGINX_YAML" up -d
    ;;
  nginx-down)
    docker compose -f "$NGINX_YAML" down
    ;;
  nginx-reload)
    reload_nginx_if_running
    ;;
  pull)
    ensure_env
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" pull "$@"
    ;;
  up)
    ensure_env
    clear_old_containers
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" up -d "$@"
    reload_nginx_if_running
    ;;
  deploy)
    ensure_env
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" pull
    clear_old_containers
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" up -d --remove-orphans
    reload_nginx_if_running
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" ps
    ;;
  down)
    ensure_env
    clear_old_containers
    ;;
  restart)
    ensure_env
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" restart "$@"
    reload_nginx_if_running
    ;;
  logs)
    ensure_env
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" logs -f --tail=100 "$@"
    ;;
  status|ps)
    ensure_env
    docker compose -f "$COMPOSE_YAML" --env-file "$ENV_FILE" ps "$@"
    ;;
  *)
    echo "Usage: ./docker-compose.sh <setup-env|init-swap|nginx-up|nginx-down|nginx-reload|deploy|up|down|pull|restart|logs|status>"
    ;;
esac
