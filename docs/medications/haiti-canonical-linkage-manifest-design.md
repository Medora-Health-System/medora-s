# Haiti Canonical Linkage Manifest Design (M1.5C)

**Program:** Haiti Canonical Linkage Remediation  
**Phase:** M1.5C — design only (no TypeScript implementation)  
**Date:** 2026-06-02  
**Parent:** [haiti-canonical-linkage-remediation-audit.md](./haiti-canonical-linkage-remediation-audit.md)

---

## Purpose

Define the future manifest consumed by **M1.5D** (implementation) and **M1.5E** (seed/backfill) to connect:

```text
CatalogMedication (Haiti legacy)
  → MedicationConcept
  → MedicationProduct (legacyCatalogMedicationId)
  → MedicationPackage (default)
```

**Proposed implementation path (M1.5D):**  
`packages/shared/src/medication/haitiCanonicalMedicationLinkageManifest.ts`

This document is the **authoritative schema** until that file exists.

---

## Part 4 — Manifest schema

### 4.1 TypeScript shape (design)

```typescript
export type HaitiLinkageStatus =
  | "LINK_READY"           // Safe to create chain + set legacy FK (may still need reviewer for T3)
  | "MANUAL_REVIEW"        // Human must approve before seed
  | "DO_NOT_LINK"          // Excluded from backfill (baseline catalog, retired, etc.)
  | "MISSING_CANONICAL_TARGET"; // Expected for all 247 rows today → CREATE in M1.5E

export type HaitiLinkageConfidence = "EXACT" | "HIGH" | "MEDIUM" | "LOW";

export type HaitiLinkageSafetyFlags = {
  controlled: boolean;
  highAlert: boolean;
  lasa: boolean;
  pediatricRisk: boolean;
  anticoagulant: boolean;
  opioid: boolean;
  insulin: boolean;
};

export type HaitiLinkageBillingFlags = {
  hasNdc: boolean;
  hasHcpcs: boolean;
  hasBillingCodeDefault: boolean;
  billingReady: boolean; // manifest + seed path viable
};

export type HaitiCanonicalMedicationLinkageEntry = {
  catalogMedicationCode: string;
  genericName: string;
  displayNameFr: string;
  displayNameEn?: string;
  strength: string;
  route: string;
  form: string; // dosageForm
  proposedConceptCode: string;
  proposedProductCode: string;
  proposedPackageCode: string;
  linkageStatus: HaitiLinkageStatus;
  confidence: HaitiLinkageConfidence;
  safetyFlags: HaitiLinkageSafetyFlags;
  billingFlags: HaitiLinkageBillingFlags;
  rationale: string;
  sourcePhase: "M1.5C" | "M1.5D";
  reviewerRequired: boolean;
  /** Optional: match rule used (audit trail) */
  matchRule?: "CODE_EXACT" | "DERIVED_CODE" | "MANIFEST_HCPCS" | "MANUAL";
  /** Tranche for phased seed */
  tranche?: "T1" | "T2" | "T3" | "T4" | "T5";
};
```

### 4.2 Code derivation (must match seed)

| Field | Rule |
|-------|------|
| `catalogMedicationCode` | Existing `CatalogMedication.code` for Haiti rows |
| `proposedProductCode` | **Default:** same as `catalogMedicationCode` |
| `proposedConceptCode` | `HAITI_{GENERIC}_{FIRST_8_OF_PRODUCT_CODE}` or shared concept per generic+INN policy (prefer **one concept per generic** when strength variants share INN — **MANUAL_REVIEW** if split policy unclear) |
| `proposedPackageCode` | `{proposedProductCode}_PKG_DEFAULT` |

Align with `deriveMedicationCatalogCode()` in `packages/shared/src/medication/medicationCatalogCodeDerive.ts` and `seed-haiti-medication-catalog.ts`.

### 4.3 Default linkage status (current DB)

| Status | Expected count (local) | Meaning |
|--------|------------------------|---------|
| `MISSING_CANONICAL_TARGET` | **247** | No safe existing product; **CREATE** in M1.5E |
| `MANUAL_REVIEW` | **~25–40** (est.) | Controlled, HA, LASA, alias collisions, manifest code drift |
| `LINK_READY` | **~200** (est.) | T1/T2/T4 after reviewer sign-off on tranche |
| `DO_NOT_LINK` | **69** | Baseline `19G%` catalog (separate manifest or exclude) |

### 4.4 Safety flag derivation (design-time)

| Flag | Source |
|------|--------|
| `controlled` | `CatalogMedication.isControlled` OR M1.3C manifest |
| `highAlert` | M1.3D manifest (`catalogCode` or generic/strength pattern) |
| `lasa` | M1.3E manifest |
| `opioid` | Generic ∈ {morphine, fentanyl, hydromorphone, tramadol, …} |
| `insulin` | Generic contains `insulin` |
| `anticoagulant` | Generic ∈ {heparin, warfarin, enoxaparin} — warfarin not in catalog |
| `pediatricRisk` | Form/route ∈ {sirop, suspension, suppositoire, pédiatrique alias} |

If manifest `catalogCode` ≠ derived `catalogMedicationCode` → **`reviewerRequired: true`**, `linkageStatus: MANUAL_REVIEW`.

### 4.5 Billing flag derivation

| Flag | Source |
|------|--------|
| `hasHcpcs` | `MEDICATION_BILLING_MAPPING_BY_CODE[catalogMedicationCode]` |
| `hasNdc` | `MEDICATION_BILLING_NDC_BY_CATALOG_CODE[catalogMedicationCode]` |
| `hasBillingCodeDefault` | DB or post–M1.4B seed |
| `billingReady` | `hasHcpcs` for billable rows; oral non-billable may be `true` with `billingReady: false` |

---

## Example entries (documentation only)

### Example 1 — T1 ER injectable (LINK_READY after tranche approval)

```json
{
  "catalogMedicationCode": "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
  "genericName": "Ceftriaxone",
  "displayNameFr": "Ceftriaxone",
  "displayNameEn": "Ceftriaxone",
  "strength": "1 g",
  "route": "injectable",
  "form": "injectable",
  "proposedConceptCode": "HAITI_CEFTRIAXONE",
  "proposedProductCode": "CEFTRIAXONE_1_G_INJECTABLE_INJECTION",
  "proposedPackageCode": "CEFTRIAXONE_1_G_INJECTABLE_INJECTION_PKG_DEFAULT",
  "linkageStatus": "MISSING_CANONICAL_TARGET",
  "confidence": "EXACT",
  "safetyFlags": {
    "controlled": false,
    "highAlert": false,
    "lasa": false,
    "pediatricRisk": false,
    "anticoagulant": false,
    "opioid": false,
    "insulin": false
  },
  "billingFlags": {
    "hasNdc": true,
    "hasHcpcs": true,
    "hasBillingCodeDefault": false,
    "billingReady": true
  },
  "rationale": "Haiti ER antibiotic; M1.4B J0696; create new canonical chain",
  "sourcePhase": "M1.5C",
  "reviewerRequired": false,
  "matchRule": "DERIVED_CODE",
  "tranche": "T1"
}
```

### Example 2 — Controlled opioid (MANUAL_REVIEW)

```json
{
  "catalogMedicationCode": "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "genericName": "Morphine",
  "displayNameFr": "Morphine",
  "strength": "10 mg/mL",
  "route": "injectable",
  "form": "injectable",
  "proposedConceptCode": "HAITI_MORPHINE",
  "proposedProductCode": "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "proposedPackageCode": "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION_PKG_DEFAULT",
  "linkageStatus": "MANUAL_REVIEW",
  "confidence": "HIGH",
  "safetyFlags": {
    "controlled": true,
    "highAlert": true,
    "lasa": true,
    "pediatricRisk": false,
    "anticoagulant": false,
    "opioid": true,
    "insulin": false
  },
  "billingFlags": {
    "hasNdc": true,
    "hasHcpcs": true,
    "hasBillingCodeDefault": false,
    "billingReady": true
  },
  "rationale": "Schedule II; M1.3C morphine pattern; LASA group; requires pharmacist sign-off",
  "sourcePhase": "M1.5C",
  "reviewerRequired": true,
  "matchRule": "DERIVED_CODE",
  "tranche": "T3"
}
```

### Example 3 — Manifest code drift (MANUAL_REVIEW)

```json
{
  "catalogMedicationCode": "HYDROMORPHONE_2_MG_PER_ML_INJECTABLE_INJECTION",
  "genericName": "Hydromorphone",
  "linkageStatus": "MANUAL_REVIEW",
  "confidence": "MEDIUM",
  "rationale": "M1.3C manifest uses legacy code HYDROMORPHONE_2MG_ML_INJECTABLE; align before safety seed",
  "reviewerRequired": true,
  "tranche": "T3"
}
```

### Example 4 — DO_NOT_LINK (baseline catalog)

```json
{
  "catalogMedicationCode": "19G1-ACET-1779400225181",
  "linkageStatus": "DO_NOT_LINK",
  "confidence": "EXACT",
  "rationale": "Q_BASELINE_CATALOG — quarantined; not Haiti formulary",
  "reviewerRequired": false
}
```

---

## Validation expectations (consumer: M1.5D)

| Check | Expected |
|-------|----------|
| Manifest length | **247** Haiti entries (+ optional **69** `DO_NOT_LINK` baseline stubs) |
| Unique `catalogMedicationCode` | **247** |
| Unique `proposedProductCode` | **247** |
| `LINK_READY` + `reviewerRequired` | **0** rows (mutually exclusive) |
| Quarantine target deny-list | **0** entries pointing at `Q_*` product codes |
| Tranche union | All **247** codes assigned exactly one tranche |

See [haiti-canonical-linkage-validation-design.md](./haiti-canonical-linkage-validation-design.md).

---

## Manifest generation workflow (M1.5D)

1. Read `HAITI_MEDICATION_CATALOG` + local `CatalogMedication` (Haiti codes).  
2. Compute `catalogMedicationCode` via `deriveMedicationCatalogCode` where code absent.  
3. Apply matching rules (Part 3 of remediation audit).  
4. Attach safety/billing flags from M1.3 / M1.4B manifests.  
5. Assign tranche T1–T5.  
6. Emit JSON/TS manifest + human-review CSV for `MANUAL_REVIEW` rows.  
7. Run validation suite before merge.

---

## Out of scope (M1.5C)

- Creating `haitiCanonicalMedicationLinkageManifest.ts` in repo  
- Seed scripts  
- Setting `legacyCatalogMedicationId`  
- Product `isActive` / runtime activation
