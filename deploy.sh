sudo tee /opt/medflash/deploy.sh > /dev/null <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/medflash/app"
COMPOSE_DIR="/opt/medflash"
BRANCH="main"
HEALTH_URL="https://medflash-api.tri-pacer.fr/health"

log() { echo -e "\n==> $*"; }

# Use docker compose if available, fallback to docker-compose
compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

log "Deploy started on $(hostname) at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# 1) Pull latest code
log "Pulling latest code in ${REPO_DIR} (${BRANCH})"
cd "$REPO_DIR"
git fetch origin "$BRANCH" --prune
git reset --hard "origin/$BRANCH"

# 2) Bring stack up
log "Starting docker compose stack from ${COMPOSE_DIR}"
cd "$COMPOSE_DIR"

# Decide whether we can build safely (avoid your 'Cannot locate Dockerfile' issue)
CAN_BUILD="yes"
# If docker-compose.yml references a missing Dockerfile, build will fail.
# We check for a Dockerfile next to the compose dir as a simple guard.
if ! ls -1 Dockerfile dockerfile >/dev/null 2>&1; then
  CAN_BUILD="no"
fi

# Always try to stop orphaned stacks that might conflict on 80/443
log "Stopping any existing stack (safe) and removing orphans"
compose down --remove-orphans || true

if [[ "$CAN_BUILD" == "yes" ]]; then
  log "Bringing up stack with build"
  compose up -d --build
else
  log "Bringing up stack WITHOUT build (Dockerfile not found in ${COMPOSE_DIR})"
  compose up -d
fi

log "Current containers:"
compose ps

# 3) Healthcheck
log "Healthcheck: ${HEALTH_URL}"
for i in {1..15}; do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null; then
    log "✅ Healthcheck OK"
    exit 0
  fi
  echo "  ... waiting ($i/15)"
  sleep 2
done

log "❌ Healthcheck failed. Showing last logs for api and caddy:"
compose logs --tail=120 api || true
compose logs --tail=120 caddy || true
exit 1
BASH

sudo chmod +x /opt/medflash/deploy.sh