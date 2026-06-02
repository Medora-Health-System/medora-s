# Canonical Medication Activation — Risk Register (M1.5B)

**Program:** Canonical Medication Activation & Linkage Audit  
**Phase:** M1.5B  
**Date:** 2026-06-02  
**Parent:** [canonical-medication-activation-audit.md](./canonical-medication-activation-audit.md)

---

## Risk register

| ID | Risk | Type | Severity | Clinical | Billing | Safety | Mitigation phase |
|----|------|------|----------|----------|---------|--------|------------------|
| R01 | Bulk-activate **786** `ACTIVATION_APPROVED` baseline products | Duplicate activation | **CRITICAL** | Wrong drug pick (900+ acetaminophen) | Duplicate HCPCS claims | False governance | **M1.6** dedupe before activation |
| R02 | **904** acetaminophen concepts — import noise | Duplicate activation | **CRITICAL** | Search unusable | Revenue duplicate lines | — | Quarantine baseline; do not activate |
| R03 | **0** Haiti code alignment (catalog ↔ product) | Legacy linkage | **CRITICAL** | Orders stay legacy-only; dual truth | Map misses | Profiles orphaned | **M1.6** backfill `legacyCatalogMedicationId` |
| R04 | **256** UNLINKED orderable meds — no canonical anchor | Legacy linkage | **HIGH** | No package-level safety/NDC on order path | MAR/billing uses legacy only | HA/LASA not on concept | Haiti link tranche |
| R05 | **60** LINKED_INACTIVE — linked then hidden from search | Search conflict | **HIGH** | Meds disappear vs unlinked peers | Inconsistent billing path | Gate blocks without activation | Fix `isActive` + runtime or unlink |
| R06 | **77** duplicate `ndc11` across packages | Billing conflict | **HIGH** | — | Wrong NDC attribution | — | NDC dedupe before billing enable |
| R07 | **414** billing profiles without HCPCS | Billing conflict | **HIGH** | — | Manual review / leakage | — | M1.4B seed + profile completion |
| R08 | Activate without `orderSearchEnabled` runtime flag | Order conflict | **HIGH** | Product active but not searchable | — | — | Follow 19G activation workflow |
| R09 | Activate without `FacilityFormularyItem` | Order conflict | **HIGH** | `FORMULARY_NOT_APPROVED` blocker | — | — | Formulary approve per facility |
| R10 | **0** `administrationType` INFUSION/PUSH on products | Governance conflict | **MEDIUM** | MAR gate `ADMINISTRATION_ROUTE_UNSAFE` | Infusion billing weak | — | Normalize admin type on link |
| R11 | **48** insulin concept clones | Provider confusion | **MEDIUM** | Multiple “Regular Insulin *” | — | Insulin HA not set | Merge to one concept per insulin SKU |
| R12 | **69** baseline catalog rows missing `route` | Provider confusion | **MEDIUM** | Incomplete order defaults | — | — | Hide from search or backfill |
| R13 | Safety manifests not on profiles | Governance conflict | **HIGH** | False negative high-alert | — | Patient harm | M1.3C–E seed before opioid activation |
| R14 | Production DB not verified | Operational | **HIGH** | Unknown prod drift | Unknown maps | Unknown flags | Ops read-only SQL replay |

---

## Summary by severity

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 8 |
| MEDIUM | 3 |

---

## Summary by risk type

| Type | IDs |
|------|-----|
| Duplicate activation | R01, R02 |
| Legacy linkage | R03, R04 |
| Search conflict | R05 |
| Billing conflict | R06, R07 |
| Order / governance | R08, R09, R10, R13 |
| Provider confusion | R11, R12 |
| Operational | R14 |

---

## Activation blockers (must resolve before tranche 1)

1. **R03** — Haiti catalog linkage backfill plan signed  
2. **R01/R02** — Baseline acetaminophen quarantine rule  
3. **R13** — Governance seed on pilot for opioids/insulin/heparin  
4. **R07** — BillingCatalog / profile HCPCS for billable linked rows  
5. **R14** — Production count verification  
