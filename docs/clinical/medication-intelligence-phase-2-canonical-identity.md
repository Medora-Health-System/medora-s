# Medication Intelligence Phase 2 — Canonical Identity Foundation

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_2_CANONICAL_IDENTITY_RXNORM_ROUTE_MAR_BILLING_FOUNDATION`

**Decision:** See `apps/api/prisma/medications/audit-summaries/medication-phase2-enterprise-certification-summary.json` (`FinalDecision`).

**Related:** [Phase 1 architecture audit](./medication-intelligence-phase-1-architecture-audit.md) · [Roadmap](./medication-intelligence-roadmap.md)

---

## 1. Repository audit findings (pre-implementation)

| # | Topic | Finding |
|---|--------|---------|
| 1 | Identity models | Runtime `CatalogMedication` + canonical `MedicationConcept` → `MedicationProduct` → `MedicationPackage` |
| 2 | Layer ownership | Concept/product/package = global reference; catalog = global curated runtime; formulary/inventory/MAR/billing = facility-scoped |
| 3 | Catalog↔product | Optional unique `MedicationProduct.legacyCatalogMedicationId`; sparse linkage; no auto-merge |
| 4 | Order→catalog | `OrderItem.catalogItemId` (and snapshots); canonical product/package FKs optional / sparsely used |
| 5 | Order→MAR | Dose instances / administrations reference order items; MAR preserves administration facts |
| 6 | MAR→charge | Soft link via `BillingEvent.sourceModule` + `sourceRecordId`; not FK-enforced |
| 7 | Routes | `MedicationRoute` ref + free-text catalog/order routes; **no** product-route M:N before Phase 2 |
| 8 | Dose form | Catalog `dosageForm` string + product form fields; not a complete controlled vocabulary |
| 9 | Strength | Display/string fields + concentration helpers; not fully normalized |
| 10 | HCPCS | Catalog `billingCodeDefault`, package `MedicationBillingProfile`, billing resolve utils; manual review default |
| 11 | NDC | `CatalogMedication.ndc11` + `MedicationPackage.ndc11`; package-level truth preferred |
| 12 | Historical deps | Order/MAR snapshots and catalog IDs must remain resolvable |
| 13 | Fixtures | `*_MST_*` / DEV-SAMPLE patterns; no DB classification field before Phase 2 |
| 14 | Tenant/facility | Canonical identity global; configuration facility-scoped |
| 15 | Search | Catalog search EN/FR; must remain default-unchanged |
| 16 | Localization | Canonical identity language-neutral; `displayNameEn` / `displayNameFr` display layers |
| 17 | ID change risk | Renaming codes breaks FKs/history — forbidden |
| 18 | Backfill risk | Auto-linking by name/strength is unsafe |
| 19 | Merge risk | Duplicate concept merge without provenance is unsafe |
| 20 | Schema changes | Additive metadata + route permission table + indexes |
| 21 | Migration | Additive SQL `20261004120000_medication_phase_2_canonical_identity` |
| 22 | Compatibility | Defaults preserve prior runtime behavior |
| 23 | Rollback | Forward-fix preferred; drop unused permission table only if never populated |
| 24 | Runtime behavior | Phase 2 completable **without** search/order/MAR behavior change |

---

## 2. Architecture decisions

1. **Additive foundation only** — no bulk RxNorm/NDC/catalog import.
2. **Explicit mapping statuses** — `UNMAPPED|CANDIDATE|VERIFIED|REJECTED|RETIRED` (RxNorm); dual-layer `UNLINKED|…|VERIFIED`.
3. **Verified ≠ field present** — `isRxNormVerifiedMapping` requires status + RxCUI.
4. **Legacy FK ≠ verified dual-layer link**.
5. **Route permissions** stored but **not enforced** on order create in Phase 2 (no surprise denials).
6. **Fixture classification** metadata + optional filter util; production search exclusion **OFF** by default.
7. **Billing quantities** are distinct kinds; catalog presence does not create charges.
8. **Seed Required: NO** — no unverified clinical product→route seeds.

---

## 3. Database changes

Migration: `apps/api/prisma/migrations/20261004120000_medication_phase_2_canonical_identity/`

| Object | Change |
|--------|--------|
| `MedicationConcept` | RxNorm mapping metadata + indexes |
| `MedicationProduct` | Dual-layer linkage metadata + index |
| `CatalogMedication` | `dataClassification`, `dataSourceLabel` |
| `MedicationRoute` | `isActive`, `sortOrder`, `clinicalCategory` |
| `MedicationBillingProfile` | `mappingStatus`, `mappingSource`, `mappingVersion` |
| `MedicationProductRoutePermission` | New M:N eligibility table |

### Local migration

```bash
pnpm --filter @medora/api exec prisma migrate deploy
# interactive local alternative when appropriate:
# pnpm --filter @medora/api exec prisma migrate dev
pnpm --filter @medora/api exec prisma generate
```

### Production migration (document only — do not run in this phase)

```bash
DATABASE_URL="$RAILWAY_DATABASE_URL" pnpm --filter @medora/api exec prisma migrate deploy
```

Verified package filter: `@medora/api` (see `docs/STARTUP_RULES.md`).

### Seed

```text
Seed Required: NO
```

Optional dry-run fixture classification:

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/medications/audit/backfill-fixture-classification.ts
# write only with --apply after review
```

---

## 4. Canonical identity chain

```text
MedicationConcept (stable clinical identity + RxNorm mapping metadata)
        ↓
MedicationProduct (strength/form; dual-layer link status to CatalogMedication)
        ↓
MedicationPackage (physical/NDC unit + billing profile candidates)
        ↓
CatalogMedication / facility formulary (orderable configuration)
        ↓
OrderItem
        ↓
MAR schedule + MedicationAdministration (actual dose/route/time/actor)
        ↓
BillingEvent (administration-provenanced; manual review)
```

Catalog presence alone does **not** prove order, dispense, preparation, administration, complete dose, infusion completion, charge validity, or HCPCS unit correctness.

---

## 5. RxNorm foundation

- Schema ready for RxCUI + term type + vocabulary + status + confidence + version + review provenance.
- **RxNormDataImported: NO**
- Empty RxCUI remains valid as `UNMAPPED`.
- Do not classify concepts as “RxNorm canonical” merely because a field exists.

---

## 6. Dual-layer reconciliation

- Bridge: `MedicationProduct.legacyCatalogMedicationId`
- Status/method/confidence/notes on product
- Fuzzy auto-merge forbidden (`assertNoAutomaticFuzzyMerge`)
- Historical orders keep catalog snapshots / codes

---

## 7. Route governance

- `MedicationProductRoutePermission.eligibilityStatus`: `ALLOWED|RESTRICTED|INACTIVE|DEPRECATED|REQUIRES_CONFIGURATION|NOT_VERIFIED`
- Injectable product **does not** imply IV push / IM / SQ / IO
- Ordering enforcement deferred (compatibility)

---

## 8. MAR + billing traceability

- Existing MAR preserves administration facts; Phase 2 adds identity helpers (`resolveHistoricalMedicationIdentity`)
- Quantity kinds: ordered / dispensed / prepared / administered / wasted / billable
- HCPCS profile mapping defaults to `CANDIDATE`; no auto claim submit

---

## 9. Fixture isolation + localization

- Heuristic `*_MST_*` / DEV-SAMPLE detection retained
- Stored `dataClassification` enables deterministic filters later
- Missing FR display rows remain identifiable (Phase 4); no invented translations

---

## 10. Certification + tooling

```bash
pnpm --filter @medora/api medication:certify:phase2
```

Artifacts: `apps/api/prisma/medications/audit-summaries/medication-phase2-*.json` (16 files).

Focused tests:

- `packages/shared/src/medication/medicationPhase2Foundation.test.ts`
- `apps/api/src/medication-master/medication-phase2-foundation.util.spec.ts`
- `apps/api/prisma/medications/audit/medication-phase2-certification.spec.ts`

---

## 11. Known gaps

### Blocking

None expected when schema, focused tests, build, typecheck, and diff-check pass.

### Non-blocking (deferred)

- RxCUI population / RxNorm import → Phase 3
- Product–route permission matrix population (verified sources only)
- Search wiring for fixture exclusion
- French display backfill
- Explicit dual-layer VERIFIED bulk review

---

## 12. Phase 3 readiness

Phase 3 may plan **scoped** RxNorm concept import with staging/promotion. Phase 2 does **not** authorize bulk import or search cutover.
