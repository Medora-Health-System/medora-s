# Medication Source Inventory — Phase M1.1A

**Program:** Enterprise Medication Inventory & Architecture Audit  
**Phase:** M1.1A (audit only)  
**Date:** 2026-05-31  
**Scope:** Read-only inventory of medication-related source artifacts in Medora-S.

---

## Summary

Medora-S maintains **two parallel medication catalog layers**:

1. **Legacy order-entry catalog** — `CatalogMedication` + `MedicationAlias` (Haiti seed, pharmacy search, `OrderItem` references).
2. **Canonical medication master (Phase 19B+)** — `MedicationConcept` → `MedicationProduct` → `MedicationPackage` with safety profiles, staging imports, and governance UI (additive; runtime ordering still primarily legacy-linked).

This document lists **all discovered medication-related paths** grouped by layer. Count: **256** paths matching `*medication*` glob repo-wide (see audit note: not every path is clinically unique).

---

## Prisma & database

| Path | Role |
|------|------|
| `apps/api/prisma/schema.prisma` | All medication models (`CatalogMedication` ~L1761, canonical master ~L2190+) |
| `apps/api/prisma/seed.ts` | Full dev seed: lab/imaging waves + `seedHaitiMedicationCatalog` |
| `apps/api/prisma/seed-catalogs.ts` | Catalog-only seed (lab, imaging waves, medications) |
| `apps/api/prisma/seed-catalogs.js` | Compiled catalog seed entry |
| `apps/api/prisma/seed.js` | Compiled full seed entry |
| `apps/api/prisma/data/haiti-medications.ts` | **263** Haiti medication seed rows (`HAITI_MEDICATION_CATALOG`) |
| `apps/api/prisma/helpers/seed-haiti-medication-catalog.ts` | Idempotent `upsert` by `code` + alias upsert |
| `apps/api/prisma/data/medication-ndc-mappings.ts` | NDC mapping helper data |
| `apps/api/prisma/data/medication-billing-sample-dev.csv` | Dev billing sample |
| `apps/api/prisma/data/english-catalog/all-haiti-medications-display-name-en.csv` | English display backfill source |
| `apps/api/prisma/data/english-catalog/er-medications-display-name-en.csv` | ER English display CSV |
| `apps/api/prisma/data/samples/er-display-name-en.dev-sample-medications.csv` | Dev sample |
| `apps/api/prisma/migrations/20260324200000_medication_administration/` | MAR table foundation |
| `apps/api/prisma/migrations/20260325120000_medication_administration_label_snapshot/` | Label snapshot |
| `apps/api/prisma/migrations/20260423160000_er32_medication_administration_mar_action/` | MAR action enum |
| `apps/api/prisma/migrations/20260430120000_add_medication_administration_route/` | Route on MAR |
| `apps/api/prisma/migrations/20260511120000_er3_medication_ndc_foundation/` | NDC on catalog/MAR |
| `apps/api/prisma/migrations/20260515150000_add_controlled_medication_fields/` | Controlled flags on catalog |
| `apps/api/prisma/migrations/20260530200000_catalog_medication_administration_billing_class/` | `administrationType`, `billingClass` |
| `apps/api/prisma/migrations/20260801120000_medication_admin_effective_time/` | Effective administered time |
| `apps/api/prisma/migrations/20260802120000_medication_administration_infusion_phase/` | Infusion START/STOP MAR |
| `apps/api/prisma/migrations/20260804120000_medication_master_schema_phase_19b1/` | Canonical master schema |
| `apps/api/prisma/migrations/20260805120000_medication_staging_promotion_result/` | Staging promotion |
| `apps/api/prisma/migrations/20260809120000_medication_product_governance_phase_19d1/` | Product governance status |
| `apps/api/prisma/migrations/20260810120000_medication_global_baseline_phase_19h/` | Global baseline flags |

---

## API — legacy catalog & search

| Path | Role |
|------|------|
| `apps/api/src/medication-catalog/medication-catalog.module.ts` | Nest module |
| `apps/api/src/medication-catalog/medication-catalog.controller.ts` | Catalog HTTP (if exposed directly) |
| `apps/api/src/medication-catalog/medication-catalog.service.ts` | Search, favorites, recent, activation filter |
| `apps/api/src/medication-catalog/medication-catalog-search.util.ts` | Query expansion, Prisma text `OR` |
| `apps/api/src/medication-catalog/medication-catalog-search.util.spec.ts` | Search unit tests |
| `apps/api/src/medication-catalog/medication-catalog-canonical-enrich.util.ts` | Attach canonical badges to search DTOs |
| `apps/api/src/medication-catalog/medication-catalog-canonical-enrich.util.spec.ts` | Enrichment tests |
| `apps/api/src/medication-catalog/dto/search-medications.dto.ts` | Search query DTO |
| `apps/api/src/medication-catalog/dto/index.ts` | DTO barrel |
| `apps/api/src/order-catalog/order-catalog.controller.ts` | `GET /catalog/medications/search` |
| `apps/api/src/order-catalog/order-catalog.module.ts` | Wires `MedicationCatalogService` |
| `apps/api/src/order-catalog/dto/catalog-search-item.dto.ts` | Unified catalog search item (incl. high-alert badge slot) |
| `apps/api/src/order-catalog/catalog-search-rank.util.ts` | Shared ranking tiers |
| `apps/api/src/order-catalog/catalog-search.mapper.ts` | Maps `CatalogMedication` → DTO |
| `apps/api/src/pharmacy-inventory/pharmacy-inventory.service.ts` | Dispense + catalog usage |
| `apps/api/src/pharmacy-inventory/pharmacy-inventory.module.ts` | Pharmacy module |
| `apps/api/src/pharmacy-inventory/dto/dispense-medication.dto.ts` | Dispense DTO |

---

## API — medication master, imports, governance

**Directory:** `apps/api/src/medication-master/` (**~90+** TypeScript files)

Representative paths:

| Path | Role |
|------|------|
| `medication-master.module.ts` | Module registration |
| `medication-master.controller.ts` | Explorer, formulary import, baseline |
| `controlled-catalog-import.controller.ts` | `medication-master/controlled-catalog` CSV import |
| `controlled-catalog-import-medication.service.ts` | Controlled medication import |
| `controlled-catalog-import-procedure.service.ts` | Procedure side of controlled import |
| `medication-formulary-import.service.ts` | Formulary workbook staging |
| `medication-formulary-promotion.service.ts` | Staging → active promotion |
| `priority-er-inventory-import.service.ts` | Priority ER inventory XLSX import |
| `priority-er-inventory-promotion.service.ts` | ER inventory promotion to catalog/canonical |
| `high-risk-medication-review.service.ts` | High-risk review queue |
| `high-risk-medication-review.controller.ts` | Admin review API |
| `medication-product-activation-governance.service.ts` | Order-search activation gates |
| `medication-product-governance.service.ts` | Approve/reject governance actions |
| `catalog-canonical-read.service.ts` | Legacy catalog ↔ canonical read metadata |
| `medication-catalog-backfill-analysis.service.ts` | Backfill analysis (admin) |
| `medication-global-baseline*.ts` | Global baseline tier rules & auto-approve |
| `medication-staging-duplicate-governance.service.ts` | Duplicate staging governance |
| `dto/*.dto.ts` | Import/governance DTOs |
| `*.spec.ts`, `*.e2e.spec.ts` | Tests |

---

## API — MAR, orders, billing helpers

| Path | Role |
|------|------|
| `apps/api/src/medication-administration/medication-administration.service.ts` | MAR create/list, infusion, billing hooks |
| `apps/api/src/medication-administration/medication-administration.controller.ts` | MAR HTTP |
| `apps/api/src/medication-administration/*.spec.ts` | MAR tests |
| `apps/api/src/orders/orders.service.ts` | Medication order lines, infusion start, cancel |
| `apps/api/src/orders/orders-medication-infusion-start.spec.ts` | Infusion order tests |
| `apps/api/src/common/medication/medication-infusion-candidate-from-order-item.util.ts` | Infusion candidate derivation |
| `apps/api/src/billing/medication-admin-cpt.util.ts` | Admin CPT inference |

---

## API — scripts (non-seed)

| Path | Role |
|------|------|
| `apps/api/scripts/generate-phase-f-medication-display-en-csv.ts` | Generate EN display CSV |
| `scripts/generate-medication-ndc-candidates.ts` | NDC candidate generator (repo root scripts) |

---

## Web — UI & hooks

| Path | Role |
|------|------|
| `apps/web/app/app/medications/page.tsx` | Medications app page |
| `apps/web/app/app/admin/medication-master/page.tsx` | Master explorer |
| `apps/web/app/app/admin/medication-master/review/[conceptId]/page.tsx` | Concept review |
| `apps/web/app/app/admin/medication-governance/page.tsx` | Governance hub |
| `apps/web/app/app/admin/medication-governance/activation/page.tsx` | Activation queue |
| `apps/web/app/app/admin/medication-governance/duplicates/page.tsx` | Duplicate staging |
| `apps/web/app/app/admin/medication-inventory-staging/page.tsx` | ER inventory staging |
| `apps/web/app/app/admin/high-risk-medication-review/page.tsx` | High-risk review |
| `apps/web/src/hooks/useMedicationSearch.ts` | Client search hook |
| `apps/web/src/components/pharmacy/MedicationAutocomplete.tsx` | Autocomplete |
| `apps/web/src/components/pharmacy/MedicationSuggestionList.tsx` | Suggestions |
| `apps/web/src/components/pharmacy/MedicationChip.tsx` | Chip display |
| `apps/web/src/components/pharmacy/MedicationPrintButton.tsx` | Print |
| `apps/web/src/components/orders/createOrderModal/SelectedMedicationItems.tsx` | Order modal meds |
| `apps/web/src/components/encounters/MedicationAdministrationTab.tsx` | MAR tab |
| `apps/web/src/components/encounters/MedicationAdministration*.tsx` | MAR modals/time/infusion UI |
| `apps/web/src/components/medication/AdvancedMedicationSafetyPanel.tsx` | Advanced safety UI |
| `apps/web/src/components/medication/MedicationSoftSafetyPanel.tsx` | Soft warnings |
| `apps/web/src/components/medication/MedicationCanonicalBadges.tsx` | Canonical badges |
| `apps/web/src/components/clinical/ErMedicationMarSummaryCard.tsx` | ER MAR summary |
| `apps/web/src/features/emergency/homeMedicationEntry.ts` | Home meds entry |
| `apps/web/src/features/emergency/HomeMedicationEntryModal.tsx` | Home meds modal |
| `apps/web/src/features/mar/*.ts` | MAR display/build helpers |
| `apps/web/src/lib/medicationMasterApi.ts` | Master API client |
| `apps/web/src/lib/medicationMasterGovernanceApi.ts` | Governance API |
| `apps/web/src/lib/medicationActivationGovernanceApi.ts` | Activation API |
| `apps/web/src/lib/medicationInventoryStagingApi.ts` | Staging API |
| `apps/web/src/lib/highRiskMedicationReviewApi.ts` | High-risk API |
| `apps/web/src/lib/localizedMedicationDisplay.ts` | EN/FR display rules |
| `apps/web/src/lib/advancedMedicationSafetyLineMappers.ts` | Safety line mapping |
| `apps/web/src/i18n/messages/fr.ts` | `pharmacyMedicationSearch` and related keys |
| `apps/web/src/i18n/messages/en.ts` | Mirrored keys |
| `apps/web/src/i18n/messages/medicationGovernance*.i18n.test.ts` | i18n guard tests |

---

## Shared packages

| Path | Role |
|------|------|
| `packages/shared/src/medication/medicationCatalogClassification.ts` | Administration/billing class enums |
| `packages/shared/src/medication/infusionRoute.util.ts` | IV push vs infusion route helpers |
| `packages/shared/src/medication/catalogClassificationAuditFlags.ts` | Read-only catalog audit flags |
| `packages/shared/src/medicationSafetyWarnings.ts` | Soft safety rules (LASA classes, high-alert hints) |
| `packages/shared/src/advancedMedicationSafety.ts` | Advanced safety evaluation |
| `packages/shared/src/medicationTimingSafety.ts` | Timing safety |
| `packages/shared/src/mar/*.ts` | MAR effective time, infusion, injection site |

---

## Existing documentation (pre-M1.1A)

| Path | Role |
|------|------|
| `docs/medication/PHASE_19B0_PRIORITY_ER_FORMULARY_WORKBOOK.md` | ER formulary workbook phase |
| `docs/medication/PHASE_19E0_PRIORITY_ER_INVENTORY_EXACT_SOURCE.md` | ER inventory source |
| `docs/medication/PHASE_19E1_PRIORITY_ER_INVENTORY_STAGING.md` | ER staging |
| `docs/medication/templates/*.csv` | Import templates |
| `docs/medication/fixtures/README.md` | Fixtures readme |

**Note:** M1.1A deliverables live under `docs/medications/` (plural), separate from legacy `docs/medication/`.

---

## Tests (representative)

Medication-related `*.spec.ts` / `*.test.ts` exist under:

- `apps/api/src/medication-catalog/`
- `apps/api/src/medication-master/` (many unit + e2e)
- `apps/api/src/medication-administration/`
- `apps/api/src/orders/orders-medication-infusion-start.spec.ts`
- `apps/web/src/**/*.test.ts` (MAR, governance i18n, localized display)

Full enumeration: run `find . -iname '*medication*' -name '*.spec.ts' -o -iname '*medication*.test.ts'` from repo root.

---

## Cross-cutting references (non-dedicated files)

These modules reference medications but are not medication-primary:

- `apps/api/src/encounters/` — clinical documentation, witness signatures, high-alert infusion forms
- `apps/api/src/chart-summary/` — chart medication summaries
- `apps/api/src/billing/` — medication admin CPT
- `apps/web/src/features/clinical-documentation/ClinicalDocumentationHighAlertInfusionForm.tsx`

---

## Audit metadata

| Item | Value |
|------|-------|
| Glob `*medication*` (repo) | 256 paths |
| Haiti seed file rows | **263** (`HAITI_MEDICATION_CATALOG.length`) |
| Production DB counts | **NOT VERIFIED** (see main audit) |
| Local dev DB (`localhost`) | **NOT PRODUCTION** — reference only |
