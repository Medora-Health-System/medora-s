# Wave 1 Production Postflight Report (Phase 2E.5B)

**Phase:** 2E.5B — post-run 1 validation  
**Date:** 2026-06-01  
**Environment:** Railway production (read-only validation after seed run 1)

---

## 1. Summary

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| **Postflight overall** | All pass | All pass | **PASS** |

---

## 2. Catalog counts

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging | **80** (43 + 37) | **80** | **PASS** |
| Wave 1 active rows | **37** | **37** | **PASS** |

---

## 3. Aliases

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Wave 1 alias rows | **41** | **41** | **PASS** |
| `XR_CHEST` — `chest 1v decub` | present | **present** | **PASS** |
| `XR_CHEST` — `chest post intubation` | present | **present** | **PASS** |

---

## 4. Classifier FK validation

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Required FKs (modality, body, contrast, laterality) on all 37 | Set | **0 incomplete** | **PASS** |
| `XR_RIBS_LEFT` subregion | `ANATOMIC_SUBREGION_RIBS` | **ANATOMIC_SUBREGION_RIBS** | **PASS** |
| `XR_RIBS_RIGHT` subregion | `ANATOMIC_SUBREGION_RIBS` | **ANATOMIC_SUBREGION_RIBS** | **PASS** |
| View / protocol / subregion per workbook | Applied | Verified via seed path + 0 null required slots | **PASS** |

---

## 5. MRI_SPINE governance

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** (unchanged) | **PASS** |

---

## 6. Retirement / successor safety

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `CT_HEAD` active | **false** | **false** | **PASS** |
| `CT_HEAD` recreated | No | No | **PASS** |
| Wave 1 inserted forbidden codes | No | **0** Wave 1 forbidden codes | **PASS** |
| `CT_ABD` duplicate rows | 1 row (baseline) | **1** | **PASS** (predecessor policy) |

**Note:** Baseline predecessors remain **active** as designed until Phase 2D (`CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA`) — not Wave 1 inserts.

| Code | Active (baseline predecessor) |
|------|------------------------------|
| `CT_ABD` | yes |
| `DOPPLER_VEIN` | yes |
| `US_ABD` | yes |
| `CT_CHEST_CTA` | yes |

---

## 7. Billing safety

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Wave 1 `billingCodeDefault` set | **0** | **0** | **PASS** |

---

## 8. Postflight verdict

| Field | Value |
|-------|--------|
| **Postflight** | **PASS** |
| **Safe to proceed to idempotency run** | **Yes** |

---

*Validated immediately after production seed run 1.*
