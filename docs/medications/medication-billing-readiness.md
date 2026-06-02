# Medication Billing Readiness (M1.4A)

**Program:** Enterprise Medication Billing & Revenue Integrity  
**Phase:** M1.4A  
**Date:** 2026-06-02  

---

## Readiness verdict

| Question | Answer |
|----------|--------|
| **Medication Billing Foundation VERIFIED** | **Yes** — for **clinic MVP** charge capture architecture |
| **Medication Billing Foundation NOT VERIFIED** | **Yes** — for **enterprise / payer-automated** billing |
| **Medication Governance Rollout blocked by billing?** | **No** — governance can deploy; billing review remains manual |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |

---

## Readiness scores (0–100)

Rubrics: **80+** production-ready · **60–79** MVP with documented gaps · **40–59** partial · **&lt;40** not ready

### By domain

| Domain | Score | Rationale |
|--------|-------|-----------|
| **Medication billing** | **62** | MAR + dispense capture; auto HCPCS; huge map gap |
| **Infusion billing** | **48** | Session + duration; no auto infusion CPT; manual review |
| **Pharmacy billing** | **55** | Dispense capture; no verify/dispensing fees |
| **Revenue integrity** | **58** | Ledger + idempotency; leakage on map/NDC/waste |
| **Enterprise readiness** | **52** | Weighted mean |

### By care setting

| Setting | Medication | Infusion | Pharmacy | Revenue integrity | Notes |
|---------|------------|----------|----------|-------------------|-------|
| **Clinic MVP (Haiti)** | 62 | 48 | 55 | 58 | Primary pilot; manual review OK |
| **Urgent care** | 58 | 45 | 52 | 55 | Similar to clinic |
| **ER** | 65 | 52 | 50 | 60 | Strongest MAR/infusion paths |
| **Observation** | 60 | 50 | 50 | 58 | Infusion duration relevant |
| **Hospital / inpatient** | 42 | 40 | 45 | 45 | No MAR scheduling; weak infusion codes |
| **Infusion center** | 38 | 35 | 40 | 40 | Time/unit automation missing |
| **Specialty clinic** | 45 | 38 | 48 | 48 | Chemo/biologics not ready |

---

## What is verified (foundation)

| Capability | Status |
|------------|--------|
| Schema for NDC, HCPCS suggestions, billing quantities | ✅ |
| MAR administration → billing capture candidate | ✅ |
| MAR administration → auto `BillingEvent` (catalog map) | ✅ |
| Pharmacy dispense → capture candidate | ✅ |
| BillingCaptureV1 → ledger sync | ✅ |
| Route-based administration CPT companion (96372/96374) | ✅ |
| Infusion START/STOP clinical model | ✅ |
| Infusion billing suggestion (rules engine) | ✅ |
| Claim/export consumes medication capture types | ✅ |
| Governance programs do not break billing | ✅ |

---

## What is not verified (enterprise blockers)

| Blocker | Impact |
|---------|--------|
| **~4** seeded `MEDICATION` `BillingCatalog` keys vs ~260 catalog meds | Auto HCPCS fails open |
| `billingCodeDefault` not backfilled on Haiti seed | Enrichment gap |
| `MedicationProduct` / `Package` not written on MAR | Canonical billing path dormant |
| `MedicationBillingProfile` not driving auto map | Package-level HCPCS unused |
| No waste billing | Revenue + compliance gap |
| No eMAR → no scheduled-dose billing | Enterprise inpatient gap |
| Infusion HCPCS/CPT not auto-selected | High leakage on IV meds |
| No J-code unit calculation | Payer under/over pay risk |
| Controlled schedule not on billing line | Reporting gap |
| Chemo / blood product programs absent | Specialty blockers |

---

## Dependency checklist (operators)

| Step | Required for billing accuracy | Status |
|------|------------------------------|--------|
| `BillingCatalog` seeded (`seed-billing-catalog`) | Auto HCPCS map | ☐ Verify on env |
| Haiti medication catalog present | Lookup keys | ☐ |
| Optional: `medication-ndc-mappings` / NDC backfill | Claim identity | ☐ |
| Billing review workflow for `needs_review` | Close revenue loop | ☐ Process |
| Do **not** assume governance seed = billing seed | Separate scripts | ℹ️ |

---

## Relationship to M1.3 governance program

| Program | Interaction |
|---------|-------------|
| M1.3B–E (classifiers, catalog flags) | Improves **eligibility** for governance; indirect for billing codes |
| M1.3F (MAR governance) | **No billing change** — safe to deploy before M1.4B |
| M1.3F.8 (legal chart) | Surfaces governance on export; not billing codes |

**Recommendation:** Deploy governance first; run **M1.4B** mapping remediation in parallel or immediately after.

---

## Next phase

**M1.4B — Medication Billing Mapping Remediation**

Scope (future, not M1.4A):

- Expand `BillingCatalog` MEDICATION keys toward Haiti catalog coverage
- Populate `CatalogMedication.billingCodeDefault` where clinically validated
- Wire `MedicationBillingProfile` read path into `mapMedicationToBillingCode`
- NDC backfill report → execution plan
- Document unmapped formulary exceptions

Alternatives:

- **M1.4C** — if product insists capture dedupe / UX before maps
- **M1.4D** — after maps exist for top infusion drugs

---

## Sign-off template

| Role | Billing foundation (MVP) | Enterprise billing |
|------|--------------------------|-------------------|
| Engineering | ☐ VERIFIED ☐ NOT | ☐ VERIFIED ☐ NOT |
| Revenue cycle | ☐ VERIFIED ☐ NOT | ☐ VERIFIED ☐ NOT |
| Clinical lead | ☐ VERIFIED ☐ NOT | ☐ VERIFIED ☐ NOT |

---

## Related documents

- [medication-billing-coding-audit.md](./medication-billing-coding-audit.md)
- [medication-revenue-integrity-audit.md](./medication-revenue-integrity-audit.md)
- [medication-governance-production-rollout-audit.md](./medication-governance-production-rollout-audit.md)
- [medication-production-readiness.md](./medication-production-readiness.md) (M1.1B baseline scores)
