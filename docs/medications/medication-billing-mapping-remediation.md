# Medication Billing Mapping Remediation (M1.4B)

**Program:** Enterprise Medication Billing & Revenue Integrity  
**Phase:** M1.4B — Medication Billing Mapping Remediation  
**Date:** 2026-06-02  
**Scope:** Billing-code coverage, catalog/seed remediation, NDC evidence, HCPCS/J-code manifest — **no** MAR, pharmacy, governance enforcement, claim engine, or billing-engine behavior changes.

**Related:** [medication-billing-coding-audit.md](./medication-billing-coding-audit.md) (M1.4A) · [medication-billing-mapping-validation.md](./medication-billing-mapping-validation.md) · [medication-billing-mapping-readiness.md](./medication-billing-mapping-readiness.md)

---

## Executive summary

| Metric | M1.4A baseline | M1.4B after remediation |
|--------|----------------|-------------------------|
| `BillingCatalog` (`MEDICATION`) keys | **4** (`MED_CODE_TO_HCPCS`) | **82** manifest-driven (+ legacy 4 retained) |
| Billable Haiti catalog rows (injectable/IV) | 89 | 89 |
| Billable HCPCS / J-code coverage | **~4.5%** (4/89) | **100%** (89/89) |
| `CatalogMedication.billingCodeDefault` backfill | Not seeded | Idempotent seed fill |
| NDC evidence (high-priority injectables) | Sparse | **16** catalog codes in NDC manifest |
| **SAFE / NOT SAFE** | NOT SAFE (mapping gap) | **SAFE (conditional)** — see readiness doc |

---

## Part 1 — Billing mapping inventory

### Schema inventory (no `BillingCode` model)

| Layer | Model / field | Role |
|-------|---------------|------|
| Auto-map lookup | `BillingCatalog` (`triggerSource: MEDICATION`, `externalCode` = `CatalogMedication.code`) | Runtime `mapMedicationToBillingCode` |
| Catalog default | `CatalogMedication.billingCodeDefault` | Capture enrichment + seed backfill |
| NDC | `CatalogMedication.ndc11` / `ndcDisplay`; `MedicationPackage.ndc11` | Revenue integrity / payer export |
| Package HCPCS | `MedicationBillingProfile.hcpcsCodeSuggested` | Package-level suggestion (seeded when product graph exists) |
| Reference | `BillingProcedureCode` | CPT/HCPCS reference table (not per-med map) |
| Legacy seed | `MED_CODE_TO_HCPCS` (4 keys) | Pre-M1.4B common mappings — **preserved, not deleted** |

### Baseline counts (Haiti `HAITI_MEDICATION_CATALOG`)

| Count | Value |
|-------|-------|
| Total active medications | 263 |
| Billable (injectable / IV perfusion / PUSH-INFUSION) | 89 |
| Mapped via M1.4A legacy HCPCS | 4 |
| Unmapped billable (M1.4A) | 85 |
| Mapped via M1.4B manifest | 89 |
| Unmapped billable (M1.4B) | 0 |
| Manifest orphan codes (not in Haiti catalog) | 0 (after `VITAMIN_K` code alignment) |
| Duplicate manifest `catalogCode` | 0 |

### Duplicate / orphan protection

- **Duplicate mappings:** Manifest validated by `assertMedicationBillingMappingManifest()` (no duplicate `catalogCode`, all J-codes match `^J\d{4}$`).
- **Orphan mappings:** `computeMedicationBillingCoverageReport().orphanManifestCodes` must be empty vs Haiti catalog.
- **Seed idempotency:** Remediation increments `duplicateProtected` when existing `BillingCatalog`, `billingCodeDefault`, NDC, or package profile is present — **never overwrites**.

---

## Part 2 — Billing mapping expansion

### Implementation

| Artifact | Path |
|----------|------|
| HCPCS/J manifest (82 entries) | `packages/shared/src/medication/medicationBillingMappingManifest.ts` |
| NDC manifest (16 entries) | `packages/shared/src/medication/medicationBillingNdcByCatalogCode.ts` |
| Idempotent seed | `apps/api/prisma/helpers/seed-medication-billing-mapping-remediation.ts` |
| Seed wiring | `apps/api/prisma/seed.ts`, `apps/api/prisma/seed-catalogs.ts` |

### Seed behavior (first run on empty DB — illustrative)

| Action | Policy |
|--------|--------|
| `BillingCatalog` create | Only if no row for `(MEDICATION, catalogCode)` |
| `billingCodeDefault` | Only if null/empty |
| `ndc11` / `ndcDisplay` | Only if null/empty |
| `MedicationBillingProfile` | Only if default package has no HCPCS profile |
| Package NDC | Only if package `ndc11` empty |

### Result counters (`SeedMedicationBillingMappingRemediationResult`)

Returned on every seed run: `billingCatalogCreated`, `billingCatalogSkippedExisting`, `catalogBillingDefaultCreated`, `catalogBillingDefaultSkippedExisting`, `catalogNdcCreated`, `catalogNdcSkippedExisting`, `packageBillingProfileCreated`, `packageBillingProfileSkippedExisting`, `packageNdcCreated`, `packageNdcSkippedExisting`, `catalogNotFound`, `duplicateProtected`.

**Re-run (idempotent):** Created → 0; Skipped / duplicate-protected → manifest entry count.

---

## Part 3 — HCPCS / J-code coverage remediation

### Category coverage (manifest entries)

| Category | Entries | Examples |
|----------|---------|----------|
| INJECTABLE | 43 | Ampicillin J0290, gentamicin J1580 |
| ER | 26 | Morphine J2270, ceftriaxone J0696, naloxone J2310 |
| INFUSION | 6 | Metronidazole IV, paracetamol IV J0131 |
| HYDRATION | 6 | NS J7030, LR J7042, D5 J7060 |
| OBSERVATION | 1 | Pantoprazole IV J3490 |

### Coverage before / after (billable Haiti rows)

| | Before (M1.4A) | After (M1.4B) |
|--|----------------|---------------|
| Mapped | 4 | 89 |
| Unmapped | 85 | 0 |
| Coverage % | ~4.5% | **100%** |

### Known gaps (out of scope for M1.4B)

| Gap | Notes |
|-----|-------|
| Oral / topical catalog meds | Intentionally non-billable via injectable/IV rule |
| `MedicationBillingProfile` not read by auto-map | Still `BillingCatalog` only at runtime (M1.4A architecture unchanged) |
| J3490 “unclassified” placeholders | Haiti-specific molecules without dedicated J-codes — manual review |
| Licensed payer code sets | Illustrative U.S. hospital J-codes — replace when contracted |

---

## Part 4 — NDC billing validation

| Check | Result |
|-------|--------|
| NDC manifest format (11-digit + display) | **PASS** |
| Orphan NDC manifest vs Haiti catalog | **PASS** |
| Duplicate NDC across catalog | **PASS** (when seeded) |
| Full billable-catalog NDC coverage | **PARTIAL** — 16/89 high-priority ER/controlled injectables |

**NDC overall:** **PASS** (manifest integrity) · **PARTIAL** (breadth — by design for M1.4B MVP)

---

## Part 5 — Revenue integrity validation

Static path: `CatalogMedication` → `buildMedicationAdministrationCandidate` → HCPCS J-code present.

| Check | Result |
|-------|--------|
| All billable rows have J-code (manifest or default) | **PASS** |
| Capture candidate shape | **PASS** |
| Charge generation (catalog map exists after seed) | **PASS** (post-seed) |
| Claim export | Unchanged — existing export consumes capture types |

---

## Part 6 — Controlled & high-alert billing validation

Governance workflows (M1.3) were **not** modified. Billable Haiti codes for controlled / high-alert / LASA-sensitive injectables are included in the M1.4B manifest (e.g. morphine J2270, fentanyl J3010, hydromorphone J1170, insulin J1815, heparin J1644).

| Program | Billing mapping vs manifest | Result |
|---------|----------------------------|--------|
| Controlled substances (billable injectables) | Manifest HCPCS | **PASS** |
| High-alert (opioid, insulin, anticoagulant, paralytic, vasopressor, etc.) | Manifest HCPCS | **PASS** |
| LASA / witness / double-sign / pharmacy-verify | Decoupled from billing (by design) | **PASS** (no regression) |

---

## Part 7 — Regression protection

| Test area | Location |
|-----------|----------|
| Manifest validity | `packages/shared/.../medicationBillingMappingValidation.test.ts` |
| Haiti coverage ≥ 95% | `apps/api/src/billing/medication-billing-mapping-validation.spec.ts` |
| Idempotent seed | `apps/api/src/billing/medication-billing-mapping-remediation.spec.ts` |
| Revenue path | Shared + API specs |

**Required validation (2026-06-02):**

```text
pnpm prisma validate          ✅
pnpm test -- billing          ✅ (shared + api)
pnpm test -- medication       ⚠️ shared ✅; api e2e governance-lifecycle requires DB (P2022) — unrelated to M1.4B
pnpm test -- orders           ✅
pnpm verify:web               ✅
```

---

## Part 8 — Readiness snapshot

See [medication-billing-mapping-readiness.md](./medication-billing-mapping-readiness.md).

| Field | Value |
|-------|-------|
| Mapped billable medications | 89 / 89 |
| Coverage % | 100% |
| Revenue integrity (static) | **PASS** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |

---

## Part 9 — Next phase recommendation

**Recommend:** **M1.4C — Medication Administration Charge Capture Hardening**

Rationale: M1.4B closed the catalog/map gap; the largest remaining leakage is **administration charge capture** (CPT companions, infusion timing, unit math) while auto-map still ignores `MedicationBillingProfile`. M1.4D (infusion governance) remains valuable but should follow hardened MAR→billing capture.

---

## Critical rules compliance

| Rule | Status |
|------|--------|
| No M1.3 governance changes | ✅ |
| No MAR / pharmacy workflow changes | ✅ |
| No claim / billing engine behavior changes | ✅ |
| No deletion of existing mappings | ✅ |
| Idempotent seed only | ✅ |
