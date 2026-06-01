# Controlled Substance Governance — Audit & Design (M1.3A)

**Phase:** M1.3A (audit + design only)  
**Date:** 2026-05-31  
**Prerequisites:** [medication-inventory-architecture-audit.md](./medication-inventory-architecture-audit.md), [medication-controlled-substance-audit.md](./medication-controlled-substance-audit.md) (M1.1B)

---

## Part 1 — Controlled substance governance audit (current state)

### 1.1 Architecture surfaces

| Surface | Location | Role today |
|---------|----------|------------|
| Legacy catalog | `CatalogMedication` | Order search, dispense, MAR snapshots |
| Canonical safety | `MedicationSafetyProfile` | Per-concept flags (intended source of truth) |
| Soft warnings | `packages/shared/src/medicationSafetyWarnings.ts` | Non-blocking UI hints |
| Import governance | `controlled-catalog-import-medication.service.ts` | Admin CSV → concepts/products (not schedule enforcement at order time) |
| EDOC | `controlled_substance_waste` tag (future witness card) | Documentation-only path |

### 1.2 Capability matrix

| Capability | Status | Evidence |
|------------|--------|----------|
| **Controlled-substance flags** | **PARTIAL** | `isControlled`, `controlledSchedule` on `CatalogMedication` and `MedicationSafetyProfile`; local M1.1B: 6 catalog rows flagged, inconsistent benzodiazepines |
| **DEA schedule support** | **PARTIAL** | `controlledSchedule` free string (`II`, `IV`, etc.); no enum; no validation |
| **Audit fields (catalog)** | **MISSING** | Only `createdAt` / `updatedAt` on catalog; no who-changed-schedule |
| **Audit fields (clinical)** | **PARTIAL** | `AuditAction.MEDICATION_DISPENSED`, `MEDICATION_ADMIN_TIME_ADJUSTED`; no `CONTROLLED_SUBSTANCE_OVERRIDE` |
| **Order restrictions** | **PARTIAL** | Product activation gates (`ORDER_SEARCH_NOT_ENABLED`, governance status); **no** controlled-specific order block |
| **Refill controls** | **PARTIAL** | `OrderItem.refillCount` (0–99) exists; **no** controlled-specific refill policy |
| **Waste controls** | **PARTIAL** | `MedicationAdministrationProfile.allowsWasteDocumentation`; EDOC tag `controlled_substance_waste` in witness policy — **card not enabled** (future immediate-witness candidate) |
| **Inventory controls** | **PARTIAL** | `InventoryItem` + `InventoryTransaction` (incl. type `WASTE` enum exists); **no** controlled-specific count/shift reconciliation |

### 1.3 M1.1B findings (reference)

- Catalog presence for audit opioid/benzo list: **55%**
- Safety profile controlled coverage: **0%**
- Diazepam / oral lorazepam / tramadol flag gaps: **HIGH** data-quality risk

---

## Part 2 — Controlled substance classifier design

### 2.1 Design principles

1. **Canonical classifier lives on `MedicationSafetyProfile`** (concept-level), with **denormalized snapshot** on `CatalogMedication` for legacy order/MAR path until dual-write cutover.
2. Classifiers are **stable string codes** (not free-text schedules in application logic).
3. **Haiti clinic MVP** may map DEA schedules to local policy; `CONTROLLED_OTHER` captures non-US/regional rules.
4. Classifiers drive **gates** (order, MAR, EDOC, audit) — never silent behavior changes without clinical sign-off.

### 2.2 Classifier enumeration

| Code | Purpose | Governance impact | Ordering impact | Documentation impact |
|------|---------|-------------------|-----------------|----------------------|
| **CONTROLLED_NONE** | No controlled-substance rules | Standard catalog activation | No extra fields | Standard MAR |
| **CONTROLLED_SCHEDULE_II** | High-abuse potential opioids/stimulants (e.g. morphine, fentanyl, hydromorphone) | Requires compliance sign-off on import; HA often co-applied | Block or warn on high quantities; no e-refill without policy | Witness/dual-check per facility policy; waste EDOC when enabled |
| **CONTROLLED_SCHEDULE_III** | Lower abuse combination products (e.g. some codeine combinations) | Formulary review | Refill limits configurable | May require cosign on dispense |
| **CONTROLLED_SCHEDULE_IV** | Benzodiazepines, tramadol (jurisdiction-dependent) | Flag all SKUs of molecule | Caution on duplicate therapy | Sedation warnings + EDOC sedation cards |
| **CONTROLLED_SCHEDULE_V** | Limited quantities preparations | Light controls | Standard with audit | Minimal extra documentation |
| **CONTROLLED_OTHER** | Regional/non-DEA (Haiti MOH, hospital policy) | Documented in `governanceNotes` | Facility policy JSON | Custom witness cards |

### 2.3 Mapping from legacy fields

| Legacy | Target classifier |
|--------|-------------------|
| `isControlled = false`, schedule null | `CONTROLLED_NONE` |
| `controlledSchedule = 'II'` | `CONTROLLED_SCHEDULE_II` |
| `controlledSchedule = 'III'` | `CONTROLLED_SCHEDULE_III` |
| `controlledSchedule = 'IV'` | `CONTROLLED_SCHEDULE_IV` |
| `controlledSchedule = 'V'` | `CONTROLLED_SCHEDULE_V` |
| Unknown / Haiti-specific string | `CONTROLLED_OTHER` + notes |

### 2.4 Derived workflow flags (from classifier)

Proposed derivation table (implemented in M1.3C):

| Classifier | `requiresWitness` default | `requiresDoubleSign` default | `requiresInventoryTracking` | `requiresWasteDocumentation` |
|------------|---------------------------|------------------------------|----------------------------|------------------------------|
| NONE | false | false | false | false |
| II | true | true | true | true |
| III | facility | facility | true | true |
| IV | facility | false | true | false |
| V | false | false | false | false |
| OTHER | clinical manifest | clinical manifest | true | facility |

“Facility” = read from `FacilityMedicationControlledPolicy` (future JSON on facility settings — design only in M1.3A).

### 2.5 Clinical sign-off artifact (required before M1.3C)

**Deliverable:** `medication-controlled-substance-manifest.csv` (future) with columns:

`genericName`, `productCode`, `classifier`, `schedule`, `witnessRequired`, `notes`, `haitiEssential`

---

## Part 3 — Implementation notes (design only)

- **No schema change in M1.3A.** M1.3C may add `controlledSubstanceClass` on `MedicationSafetyProfile` or use `highAlertCategories`-style JSON bucket `controlledClass`.
- Prefer **additive** column over breaking `controlledSchedule` string during transition.
- Sync job: concept profile → legacy catalog on approved promotion only.

---

## Sign-off

| Item | M1.3A |
|------|-------|
| Implementation | **Not authorized** |
| Design status | **COMPLETE** |
