# Enterprise Medication Catalog — Source Inventory (M1.5A)

**Program:** Enterprise Medication Catalog Completion Audit  
**Phase:** M1.5A (audit only)  
**Date:** 2026-06-02  
**Constraints:** No code, seeds, migrations, production writes, or catalog imports.

---

## Data source declaration

| Source | Status |
|--------|--------|
| **Production DB** | **NOT VERIFIED** — no production `DATABASE_URL` query in this phase |
| **Local dev DB** | `postgresql://postgres:postgres@localhost:5432/medora` (read-only SQL 2026-06-02) |
| **Seed / manifests** | Authoritative for designed coverage; validated via `pnpm --filter @medora/api test -- medication-billing-mapping-validation.spec.ts` (PASS) |
| **Prisma schema** | `pnpm --filter @medora/api exec prisma validate` — **PASS** |

---

## Part 1 — Source inventory summary

### 1.1 Primary catalog layers

| Layer | Repo path | Role |
|-------|-----------|------|
| Haiti seed | `apps/api/prisma/data/haiti-medications.ts` | `HAITI_MEDICATION_CATALOG` — curated Phase 1 formulary |
| Legacy runtime | `CatalogMedication` + `MedicationAlias` | Orders, pharmacy, MAR, medication search |
| Canonical master | `MedicationConcept` → `MedicationProduct` → `MedicationPackage` | Governance, staging, baseline, future dual-write |
| Billing | `BillingCatalog`, `CatalogMedication.billingCodeDefault`, `MedicationBillingProfile` | Charge capture / HCPCS suggestions |
| Safety | `MedicationSafetyProfile`, governance manifests (M1.3C–E) | High-alert, LASA, controlled, classifier taxonomy |

### 1.2 Count matrix

| Entity / artifact | Seed / manifest count | Local DB count | Production DB | Active | Inactive | Duplicate |
|-------------------|----------------------|----------------|---------------|--------|----------|-----------|
| `HAITI_MEDICATION_CATALOG` rows | **269** (spread-marker count) | — (upserted into catalog) | NOT VERIFIED | 269 in seed (`isActive: true`) | 0 in seed | 0 code collisions when derived |
| `CatalogMedication` | 269 target + imports | **316** | NOT VERIFIED | **316** | **0** | **0** duplicate `code` |
| `MedicationAlias` | per-row `commonAliases` | **344** | NOT VERIFIED | 344* | 0 | 40 shared alias strings → multiple meds |
| `MedicationConcept` | from imports/baseline | **1003** | NOT VERIFIED | **5** | **998** | 0 duplicate `code` |
| `MedicationProduct` | tied to concepts | **993** | NOT VERIFIED | **0** | **993** | 0 duplicate `code` |
| `MedicationPackage` | per product | **993** | NOT VERIFIED | **5** | **988** | 0 duplicate `code` |
| `MedicationBillingProfile` | M1.4B seed design | **426** | NOT VERIFIED | 426 | — | — |
| `MedicationSafetyProfile` | M1.3 design | **769** | NOT VERIFIED | 769 rows | **0** `isHighAlert` | — |
| `MedicationSearchAlias` (canonical) | import/backfill | **369** | NOT VERIFIED | 369 | 0 | — |
| `BillingCatalog` (`MEDICATION`) | M1.4B manifest **83** | **4** | NOT VERIFIED | 4 | 0 | 0 |
| HCPCS/J manifest | `medicationBillingMappingManifest.ts` — **83** `catalogCode` | not applied locally* | NOT VERIFIED | — | — | 0 (validated in shared tests) |
| NDC manifest | `medicationBillingNdcByCatalogCode.ts` — **16** normalized keys (23 `productNdc` lines) | **0** catalog `ndc11` | NOT VERIFIED | — | — | 0 orphan (test PASS) |
| Controlled governance manifest | `controlledSubstanceGovernanceManifest.ts` — **17** status rows | partial catalog flags (**9** `isControlled`) | NOT VERIFIED | — | — | — |
| High-alert governance manifest | `highAlertMedicationGovernanceManifest.ts` — **15** `catalogCode` APPLY rows | **0** `isHighAlert` profiles | NOT VERIFIED | — | — | — |
| LASA governance manifest | `lasaMedicationGovernanceManifest.ts` — **5** `lasaGroupCode` groups | **0** `lasaGroupId` populated | NOT VERIFIED | — | — | — |
| Safety classifier manifest | `medicationSafetyClassifierManifest.ts` — **33** classifiers | taxonomy only | NOT VERIFIED | — | — | — |
| `medication-ndc-mappings.ts` (legacy helper) | reference data | not primary | NOT VERIFIED | — | — | — |

\*Local DB has **0** `billingCodeDefault` and **4** `BillingCatalog` MEDICATION rows → **M1.4B remediation seed not applied** on this environment (manifest + tests still PASS at source level).

### 1.3 Import / staging artifacts (repo + DB)

| Artifact | Location | Count / notes |
|----------|----------|---------------|
| Haiti English display CSV | `apps/api/prisma/data/english-catalog/all-haiti-medications-display-name-en.csv` | **217** data rows |
| ER English display CSV | `apps/api/prisma/data/english-catalog/er-medications-display-name-en.csv` | **20** data rows |
| Dev ER sample CSV | `apps/api/prisma/data/samples/er-display-name-en.dev-sample-medications.csv` | sample only |
| Dev billing sample CSV | `apps/api/prisma/data/medication-billing-sample-dev.csv` | dev only |
| Controlled catalog import | `controlled-catalog-import.controller.ts` + `controlled-catalog-import-medication.service.ts` | admin CSV — no bundled production file |
| Formulary workbook staging | `medication-formulary-import.service.ts` | **1056** staging rows (local DB) |
| Priority ER inventory | `priority-er-inventory-import.service.ts` + workbook utils | XLSX import path — no fixed row count in repo |
| Global baseline codes | DB `CatalogMedication.code LIKE '19G%'` | **69** local rows |

### 1.4 Seed wiring (inventory only — not executed)

| Helper | File |
|--------|------|
| Haiti catalog | `apps/api/prisma/helpers/seed-haiti-medication-catalog.ts` |
| Billing remediation (M1.4B) | `apps/api/prisma/helpers/seed-medication-billing-mapping-remediation.ts` |
| Controlled / high-alert / LASA / classifiers | `seed-controlled-substance-governance.ts`, `seed-high-alert-medication-governance.ts`, `seed-lasa-medication-governance.ts`, `seed-medication-safety-classifiers.ts` |
| Catalog seed entry | `apps/api/prisma/seed-catalogs.ts`, `apps/api/prisma/seed.ts` |

### 1.5 Related audit docs (prior phases)

| Phase | Document |
|-------|----------|
| M1.1A | `medication-source-inventory.md`, `medication-inventory-architecture-audit.md` |
| M1.1B | `medication-data-quality-audit.md`, `medication-production-readiness.md` |
| M1.3 | Governance design/readiness under `docs/medications/` |
| M1.4A–B | `medication-billing-coding-audit.md`, `medication-billing-mapping-remediation.md` |
| M1.4C–D | `medication-administration-charge-capture-hardening.md`, `infusion-billing-governance.md` (code present; not part of M1.5A execution) |

---

## Drift notes (seed vs local DB)

| Metric | Value | Interpretation |
|--------|-------|----------------|
| Haiti seed rows | 269 | Prior audits cited 263; file grew (+6) |
| Local `CatalogMedication` | 316 | **+47** vs seed — imports/baseline (`19G*` = 69 rows) |
| Non-baseline catalog codes | 247 | Haiti-style + other promotions |
| Legacy → product link | **60** products, **256** catalog rows unlinked | Dual-layer reconciliation required before canonical-first ordering |

---

## Validation performed

- `prisma validate` — PASS  
- Read-only SQL counts — local dev only  
- `medication-billing-mapping-validation.spec.ts` — PASS (manifest vs Haiti derive)  
- Grep / path inventory — repo-wide medication artifacts (see M1.1A `medication-source-inventory.md` for full path list; **256** `*medication*` paths repo-wide per M1.1A)
