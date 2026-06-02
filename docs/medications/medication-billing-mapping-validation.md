# Medication Billing Mapping Validation (M1.4B)

**Program:** Enterprise Medication Billing & Revenue Integrity  
**Phase:** M1.4B  
**Date:** 2026-06-02  

Validation rules and automated checks for medication billing mapping remediation. Implementation: `packages/shared/src/medication/medicationBillingMappingValidation.ts`.

---

## Validation modules

| Function | Purpose | PASS criteria |
|----------|---------|---------------|
| `validateMedicationBillingMappingManifest` | Manifest structure | No duplicates; all HCPCS match `^J\d{4}$`; non-empty |
| `assertMedicationBillingMappingManifest` | Seed guard | Throws on manifest issues (called at start of remediation seed) |
| `computeMedicationBillingCoverageReport` | Coverage metrics | Used with threshold |
| `medicationBillingCoverageMeetsThreshold` | Sign-off gate | Default **≥ 95%** billable coverage |
| `validateMedicationBillingNdcLinkage` | NDC integrity | No invalid/orphan manifest NDC; no duplicate `ndc11` on catalog |
| `validateMedicationRevenuePathReadiness` | Static revenue path | Every billable row has J-code + valid capture candidate |
| `validateGovernanceMedicationsHaveBillingMappings` | Sensitive meds | Listed codes have manifest HCPCS |
| `resolveMedicationHcpcsForCatalogRow` | Lookup helper | `billingCodeDefault` ?? manifest `hcpcs` |

---

## Part 1 — Inventory validation

**Inputs:** `CatalogMedication` rows (active), `MEDICATION_BILLING_MAPPING_BY_CODE`.

**Outputs:** `MedicationBillingCoverageReport`

| Field | Description |
|-------|-------------|
| `totalMedications` | Active catalog count |
| `billableMedications` | `isBillableCatalogMedicationRow()` |
| `mappedMedications` | Billable + (`billingCodeDefault` J-code OR manifest HCPCS) |
| `unmappedMedications` | Billable − mapped |
| `coveragePct` | Rounded to 0.1% |
| `duplicateManifestCodes` | Manifest duplicates |
| `orphanManifestCodes` | Manifest keys not in catalog |

**M1.4B Haiti result:** 263 total · 89 billable · 89 mapped · **100%** · 0 orphans · 0 duplicates.

---

## Part 2 — Expansion validation (seed)

**Seed:** `seedMedicationBillingMappingRemediation`

| Rule | Enforcement |
|------|-------------|
| Do not delete | No delete paths in seed |
| Do not overwrite validated values | Skip when `billingCodeDefault`, `BillingCatalog`, NDC, or profile exists |
| Idempotent | Second run: `duplicateProtected` ↑, `*Created` = 0 |

**Unit test:** `medication-billing-mapping-remediation.spec.ts` — morphine J2270 created once; second run preserves `J9999` override.

---

## Part 3 — HCPCS / J-code validation

| Category | Validation |
|----------|------------|
| J-code format | `HCPCS_J_PATTERN = /^J\d{4}$/` |
| Injectable / ER / infusion / hydration | Manifest `category` tags for reporting |
| `BillingCatalog` row | `system: HCPCS`, `triggerSource: MEDICATION`, `externalCode` = catalog code |

**Note:** `J8499` (acyclovir) is a valid J-code pattern in manifest; payer-specific review may still apply.

---

## Part 4 — NDC validation

**Manifest:** `MEDICATION_BILLING_NDC_BY_CATALOG_CODE` — normalized via `normalizeNdc()`.

| Issue kind | Detection |
|------------|-----------|
| Missing NDC | Manifest code in catalog but `ndc11` empty (informational; not in `pass` boolean) |
| Invalid NDC | Manifest `ndc11` not 11 digits |
| Duplicate NDC | Same `ndc11` on two catalog codes |
| Orphan NDC manifest | Manifest key not in catalog |

**M1.4B result:** **PASS** (integrity) when Haiti catalog includes all NDC manifest keys.

**Breadth:** 16 NDC entries — subset of 89 billable (ER / controlled priority).

---

## Part 5 — Revenue path validation

For each billable row:

1. Resolve HCPCS (`billingCodeDefault` or manifest).
2. Build `buildMedicationAdministrationCandidate({ ... })`.
3. Assert `sourceType === "MEDICATION_ADMINISTRATION"` and `sourceId` present.

**M1.4B Haiti result:** **PASS** (0 `brokenCatalogCodes`).

---

## Part 6 — Governance billing validation

Governance enforcement (M1.3) is unchanged. Validation confirms **billable sensitive catalog codes** used in Haiti have manifest HCPCS:

- Opioids: morphine, fentanyl, hydromorphone  
- Sedatives: midazolam, ketamine, propofol  
- Insulin, heparin, methylprednisolone  
- Vasopressors / resuscitation meds in manifest  

**Result:** **PASS**

---

## Part 7 — Test matrix

| Test file | Cases |
|-----------|-------|
| `medicationBillingMappingValidation.test.ts` | Manifest, coverage threshold, morphine J2270, NDC format, NDC linkage, governance codes, revenue path |
| `medication-billing-mapping-validation.spec.ts` | Haiti ≥95% coverage, revenue path, NDC orphans, sensitive prefixes |
| `medication-billing-mapping-remediation.spec.ts` | Idempotent seed, no overwrite |

**Coverage threshold:** `MEDICATION_BILLING_MAPPING_COVERAGE_THRESHOLD_PCT = 95`.

---

## Part 8 — Validation verdict summary

| Part | Verdict |
|------|---------|
| 1 Inventory | **PASS** |
| 2 Expansion | **PASS** |
| 3 HCPCS/J-code | **PASS** |
| 4 NDC | **PASS** (integrity) / **PARTIAL** (breadth) |
| 5 Revenue path | **PASS** |
| 6 Governance billing | **PASS** |
| 7 Regression tests | **PASS** |

**Overall mapping validation:** **PASS**
