#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
  echo ".env.production not found" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.production
set +a

export ENV_FILE=.env.production

if [[ -z "${APP_IMAGE:-}" ]]; then
  echo "APP_IMAGE is not set in .env.production" >&2
  exit 1
fi

echo "Disk usage before Docker cleanup:"
df -h /
docker system df || true

echo "Pruning unused Docker objects before pulling the new image..."
docker container prune -f || true
docker image prune -af || true
docker builder prune -af || true
docker system prune -af || true

echo "Disk usage after Docker cleanup:"
df -h /
docker system df || true

COMPOSE_LEGACY=false

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
  COMPOSE_LEGACY=true
else
  echo "Docker Compose is not installed. Install Docker Compose plugin or docker-compose." >&2
  exit 1
fi

COMPOSE_FILES=(-f docker-compose.prod.yml)
PULL_SERVICES=(postgres app)

if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
  COMPOSE_FILES+=(-f docker-compose.caddy.yml)
  PULL_SERVICES+=(caddy)

  if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet nginx 2>/dev/null; then
      echo "Stopping nginx because Caddy will own ports 80 and 443."
      systemctl stop nginx
    fi

    if systemctl is-enabled --quiet nginx 2>/dev/null; then
      echo "Disabling nginx autostart because Caddy will own ports 80 and 443."
      systemctl disable nginx
    fi
  fi

  for port in 80 443; do
    docker_port_users="$(docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E "0\.0\.0\.0:${port}->|:::${port}->" || true)"
    non_caddy_port_users="$(printf '%s\n' "$docker_port_users" | grep -vE '(^|[[:space:]])[^[:space:]]*caddy[^[:space:]]*([[:space:]]|$)' || true)"
    caddy_owns_port=false
    if [[ -n "$docker_port_users" && -z "$non_caddy_port_users" ]]; then
      caddy_owns_port=true
    fi

    if [[ -n "$non_caddy_port_users" ]]; then
      echo "Port ${port} is already used by another Docker container:" >&2
      printf '%s\n' "$non_caddy_port_users" >&2
      echo "" >&2
      echo "Either stop the container that owns port ${port}, or set VPS_ENABLE_CADDY=false and configure your existing reverse proxy to route the domain to the app." >&2
      exit 1
    fi

    if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :${port} )" | tail -n +2 | grep . >/dev/null; then
      if [[ "$caddy_owns_port" == "true" ]]; then
        continue
      fi

      echo "Port ${port} is already used on the host:" >&2
      ss -ltnp "( sport = :${port} )" >&2 || ss -ltn "( sport = :${port} )" >&2
      echo "" >&2
      echo "Stop the host service that owns port ${port}, or set VPS_ENABLE_CADDY=false and configure your existing reverse proxy to route the domain to the app." >&2
      exit 1
    fi
  done
fi

"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" pull "${PULL_SERVICES[@]}"

if [[ "${COMPOSE_LEGACY}" == "true" ]]; then
  echo "Legacy docker-compose detected; removing recreate-prone app containers before up."
  LEGACY_RM_SERVICES=(app)
  if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
    LEGACY_RM_SERVICES+=(caddy)
  fi
  "${COMPOSE[@]}" "${COMPOSE_FILES[@]}" rm -sf "${LEGACY_RM_SERVICES[@]}" || true
fi

"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" up -d --remove-orphans
"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" ps
docker image prune -f
