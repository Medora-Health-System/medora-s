# Medication Validation CI Guide

**Certification ID:** `MEDUI.PERMANENT_MEDICATION_VALIDATION_SUITE`

## Commands

| Command | When | Path |
|---------|------|------|
| `pnpm medication:validate:unit` | Every PR | Shared validators + negative fixture test |
| `pnpm medication:validate:critical` | Local / main / populated DB | Real `MedicationCatalogService.search` on clinical corpus |
| `pnpm medication:validate:full` | Nightly / release | Universal benchmark (5301 families) via real search |
| `pnpm medication:validate:deployment` | Post-deploy / post-APPLY | Hard-acceptance subset + env metadata |
| `pnpm medication:validate:certify` | After suite evidence | Writes certification artifacts |

## Workflow

`.github/workflows/medication-validation.yml`

- **PR:** unit + negative regression (always fails CI if validators regress)
- **main / schedule:** also attempts DB-backed critical suite; skips cleanly if CI catalog is empty (`MEDORA_MEDICATION_VALIDATE_ALLOW_SKIP=1`)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Target DB (never print) |
| `MEDORA_MEDICATION_VALIDATE_ALLOW_SKIP=1` | Skip DB suite when `catalogActive < 50` |

## Production / Railway smoke

```bash
railway run --service Postgres --environment production -- sh -c '
  export DATABASE_URL="$DATABASE_PUBLIC_URL"
  cd apps/api
  pnpm medication:validate:deployment
'
```
