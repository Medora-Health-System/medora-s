# Medication Safety Classifier Foundation (M1.3B)

**Phase:** M1.3B — implementation (reference vocabulary only)  
**Date:** 2026-05-31  
**Authority:** [medication-governance-authorization.md](./medication-governance-authorization.md) (M1.3A)

---

## Summary

M1.3B adds **shared TypeScript classifiers** and optional **TermClassifier seed** for medication safety governance. No medication rows, orders, MAR, or search behavior are changed.

---

## Classifier domains

| Domain | Count | Codes |
|--------|------:|-------|
| `CONTROLLED_SUBSTANCE` | 6 | `CONTROLLED_NONE` … `CONTROLLED_OTHER` |
| `HIGH_ALERT` | 12 | `HIGH_ALERT_NONE` … `HIGH_ALERT_OTHER` |
| `SAFETY_REQUIREMENT` | 11 | `REQUIRES_*` workflow flags |
| `LASA` | 4 | `LASA_NONE` … `LASA_HIGH` |
| **Total** | **33** | |

---

## Code locations

| Path | Role |
|------|------|
| `packages/shared/src/medication/medicationSafetyClassifiers.ts` | Enums, Zod, parsers |
| `packages/shared/src/medication/medicationSafetyClassifierValidation.ts` | Manifest validation |
| `packages/shared/src/medication/medicationSafetyClassifierManifest.ts` | Seed manifest + labels |
| `apps/api/prisma/helpers/seed-medication-safety-classifiers.ts` | Idempotent TermClassifier upsert |
| `apps/api/prisma/seed-catalogs.ts` | Wires seed after MRV classifiers |

---

## Seed

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

Upserts **only** `TermClassifier`, `TermClassifierLabel`, `TermClassifierAlias` for the four domains above.

---

## Migration

**Not required** — reuses existing `TermClassifier` tables from Phase 2B.2.

---

## Next phase

**M1.3C** — assign controlled classes to `MedicationSafetyProfile` / catalog (clinical manifest required).
