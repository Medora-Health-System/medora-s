# High-Alert Medication Governance — Readiness (M1.3D)

**Phase:** M1.3D  
**Date:** 2026-05-31  

---

## Readiness verdict

| Area | Status |
|------|--------|
| Schema (MVP) | **READY (partial)** — `isHighAlert` + JSON; no dedicated `highAlertClass` column |
| Manifest | **READY** — 33 rows, 23 APPLY |
| Validation | **READY** |
| Idempotent seed | **READY** |
| Production deploy | **NOT READY** — local/dev seed only |
| ISMP program closure | **PARTIAL** — 8 agents absent; tramadol pending; no order/MAR enforcement |

**SAFE / NOT SAFE**

| Scope | Verdict |
|-------|---------|
| M1.3D implementation merge | **SAFE (conditional)** — scoped profile/catalog witness backfill only |
| Enterprise high-alert program | **NOT SAFE** — profiles only when pre-existing; soft warnings still primary UX |

---

## Coverage vs M1.1B audit

| Group | Catalog | M1.3D |
|-------|---------|-------|
| Insulin (3 SKUs) | Yes | APPLY |
| Heparin | Yes | APPLY |
| Opioids (morphine, hydromorphone, fentanyl) | Yes | APPLY (+ M1.3C controlled) |
| Benzodiazepines | Yes | APPLY |
| Sedatives (midazolam, propofol, ketamine) | Yes | APPLY |
| Vasopressors (6) | Yes | APPLY |
| Amiodarone | Yes | APPLY |
| NMBAs | Yes | APPLY |
| Tramadol | Yes | **MANUAL_REVIEW** |
| Warfarin / enoxaparin / DOACs / basal insulin / tPA | No | **MISSING_CATALOG** |

---

## Post-M1.3D local verification

After `prisma:seed-catalogs` on dev DB:

- `MedicationSafetyProfile.isHighAlert` should be `true` where profiles exist for manifest APPLY rows
- `highAlertCategories` JSON should include `highAlertClass` + `safetyRequirements`
- Catalog witness/double-sign may increase for insulin/opioid/vasopressor rows (OR merge with M1.3C)

Optional read-only SQL:

```sql
SELECT cm.code, cm."genericName", msp."isHighAlert", msp."highAlertCategories"
FROM "CatalogMedication" cm
LEFT JOIN "MedicationProduct" mp ON mp."legacyCatalogMedicationId" = cm.id
LEFT JOIN "MedicationSafetyProfile" msp ON msp."conceptId" = mp."conceptId"
WHERE LOWER(cm."genericName") IN (
  'heparin','morphine','regular insulin','norepinephrine','propofol'
)
ORDER BY cm."genericName", cm.code;
```

---

## Next phases

| Phase | Focus |
|-------|--------|
| M1.3D-M1 | Dedicated `highAlertClass` + safety-requirement boolean columns |
| M1.3E | LASA governance |
| Clinical | Tramadol HA classification sign-off |
| Formulary | Missing anticoagulant / insulin / tPA import (explicit scope) |
