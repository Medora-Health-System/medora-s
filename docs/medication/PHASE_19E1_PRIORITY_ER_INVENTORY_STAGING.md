# Phase 19E.1 — Priority ER inventory extraction + duplicate reconciliation

**Status:** Staging-only import and pharmacy review queue.  
**Depends on:** Phase 19E.0 exact-source preservation rules.

## Upload access

1. **Admin UI:** `/app/admin/medication-inventory-staging` — multipart upload of `PHARMACY INVENTORY LIST (1).xlsx`
2. **API:** `POST /medication-master/import-priority-er-inventory?dryRun=true` (field `workbook`)
3. **Fixture path (optional):** `docs/medication/fixtures/PHARMACY INVENTORY LIST (1).xlsx` — see `fixtures/README.md`

Default: **dry-run** (no DB writes). Uncheck simulation in UI only after pharmacy review.

## Reconciliation categories (no auto-merge)

| Status | Meaning |
|--------|---------|
| `EXACT_MATCH` | Same normalized name + dose + form |
| `POSSIBLE_DUPLICATE` | Same name, uncertain/different dose or form |
| `REVIEW_REQUIRED` | Missing medication, dose, or form |
| `NEW_CANDIDATE` | No catalog match |

## Safety

- Writes **only** `MedicationFormularyImportStaging`
- `importGateStatus` = `BLOCKED`, `overallStatus` = `draft`
- `MANUAL_REVIEW_REQUIRED` on all inventory rows
- `BILLING_REVIEW_REQUIRED` + `NDC_REVIEW_REQUIRED` when codes absent
- No promotion, activation, ordering, MAR, billing, or inventory cutover
