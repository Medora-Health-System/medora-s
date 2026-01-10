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

API health: `GET http://localhost:3001/health`

### Web

```bash
pnpm --filter @medora/web dev
```

