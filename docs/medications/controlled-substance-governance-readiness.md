# Controlled Substance Governance — Readiness (M1.3C)

**Phase:** M1.3C  
**Date:** 2026-05-31  

---

## Readiness verdict

| Area | Status |
|------|--------|
| Schema | **READY** — no migration required |
| Manifest | **READY** — 16 rows, 9 APPLY |
| Validation | **READY** |
| Idempotent seed | **READY** |
| Production deploy | **NOT READY** — local/dev seed only |
| Clinical sign-off | **PARTIAL** — tramadol + missing catalog rows pending |

**SAFE / NOT SAFE**

| Scope | Verdict |
|-------|---------|
| M1.3C implementation merge | **SAFE (conditional)** — scoped catalog flag backfill only |
| Enterprise controlled program closure | **NOT SAFE** — 5 molecules absent; tramadol not applied; no order/MAR enforcement |

---

## Coverage vs M1.1B audit list

| Substance | Catalog | M1.3C action |
|-----------|---------|--------------|
| Morphine | Yes | APPLY II |
| Hydromorphone | Yes | APPLY II |
| Fentanyl | Yes | APPLY II |
| Ketamine | Yes | APPLY III |
| Midazolam | Yes | APPLY IV |
| Lorazepam injectable | Yes | APPLY IV |
| Lorazepam oral | Yes | APPLY IV (fixes gap) |
| Diazepam oral/injectable | Yes | APPLY IV (fixes gap) |
| Tramadol | Yes | **MANUAL_REVIEW** (not applied) |
| Hydrocodone | No | MISSING_CATALOG |
| Oxycodone | No | MISSING_CATALOG |
| Codeine | No | MISSING_CATALOG |
| Alprazolam | No | MISSING_CATALOG |
| Clonazepam | No | MISSING_CATALOG |

---

## Post-M1.3C local verification

After `prisma:seed-catalogs` on dev DB, expect:

- Diazepam / oral lorazepam: `isControlled=true`, schedule `IV`
- Tramadol: unchanged (manual review)
- Morphine / fentanyl / hydromorphone: remain controlled II

Read-only check (optional):

```sql
SELECT code, "genericName", "isControlled", "controlledSchedule"
FROM "CatalogMedication"
WHERE LOWER("genericName") IN (
  'morphine','hydromorphone','fentanyl','tramadol',
  'lorazepam','diazepam','ketamine','midazolam'
)
ORDER BY "genericName", code;
```

---

## Next phases

| Phase | Focus |
|-------|--------|
| M1.3D | High-alert governance |
| M1.3E | LASA |
| Clinical | Tramadol schedule decision → move to APPLY or keep excluded |
| Formulary | Missing opioid/benzo import (explicit scope, not M1.3C) |
