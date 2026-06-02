# LASA Medication Governance — Readiness (M1.3E)

**Phase:** M1.3E  
**Date:** 2026-05-31  

---

## Readiness verdict

| Area | Status |
|------|--------|
| Schema (MVP) | **READY (partial)** — `lasaGroupId` + JSON merge |
| Manifest | **READY** — 8 groups, 8 APPLY members |
| Validation | **READY** |
| Idempotent seed | **READY** |
| Production deploy | **NOT READY** |
| LASA program closure | **PARTIAL** — profiles only when pre-existing; insulin/steroid groups not applied |

**SAFE / NOT SAFE**

| Scope | Verdict |
|-------|---------|
| M1.3E merge | **SAFE (conditional)** — profile `lasaGroupId` + JSON merge only |
| Enterprise LASA program | **NOT SAFE** — no profile rows in typical dev DB; 4 missing pairs; no order/search enforcement |

---

## Coverage vs M1.1B / soft warnings

| Pair | Catalog | M1.3E |
|------|---------|-------|
| Morphine / hydromorphone | Yes | APPLY LASA_HIGH |
| Epinephrine / norepinephrine | Yes | APPLY LASA_HIGH |
| Dopamine / dobutamine | Yes | APPLY LASA_HIGH |
| Cefazolin / ceftriaxone | Yes | APPLY LASA_MEDIUM |
| Insulin types | Yes | **MANUAL_REVIEW** |
| Prednisone / prednisolone | Yes | **MANUAL_REVIEW** |
| Hydralazine / hydroxyzine | No | **MISSING_CATALOG** |
| Clonidine / clonazepam | No | **MISSING_CATALOG** |

Soft `LASA_PAIRS` in `medicationSafetyWarnings.ts` remain; structured governance is additive.

---

## Post-M1.3E verification

```sql
SELECT cm.code, cm."genericName", msp."lasaGroupId", msp."highAlertCategories"->'lasa' AS lasa
FROM "CatalogMedication" cm
LEFT JOIN "MedicationProduct" mp ON mp."legacyCatalogMedicationId" = cm.id
LEFT JOIN "MedicationSafetyProfile" msp ON msp."conceptId" = mp."conceptId"
WHERE msp."lasaGroupId" IS NOT NULL
ORDER BY msp."lasaGroupId", cm.code;
```

---

## Next phases

| Phase | Focus |
|-------|--------|
| M1.3E-M1 | `isLASA` + catalog `lasaGroupId` columns |
| Clinical | Insulin / prednisone group sign-off → APPLY |
| Formulary | Hydralazine, hydroxyzine, clonidine, clonazepam import (explicit scope) |
