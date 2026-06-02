# Haiti Canonical Linkage Quarantine — Design & Implementation (M1.5D)

**Phase:** M1.5D — deny-list rules (no DB)  
**Date:** 2026-06-02  
**Audit basis:** M1.5B canonical activation audit (904 acetaminophen clones, 48 insulin clones, 51 blocked/test rows)

---

## Purpose

Prevent M1.5E from linking Haiti formulary rows to **import noise** or **baseline artifacts** in the existing canonical layer.

Quarantine applies when **inspecting existing canonical targets**. Proposed Haiti product codes (same string as catalog code) are **allowed** even when `productIsActive` / `conceptIsActive` are false pre-activation.

---

## Module

`packages/shared/src/medication/haitiCanonicalMedicationQuarantine.ts`

---

## Quarantine classes

| Class ID | Trigger |
|----------|---------|
| `Q_ACETAMINOPHEN_CLONE` | Generic name acetaminophen (import clone family) |
| `Q_INSULIN_CLONE` | Generic name starts with "regular insulin" |
| `Q_BLOCKED_MED_TEST` | Generic name "blocked med" (governance test) |
| `Q_BASELINE_PRODUCT` | `baselineAvailable === true` |
| `Q_IMPORT_ARTIFACT_PREFIX` | Product code `PRI_ER_*`, `19G1-*`, `19G2-*`, `19G2C-*` |
| `Q_DUPLICATE_NDC_CLUSTER` | NDC11 in known duplicate set → **MANUAL_REVIEW** (not hard quarantine) |
| `Q_INACTIVE_CANONICAL_CHAIN` | Documented for audit; enforced via other classes for import noise |

---

## Public API

| Function | Returns |
|----------|---------|
| `isQuarantinedCanonicalConcept()` | `ALLOW` \| `QUARANTINE` \| `MANUAL_REVIEW` |
| `isQuarantinedCanonicalProduct()` | Same |
| `isQuarantinedCanonicalPackage()` | Same (includes NDC inspect) |
| `getQuarantineReason()` / `getQuarantineReasonForInput()` | Human-readable reason |
| `classifyQuarantine()` | Internal class id or null |

---

## Decision matrix

| Class | Decision |
|-------|----------|
| Acetaminophen / insulin / blocked / baseline / import prefix | `QUARANTINE` |
| Duplicate NDC cluster | `MANUAL_REVIEW` |
| Clean Haiti-derived proposed code | `ALLOW` |

---

## Integration

- **Matching:** `matchHaitiFormularyToCanonical()` returns `DO_NOT_LINK` when target is quarantined
- **Validation:** `validateQuarantineTargets()` flags manifest proposed codes with import prefixes and optional existing target list

---

## Known duplicate NDC11 (reference set)

Default set from M1.5B local audit: `04099093001`, `06416190001`, `25021106001`, `25021107001`.

---

## Explicitly not done in M1.5D

- No quarantine table in DB
- No product status changes
- No automatic deactivation of clone rows

---

## Next phase (M1.5E)

Pass live canonical rows into `validateQuarantineTargets(manifest, existingTargets)` during seed dry-run. Reject any seed row whose match target returns `QUARANTINE`.
