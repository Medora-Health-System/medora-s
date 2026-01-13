# Medora S

Sprint 0 monorepo scaffold (API + Web + shared package).

## Quick start

### Install

```bash
pnpm install
```

### Local Postgres (recommended)

Docker is expected on your machine (not required in this CI workspace).

```bash
cp infra/docker/.env.example infra/docker/.env
docker compose -f infra/docker/docker-compose.yml up -d
```

### API

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter @medora/api prisma:generate
pnpm --filter @medora/api prisma:migrate
pnpm --filter @medora/api prisma:seed
pnpm --filter @medora/api dev
```

API runs on: `http://localhost:3000`
API health: `GET http://localhost:3000/health`

### Web

```bash
PORT=3002 pnpm --filter @medora/web dev
```

Web runs on: `http://localhost:3002`

### Default Credentials

- Email: `admin@medora.local`
- Password: `Admin123!`

### Create Admin User

To create or update the admin user:

```bash
ADMIN_EMAIL=admin@medora.local ADMIN_PASSWORD=Admin123! pnpm --filter @medora/api create-admin
```

