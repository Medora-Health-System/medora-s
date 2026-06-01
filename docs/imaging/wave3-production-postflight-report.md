# Wave 3 Production Postflight Report (Phase 2E.7D)

**Phase:** 2E.7D — post-run 1 validation  
**Date:** 2026-06-01  
**Environment:** Railway production (read-only after seed run 1)

---

## 1. Summary

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| **Postflight overall** | All pass | *Not run* | **PENDING** |
| **Production safety** | SAFE | — | **PENDING** |

**Status:** Postflight **not executed** in agent session — production seed run 1 did not complete (no production DB access).

---

## 2. Validation command (after run 1)

```bash
export DATABASE_URL="<production-connection-string>"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave3-staging-validation.ts
```

### Expected JSON summary (post-seed)

```json
{
  "summary": {
    "pass": true,
    "checksTotal": 19,
    "checksFailed": 0,
    "wave3Studies": 41,
    "wave3Aliases": 86,
    "totalActiveImaging": 182
  }
}
```

### Expected checks (all pass)

| # | Check | Expected detail |
|---|-------|-----------------|
| 1 | Wave 3 row count | 41 |
| 2 | Manifest batches | 14/5/10/3/4/5 |
| 3 | All Wave 3 active | 41 |
| 4 | Wave 3 aliases | ≥ 86 |
| 5 | Classifier FK | 41/41 |
| 6 | CT_HEAD inactive | isActive=false |
| 7 | MRI_SPINE contrast null | null |
| 8 | Wave 1 unchanged | 37 |
| 9 | Wave 2 unchanged | 61 |
| 10 | Active imaging | 182 |
| 11 | Forbidden / predecessor | DOPPLER_VEIN=1, no LE splits |
| 12 | MRA-1 active | 5 |
| 13–18 | Search smoke | MRI knee, MRA carotid wo, carotid duplex, breast US, HIDA, FL esophagram |
| 19 | CT_HEAD not in search | successors only |

---

## 3. Catalog counts (expected after successful run 1)

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging | **182** | — | **PENDING** |
| Wave 1 active | **37** | — | **PENDING** |
| Wave 2 active | **61** | — | **PENDING** |
| Wave 3 active | **41** | — | **PENDING** |

| Batch | Expected active |
|-------|----------------:|
| MRI-2 | **14** |
| MRA-1 | **5** |
| US-2 | **10** |
| US-3 | **3** |
| FL-1 | **4** |
| NM-1 | **5** |

---

## 4. Governance regression (expected PASS)

| Check | Expected |
|-------|----------|
| `CT_HEAD` inactive | **false** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** |
| Wave 1 / Wave 2 unchanged | **37** / **61** |
| Forbidden codes | No new `US_ABD`, `DOPPLER_VEIN`, etc. |
| Wave 3 `billingCodeDefault` set | **0** |

---

## 5. Staging reference (2E.7B — not production)

Full validation **PASS** on local staging DB after Wave 3 seed (`d080595d`):

- `summary.pass: true` · `checksFailed: 0`
- `wave3Studies: 41` · `wave3Aliases: 86` · `totalActiveImaging: 182`

---

## 6. Postflight verdict

| Field | Value |
|-------|--------|
| **Postflight** | **PENDING** |
| **Safe to proceed to idempotency run** | **No** (seed not confirmed) |

---

*Update after operator completes 2E.7D run 1 on production.*
