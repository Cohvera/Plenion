#!/usr/bin/env bash
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SSH_PORT="${SSH_PORT:-22}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/deploy}"
APPS_ROOT="${APPS_ROOT:-/opt/apps}"
WEB_NETWORK="${WEB_NETWORK:-web}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root, for example: sudo bash bootstrap-ubuntu-docker.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg git ufw fail2ban unattended-upgrades

install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi

. /etc/os-release
case "$ID" in
  ubuntu|debian)
    DOCKER_REPO_OS="$ID"
    ;;
  *)
    echo "Unsupported OS for Docker upstream repository: $ID"
    echo "This bootstrap supports Ubuntu and Debian."
    exit 1
    ;;
esac

if [ -z "${VERSION_CODENAME:-}" ]; then
  echo "Could not detect VERSION_CODENAME from /etc/os-release."
  exit 1
fi

cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DOCKER_REPO_OS} ${VERSION_CODENAME} stable
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required but was not installed correctly."
  exit 1
fi

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi

usermod -aG docker "$DEPLOY_USER"

install -d -m 0755 "$DEPLOY_ROOT/bin"
install -d -m 0755 "$DEPLOY_ROOT/caddy/routes"
install -d -m 0755 "$DEPLOY_ROOT/caddy/sites"
install -d -m 0755 "$DEPLOY_ROOT/caddy/data"
install -d -m 0755 "$DEPLOY_ROOT/caddy/config"
install -d -m 0755 "$APPS_ROOT"

touch "$DEPLOY_ROOT/caddy/routes/000-empty.caddy"
touch "$DEPLOY_ROOT/caddy/sites/000-empty.caddy"

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_ROOT" "$APPS_ROOT"

if ! docker network inspect "$WEB_NETWORK" >/dev/null 2>&1; then
  docker network create "$WEB_NETWORK"
fi

cat >"$DEPLOY_ROOT/caddy/Caddyfile" <<'EOF'
:80 {
	import /etc/caddy/routes/*.caddy
	handle {
		respond "Deploy host is ready." 200
	}
}

import /etc/caddy/sites/*.caddy
EOF

cat >"$DEPLOY_ROOT/docker-compose.yml" <<'EOF'
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy/routes:/etc/caddy/routes:ro
      - ./caddy/sites:/etc/caddy/sites:ro
      - ./caddy/data:/data
      - ./caddy/config:/config
    networks:
      - web

networks:
  web:
    external: true
EOF

cat >"$DEPLOY_ROOT/bin/deploy-compose-app.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:?APP_NAME is required}"
APP_PORT="${APP_PORT:?APP_PORT is required}"
APP_HOST="${APP_HOST:-}"
APP_ROOT="${APP_ROOT:-/opt/apps/$APP_NAME}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/deploy}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

if ! [[ "$APP_NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "APP_NAME must use lowercase letters, numbers, and hyphens only."
  exit 1
fi

if [ ! -d "$APP_ROOT/src" ]; then
  echo "Missing app source directory: $APP_ROOT/src"
  exit 1
fi

cd "$APP_ROOT/src"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Missing Compose file: $APP_ROOT/src/$COMPOSE_FILE"
  exit 1
fi

export APP_NAME APP_PORT APP_HOST
docker compose -p "$APP_NAME" -f "$COMPOSE_FILE" up -d --build --remove-orphans

if [ -n "$APP_HOST" ]; then
  cat >"$DEPLOY_ROOT/caddy/sites/$APP_NAME.caddy" <<ROUTE
$APP_HOST {
	reverse_proxy $APP_NAME:$APP_PORT
}
ROUTE
  rm -f "$DEPLOY_ROOT/caddy/routes/$APP_NAME.caddy"
else
  cat >"$DEPLOY_ROOT/caddy/routes/$APP_NAME.caddy" <<ROUTE
redir /$APP_NAME /$APP_NAME/

handle_path /$APP_NAME/* {
	reverse_proxy $APP_NAME:$APP_PORT
}
ROUTE
  rm -f "$DEPLOY_ROOT/caddy/sites/$APP_NAME.caddy"
fi

docker compose -f "$DEPLOY_ROOT/docker-compose.yml" up -d
docker exec "$(docker compose -f "$DEPLOY_ROOT/docker-compose.yml" ps -q caddy)" caddy reload --config /etc/caddy/Caddyfile
EOF

chmod 0755 "$DEPLOY_ROOT/bin/deploy-compose-app.sh"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_ROOT" "$APPS_ROOT"

docker compose -f "$DEPLOY_ROOT/docker-compose.yml" up -d

ufw allow "$SSH_PORT/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now fail2ban
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo "Bootstrap complete."
echo "Test the host at: http://SERVER_IP/"
echo "Add an SSH public key for the '$DEPLOY_USER' user before deploying from GitHub."
