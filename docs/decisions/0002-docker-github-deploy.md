# 0002: Docker-Based GitHub Deployment

Date: 2026-05-12

## Status

Accepted

## Context

Cohvera needs a basic deployment foundation for a new Ubuntu/Debian server that
is accessible only through SSH. There is no domain name yet, but the setup
should support adding one later without changing the app deployment model.

## Decision

Use a small Docker-based deployment foundation:

- Docker Engine and Docker Compose on the server
- one shared external Docker network named `web`
- Caddy as the public reverse proxy
- GitHub Actions connecting to the server over SSH
- one `/opt/apps/<app-name>` directory per deployed app
- temporary IP path routing until DNS is available
- domain-based HTTPS routing once DNS is available

## Consequences

The server stays simple and transparent while still supporting multiple apps.
Apps can be deployed independently from GitHub. The temporary no-domain routing
is useful for early validation, but production apps should move to domain-based
routes for cleaner URLs and automatic HTTPS.
