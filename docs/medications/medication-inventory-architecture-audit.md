# Medication Inventory & Architecture Audit — Phase M1.1A

**Program:** Enterprise Medication Inventory & Architecture Audit  
**Phase:** M1.1A (audit only — no code, seeds, migrations, commits, or DB writes)  
**Date:** 2026-05-31  
**Verdict (reuse Haiti directory vs screenshots):** **YES — reuse existing catalog**; do not rebuild from screenshots alone.  
**Seed architecture verdict:** **SAFE (conditional)** — see §4.

Related deliverables:

- [medication-source-inventory.md](./medication-source-inventory.md)
- [medication-governance-gap-analysis.md](./medication-governance-gap-analysis.md)
- [medication-program-roadmap.md](./medication-program-roadmap.md)

---

## Executive summary

Medora-S already contains a **substantial medication directory** suitable for Haiti clinic MVP reuse:

- **263** curated rows in `HAITI_MEDICATION_CATALOG` with stable codes, bilingual labels, aliases, and idempotent seed upsert.
- **Legacy runtime path** (`CatalogMedication`) powers medication search, orders, pharmacy inventory, and MAR snapshots.
- **Canonical master path** (`MedicationConcept` / `MedicationProduct` / `MedicationPackage`) supports enterprise governance, imports, and future dual-write — largely **additive** and not yet the sole order identity.

**Production medication counts were not verified** in this audit (no production `DATABASE_URL` run). Local developer database counts are documented as **reference only**.

---

## Part 2 — Prisma / database architecture

### 2.1 Dual-layer model map

#### Layer A — Legacy order-entry catalog (MVP runtime)

##### `CatalogMedication`

| Aspect | Detail |
|--------|--------|
| **Purpose** | Global medication catalog row for search, orders (`OrderItem.catalogItemId`), inventory, dispense |
| **Primary key** | `id` (UUID) |
| **Unique** | `code` |
| **Indexes** | `ndc11` |
| **Facility scope** | **None** (global catalog); facility scoping via `InventoryItem`, `FacilityMedicationUsage`, `FacilityFormularyItem` (canonical) |
| **Active flag** | `isActive` (default `true`) |
| **Audit** | `createdAt`, `updatedAt` only (no row-level clinical audit on catalog itself) |

**Columns (clinical / search):**

- Identity: `code`, `name` (legacy, often mirrors FR), `genericName`, `displayNameEn`, `displayNameFr`
- Product attrs: `strength`, `dosageForm`, `route`, `therapeuticClass` (free-text string)
- Search: `searchText`, `sortPriority`, `isEssential`
- Controlled: `isControlled`, `controlledSchedule`, `requiresWitness`, `requiresDoubleSign`
- NDC/billing hints: `ndc11`, `ndcDisplay`, `billingUnitType`, `billingCodeDefault`, `administrationType`, `billingClass`
- Other: `description`, `isActive`

**Not present on legacy table:**

- Dedicated **brand name** column (brand conveyed via `displayNameEn`, aliases, or `name`)
- **LASA** / **high-alert** boolean (high-alert lives on `MedicationSafetyProfile` for concepts; soft rules in shared `medicationSafetyWarnings.ts`)
- Structured **medication family** FK (only `therapeuticClass` string)
- **Formulary status** (canonical `FacilityFormularyItem` instead)
- **Concentration** as structured FK (string `strength` only)
- **Successor / retired** link on legacy row (canonical `MedicationConcept.retiredAt` only)

##### `MedicationAlias`

| Aspect | Detail |
|--------|--------|
| **Unique** | `[catalogMedicationId, alias]` |
| **Indexes** | `catalogMedicationId`, `alias` |
| **Fields** | `alias`, `language`, `isPrimary`, `createdAt` |
| **Cascade** | `onDelete: Cascade` from catalog medication |

#### Layer B — Orders, pharmacy, MAR (runtime clinical)

##### `OrderItem` (medication lines)

- `catalogItemType`: `"MEDICATION"`
- `catalogItemId` → `CatalogMedication.id`
- `manualLabel`, `manualSecondaryText` when not catalog-backed
- `strength`, `route` (string snapshots)
- `refillCount`, `medicationFulfillmentIntent`, `intendedAdministrationAt`
- Future dual-write: `medicationProductId`, `medicationPackageId` (nullable, **not populated** in current phase)
- Status: `status`, `lifecycleState`, completion/collection timestamps per modality

**Not on `OrderItem`:** structured **frequency**, **PRN reason**, **start/stop schedule**, **dose amount** as structured fields (dose primarily in MAR / notes).

##### `MedicationAdministration` (append-only MAR)

- Facility-scoped: `facilityId`, `patientId`, `encounterId`
- Snapshots: `medicationLabelSnapshot`, `route`, `doseValue`, `doseUnit`, NDC snapshots
- MAR semantics: `marAction`, `infusionPhase`, `infusionSessionKey`
- Effective time correction fields (Phase 15F-B)
- Future canonical FKs: `medicationProductId`, `medicationPackageId`, `infusionSessionId`

##### `MedicationDispense`, `InventoryItem`, `FacilityMedicationUsage`

- Pharmacy inventory links `catalogMedicationId` (+ optional `medicationPackageId`)
- Dispense ties to `OrderItem`, patient, encounter
- Usage tracking for facility “recent meds” search

#### Layer C — Canonical medication master (Phase 19B+)

| Model | Key constraints | Notable fields |
|-------|-----------------|----------------|
| `MedicationTherapeuticClass` | `code` unique | Hierarchy via `parentId` |
| `MedicationRoute` | `code` unique | Structured route reference |
| `MedicationDoseUnit` | `code` unique | Units for concentration/packages |
| `MedicationConcept` | `code` unique | `genericName`, `displayName`, `therapeuticClassId`, `rxNormConceptId`, `isActive`, `retiredAt` |
| `MedicationConcentration` | — | Structured numerator/denominator/total volume |
| `MedicationProduct` | `code` unique; `legacyCatalogMedicationId` unique optional | `strengthDisplay`, `dosageForm`, `governanceStatus`, `baselineAvailable` |
| `MedicationPackage` | `code` unique | NDC, package type, contents, default dose unit |
| `MedicationSafetyProfile` | `conceptId` unique | `isHighAlert`, `highAlertCategories` (JSON), `lasaGroupId`, controlled/witness flags |
| `MedicationSearchAlias` | indexes on `normalizedAlias` | Concept/product aliases (separate from legacy `MedicationAlias`) |
| `FacilityFormularyItem` | `[facilityId, packageId]` unique | `isOnFormulary`, `isEDFormulary`, favorites/boost |
| `MedicationFormularyImportStaging` | — | Workbook rows; **not active** until promotion |
| `MedicationOrderSetLink` | — | Protocol defaults (product/package/route) |

### 2.2 Enterprise field support matrix (legacy `CatalogMedication`)

| Desired domain | Legacy catalog | Canonical master |
|----------------|----------------|------------------|
| Generic name | ✅ `genericName` | ✅ `MedicationConcept.genericName` |
| Brand name | ⚠️ Partial (aliases / `displayNameEn`) | ⚠️ Via `MedicationSearchAlias` |
| Medication family/class | ⚠️ `therapeuticClass` string | ✅ `MedicationTherapeuticClass` FK |
| Route | ⚠️ Free-text `route` | ✅ `MedicationRoute` + product default |
| Dosage form | ⚠️ String `dosageForm` | ✅ Product `dosageForm` |
| Strength | ⚠️ String `strength` | ✅ `strengthDisplay` + `MedicationConcentration` |
| Concentration | ❌ | ✅ |
| Controlled substance | ✅ flags on catalog | ✅ `MedicationSafetyProfile` |
| High-alert | ❌ on legacy | ✅ `isHighAlert` on safety profile |
| LASA | ❌ on legacy | ⚠️ `lasaGroupId` + soft UI rules |
| Formulary status | ❌ on legacy row | ✅ `FacilityFormularyItem` |
| Inventory status | ✅ via `InventoryItem` | ✅ package-linked inventory |
| Order defaults | ⚠️ Partial (order set links) | ✅ `MedicationOrderSetLink` |
| Bilingual labels | ✅ `displayNameFr` + `displayNameEn` | ⚠️ Concept `displayName` (single); FR via legacy/UI |

---

## Part 3 — Current medication inventory

### 3.1 Source-file inventory (authoritative for seed)

| Metric | Count | Source |
|--------|-------|--------|
| Haiti seed rows | **263** | `HAITI_MEDICATION_CATALOG` in `haiti-medications.ts` |
| Preserved inventory codes | **15** | `EXISTING_INVENTORY_CODES` |

### 3.2 Database counts

| Environment | Status |
|-------------|--------|
| **Production** | **NOT VERIFIED** — no production read-only query executed in M1.1A |
| **Local dev** (`postgresql://postgres:postgres@localhost`) | Reference only — **not production** |

#### Local dev reference (2026-05-31)

| Metric | Count |
|--------|-------|
| `CatalogMedication` total | 299 |
| Active | 299 |
| Inactive | 0 |
| `MedicationAlias` | 344 |
| `MedicationConcept` | 686 |
| `MedicationProduct` | 676 |
| `MedicationSearchAlias` (canonical) | 232 |
| Duplicate `code` groups | 0 |
| Distinct `route` values | 13 |
| Distinct `dosageForm` values | 24 |
| Distinct `strength` values | 126 |
| Distinct `therapeuticClass` values | 58 |
| `isControlled = true` (catalog) | 6 |
| `MedicationSafetyProfile.isHighAlert = true` | 0 |
| Rows missing `genericName` | 52 |
| Duplicate **name** groups (case-insensitive) | 61 groups |
| Duplicate **genericName** groups | 61 groups |
| Duplicate **displayNameEn** groups | 62 groups |

**Interpretation:** Duplicate generic/name **groups** often reflect **multiple strengths/forms** per ingredient (expected). The **52** rows missing `genericName` on local DB warrant data-quality review (may include import-only or legacy rows).

**Gap:** Local **299** catalog rows vs **263** Haiti seed → additional rows likely from **controlled import**, **priority ER promotion**, **global baseline**, or manual ops — **not** explained by Haiti seed alone.

---

## Part 4 — Seed / import architecture

### 4.1 Primary Haiti seed path

| Item | Detail |
|------|--------|
| **Data** | `apps/api/prisma/data/haiti-medications.ts` → `HAITI_MEDICATION_CATALOG` |
| **Function** | `seedHaitiMedicationCatalog(prisma, catalog)` |
| **Idempotency** | ✅ `catalogMedication.upsert` by `code`; `medicationAlias.upsert` by `[catalogMedicationId, alias]` |
| **searchText** | Built from generic, strength, form, route, class, aliases |
| **English guard** | Essential rows must resolve `displayNameEn` or seed throws |
| **Wiring** | `seed-catalogs.ts` and `seed.ts` (after lab + imaging waves) |
| **Separation from lab/imaging** | ✅ Medications in dedicated function; imaging waves are separate helpers |

### 4.2 Additional entry paths (non-Haiti-seed)

| Path | Mechanism |
|------|-----------|
| Controlled catalog CSV | `POST medication-master/controlled-catalog` |
| Formulary workbook | `medication-formulary-import.service` → staging → promotion |
| Priority ER inventory | XLSX import + promotion to catalog/canonical |
| Global baseline | Phase 19H baseline flags on products |
| English display CSV | `english-catalog/*.csv` + generator scripts |
| NDC mappings | `medication-ndc-mappings.ts` |

### 4.3 Production seed behavior

- `seed-catalogs.ts` is suitable for **catalog refresh** deployments (lab, imaging, **medications**).
- Full `seed.ts` includes demo facilities/users/inventory — **not** a minimal production medication-only path.
- Medication seed supports **partial updates** via upsert (same `code` updates fields/aliases); **does not** auto-retire rows removed from source file.

### 4.4 Aliases & classifiers

| Feature | Haiti seed | Canonical |
|---------|------------|-----------|
| Legacy aliases | ✅ `commonAliases` → `MedicationAlias` | — |
| Canonical aliases | — | ✅ `MedicationSearchAlias` (import/governance) |
| Classifiers (structured family) | ⚠️ `therapeuticClass` string only | ✅ `MedicationTherapeuticClass` when populated |

### 4.5 SAFE / NOT SAFE — seed architecture

| Verdict | Rationale |
|---------|-----------|
| **SAFE (conditional)** | Reuse `HAITI_MEDICATION_CATALOG` + `seedHaitiMedicationCatalog` for Haiti baseline expansion: stable codes, idempotent upsert, bilingual labels, alias seeding, separated from imaging. |
| **Conditions** | (1) Run production count/duplicate audit before relying on DB. (2) Do not assume DB = seed only — reconcile imports. (3) Do not delete codes without inventory/order impact analysis. (4) Canonical governance may block order search until activation approved. |
| **NOT SAFE if** | Treating screenshots as source of truth over existing seed; re-seeding production without backup; assuming high-alert/LASA seeded when safety profiles show zero high-alert locally. |

---

## Part 5 — Search architecture

### 5.1 API surface

| Endpoint | Service |
|----------|---------|
| `GET /catalog/medications/search` | `MedicationCatalogService.search` |
| Historical alias | Same service via pharmacy module (comment: parity with `/pharmacy/medications/search`) |

**Query parameters:** `q`, `limit` (cap 50), `favoritesFirst`, `purpose` (`order` | `documentation`).

### 5.2 Search pipeline

1. Normalize query; expand via `expandMedicationSearchQuery` (small hardcoded brand↔generic map).
2. `buildCatalogMedicationSearchWhere` — case-insensitive `contains` on: `code`, `name`, `genericName`, `displayNameEn/Fr`, `strength`, `searchText`, `dosageForm`, `route`, `therapeuticClass`.
3. `MedicationAlias` join path for alias-only matches.
4. `CatalogCanonicalReadService.findCatalogIdsViaCanonicalAlias` for canonical aliases.
5. Rank via shared `matchTierForQuery` / `compareCatalogRows` (exact/prefix/contains, essential, sortPriority).
6. For `purpose=order`: filter by `MedicationProductActivationGovernanceService` (activation eligibility).
7. Optional facility favorites via `InventoryItem.isFavorite`.
8. Enrich DTOs with canonical read metadata (high-alert badge slot).

### 5.3 Capability matrix

| Capability | Status | Notes |
|------------|--------|-------|
| Generic name | **PASS** | `genericName`, `searchText` |
| Brand name | **PARTIAL** | `displayNameEn`, aliases; limited brand map in `MEDICATION_SEARCH_QUERY_ALIASES` |
| Common aliases | **PASS** | `MedicationAlias` + canonical alias path |
| Misspellings | **FAIL** | No fuzzy/Levenshtein/phonetic index |
| Family/class | **PARTIAL** | `therapeuticClass` substring match only |
| Route | **PARTIAL** | Text `contains` on `route` |
| Strength | **PARTIAL** | Text `contains` on `strength` |
| Active-only | **PASS** | `isActive: true` |
| Facility filtering | **PARTIAL** | Favorites/recent/usage facility-scoped; catalog global |
| Controlled filter in search | **NOT IMPLEMENTED** | No query flag; flags returned on item |
| High-alert filter in search | **NOT IMPLEMENTED** | Badge via canonical enrichment only |

---

## Part 6 — Order workflow architecture

| Capability | Status | Evidence |
|------------|--------|----------|
| Medication order creation | **IMPLEMENTED** | `OrderItem` + order modal / catalog search |
| Medication dose | **PARTIAL** | `strength` on order; MAR `doseValue`/`doseUnit` |
| Route | **PARTIAL** | String `route` on order + MAR |
| Frequency | **NOT IMPLEMENTED** | No structured frequency on `OrderItem` or order UI grep |
| PRN reason | **NOT IMPLEMENTED** | — |
| Start/stop time | **PARTIAL** | `intendedAdministrationAt`; MAR infusion START/STOP |
| Order status | **IMPLEMENTED** | `OrderStatus`, `lifecycleState`, cancel flow |
| Medication reconciliation | **PARTIAL** | ER home medication entry; no full reconciliation module |
| MAR / eMAR | **PARTIAL** | Append-only `MedicationAdministration`; not full scheduled eMAR |
| Pharmacy verification | **NOT IMPLEMENTED** | Dispense exists; no verification queue |
| Dual signature | **PARTIAL** | Catalog `requiresDoubleSign`; clinical documentation witness |
| Witness requirement | **PARTIAL** | Catalog flags + documentation witness fields |
| Controlled-substance audit | **PARTIAL** | Catalog flags; soft safety warnings; limited audit trail on catalog edits |
| High-alert medication audit | **PARTIAL** | High-risk review UI + documentation forms; safety profile often empty |
| Order discontinuation | **PARTIAL** | Order/item cancel; no dedicated DC workflow |
| Inpatient vs ED context | **PARTIAL** | Pathways, `isEDFormulary` on facility formulary (canonical) |

---

## Part 7 & 8 — Governance and data quality

See [medication-governance-gap-analysis.md](./medication-governance-gap-analysis.md).

---

## Part 9 — Program roadmap

See [medication-program-roadmap.md](./medication-program-roadmap.md).

---

## Final return block (M1.1A)

| Item | Result |
|------|--------|
| **Reuse directory vs screenshots?** | **Yes** — 263-row Haiti seed + existing DB/catalog machinery |
| **Prisma models** | Legacy: `CatalogMedication`, `MedicationAlias`; Clinical: `OrderItem`, `MedicationAdministration`, `MedicationDispense`, `InventoryItem`; Canonical: `MedicationConcept`, `MedicationProduct`, `MedicationPackage`, `MedicationSafetyProfile`, … |
| **Current count** | Seed **263**; production **NOT VERIFIED**; local dev **299** catalog / **686** concepts |
| **Seed/import** | Idempotent Haiti upsert + separate import/promotion pipelines |
| **Search** | Strong contains + aliases; weak fuzzy; governance filter on orders |
| **Orders** | MVP create/MAR/dispense; weak scheduling/frequency/reconciliation |
| **SAFE / NOT SAFE** | **SAFE (conditional)** for Haiti seed reuse; **NOT SAFE** for screenshot-only rebuild or unverified production re-seed |

---

## Sign-off

| Role | Status |
|------|--------|
| M1.1A audit | **COMPLETE** (documentation only) |
| Code changes | **None** |
| Git commit | **Deferred** (per user instruction) |
