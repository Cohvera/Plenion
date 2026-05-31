# Deployment Foundation

This repository is prepared for a small Ubuntu or Debian server that deploys
apps from GitHub through SSH and Docker Compose.

The initial setup assumes:

- Ubuntu or Debian server with SSH access
- No domain name yet
- Docker Compose per app
- Caddy as the public reverse proxy
- GitHub Actions as the deployment trigger

## Server Layout

The bootstrap script creates this structure:

```text
/opt/deploy/
  bin/deploy-compose-app.sh
  caddy/Caddyfile
  caddy/routes/
  caddy/sites/
  docker-compose.yml

/opt/apps/
  app-name/
    src/
    .env
```

The shared Docker network is named `web`. App containers join that network and
Caddy routes traffic to them.

## One-Time Server Bootstrap

Copy `scripts/server/bootstrap-ubuntu-docker.sh` to the server and run it as
root:

```bash
sudo bash bootstrap-ubuntu-docker.sh
```

The script installs:

- Docker Engine and Docker Compose plugin
- Caddy in a Docker container
- Git, UFW, Fail2ban, and unattended security upgrades
- `/opt/deploy` and `/opt/apps`
- a `deploy` user if it does not exist

It opens SSH, HTTP, and HTTPS in UFW. It does not disable password SSH login;
do that only after key login for the `deploy` user has been tested.

## GitHub Secrets

Create a separate SSH key for GitHub Actions. The public key goes on the
server, the private key goes into GitHub secrets.

```bash
ssh-keygen -t ed25519 -f github-actions-deploy -C github-actions-deploy
```

Add `github-actions-deploy.pub` to:

```text
/home/deploy/.ssh/authorized_keys
```

Create these GitHub repository secrets:

```text
DEPLOY_HOST=server-ip-address
DEPLOY_USER=deploy
DEPLOY_SSH_KEY=private SSH key allowed to log in as deploy
DEPLOY_PORT=22
```

`DEPLOY_PORT` is optional if SSH runs on port 22.

## First App Deploy

Use `templates/github-actions-deploy.yml` as the starting point for an app
workflow. Copy it to:

```text
.github/workflows/deploy.yml
```

Then set:

```yaml
env:
  APP_NAME: cohvera
  APP_PORT: "3000"
```

The workflow copies the repository to `/opt/apps/cohvera/src` and runs Docker
Compose on the server.

## App Requirements

An app repository needs a `docker-compose.yml` like the template in
`templates/app-docker-compose.yml`.

The important pieces are:

- publish the app on host port `3000` for direct testing
- join the external `web` network
- add a network alias that matches `APP_NAME`

## Without A Domain

Until DNS is available, the compose file exposes the app directly on host
port `3000` so you can test it without port `80`:

```text
http://SERVER_IP:3000/
```

This works well for direct server testing and avoids conflicts when port `80`
is already occupied. Once a domain exists, you can switch back to a reverse
proxy route if you want.

## With A Domain Later

Point DNS to the server:

```text
A app.example.com -> SERVER_IP
```

Then you can keep using direct host access or switch to a reverse proxy later:

```text
http://SERVER_IP:3000/
```
