# Wave 2 Production Postflight Report (Phase 2E.6D)

**Phase:** 2E.6D — post-run 1 validation  
**Date:** 2026-06-01  
**Environment:** Railway production (read-only after seed run 1)

---

## 1. Summary

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| **Postflight overall** | All pass | *Not run* | **PENDING** |

**Status:** Postflight **not executed** — production seed run 1 did not complete in agent session (Railway CLI unauthorized).

---

## 2. Catalog counts (expected after successful run 1)

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging | **141** (80 + 61) | — | **PENDING** |
| Wave 1 active rows | **37** | — | **PENDING** |
| Wave 2 active rows | **61** | — | **PENDING** |

| Batch | Expected active |
|-------|----------------:|
| XR-2 | **53** |
| CT-2 | **4** |
| US-1 | **4** |

---

## 3. Aliases

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Wave 2 alias rows | **≥ 85** | — | **PENDING** |
| Wave 1 alias rows | **41** (unchanged) | — | **PENDING** |
| `XR_CHEST` tuple aliases | **2** | — | **PENDING** |

---

## 4. US tuple pass

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Tuple mappings applied | **15** | — | **PENDING** |
| Tuple aliases (run 1) | **~31** | — | **PENDING** |
| `US_ABDOMEN` → `PROTOCOL_US_ABDOMEN_LIMITED` | set | — | **PENDING** |
| `US_SOFT` → `PROTOCOL_US_NECK_THYROID` | set | — | **PENDING** |

---

## 5. Classifier FK validation

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Required FKs on all 61 Wave 2 rows | Complete | — | **PENDING** |
| XR-2 view count FKs | **53/53** | — | **PENDING** |
| CT/US view count null | yes | — | **PENDING** |

---

## 6. Governance regression

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | — | **PENDING** |
| `CT_HEAD` active | **false** | — | **PENDING** |
| Wave 1 unchanged | **37** active | — | **PENDING** |
| Duplicate active `code` | **0** | — | **PENDING** |
| Wave 2 `billingCodeDefault` set | **0** | — | **PENDING** |

---

## 7. Validation command (after run 1)

```bash
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave2-staging-validation.ts
'
```

**Expected:** `summary.pass: true` · `wave2Studies: 61` · `totalActiveImaging: 141` · all checks pass.

**Staging reference (2E.6B local):** Full script **PASS** post-seed.

---

## 8. Search smoke (expected PASS post-seed)

| Query | Expected hit |
|-------|----------------|
| `os calcis left` | `XR_CALCANEUS_LEFT_2V` |
| `ankle left` | `XR_ANKLE_LEFT_*` |
| `cta lower extremity left` | `CTA_LOWER_EXTREMITY_LEFT` |
| `thyroid ultrasound` | `US_THYROID` |
| `ct head` | no `CT_HEAD` |

---

## 9. Postflight verdict

| Field | Value |
|-------|--------|
| **Postflight** | **PENDING** |
| **Safe to proceed to idempotency run** | **No** (seed not confirmed) |

---

*Update after operator completes 2E.6D seed run 1.*
