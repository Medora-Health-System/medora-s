# Haiti Canonical Linkage Manifest — Implementation (M1.5D)

**Phase:** M1.5D — manifest + validation only (no DB, seeds, activation)  
**Date:** 2026-06-02  
**Design parent:** [haiti-canonical-linkage-manifest-design.md](./haiti-canonical-linkage-manifest-design.md)

---

## Purpose

Provide a **governed, typed manifest** for all 247 unique Haiti formulary `CatalogMedication` codes so M1.5E can create canonical Concept → Product → Package chains without attaching to import noise.

---

## Module layout

| Module | Role |
|--------|------|
| `haitiMedicationFormularyCatalog.ts` | Static 247-row formulary (derived from `apps/api/prisma/data/haiti-medications.ts`) |
| `haitiCanonicalMedicationLinkageTypes.ts` | Zod schemas, enums, parse/serialize |
| `haitiCanonicalMedicationLinkageBuild.ts` | Entry builder (flags, tranche, status) |
| `haitiCanonicalMedicationLinkageManifest.ts` | Exported `HAITI_CANONICAL_LINKAGE_MANIFEST` + assert on load |
| `haitiCanonicalMedicationMatching.ts` | Deterministic match helpers (no DB) |
| `haitiCanonicalMedicationQuarantine.ts` | Deny-list for existing canonical targets |
| `haitiCanonicalMedicationValidation.ts` | Validator suite + `assertHaitiCanonicalLinkageManifest` |

All exports are re-exported from `@medora/shared`.

---

## Manifest entry schema

Each entry includes:

- **Identity:** `catalogMedicationCode`, `genericName`, `displayName`, `strength`, `route`, `form`
- **Proposed targets (M1.5E create-only):** `proposedConceptCode` (`HAITI_{GENERIC}`), `proposedProductCode` (= catalog code), `proposedPackageCode` (`{product}_PKG_DEFAULT`)
- **Governance:** `linkageStatus`, `confidence`, `safetyFlags`, `billingFlags`, `rationale`, `sourcePhase`, `reviewerRequired`, optional `tranche` / `matchRule`

### Linkage status at M1.5D

| Status | Meaning |
|--------|---------|
| `MISSING_CANONICAL_TARGET` | Default for safe rows — M1.5E will create chains |
| `MANUAL_REVIEW` | Controlled, high-alert, LASA, opioid, insulin, alias collision, governance drift, or billing gap |
| `LINK_READY` | **0 rows** at M1.5D (no bulk activation) |
| `DO_NOT_LINK` | Reserved for explicit exclusions |

### Concept code sharing

Multiple strength/form variants of the same INN share one `proposedConceptCode` (e.g. `HAITI_AMOXICILLIN`). Validation enforces **unique product and package codes only**, not unique concept codes.

---

## Tranches (seed ordering hint for M1.5E)

| Tranche | Rule |
|---------|------|
| T1 | Billable catalog rows (HCPCS manifest) |
| T2 | Antibiotics |
| T3 | Controlled / high-alert / LASA / opioid |
| T4 | Essential non-T1–T3 |
| T5 | Remainder |

---

## Counts

- **247** manifest entries (= unique derived catalog codes from 263 Haiti seed rows)
- **0** `LINK_READY`
- Assert runs at module load via `assertHaitiCanonicalLinkageManifest`

---

## Explicitly out of scope (M1.5D)

- No `MedicationConcept` / `MedicationProduct` / `MedicationPackage` rows
- No `legacyCatalogMedicationId` updates
- No provider search changes
- No seed execution

---

## Next phase

**M1.5E** — consume this manifest to create canonical chains and legacy linkage records per tranche, respecting quarantine and `MANUAL_REVIEW` gates.
