# Haiti Canonical Linkage Validation — Implementation (M1.5D)

**Phase:** M1.5D — validation only (no runtime workflow changes)  
**Date:** 2026-06-02  
**Design parent:** [haiti-canonical-linkage-validation-design.md](./haiti-canonical-linkage-validation-design.md)

---

## Purpose

Block unsafe manifest states **before** M1.5E seed/backfill. Validators run in CI via `@medora/shared` Vitest and at manifest load time.

---

## Entry point

`haitiCanonicalMedicationValidation.ts`

| Function | Description |
|----------|-------------|
| `validateManifest()` | Orchestrates all checks; returns issues + stats |
| `assertHaitiCanonicalLinkageManifest()` | Throws on blocking issues (used by manifest module) |
| `validateCatalogCoverage()` | Every formulary code has exactly one manifest row |
| `validateDuplicateCatalogCodes()` | No duplicate `catalogMedicationCode` |
| `validateDuplicateCanonicalTargets()` | Unique `proposedProductCode` / `proposedPackageCode` |
| `validateQuarantineTargets()` | Proposed codes + optional existing DB targets |
| `validateControlledReviewRequirements()` | No `LINK_READY` for controlled without reviewer |
| `validateHighAlertReviewRequirements()` | Same for high-alert / LASA |
| `validateBillingRequirements()` | M1.4B billing manifest alignment |
| `validateSearchRequirements()` | Alias / display collision guards |

---

## Billing preservation (validation only)

Ensures future linkage cannot silently break:

- `billingCodeDefault` readiness flags on billable rows
- M1.4B `MEDICATION_BILLING_MAPPING_BY_CODE` (HCPCS)
- NDC map (`MEDICATION_BILLING_NDC_BY_CATALOG_CODE`)
- `billingFlags.billingReady` for billable catalog medications

No changes to billing engine, capture, or administration billing at runtime.

---

## Safety governance (validation only)

Cross-checks manifest rows against M1.3 governance manifests:

- Controlled substance (`CONTROLLED_SUBSTANCE_GOVERNANCE_MANIFEST`)
- High alert (`HIGH_ALERT_MEDICATION_GOVERNANCE_MANIFEST`)
- LASA (`LASA_MEDICATION_GOVERNANCE_MANIFEST`)

Enforces `reviewerRequired` and rejects auto-link patterns for high-risk flags via `rejectAutoLinkForHighRiskFlags()` in the matching module.

MAR, witness, double-sign, waste, and pharmacy verification workflows are **not** modified in M1.5D.

---

## Search safety (validation only)

Non-blocking warnings (and build-time info) for:

- Shared clinical alias collisions (`HAITI_SHARED_ALIAS_COLLISIONS`)
- Governance manifest code drift vs derived catalog codes
- Duplicate activation target patterns

No provider-search index or API changes in M1.5D.

---

## Issue severity

| Kind | Typical severity |
|------|------------------|
| `DUPLICATE_*`, `CATALOG_COVERAGE`, `QUARANTINE_TARGET` | **Blocking** (assert throws) |
| `ALIAS_COLLISION`, `GOVERNANCE_CODE_DRIFT` | Informational / manual review drivers |
| `CONTROLLED_AUTO_LINK`, `HIGH_ALERT_AUTO_LINK` | Blocking if `LINK_READY` mis-set |

---

## Tests

`haitiCanonicalMedicationValidation.test.ts` — duplicate detection, quarantine targets, controlled/high-alert review, billing and search validators.

Run: `pnpm --filter @medora/shared test`

---

## Next phase (M1.5E)

Re-run `validateManifest()` after seed with `existingTargets` populated from DB to ensure no manifest row points at quarantined canonical products.
