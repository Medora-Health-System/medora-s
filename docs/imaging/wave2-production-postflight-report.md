# Wave 2 Production Postflight Report (Phase 2E.6D)

**Phase:** 2E.6D — post-run 1 validation · finalized **2E.6D.1** (2026-06-01)  
**Date:** 2026-06-01  
**Environment:** Railway production (read-only after seed run 1)  
**Execution docs commit:** `9584c75d`

**Stabilization audit:** [`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md) (Phase 2E.6E)

---

## 1. Summary

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| **Postflight overall** | All pass | **17/17 pass** | **PASS** |
| **Production safety** | SAFE | **SAFE** | **PASS** |

**Status:** Postflight **executed** on production immediately after seed run 1.

### Validation command

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave2-staging-validation.ts
```

(Run with production `DATABASE_URL`.)

### Validation JSON summary

```json
{
  "summary": {
    "pass": true,
    "checksTotal": 17,
    "checksFailed": 0,
    "wave2Studies": 61,
    "wave2Aliases": 85,
    "totalActiveImaging": 141
  }
}
```

### Full check list

| # | Check | Pass | Detail |
|---|-------|:----:|--------|
| 1 | Wave 2 row count | ✓ | found 61 (expected 61) |
| 2 | XR-2 / CT-2 / US-1 manifest batches | ✓ | manifest 53/4/4 |
| 3 | All Wave 2 rows active | ✓ | 61 active |
| 4 | Wave 2 alias rows present | ✓ | found 85 (expected ~65+) |
| 5 | REQUIRED calcaneus aliases | ✓ | left=3 |
| 6 | Classifier FK completeness (61/61) | ✓ | 61/61 complete |
| 7 | CT_HEAD remains inactive | ✓ | isActive=false |
| 8 | MRI_SPINE contrast null | ✓ | contrastTypeClassifierId=null |
| 9 | Wave 1 unchanged (37 active) | ✓ | active=37 |
| 10 | Active catalog growth (80 + 61 wave2) | ✓ | active=141 (expected 141) |
| 11 | US tuple — US_ABDOMEN limited protocol | ✓ | PROTOCOL_US_ABDOMEN_LIMITED |
| 12 | Search: os calcis left | ✓ | XR_CALCANEUS_LEFT_2V |
| 13 | Search: ankle left | ✓ | XR_ANKLE_LEFT_2V, XR_ANKLE_LEFT_3V |
| 14 | Search: cta lower extremity left | ✓ | CTA_LOWER_EXTREMITY_LEFT |
| 15 | Search: thyroid ultrasound | ✓ | US_THYROID |
| 16 | CT_HEAD not in active search results | ✓ | CT_HEAD_WO_CONTRAST, CT_HEAD_W_CONTRAST |
| 17 | US tuple pass manifest count | ✓ | 15 |

---

## 2. Catalog counts

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging | **141** (80 + 61) | **141** | **PASS** |
| Wave 1 active rows | **37** | **37** | **PASS** |
| Wave 2 active rows | **61** | **61** | **PASS** |

| Batch | Expected active | Actual | Result |
|-------|----------------:|--------|--------|
| XR-2 | **53** | **53** | **PASS** |
| CT-2 | **4** | **4** | **PASS** |
| US-1 | **4** | **4** | **PASS** |

---

## 3. Aliases

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Wave 2 alias rows | **≥ 85** | **85** | **PASS** |
| Wave 1 alias rows | **41** (unchanged) | **41** | **PASS** |
| `XR_CHEST` tuple aliases | **2** | **2** | **PASS** |

---

## 4. US tuple pass

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Tuple mappings applied | **15** | **15** | **PASS** |
| Tuple aliases (run 1) | **31** | **31** | **PASS** |
| `US_ABDOMEN` → `PROTOCOL_US_ABDOMEN_LIMITED` | set | set | **PASS** |
| `US_SOFT` → `PROTOCOL_US_NECK_THYROID` | set | set | **PASS** |

---

## 5. Classifier FK validation

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Required FKs on all 61 Wave 2 rows | Complete | **61/61** | **PASS** |
| XR-2 view count FKs | **53/53** | **53/53** | **PASS** |
| CT/US view count null | yes | yes | **PASS** |

---

## 6. Governance regression

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** | **PASS** |
| `CT_HEAD` active | **false** | **false** | **PASS** |
| Wave 1 unchanged | **37** active | **37** | **PASS** |
| Duplicate active `code` | **0** | **0** | **PASS** |
| Wave 2 `billingCodeDefault` set | **0** | **0** | **PASS** |

---

## 7. Search smoke

| Query | Expected hit | Actual | Result |
|-------|----------------|--------|--------|
| `os calcis left` | `XR_CALCANEUS_LEFT_2V` | `XR_CALCANEUS_LEFT_2V` | **PASS** |
| `ankle left` | `XR_ANKLE_LEFT_*` | `XR_ANKLE_LEFT_2V`, `XR_ANKLE_LEFT_3V` | **PASS** |
| `cta lower extremity left` | `CTA_LOWER_EXTREMITY_LEFT` | `CTA_LOWER_EXTREMITY_LEFT` | **PASS** |
| `thyroid ultrasound` | `US_THYROID` | `US_THYROID` | **PASS** |
| `ct head` | no `CT_HEAD` | successors only | **PASS** |

---

## 8. Postflight verdict

| Field | Value |
|-------|--------|
| **Postflight** | **PASS** |
| **Safe to proceed to idempotency run** | **Yes** |
| **Production safety** | **SAFE** |

---

*Phase 2E.6D postflight complete. Idempotency: [`wave2-production-idempotency-report.md`](wave2-production-idempotency-report.md).*
