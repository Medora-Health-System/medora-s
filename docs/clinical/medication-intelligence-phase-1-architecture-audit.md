# Medication Intelligence Phase 1 — Architecture Audit

Factual architecture audit for Medora-S medication intelligence. Based on repository evidence (Prisma schema, API routes, shared manifests, existing `docs/medications/*` audits) and **live local-dev DB measurements** below.

**Phase:** 1 — audit only (no code, seeds, migrations, or production writes)
**Report date:** 2026-07-17
**Production DB:** NOT VERIFIED — counts below are **local-dev reference only**

**Prior art:** 150+ medication program documents under [`docs/medications/`](../medications/). This Phase 1 audit **supersedes stale counts** in those docs with live audit tooling measurements where noted.

---

## Executive summary

Medora-S operates a **dual medication identity** architecture: legacy `CatalogMedication` drives runtime search, orders, MAR, and pharmacy workflows; canonical `MedicationConcept` → `MedicationProduct` → `MedicationPackage` provides governance, billing profiles, and future enterprise identity. The canonical layer is **populated but not operationally authoritative** — RxNorm linkage is absent, provider search canonical cutover is documented as **NOT SAFE**, and no prescription or medication-reconciliation entities exist.

The catalog is **CURATED** (Haiti seed + enterprise wave expansion), **not COMPLETE** (no full US/RxNorm clinical drug dictionary).

| Decision | Result |
|----------|--------|
| **Medication engine foundation ready** | **No** |
| **Final audit decision** | **`MEDICATION_ENGINE_FOUNDATION_REPAIR_REQUIRED`** |
| **Estimated maturity** | **~50–55%** (exact score from `medication-maturity-score.json` tooling; see [Maturity](#part-15--maturity--blockers)) |
| **Canonical cutover** | **NOT SAFE** (per `docs/medications/provider-search-canonical-cutover-audit.md`, `enterprise-formulary-readiness.md`, and related M1.5F/M1.6 audits) |
| **Haiti MVP on legacy catalog** | **SAFE (conditional)** — continue with documented gaps |

---

## Local-dev DB measurements (reference)

Measured against local dev database (`postgresql://postgres:postgres@localhost:5432/medora`). **Not production.**

| Entity / metric | Count | Notes |
|-----------------|------:|-------|
| **CatalogMedication** total | 1,042 | Legacy runtime catalog |
| **CatalogMedication** active | 969 | |
| **MedicationConcept** | 1,365 | `rxNormConceptId` populated: **0** |
| **MedicationProduct** | 1,428 | 1:1 with packages locally |
| **MedicationPackage** | 1,428 | |
| **MedicationAlias** | 1,348 | Legacy catalog aliases |
| **MedicationSearchAlias** | 466 | Canonical search aliases |
| **NDC on catalog** (`CatalogMedication.ndc11`) | 84 | Catalog-level NDC sparse |
| **NDC on packages** (`MedicationPackage.ndc11`) | 544 | Package-level; primary billing identity |
| **HCPCS** (`CatalogMedication.billingCodeDefault`) | 128 | Billing suggestion only |
| **Billing profiles with HCPCS** (`MedicationBillingProfile.hcpcsCode`) | 95 | Package-scoped billing metadata |
| **Controlled substances** (`CatalogMedication.isControlled`) | 18 | Denormalized legacy flags |
| **displayNameEn** populated | 1,042 | 100% of catalog rows |
| **displayNameFr** populated | 963 | ~92% — 79 rows missing French display |
| **FacilityFormularyItem** | 898 | Per-facility formulary mapping |
| **InventoryItem** | 15 | Sparse local inventory linkage |
| **MedicationSafetyProfile** | 1,085 | Concept-level safety; no DDI engine |

**Seed composition (source manifests, not re-counted in SQL):**

- Haiti full seed: **~326 curated rows** (`haiti-medications.ts` / `haitiMedicationFormularyCatalog.ts`; manifest expects 310 unique codes — local DB drift from enterprise imports expected)
- Enterprise waves (W1–W4 manifests in `packages/shared/src/medication/enterpriseWave*FormularyManifest.ts`) expand catalog beyond Haiti baseline toward ~650–1,000+ governed codes per `enterprise-formulary-roadmap-1000-medications.md`

**Catalog classification:** **CURATED** — facility/regional formulary built from Haiti seed + staged enterprise waves. **Not COMPLETE** — no authoritative national or US RxNorm-complete drug dictionary.

---

## Architecture map

```mermaid
flowchart TB
  subgraph runtime [Runtime path — operational today]
    SEARCH["GET /catalog/medications/search<br/>GET /pharmacy/medications/search"]
    CM[(CatalogMedication)]
    ORD[OrderItem]
    MAR[MedicationAdministration]
    SEARCH --> CM
    CM --> ORD --> MAR
  end
  subgraph canonical [Canonical path — governance / future identity]
    MC[(MedicationConcept)]
    MP[(MedicationProduct)]
    PKG[(MedicationPackage)]
    SAF[MedicationSafetyProfile]
    BILL[MedicationBillingProfile]
    MC --> MP --> PKG
    MC --> SAF
    PKG --> BILL
  end
  CM -.->|legacyCatalogMedicationId| MP
  PKG --> FFI[FacilityFormularyItem]
```

**Dual identity summary:**

| Layer | Primary tables | Runtime role |
|-------|----------------|--------------|
| **Legacy** | `CatalogMedication`, `MedicationAlias` | Search, orders, MAR, inventory FK, controlled/witness denorm |
| **Canonical** | `MedicationConcept`, `MedicationProduct`, `MedicationPackage`, `MedicationSearchAlias`, `MedicationSafetyProfile` | Governance activation, billing profiles, formulary items, future cutover target |

Provider search returns **`CatalogMedication.id`** only. Canonical rows enrich metadata but do not replace search hits (`provider-search-canonical-cutover-audit.md`).

---

## Part 1 — Data model

**Status:** PARTIAL — schema rich; runtime split across dual paths.

| Model | Purpose | Verdict |
|-------|---------|---------|
| `CatalogMedication` | Legacy order/MAR/search catalog | **IMPLEMENTED** — operational |
| `MedicationConcept` / `Product` / `Package` | Canonical identity graph | **PARTIAL** — populated; not primary runtime FK |
| `MedicationAlias` | Legacy search aliases | **IMPLEMENTED** |
| `MedicationSearchAlias` | Canonical normalized aliases | **PARTIAL** — supplemental search only |
| `MedicationSafetyProfile` | High-alert, LASA, controlled, `interactionGroupIds` JSON | **PARTIAL** — data layer; weak enforcement |
| `MedicationAdministrationProfile` / `InfusionProfile` | MAR/billing workflow hints on product | **PARTIAL** — schema; not primary MAR path |
| `FacilityFormularyItem` | Per-facility package formulary | **IMPLEMENTED** — 898 rows locally |
| `MedicationBillingProfile` | HCPCS, billable units, payer hints | **PARTIAL** — 95 with HCPCS |
| `MedicationFormularyImportStaging` | Import workbook staging | **IMPLEMENTED** — no silent promotion |
| `InventoryItem` | Pharmacy stock (`catalogMedicationId` FK) | **PARTIAL** — 15 rows locally |
| **`Prescription`** | Discharge/outpatient Rx entity | **NOT IMPLEMENTED** — no Prisma model |
| **`MedicationReconciliation`** | Admission/transfer/discharge med rec | **NOT IMPLEMENTED** — no clinical entity |

**Key schema locations:** `apps/api/prisma/schema.prisma` (Phase 19B medication master block).

---

## Part 2 — Catalog

**Status:** CURATED, not COMPLETE.

- **1,042** legacy catalog rows (969 active) vs **~326** Haiti curated seed — delta from enterprise wave imports, baseline products, and promotion staging.
- Static manifests: `haitiMedicationFormularyCatalog.ts`, `enterpriseWave1–4FormularyManifest.ts`, pilot tranche manifests.
- `MedicationProduct.governanceStatus` defaults to `REVIEW_REQUIRED`; activation is tranche-governed (`medication-product-activation-governance.service.ts`).
- Duplicate code constraint on `CatalogMedication.code` holds (unique).
- Classification audit flags (`catalogClassificationAuditFlags.ts`) detect route/admin-type/billing-class mismatches — read-only, no auto-fix.

**Gap:** No single unified runtime master; static manifests and DB can drift.

---

## Part 3 — Coding systems

| System | Role in Medora-S | Status |
|--------|------------------|--------|
| **Internal codes** | `CatalogMedication.code`, `MedicationProduct.code` | **PRIMARY** for FK stability |
| **RxNorm** | `MedicationConcept.rxNormConceptId` | **NOT LINKED** (0 populated) |
| **NDC** | Package-level identifier (`MedicationPackage.ndc11`) | **PARTIAL** — 544 packages; not search primary key |
| **HCPCS** | Billing code on catalog default + billing profiles | **PARTIAL** — billing metadata, **not** clinical dictionary |
| **CVX** | Vaccine billing (enterprise wave manifests) | **PARTIAL** — manifest-level for select vaccines |

**Critical distinction:** HCPCS supports charge capture suggestions; it does **not** substitute for clinical drug identity or RxNorm concept resolution.

---

## Part 4 — RxNorm / NDC / HCPCS

| Identifier | Where stored | Local count | Clinical vs billing |
|------------|--------------|------------:|---------------------|
| **RxNorm concept** | `MedicationConcept.rxNormConceptId` | 0 | Clinical dictionary — **absent** |
| **NDC (catalog)** | `CatalogMedication.ndc11` | 84 | Legacy convenience; sparse |
| **NDC (package)** | `MedicationPackage.ndc11` | 544 | **Package-level** — correct layer for dispense/billing |
| **HCPCS (catalog default)** | `CatalogMedication.billingCodeDefault` | 128 | Billing suggestion |
| **HCPCS (billing profile)** | `MedicationBillingProfile.hcpcsCode` | 95 | Payer-scoped billing |

**Finding:** Complete US/RxNorm catalog is **not present**. NDC is correctly modeled at package level but coverage is incomplete. HCPCS is billing-oriented.

---

## Part 5 — Search

**Endpoints (same service):**

| Endpoint | Controller | Roles |
|----------|------------|-------|
| `GET /catalog/medications/search` | `order-catalog.controller.ts` | PROVIDER, RN, PHARMACY, ADMIN |
| `GET /pharmacy/medications/search` | `medication-catalog.controller.ts` | PHARMACY, ADMIN, PROVIDER, RN |

**Implementation:** `MedicationCatalogService.search()` queries `CatalogMedication` + `MedicationAlias`, optionally supplements via `MedicationSearchAlias`, applies `filterProviderSearchCatalogIds` activation gate, enriches via `CatalogCanonicalReadService`.

**Web wiring:** `apps/web/src/lib/catalogSearchApi.ts` → `MedicationAutocomplete`.

**Admin/explorer (separate):** `GET /medication-master/search` — canonical concept/product explorer, not provider typeahead.

**Cutover:** Documented **NOT SAFE** for canonical-only provider search (M1.5F). Legacy catalog remains authoritative for returned IDs.

---

## Part 6 — EN / FR localization

| Field | Coverage (local) | Notes |
|-------|------------------|-------|
| `displayNameEn` | 1,042 / 1,042 | English-primary for pharmacy, search, orders, MAR |
| `displayNameFr` | 963 / 1,042 | Product UI language — 79 gaps |
| `MedicationAlias.language` | Optional | Legacy aliases |
| `MedicationSearchAlias.language` | Optional | Canonical aliases |
| `MedicationConcept.displayName` | Single string | Not bilingual — gap for canonical cutover |

Localization validation: `medicationClinicalDisplayLocale`, `medication-localization-*` docs. i18n maturity score ~4/5 in static audit tooling.

---

## Part 7 — Ordering

**Status:** IMPLEMENTED on legacy path.

- Medication orders: `Order` (type MEDICATION) + `OrderItem` (`catalogItemType = MEDICATION`).
- Optional canonical FKs: `OrderItem.medicationProductId`, `medicationPackageId` — **not populated in MVP flows**.
- Order lifecycle: `OrderItemLifecycleState`, infusion start/stop events, cancel cascade.
- Activation pipeline: formulary approval → `orderSearchEnabled` → MAR enable (`medication-product-activation-governance.service.ts`).
- Order sentences / structured sig: **PARTIAL** — free-text instructions; no RxNorm-normalized dose grammar.

**Gap:** Canonical ordering integration deferred (Phase 6 roadmap).

---

## Part 8 — Prescription

**Status:** NOT IMPLEMENTED.

- No `Prescription` Prisma model.
- Outpatient intent exists via `MedicationFulfillmentIntent.PHARMACY_DISPENSE` and `MedicationDispense` records.
- No e-prescribing, discharge Rx document entity, or external pharmacy transmission.
- Discharge medication lists may appear in clinical documentation text but are not a reconciled prescription object.

---

## Part 9 — MAR (medication administration record)

**Status:** PARTIAL — functional bedside log; not full eMAR.

| Capability | Status |
|------------|--------|
| `MedicationAdministration` append-only MAR | **IMPLEMENTED** |
| Infusion START/STOP phases | **IMPLEMENTED** |
| PRN / continuous / bolus workflows | **PARTIAL** |
| Scheduled eMAR / due-times engine | **NOT IMPLEMENTED** |
| BCMA / barcode scanning | **NOT IMPLEMENTED** |
| Pharmacy verification state machine at MAR | **NOT IMPLEMENTED** |
| Controlled waste / witness MAR fields | **PARTIAL** — verification models exist; enforcement gaps |
| `MedicationAdministrationProfile` on canonical product | **PARTIAL** — schema only |

Primary UI: `MedicationAdministrationTab.tsx`. MAR keys off order lines tied to `CatalogMedication`.

Reference: `docs/medications/mar-emar-architecture-audit.md`.

---

## Part 10 — Reconciliation

**Status:** NOT IMPLEMENTED.

- No `MedicationReconciliation` clinical entity.
- `MedicationFormularyImportStaging.reconciliationStatus` is **import-workbook** staging only — not patient med rec.
- No admission / transfer / discharge reconciliation workflow, discrepancy tracking, or continue/hold/change/stop actions.

---

## Part 11 — Safety

**Status:** PARTIAL — scaffolding without licensed DDI engine.

| Capability | Status |
|------------|--------|
| `MedicationSafetyProfile` (1,085 rows) | **PARTIAL** — concept-level flags |
| High-alert / LASA / controlled flags | **PARTIAL** — denorm on catalog + profile |
| `interactionGroupIds` JSON | **STORED ONLY** — no DDI engine, no interaction checking API |
| `getMedicationSafetyWarnings` (shared) | **IMPLEMENTED** — soft, non-blocking UI warnings |
| Allergy cross-check at order | **NOT IMPLEMENTED** — no licensed interaction/allergy engine |
| M1.3 governance enforcement at MAR | **NOT IMPLEMENTED** at administration time |

Reference: `docs/medications/medication-safety-governance-audit.md`, `medication-safety-profile-design.md`.

---

## Part 12 — Dosing

**Status:** PARTIAL.

- Strength/form/route stored as **display strings** on catalog and product (`strength`, `dosageForm`, `route`, `strengthDisplay`).
- `MedicationConcentration`, `MedicationDoseUnit`, `MedicationRoute` models exist for canonical normalization — **incomplete adoption**.
- `maxSingleDoseAmount` on safety profile — optional guardrail, not enforced engine.
- IVPB / infusion dose projection: shared modules (`medicationInfusionRuntimeProjection.ts`, `ivpbDoseStatusTransition.ts`) — workflow-specific, not universal dose engine.
- No FDB/Medi-Span or open dose-range knowledge base integrated.

---

## Part 13 — Controlled substances

**Status:** PARTIAL.

- **18** controlled rows on legacy catalog (`isControlled`, `controlledSchedule`).
- Canonical classifier on `MedicationSafetyProfile.isControlled` with legacy denorm mirror (`controlled-substance-governance-design.md`).
- Witness / double-sign requirements: schema + MAR verification models; enterprise controlled blocked from auto-activation.
- DEA schedule consistency across dual paths: **audit gaps** documented in prior M1.1B audits.

---

## Part 14 — Formulary / inventory / billing

| Area | Status | Local signal |
|------|--------|--------------|
| **Facility formulary** | **IMPLEMENTED** | 898 `FacilityFormularyItem` rows |
| **Formulary activation gates** | **IMPLEMENTED** | Tranche-based; no bulk enable |
| **Inventory linkage** | **PARTIAL** | 15 `InventoryItem` rows; FK to `catalogMedicationId` |
| **Package ↔ inventory** | **PLANNED** | `InventoryItem.medicationPackageId` nullable, unpopulated |
| **NDC billing capture** | **PARTIAL** | Package NDC + billing manifests; activation gates |
| **HCPCS charge capture** | **PARTIAL** | 95 billing profiles; manual review default |
| **Infusion billing governance** | **PARTIAL** | `InfusionProfile.requiresStopMarForBilling` |

Reference: `docs/medications/medication-inventory-architecture-audit.md`, `medication-billing-readiness.md`.

---

## Part 15 — Integrations

| Integration | Status |
|-------------|--------|
| **External e-prescribing (Surescripts, etc.)** | **NOT IMPLEMENTED** |
| **RxNorm API / import** | **NOT IMPLEMENTED** |
| **Licensed DDI/allergy (FDB, Medi-Span)** | **NOT IMPLEMENTED** |
| **NCPDP / NDC directory sync** | **NOT IMPLEMENTED** |
| **Pharmacy dispense workflow** | **PARTIAL** — `MedicationDispense`, pharmacy worklist |
| **Billing / claims engine** | **PARTIAL** — HCPCS suggestions, administration billing resolve util |
| **Public health vaccine catalog** | **PARTIAL** — separate vaccine module; Tdap workflow designed not fully wired |

Offline-readiness: medication catalog is DB-local and seed-reconstructable; no external dictionary dependency at runtime (by design for low-resource clinics).

---

## Part 16 — Security

| Control | Status |
|---------|--------|
| JWT + role guards on search/order APIs | **IMPLEMENTED** |
| Facility scoping (`facilityId` / `x-facility-id`) | **IMPLEMENTED** |
| Activation governance authorization | **IMPLEMENTED** — admin/pharmacy sign-off patterns |
| Audit logging for governance actions | **PARTIAL** |
| Controlled substance witness verification audit | **PARTIAL** — `MedicationAdministrationVerification` |
| PHI in medication audit tooling | **EXCLUDED** — static manifests and certifiers use codes only |

Reference: `docs/medications/medication-governance-authorization.md`.

---

## Part 17 — Coverage

Static audit tooling (`providerMedicationCatalogMaturityAudit.ts`, `hospitalMedicationCoverageManifest.ts`) evaluates hospital core medication groups (pressors, antibiotics, analgesics, etc.) against manifest union — not live DB.

**Local catalog breadth:** 1,042 rows exceeds Haiti MVP (~326) due to enterprise waves; **clinical completeness** is category-dependent (strong ER injectables/antibiotics in seed; weak RxNorm depth, incomplete controlled/high-alert profile enforcement).

Enterprise expansion trajectory: ~325 unique today → 650–1,000+ per wave roadmap — still **curated**, not US-complete.

---

## Part 18 — Maturity

**Estimated overall maturity: ~50–55%.**

Exact percentage will be emitted by medication maturity audit tooling to `medication-maturity-score.json` (planned companion artifact; not yet committed). Interim basis:

| Source | Signal |
|--------|--------|
| `runProviderMedicationCatalogMaturityAudit()` | 16-domain report; static manifest `maturityAverage` ~3.4/5 ≈ 68% on manifest-only basis |
| `medication-production-readiness.md` (M1.1B) | Enterprise readiness **44/100** on older local DB |
| Live DB dual-path gap (0 RxNorm, NOT SAFE cutover, no Rx/rec) | Pulls effective maturity down to **~50–55%** |

**Domain highlights (0–5 scale from audit tooling):**

| Domain | Score | Risk |
|--------|------:|------|
| Formulary activation / import pipeline | 4 | LOW |
| High-risk / controlled governance design | 4 | HIGH |
| i18n EN/FR | 4 | LOW |
| Medication master / catalog unity | 3 | MEDIUM |
| Provider search | 3 | MEDIUM |
| MAR workflow | 3 | MEDIUM |
| NDC / billing | 3 | MEDIUM |
| Prescription / med rec / DDI | 0–1 | HIGH |

---

## Part 19 — Blockers

Priority blockers before enterprise medication intelligence certification:

1. **Zero RxNorm linkage** — `rxNormConceptId` populated: 0 / 1,365 concepts.
2. **Dual identity without cutover plan execution** — runtime on legacy; canonical dormant for search/orders.
3. **Canonical provider search cutover NOT SAFE** — documented across M1.5F/M1.6/M1.7 audits.
4. **No Prescription entity** — discharge/outpatient prescribing not modeled.
5. **No medication reconciliation** — admission/transfer/discharge gap.
6. **No DDI engine** — `interactionGroupIds` JSON only; no licensed knowledge base.
7. **Safety profile enforcement gap** — data exists; MAR/order-time hard stops incomplete.
8. **NDC / inventory sparsity** — 15 inventory rows locally; package NDC incomplete.
9. **French display gaps** — 79 catalog rows missing `displayNameFr`.
10. **Manifest ↔ DB drift risk** — 1,042 DB rows vs ~326 Haiti seed requires ongoing audit discipline.

---

## Final decision

```
MEDICATION_ENGINE_FOUNDATION_REPAIR_REQUIRED
```

Continue Haiti MVP on legacy `CatalogMedication` with documented gaps. Do **not** proceed with canonical-only search cutover, bulk activation, or enterprise safety sign-off until Phases 2–11 of [`medication-intelligence-roadmap.md`](./medication-intelligence-roadmap.md) address foundation repairs in order.

---

## Related documentation

| Document | Relevance |
|----------|-----------|
| [`docs/medications/`](../medications/) | Prior art — formulary waves, MAR, billing, canonical linkage, pilot activation |
| [`provider-search-canonical-cutover-audit.md`](../medications/provider-search-canonical-cutover-audit.md) | NOT SAFE cutover evidence |
| [`mar-emar-architecture-audit.md`](../medications/mar-emar-architecture-audit.md) | MAR/eMAR gap inventory |
| [`medication-production-readiness.md`](../medications/medication-production-readiness.md) | M1.1B readiness scores (superseded counts) |
| [`enterprise-medication-catalog-completion-audit.md`](../medications/enterprise-medication-catalog-completion-audit.md) | M1.5A dual-path reconciliation |
| `packages/shared/src/medication/providerMedicationCatalogMaturityAudit.ts` | Static maturity audit tooling |

**No PHI.** All counts from schema queries and non-patient manifests.
