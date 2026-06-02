# MAR / eMAR — Risk Register (M1.3F)

**Phase:** M1.3F (audit + design only)  
**Date:** 2026-05-31  

---

## Part 12 — Top 20 MAR/eMAR risks

| # | Risk | Severity | Mitigation | Future phase |
|---|------|----------|------------|--------------|
| 1 | Wrong patient administration | **Critical** | Encounter-scoped MAR; future BCMA patient scan | M1.3F.2+ / enterprise BCMA |
| 2 | Wrong medication selected | **Critical** | Catalog-backed orders; LASA ack; future scan | M1.3F.6, BCMA |
| 3 | Wrong dose administered | **Critical** | Structured dose fields; profile max dose; double-check | M1.3F.5, M1.3D enforcement |
| 4 | Wrong route (IV vs IM) | **High** | Route snapshot on order + MAR; warnings | M1.3F.3 |
| 5 | Wrong time (early/late) | **High** | Timing safety soft rules; eMAR due windows | M1.3F.2 |
| 6 | Undocumented controlled waste | **Critical** | Waste EDOC + MAR waste state + witness | M1.3F.4 |
| 7 | Missing witness for Schedule II | **Critical** | `requiresDoubleSign` + EDOC witness gate | M1.3F.4 |
| 8 | Missing independent double-check (insulin) | **Critical** | HA verification EDOC; profile enforcement | M1.3F.5 |
| 9 | Uncontrolled override (bypass safety) | **High** | Override reason + audit + supervisor policy | M1.3F.3, M1.3F.8 |
| 10 | Missing pharmacy verification | **High** | Verify queue + banner + block admin | M1.3F.7 |
| 11 | Hidden legal chart event | **High** | Chart export includes MAR + EDOC + audit | M1.3F.8 |
| 12 | Unsafe MAR correction (silent delete) | **High** | Append-only MAR; versioned effective time | Existing + M1.3F.8 |
| 13 | Downtime documentation gap | **High** | Offline pending queue; paper reconcile SOP | Offline program |
| 14 | LASA pair administered without ack | **High** | `lasaGroupId` UI + `LASA_WARNING_ACKNOWLEDGED` | M1.3F.6 |
| 15 | Infusion STOP without START | **Medium** | Infusion session key + UI chips | Existing; wire `InfusionSession` |
| 16 | Governance flags not on MAR UI | **High** | Badges from M1.3C–E profile | M1.3F.3 |
| 17 | Profile missing (seed skipped) | **Medium** | Promotion creates profile; backfill job | Formulary promotion |
| 18 | Duplicate therapy undetected | **Medium** | Placeholder on pharmacy verify | M1.3F.7+ |
| 19 | Allergy cross miss at admin | **Critical** | Existing allergy warnings; hard stop later | M1.3F.7 |
| 20 | Shift count discrepancy | **Medium** | Controlled inventory module | Enterprise |

---

## Risk summary by domain

| Domain | Critical count | Primary mitigation phase |
|--------|----------------|---------------------------|
| Five rights (patient/med/dose/route/time) | 5 | M1.3F.2–3, BCMA later |
| Controlled substance | 3 | M1.3F.4 |
| High-alert | 2 | M1.3F.5 |
| LASA | 1 | M1.3F.6 |
| Pharmacy / audit | 4 | M1.3F.7–8 |

---

## Residual risk after M1.3 program (design intent)

Even after M1.3F.1–8, **BCMA** and **national inventory** remain out of scope for Haiti clinic MVP. Production safety requires **SOP + training** until enterprise phases complete.
