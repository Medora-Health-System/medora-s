# Deployment Medication Smoke-Test Guide

## Purpose

Detect code/database mismatch after deploy or catalog APPLY.

## Command

```bash
pnpm medication:validate:deployment
```

Uses hard-acceptance families only via real `MedicationCatalogService.search`.

## Production-equivalent

```bash
railway run --service Postgres --environment production -- sh -c '
  export DATABASE_URL="$DATABASE_PUBLIC_URL"
  cd apps/api
  pnpm medication:validate:deployment
'
```

## Safety

- No patient orders
- No MAR / chart / CDS mutations
- Never print `DATABASE_URL` or credentials
- Prefer Wayne facility when present

## Pass criteria

- Hard acceptance PASS
- Search pass rate ≥ 0.9 on hard-acceptance queries
