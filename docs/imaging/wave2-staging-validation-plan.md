# Wave 2 Staging Validation Plan (Phase 2E.6A)

**Phase:** 2E.6A — design only  
**Date:** 2026-05-31  
**Baseline:** **80** active imaging (production) → **141** after Wave 2 seed on staging (`80 + 61`)

---

## 1. Validation domains

### 1.1 Catalog validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Rows with `wave=2` codes | **61** | Exact match to workbook |
| Active Wave 2 rows after seed | **61** | `isActive=true` |
| Total active imaging | **141** | 80 + 61 |
| Duplicate `code` (global) | **0** new | Preflight query |
| Forbidden inserts | **0** | No `CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA` |
| Wave 1 rows unchanged | **37** active | Count + spot FK |
| Haiti 44 unchanged | **43** active (+ inactive `CT_HEAD`) | Count policy |

### 1.2 Alias validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| REQUIRED calcaneus aliases | ≥3 per code | Search resolves `Os Calcis` labels |
| Wave 2 alias rows created | ~65–85 (est.) | Within 20% of plan or documented delta |
| No alias to retired codes | — | Audit query |
| No new global duplicate alias conflicts | 0 **new** | Compare to pre-seed baseline |

### 1.3 Classifier validation

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Modality / body / contrast / laterality | 61/61 set | FK not null |
| XR view count (XR-2) | 53/53 set | `viewCountClassifierId` where workbook has `viewCount` |
| CT/CTA / US view count | null FK | NOT_APPLICABLE |
| US subregion (thyroid, aorta, bladder) | 3/3 set | Per workbook |
| `MRI_SPINE` unchanged | contrast FK **null** | B1B regression |
| `CT_HEAD` unchanged | inactive | No reactivation |
| Seed idempotent | 2nd run | 0 new rows; 0 duplicate aliases |

### 1.4 Search validation (smoke)

| Query | Expected hit (any) |
|-------|-------------------|
| `ankle left` | `XR_ANKLE_LEFT_2V` or `XR_ANKLE_LEFT_3V` |
| `os calcis left` | `XR_CALCANEUS_LEFT_2V` |
| `cta lower extremity` | `CTA_LOWER_EXTREMITY_*` |
| `thyroid ultrasound` / `échographie thyroïde` | `US_THYROID` |
| `ct head` | `CT_HEAD_WO_CONTRAST` (no `CT_HEAD`) |

### 1.5 Retirement validation

| Test | Pass criteria |
|------|---------------|
| `CT_HEAD` not orderable | inactive |
| Predecessors until 2D | `CT_ABD`, `US_ABD`, `DOPPLER_VEIN`, `CT_CHEST_CTA` policy unchanged |
| CTA extremity vs chest CTA | `CTA_LOWER_*` ≠ `CTA_CHEST` |

### 1.6 US tuple validation (parallel)

| Test | Expected | Pass criteria |
|------|----------|---------------|
| Tuple protocols on legacy US codes | **15** | Per [`ultrasound-expansion-candidate-list.md`](ultrasound-expansion-candidate-list.md) |
| No new `US_ABD` row | **0** | `AVOID_US_ABD` governance |

### 1.7 Billing validation

| Test | Pass criteria |
|------|---------------|
| All 61 `PENDING_CPT_REVIEW` | No priced CPT auto-applied |
| `billingCodeDefault` null on Wave 2 | 61/61 |

### 1.8 Idempotency validation

| Test | Pass criteria |
|------|---------------|
| Re-run staging seed | `61 studies, 0 aliases` (or documented alias idempotency) |
| Active count stable | **141** |

---

## 2. Expected outcomes

| Outcome | When |
|---------|------|
| **PASS** | All §1.1–1.6, §1.8 pass; §1.7 confirms deferred billing |
| **FAIL** | Any duplicate code; `MRI_SPINE` contrast set; `CT_HEAD` active; forbidden insert; classifier missing on required slot |
| **CONDITIONAL PASS** | REQUIRED calcaneus aliases + US tuple incomplete; OPTIONAL aliases partial |

---

## 3. Evidence required (2E.6B)

| Artifact | Owner |
|----------|-------|
| Preflight + postflight count output | Engineering |
| `wave1-staging-validation.ts` equivalent for Wave 2 | Engineering |
| US tuple checklist (15) | QA + Clinical |
| Signed smoke checklist | QA + Clinical |

---

*No staging execution in 2E.6A.*
