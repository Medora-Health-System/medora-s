# Medora S

## Overview
Medora S is a healthcare/medical records management system built with a modern monorepo architecture.

## Project Architecture

### Structure
```
├── apps/
│   ├── api/          # NestJS backend API (runs on port 3001)
│   └── web/          # Next.js frontend (runs on port 5000)
├── packages/
│   └── shared/       # Shared TypeScript types and schemas
└── infra/            # Infrastructure configuration
```

### Tech Stack
- **Frontend**: Next.js 15 with React 19
- **Backend**: NestJS 11 with Prisma ORM
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Package Manager**: npm with workspaces

### Key Features
- User authentication with JWT (access + refresh tokens)
- Patient management
- Encounters (visits/appointments)
- Orders (lab, imaging, medications)
- Audit logging

## Development

### Running Locally
The workflow "Start application" runs both the API and web frontend:
- Frontend: http://localhost:5000
- API: http://localhost:3001

### Database
Uses Prisma ORM with PostgreSQL. Database migrations are in `apps/api/prisma/migrations/`.

To run migrations:
```bash
cd apps/api && npx prisma migrate deploy
```

To generate Prisma client:
```bash
cd apps/api && npx prisma generate
```

### Shared Package
The shared package must be built before running the apps:
```bash
cd packages/shared && npm run build
```

## Environment Variables
Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `NEXT_PUBLIC_API_BASE_URL` - API base URL for frontend

## Recent Changes
- January 13, 2026: Initial setup for Replit environment
  - Migrated from pnpm to npm workspaces
  - Configured Next.js for Replit proxy
  - Set up PostgreSQL database and Prisma migrations
  - Configured deployment settings
