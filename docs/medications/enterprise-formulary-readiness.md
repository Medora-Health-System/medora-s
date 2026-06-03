# Enterprise Formulary Readiness (M1.6A)

**Date:** 2026-06-02  
**Environment:** Railway staging (read-only audit)  
**Haiti canonical program:** **STABILIZED** (M1.5H PASS)

---

## Final decisions

| Decision | Result |
|----------|--------|
| **READY FOR ENTERPRISE FORMULARY EXPANSION** (full platform) | **NOT READY** |
| **READY FOR M1.6B Wave 1** (scoped expansion) | **READY (conditional)** |
| **HAITI MEDICATION ARCHITECTURE STABILIZED** | **YES** (staging) |
| **SAFE / NOT SAFE** | **SAFE (conditional)** / **NOT SAFE** for bulk enterprise cutover |

### Conditional means

- Architecture and quarantine gates are production-quality on staging.
- Wave 1 requires **clinical sign-off**, **M1.4B apply on catalog**, and **per-wave validation** before activation.
- Do **not** interpret as approval for national formulary, search cutover, or oncology module.

---

## Precondition matrix

| Gate | Staging | Required for M1.6B |
|------|---------|-------------------|
| M1.5R | **PASS** | Yes |
| M1.5E (192 links) | **PASS** | Yes |
| M1.5G validation | **PASS** (38 eligible) | Yes |
| M1.5H | **PASS** | Yes |
| M1.4B on catalog rows | **FAIL** (0 `billingCodeDefault`) | **Recommended fix before Wave 1** |
| Production parity | **NOT VERIFIED** | Required before Haiti production pilot |

---

## Part 12 — Enterprise readiness scorecard

| Dimension | Score | Notes |
|-----------|------:|-------|
| **Catalog completeness** | **38** | 247 Haiti + 39 PRI_ER vs ~2000+ enterprise ambulatory target |
| **Search readiness** | **58** | M1.5H 13/13 PASS; brand gaps anticoag/psych |
| **Billing readiness** | **42** | 38/192 M1.5E profiles; 0 catalog billing defaults |
| **Governance readiness** | **55** | Manifests strong; LASA not on DB |
| **Canonical architecture** | **92** | 192 M1.5E chains; 0 quarantine |
| **Activation readiness** | **68** | 38 pilot-ready; 192 inactive by design |
| **Enterprise formulary readiness** | **52** | Weighted mean |

### M1.5H stabilization scores (staging, for reference)

| Dimension | Score |
|-----------|------:|
| Linkage integrity | 95 |
| Search integrity | 90 |
| Billing integrity | 92 |
| Governance integrity | 85 |
| Quarantine integrity | 88 |
| Activation readiness (M1.5H scorer) | 63 |
| Enterprise readiness (M1.5H scorer) | 78 |

---

## Part-by-part readiness (M1.6A)

| Part | Topic | Verdict |
|------|-------|---------|
| 1 | Formulary inventory | **PASS** (documented) |
| 2 | Specialty coverage | **FAIL** enterprise breadth (~46 avg) |
| 3 | Top 100 gaps | **DOCUMENTED** |
| 4 | Anticoagulation | **FAIL** (heparin only) |
| 5 | Vaccines | **FAIL** (0 rows) |
| 6 | Chronic care | **PARTIAL** (~45) |
| 7 | Enterprise search | **PARTIAL** (58) |
| 8 | Billing | **PARTIAL** (42) |
| 9 | Governance | **PARTIAL** (55) |
| 10 | Expansion waves | **PASS** (roadmap) |
| 11 | Risk register | **PASS** (documented) |
| 12 | Scorecard | **PASS** |
| 13 | Final decision | **NOT READY** full / **READY** Wave 1 conditional |

---

## SAFE / NOT SAFE matrix

| Operation | Verdict |
|-----------|---------|
| Haiti 247-code clinical ordering | **SAFE (conditional)** |
| Staging M1.6B Wave 1 manifest + seed | **SAFE (conditional)** |
| M1.5G pilot activation (38 T1) on one facility | **SAFE (conditional)** |
| Apply M1.4B to existing Haiti rows on staging | **SAFE (recommended)** |
| Bulk import >100 meds without manifest | **NOT SAFE** |
| M1.5F provider search cutover | **NOT SAFE** |
| Wave 4 oncology without module | **NOT SAFE** |
| M1.6A full enterprise go-live | **NOT SAFE** |

---

## Blocking items before full enterprise readiness

1. **Wave 1–3 execution** — anticoag, vaccines, chronic, specialty rows with canonical linkage.
2. **M1.4B operational apply** — `billingCodeDefault`, `BillingCatalog`, NDC on packages.
3. **Governance persistence** — LASA groups, witness flags on new rows.
4. **Search alias program** — brand pairs for each wave (Coumadin, Lovenox, etc.).
5. **M1.5F audit** — per-wave search cutover decision.
6. **Production staging parity** — repeat M1.5H on production candidate DB.

---

## Recommended immediate next step

**M1.6B — Enterprise Formulary Wave 1**

- Anticoagulants (warfarin, enoxaparin, apixaban, rivaroxaban minimum)
- Vaccines (influenza, Tdap, pneumococcal, hepatitis B core)
- Chronic care core (atorvastatin, sertraline, lisinopril/ACE depth)

**Optional parallel:** Apply M1.4B billing remediation on staging for existing 247 Haiti codes before adding Wave 1 rows.

---

## CI / documentation (M1.6A)

| Artifact | Status |
|----------|--------|
| `enterprise-formulary-expansion-audit.md` | Created/updated |
| `enterprise-formulary-gap-register.md` | Created/updated |
| `enterprise-formulary-roadmap.md` | Created/updated |
| `enterprise-formulary-readiness.md` | Created/updated |
| Git commit | **Not performed** (audit only per scope) |

---

## Validation statement

- **Read-only** DB queries on Railway staging
- **No** writes, seeds, migrations, activations, search cutover, billing or governance code changes
