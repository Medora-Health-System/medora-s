# Enterprise Medication Gap Register (M1.5A)

**Program:** Enterprise Medication Catalog Completion Audit  
**Phase:** M1.5A  
**Date:** 2026-06-02  
**Parent:** [enterprise-medication-catalog-completion-audit.md](./enterprise-medication-catalog-completion-audit.md)

Severity: **LOW** · **MEDIUM** · **HIGH** · **CRITICAL**

---

## Gap register

| ID | Medication / category | Gap type | Severity | Clinical impact | Billing impact | Safety impact | Recommended phase |
|----|----------------------|----------|----------|-----------------|---------------|---------------|-------------------|
| G01 | Canonical master (993 products) | Dual catalog / inactive canonical | **CRITICAL** | Orders ignore package-level safety & NDC | Package billing profiles unused at order time | HA/LASA not enforced on concepts | **M1.6** consolidation + activation |
| G02 | High-alert medications (class) | Safety profile not persisted | **CRITICAL** | False negative in governance badges | Indirect MAR risk | No `isHighAlert` locally | **M1.4** governance seed + verify |
| G03 | LASA pairs (opioid, pressor groups) | LASA not persisted | **HIGH** | Wrong-drug selection risk | Low | No `lasaGroupId` | **M1.4** / **M1.5** |
| G04 | M1.4B billing mappings | Seed not applied (local DB) | **HIGH** | None clinical | Auto HCPCS fails (~4 keys) | None | **M1.4B** ops seed on env |
| G05 | Warfarin / Coumadin | Missing formulary row | **HIGH** | Anticoagulation gap in cardiology | No map | No HA profile | **M1.2** curated add |
| G06 | Enoxaparin / Lovenox | Missing formulary row | **HIGH** | DVT/ACS pathway gap | No map | No HA profile | **M1.2** curated add |
| G07 | 256 legacy catalog rows | No `legacyCatalogMedicationId` | **HIGH** | Canonical enrichment absent | Package profiles orphaned | Safety not on concept link | **M1.6** backfill link |
| G08 | 60 legacy-linked products | Inactive product blocks search | **HIGH** | Meds hidden if linked | Billing profile exists but product inactive | Governance blocked | **M1.6** activation policy |
| G09 | Oral diazepam / lorazepam | Controlled flag inconsistent | **HIGH** | Schedule IV drugs unflagged oral | Low | Witness/double-sign wrong | **M1.3C** seed APPLY |
| G10 | Tramadol (oral + IV) | Schedule policy unset | **MEDIUM** | Regional legal variance | Mapped in manifest | MANUAL_REVIEW in manifest | **M1.3C** sign-off |
| G11 | Oxycodone / hydrocodone | Missing catalog | **MEDIUM** | Pain service gap | None | Controlled manifest MISSING_CATALOG | **M1.2** policy decision |
| G12 | Vaccines (class) | Category absent | **MEDIUM** | Public health program gap | Vaccine admin codes N/A | Low | **Phase 3** / formulary add |
| G13 | 69 baseline `19G*` rows | Import without route | **MEDIUM** | Incomplete order defaults | Unknown billable class | Unknown | **M1.5** import hygiene |
| G14 | 69 rows missing `genericName` | Data quality | **MEDIUM** | Search noise | Map keys fail | Classifier match weak | **M1.1B** backfill |
| G15 | Search misspellings | No fuzzy match | **MEDIUM** | Failed lookup | None | Delayed care | **M1.5** search |
| G16 | Shared aliases (`rsi`, `sédation`) | Alias collision | **MEDIUM** | Wrong drug pick | None | LASA-adjacent | **M1.5** alias governance |
| G17 | NDC coverage (316 meds) | Only 16 manifest keys | **MEDIUM** | None | Payer identity weak | None | **M1.4B+** NDC tranche |
| G18 | Chemotherapy / biologics | Placeholder only | **LOW** | Specialty referral | High $ leakage if ad-hoc | HA rules partial | **Future** specialty phase |
| G19 | `mapMedicationToBillingCode` | Profiles not in auto-map | **MEDIUM** | None | Package HCPCS ignored at runtime | None | **M1.4C** wiring (future) |
| G20 | Production DB counts | NOT VERIFIED | **HIGH** | Unknown prod drift | Unknown prod billing | Unknown prod safety | **M1.5A** ops checklist |

---

## Summary by severity

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 8 |
| MEDIUM | 9 |
| LOW | 1 |

---

## Summary by recommended phase

| Phase | Gap IDs |
|-------|---------|
| **M1.4B** (ops) | G04 |
| **M1.3C–E** (governance seed) | G09, G10, G02, G03 |
| **M1.5** (search/import hygiene) | G13, G15, G16 |
| **M1.6** (consolidation) | G01, G07, G08 |
| **M1.2** (curated formulary adds) | G05, G06, G11 |
| **Ops / production verify** | G20 |
