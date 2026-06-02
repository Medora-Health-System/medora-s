# Medication Governance — Production Rollout Audit (M1.3F.9)

**Phase:** M1.3F.9 (read-only audit)  
**Date:** 2026-06-02  
**Scope:** M1.3B → M1.3F.8 (entire Medication Governance program through legal chart integration)  
**Constraints:** No migrations executed, no seed run, no production writes, no code changes.

**Repository HEAD reference:** `a956f1a3` — *Integrate medication governance into legal chart* (M1.3F.8).

---

## Executive summary

| Area | Verdict |
|------|---------|
| **Part 1 — Governance inventory** | **PASS** |
| **Part 2 — Production readiness (code)** | **READY** |
| **Part 2 — Production readiness (data/ops)** | **NOT READY** until `prisma migrate deploy` + `seed-catalogs` on target DB |
| **Part 3 — Safety governance** | **PASS** (runtime enforcement wired; catalog coverage is operational) |
| **Part 4 — Legal chart** | **PASS** |
| **Part 5 — Performance / ops risk** | **LOW–MEDIUM** overall |
| **Part 6 — Billing foundation** | **PASS WITH OBSERVATIONS** |
| **Part 7 — Rollout decision** | **Medication Governance Rollout Ready** (code) |
| **SAFE / NOT SAFE** | **SAFE (conditional)** — see [medication-governance-production-readiness.md](./medication-governance-production-readiness.md) |

---

## Part 1 — Governance inventory audit

Verification method: static codebase trace (shared → API → web → chart/ROI), migration folder listing, spec file presence.

| Component | Phase | Evidence | Verdict |
|-----------|-------|----------|---------|
| Medication safety classifiers | M1.3B | `packages/shared/src/medication/medicationSafetyClassifiers.ts`, `medicationSafetyClassifierManifest.ts`, `seed-medication-safety-classifiers.ts`, `TermClassifier` upserts | **PASS** |
| Controlled substance governance | M1.3C | `controlledSubstanceGovernanceManifest.ts`, `seed-controlled-substance-governance.ts`, catalog `isControlled` / schedule fields | **PASS** |
| High-alert governance | M1.3D | `highAlertMedicationGovernanceManifest.ts`, `seed-high-alert-medication-governance.ts`, `MedicationSafetyProfile` | **PASS** |
| LASA governance | M1.3E | `lasaMedicationGovernanceManifest.ts`, `seed-lasa-medication-governance.ts`, `lasaGroupId` on profile | **PASS** |
| MAR/eMAR schema foundation | M1.3F.1 | Migration `20260903120000_m1_3f1_mar_emar_schema_foundation`, models: verification, waste, override, correction, pharmacy | **PASS** |
| MAR UI governance foundation | M1.3F.3 | `MedicationMarSafetyGovernanceBadges.tsx`, `MedicationMarSafetySummaryPanel.tsx`, `orderItemMedicationSafetyGovernance.ts`, `MedicationAdministrationTab.tsx` | **PASS** |
| Witness workflow | M1.3F.4 | `controlledSubstanceMarGovernance.ts`, `MarControlledSubstanceFields.tsx`, `persistControlledSubstanceMarGovernance`, audit enums F.4 migration | **PASS** |
| Waste workflow | M1.3F.4 | `MedicationWasteDocumentation`, waste fields in MAR create + persist | **PASS** |
| Double-check workflow | M1.3F.5 | `highAlertMarGovernance.ts`, `MarHighAlertFields.tsx`, `persistHighAlertMarGovernance`, F.5 migration | **PASS** |
| LASA MAR acknowledgement | M1.3F.6* | `lasaMarGovernance.ts`, `MarLasaFields.tsx`, `persistLasaMarGovernance`, F.6 migration | **PASS** |
| Pharmacy verification workflow | M1.3F.7 | `pharmacyMarGovernance.ts`, `PharmacyVerificationService`, `orders.controller` complete/reject, `MarPharmacyVerificationPanel.tsx`, F.7 migration | **PASS** |
| Legal chart integration | M1.3F.8 | `medicationGovernanceChartSummary.ts`, `medication-governance-chart.util.ts`, manifest + HTML sections | **PASS** |
| Unified timeline integration | M1.3F.8 | `unified-encounter-timeline.service.ts` governance source rows | **PASS** |
| Chart export integration | M1.3F.8 | `chart-export.service.ts` `medicationGovernanceSummaries` / `medicationGovernanceTimeline` | **PASS** |
| ROI integration | M1.3F.8 | ROI consumes `EncounterChartExportService` snapshots (`chart-roi.service.ts`); manifest is snapshot source | **PASS** |

\*M1.3F.6 (LASA MAR) is implemented and migrated; it was omitted from the M1.3F.9 brief but is part of the completed program.

**MAR create wiring (single enforcement point):** `medication-administration.service.ts` resolves and persists F.4–F.7 governance in one transaction after `MedicationAdministration` create.

**Part 1 overall: PASS**

---

## Part 2 — Production readiness audit

### Migrations (repository)

| Migration folder | Purpose |
|------------------|---------|
| `20260903120000_m1_3f1_mar_emar_schema_foundation` | Governance tables + enums |
| `20260904120000_m1_3f4_controlled_substance_mar_audit_actions` | Witness / waste / controlled override audit |
| `20260905120000_m1_3f5_high_alert_mar_audit_actions` | Double-check / HA override audit |
| `20260906120000_m1_3f6_lasa_mar_audit_actions` | LASA ack / override audit |
| `20260907120000_m1_3f7_pharmacy_mar_audit_actions` | Pharmacy verify / reject / override audit |

**Supporting (pre-F, required for governance data):**

- `20260804120000_medication_master_schema_phase_19b1` — `MedicationSafetyProfile`, product/concept
- `20260515150000_add_controlled_medication_fields` — legacy catalog controlled fields
- `20260511120000_er3_medication_ndc_foundation` — NDC on package/MAR snapshots

| Check | Verdict |
|-------|---------|
| No required migration missing from repo | **PASS** |
| Schema validates (`prisma validate`) | **PASS** (verified in prior F.8 cycle) |
| Production DB applied state | **UNKNOWN** — ops must confirm `_prisma_migrations` |

### Seeds (repository, not executed in this audit)

`prisma/seed-catalogs.ts` chains:

1. `seedMedicationSafetyClassifiers`
2. `seedControlledSubstanceGovernance`
3. `seedHighAlertMedicationGovernance`
4. `seedLasaMedicationGovernance`

| Check | Verdict |
|-------|---------|
| Seed modules present and idempotent | **PASS** |
| Production seed executed | **NOT VERIFIED** — required for catalog/profile flags before enforcement reflects clinical policy |

### Dependency closure

| Layer | Verdict | Notes |
|-------|---------|-------|
| Schema | **READY** | All F.1 tables + audit enum values in Prisma |
| API | **READY** | MAR create, pharmacy endpoints, chart export, timeline |
| UI | **READY** | MAR panels + badges + i18n tests |
| Chart export | **READY** | Manifest + HTML + snapshot specs |
| Audit | **READY** | `CHART_AUDIT_TIMELINE_ACTIONS` includes all 11 M1.3F actions |

**Part 2 code: READY**  
**Part 2 production data: NOT READY** until migrate + catalog governance seed on clinic DB.

---

## Part 3 — Safety governance audit

Runtime enforcement is **profile + catalog driven**. Medications without matched catalog/product/safety profile do not receive MAR gates (by design).

| Domain | Enforcement | Persisted artifacts | Audit events | Verdict |
|--------|-------------|---------------------|--------------|---------|
| Controlled medications | Witness + optional waste + override | `MedicationAdministrationVerification` (WITNESS), `MedicationWasteDocumentation`, overrides | F.4 actions | **PASS** |
| High-alert medications | Independent double-check / dual verification + override | Verification rows + `HIGH_ALERT_OVERRIDE` | F.5 actions | **PASS** |
| LASA medications | Acknowledgement + override | `LASA_ACKNOWLEDGMENT` verification + override | F.6 actions | **PASS** |
| Pharmacy verification | Block MAR unless VERIFIED or documented override | `PharmacyVerification` + `PHARMACY_PENDING_OVERRIDE` | F.7 actions | **PASS** |
| Witness-required | `requiresWitness` / controlled schedule | WITNESS verification | `MEDICATION_WITNESS_VERIFICATION_COMPLETED` | **PASS** |
| Double-sign | `requiresDoubleSign` + HA rules | `INDEPENDENT_DOUBLE_CHECK` / `DUAL_VERIFICATION` | `HIGH_ALERT_DOUBLE_CHECK_COMPLETED` | **PASS** |
| Waste-required | Partial dose / controlled waste policy | Waste documentation rows | `MEDICATION_WASTE_*` | **PASS** |
| Override workflows | Per-domain override types + reason validation | `MedicationAdministrationOverride` | Domain-specific override audits | **PASS** |

**Catalog coverage caveat (operational, not code):** M1.3C readiness doc notes tramadol MANUAL_REVIEW, absent molecules on M1.1B list — enforcement only applies where seed matched catalog rows.

**Part 3: PASS**

---

## Part 4 — Legal chart audit

| Requirement | Implementation | Test evidence | Verdict |
|-------------|----------------|---------------|---------|
| Governance summaries in chart export | `medicationGovernanceSummaries` + per-MAR `governanceSummary` | `medication-governance-legal-chart.spec.ts` | **PASS** |
| Governance in HTML export | `Medication governance summary` section | Same spec | **PASS** |
| Governance timeline in unified timeline | `loadMedicationGovernanceEncounterBundle` → source rows | Unified timeline service + export | **PASS** |
| Governance in chart audit timeline | `CHART_AUDIT_TIMELINE_ACTIONS` extended | Spec + `chart-audit-timeline.util.ts` | **PASS** |
| Snapshot survival | Snapshots store full `manifestJson` | `chart-export-snapshot.service.spec.ts` fixtures updated | **PASS** |
| ROI survival | ROI uses chart export snapshots, not parallel manifest | `assertRoiConsumesChartExportManifest()` | **PASS** |

**Gap (non-blocking):** Live `chart-summary.service.ts` does not surface governance summaries — legal/export/snapshot paths are complete; live chart preview may show MAR without governance block until a future read-model extension.

**Part 4: PASS**

---

## Part 5 — Performance & operational risk audit

See [medication-governance-risk-assessment.md](./medication-governance-risk-assessment.md) for full matrix.

Summary:

| Area | Risk | Rationale |
|------|------|-----------|
| Chart export | **LOW–MEDIUM** | +4 batched queries per encounter; duplicate governance load when unified timeline built in same `getManifest` |
| Unified timeline | **LOW** | Same batch loader; capped aggregation |
| MAR UI / create | **MEDIUM** | Up to 4 governance resolvers per create (product + pharmacy lookups) — acceptable for MVP volume |
| Orders (pharmacy) | **LOW** | Two endpoints; verification loaded on order reads where implemented |
| Medication search | **LOW** | No F-phase search changes |

Indexes exist on `medicationAdministrationId`, `encounterId`, `orderItemId` for governance tables (F.1 migration).

**Part 5: LOW–MEDIUM program risk**

---

## Part 6 — Medication billing foundation audit

| Capability | Architecture support | Verdict |
|------------|---------------------|---------|
| NDC linkage | `MedicationProduct.ndc11`, MAR `ndc11Snapshot` / `ndcDisplaySnapshot` | **Present** |
| HCPCS linkage | Product `hcpcsCodeSuggested`, catalog medication HCPCS fields | **Present (suggestion fields)** |
| J-code linkage | HCPCS-style suggestion columns; not full J-code engine | **Partial** |
| Medication administration billing | `tryAutoMedicationAdministrationBilling`, `billingCaptureV1` | **Present** |
| Future infusion billing | `suggestInfusionBilling`, infusion MAR phases, infusion billing evidence on create | **Foundation only** |
| Future pharmacy billing | `PharmacyVerification` + dispense paths separate | **Foundation only** |
| Future waste billing | Waste documented in governance tables; no charge capture | **Not implemented** |
| Future controlled-substance billing | Controlled flags + audit; no separate controlled billing line | **Not implemented** |

**Part 6: PASS WITH OBSERVATIONS** — enterprise billing (waste, pharmacy fees, controlled reporting) remains future work; no blocker to deploying governance.

---

## Part 7 — Production rollout decision

| Decision | Result |
|----------|--------|
| **Medication Governance Rollout Ready** | **Yes** — application code and tests are complete for M1.3B–F.8 |
| **Medication Governance Rollout Blocked** | **No** — no code defects found requiring fix in this audit |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |

**Conditions before clinic production use:**

1. Apply all migrations through `20260907120000_m1_3f7_pharmacy_mar_audit_actions` on production DB.
2. Run `pnpm --filter @medora/api prisma:seed-catalogs` (or approved subset) so classifier + governance seeds update catalog/safety profiles.
3. Clinical sign-off on manifest gaps (tramadol, absent controlled list molecules per M1.3C readiness).
4. Train staff on new MAR fields (witness, waste, double-check, LASA, pharmacy).

---

## Part 8 — Next program recommendation

**Recommended next phase: M1.4 — Medication billing integrity**

**Rationale (aligned to stated priorities):**

1. **Billing integrity** — MAR already captures NDC snapshots and auto-append hooks; closing gaps between administration, product package, and `billingCaptureV1` reduces revenue and compliance risk before catalog expansion.
2. Builds on stable governance audit trail (F.4–F.8) without adding new clinical gates.
3. **Catalog completeness** (M1.2) and **search quality** (M1.5) remain parallel tracks but are lower immediate risk than mis-billed administrations once governance blocks are live.

**Secondary:** Medication-family governance / enterprise catalog consolidation (M1.6-style) after billing + catalog gap closure.

---

## Test evidence (representative, not re-run in F.9)

| Suite | Status (last known) |
|-------|---------------------|
| `medication-safety` | Pass |
| `medication-governance-legal-chart` + `chart-export*` | Pass |
| MAR governance specs (F.4–F.7) | Pass |
| `medication` (full) | 1 known flake: `medication-governance-lifecycle.e2e` acetaminophen search |
| `verify:web` / web tests | Pass |

---

## Related documents

- [medication-governance-production-readiness.md](./medication-governance-production-readiness.md)
- [medication-governance-risk-assessment.md](./medication-governance-risk-assessment.md)
- [medication-audit-legal-chart-integration.md](./medication-audit-legal-chart-integration.md)
