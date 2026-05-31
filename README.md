# Cohvera

Cohvera is an internal quotation request app for a Belgian multi-technical
installation group with Q-Home, Warco, and Tomme.

Users create quotation requests through a guided wizard. The requester can
upload customer quotations, plans, specifications, or external technical offers.
Selected techniques either generate a quotation section from a template or
create a technical quotation task for a specialist.

## Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- Role-based access placeholder
- Local file upload storage

## Features

- Quotation request wizard
- Company, customer, document, technique, routing and review steps
- Automatic section generation from templates
- Technical quotation tasks with upload flow
- Request overview page
- Request detail page
- Task list and task detail pages
- Admin template placeholder
- Prisma seed data for Q-Home, Warco and Tomme

## Deployment

The first deployment target is an Ubuntu/Debian server with SSH access, Docker
Compose, Caddy, and GitHub Actions. See `docs/deployment.md` for the server
bootstrap, GitHub secrets, and app deployment conventions.

This app listens on container port `3000`, so deploy it with:

```bash
APP_NAME=cohvera APP_PORT=3000 APP_HOST="" /opt/deploy/bin/deploy-compose-app.sh
```

Without a domain it will be available at:

```text
http://SERVER_IP/cohvera/
```

## Development

Create `.env`:

```bash
cp .env.example .env
```

Install dependencies:

```bash
npm install
```

Start PostgreSQL with Docker:

```bash
docker network create web
docker compose up -d db
```

Create the schema and seed demo data:

```bash
npx prisma db push
npm run prisma:seed
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

The demo user is controlled by `DEMO_USER_EMAIL`. Seeded users include:

- `lotte@warco.be`
- `quinten@q-home.be`
- `tom@tomme.be`
- `admin@cohvera.local`

## Validation

```bash
npm run build
```

PDF quotation output is intentionally not implemented yet. The current focus is
the request workflow, task routing, uploads, templates, and internal review path.
