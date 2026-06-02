# M1.6C — Enterprise search validation

## Automated tests

| Package | Command | Coverage |
|---------|---------|----------|
| Shared | `pnpm --filter @medora/shared test` | Manifest, expansion map, readiness model, typo safety |
| API | `pnpm --filter @medora/api test -- medication` | `medication-catalog-search.util.spec.ts`, `enterprise-medication-search.spec.ts` |
| API | `pnpm --filter @medora/api test -- search` | Same search specs |

### Scenarios

- Brand search (coumadin → warfarin terms)
- Generic search (warfarin)
- Alias persistence validation (`validateEnterpriseAliasManifestPersisted`)
- Partial prefix (atorvas → atorvastatin)
- Misspelled (cumadin, lovanox, levothyroxin, hydrochlorothiazid)
- Controlled rows in manifest (morphine, hydromorphone, lorazepam)
- Wave 1 catalog codes in manifest
- Canonical-linked search unchanged (no `MedicationSearchAlias` writes in M1.6C)

## CI gate

```bash
pnpm --filter @medora/shared test
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- search
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api run build
pnpm verify:web
```

## Post-seed SQL (optional)

```sql
SELECT COUNT(*) FROM "MedicationAlias";
SELECT cm.code, COUNT(ma.id) AS alias_count
FROM "CatalogMedication" cm
LEFT JOIN "MedicationAlias" ma ON ma."catalogMedicationId" = cm.id
WHERE cm.code IN ('WARFARIN_5_MG_COMPRIME_ORAL', 'ENOXAPARIN_40_MG_PER_0.4_ML_INJECTABLE_INJECTION')
GROUP BY cm.code;
```

Expect `coumadin` / `lovenox` aliases present after seed.
