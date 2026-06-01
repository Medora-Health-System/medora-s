# Wave 4 Production Postflight Report (Phase 2E.8D)

**Phase:** 2E.8D — post-run 1 validation  
**Date:** 2026-06-01  
**Environment:** Railway production (read-only after seed run 1)

---

## 1. Summary

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| **Postflight overall** | All pass | **22/22 PASS** | **PASS** |
| **`summary.pass`** | **true** | **true** | **PASS** |
| **`checksFailed`** | **0** | **0** | **PASS** |
| **`wave4Studies`** | **31** | **31** | **PASS** |
| **`wave4Aliases`** | **72** | **72** | **PASS** |
| **`totalActiveImaging`** | **213** | **213** | **PASS** |
| **Production safety** | SAFE | **SAFE** | **PASS** |

---

## 2. Validation command (after run 1)

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave4-staging-validation.ts
```

Executed with production `DATABASE_URL`.

### Actual JSON summary (post-seed)

```json
{
  "summary": {
    "pass": true,
    "checksTotal": 22,
    "checksFailed": 0,
    "wave4Studies": 31,
    "wave4Aliases": 72,
    "totalActiveImaging": 213
  }
}
```

### Check results (all pass)

| # | Check | Detail |
|---|-------|--------|
| 1 | Wave 4 row count | found **31** |
| 2 | XR-3 / CT-3 manifest batches | XR-3=**7** CT-3=**24** |
| 3 | All Wave 4 active | **31** active |
| 4 | Wave 4 aliases | **72** |
| 5 | Classifier FK | **31/31** |
| 6 | CT_HEAD inactive | isActive=false |
| 7 | MRI_SPINE contrast null | null |
| 8 | Wave 1 unchanged | **37** |
| 9 | Wave 2 unchanged | **61** |
| 10 | Wave 3 unchanged | **41** |
| 11 | Active imaging | **213** (182 + 31) |
| 12 | Forbidden / predecessor | PASS |
| 13 | CTA extremity unchanged | active=**2** |
| 14 | Search: ac joint left | `XR_AC_JOINT_LEFT_2V` |
| 15 | Search: clavicule gauche | `XR_CLAVICLE_LEFT_2V` |
| 16 | Search: scapula gauche | `XR_SCAPULA_LEFT` |
| 17 | Search: ct sinus | `CT_SINUSES_WO_CONTRAST` |
| 18 | Search: TDM orbites | `CT_ORBITS_WO_CONTRAST` |
| 19 | Search: soft tissue neck | `CT_STN_*` |
| 20 | Search: ct knee left | `CT_KNEE_LEFT_WO_CONTRAST` |
| 21 | Search: perfusion cérébrale | `CT_BRAIN_PERFUSION` |
| 22 | CT_HEAD not in search | successors only |

---

## 3. Governance regression

| Invariant | Result |
|-----------|--------|
| `CT_HEAD` inactive | **PASS** |
| `MRI_SPINE` contrast **NULL** | **PASS** |
| No forbidden code expansion | **PASS** |
| Waves 1–3 counts preserved | **PASS** |

---

## 4. Verdict

| Field | Value |
|-------|--------|
| **Postflight status** | **SUCCESS** |
| **Production safety** | **SAFE** |

---

*Proceed to idempotency run 2 — [`wave4-production-idempotency-report.md`](wave4-production-idempotency-report.md)*
