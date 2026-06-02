# Haiti Canonical Linkage Validation Design (M1.5C)

**Program:** Haiti Canonical Linkage Remediation  
**Phase:** M1.5C — design only  
**Date:** 2026-06-02  
**Consumer phase:** **M1.5D** (implementation + tests)

**Manifest schema:** [haiti-canonical-linkage-manifest-design.md](./haiti-canonical-linkage-manifest-design.md)

---

## Part 5 — Validation design

### 5.1 Design goals

Validation must fail closed before any seed/backfill (M1.5E):

- Protect Haiti formulary integrity (**247** codes)  
- Prevent attachment to **993** quarantined canonical products  
- Enforce safety/billing policy for controlled and high-alert meds  
- Preserve idempotent, one-to-one legacy linkage  

### 5.2 Validation modules (proposed)

| Module | File (M1.5D) | Role |
|--------|----------------|------|
| Manifest structure | `haitiCanonicalMedicationLinkageValidation.ts` | Schema + duplicate keys |
| Quarantine deny-list | `haitiCanonicalLinkageQuarantineValidation.ts` | Block noise targets |
| Catalog alignment | `haitiCanonicalLinkageCatalogAlignmentValidation.ts` | Haiti DB ↔ manifest |
| Safety policy | `haitiCanonicalLinkageSafetyValidation.ts` | M1.3 manifest cross-check |
| Billing policy | `haitiCanonicalLinkageBillingValidation.ts` | M1.4B cross-check |
| Tranche coverage | `haitiCanonicalLinkageTrancheValidation.ts` | T1–T5 partition |

**Test location (M1.5D):**  
`packages/shared/src/medication/haitiCanonicalMedicationLinkageValidation.test.ts`  
`apps/api/src/medication-master/haiti-canonical-linkage-validation.spec.ts` (optional API integration read-only)

---

## Validation checklist

### A — Manifest integrity

| ID | Rule | Failure kind |
|----|------|--------------|
| V-A1 | Manifest non-empty | `EMPTY_MANIFEST` |
| V-A2 | No duplicate `catalogMedicationCode` | `DUPLICATE_CATALOG_CODE` |
| V-A3 | No duplicate `proposedProductCode` unless `allowSharedProduct` flag (default **false**) | `DUPLICATE_PRODUCT_CODE` |
| V-A4 | No duplicate `proposedPackageCode` | `DUPLICATE_PACKAGE_CODE` |
| V-A5 | Required string fields non-empty for `LINK_READY` / `MISSING_CANONICAL_TARGET` | `MISSING_REQUIRED_FIELD` |
| V-A6 | `linkageStatus` enum valid | `INVALID_STATUS` |
| V-A7 | `confidence` enum valid | `INVALID_CONFIDENCE` |
| V-A8 | `LINK_READY` implies `reviewerRequired === false` | `POLICY_CONFLICT` |
| V-A9 | `DO_NOT_LINK` must not appear in seed apply list | `SEED_POLICY_CONFLICT` |

### B — Quarantine / target safety

| ID | Rule | Failure kind |
|----|------|--------------|
| V-B1 | `proposedProductCode` must not match deny-list prefix (`PRI_ER_`, `19G2-`, `19G1-`) | `QUARANTINE_PREFIX` |
| V-B2 | If DB product exists for `proposedProductCode`, it must **not** be quarantine class | `QUARANTINE_TARGET` |
| V-B3 | `legacyCatalogMedicationId` on existing product must be null or equal to manifest catalog id | `LEGACY_LINK_CONFLICT` |
| V-B4 | No manifest row may reference `19G%` catalog codes with `LINK_READY` | `BASELINE_CATALOG_LEAK` |

### C — Catalog alignment (read-only in CI)

| ID | Rule | Failure kind |
|----|------|--------------|
| V-C1 | Every `catalogMedicationCode` exists in `HAITI_MEDICATION_CATALOG` derived set or active DB Haiti row | `ORPHAN_MANIFEST_CODE` |
| V-C2 | Every active Haiti DB code appears in manifest | `MISSING_MANIFEST_ENTRY` |
| V-C3 | `genericName`, `strength`, `route`, `form` match catalog row (normalized) | `CATALOG_DRIFT` |
| V-C4 | `proposedProductCode` equals `catalogMedicationCode` unless `matchRule: MANUAL` with note | `CODE_MISMATCH` |

### D — Clinical completeness

| ID | Rule | Failure kind |
|----|------|--------------|
| V-D1 | Missing route/strength/form on `LINK_READY` | `INCOMPLETE_CLINICAL` |
| V-D2 | `MANUAL_REVIEW` required for alias collision groups (configurable list) | `ALIAS_COLLISION` |
| V-D3 | High-risk generic without `reviewerRequired` | `SAFETY_POLICY_VIOLATION` |

### E — Safety governance (M1.3)

| ID | Rule | Failure kind |
|----|------|--------------|
| V-E1 | `controlled` or `opioid` → `reviewerRequired` unless `linkageStatus: DO_NOT_LINK` | `CONTROLLED_AUTO_LINK` |
| V-E2 | `highAlert` or `lasa` → `reviewerRequired` | `HIGH_ALERT_AUTO_LINK` |
| V-E3 | `insulin` or `anticoagulant` → `reviewerRequired` | `SPECIAL_CLASS_AUTO_LINK` |
| V-E4 | M1.3 manifest `catalogCode` present → must equal `catalogMedicationCode` or row is `MANUAL_REVIEW` | `MANIFEST_CODE_DRIFT` |

### F — Billing (M1.4)

| ID | Rule | Failure kind |
|----|------|--------------|
| V-F1 | Billable row (injectable/IV heuristic) must have `hasHcpcs` or `MANUAL_REVIEW` | `BILLING_UNMAPPED_BILLABLE` |
| V-F2 | `hasNdc` manifest without 11-digit NDC pattern | `INVALID_NDC` |
| V-F3 | Two manifest rows same HCPCS + conflicting unit → `MANUAL_REVIEW` | `HCPCS_CONFLICT` |
| V-F4 | `billingReady: true` implies manifest entry in M1.4B for billable | `BILLING_FALSE_POSITIVE` |

### G — Seed apply guards (M1.5E preview)

| ID | Rule | Failure kind |
|----|------|--------------|
| V-G1 | Apply set excludes `DO_NOT_LINK` and `MANUAL_REVIEW` without approval token | `UNAPPROVED_ROW` |
| V-G2 | Second apply with existing `legacyCatalogMedicationId` → skip (idempotent), never overwrite | `DUPLICATE_PROTECTED` |
| V-G3 | Create concept/product/package only when `MISSING_CANONICAL_TARGET` | `UNSAFE_UPDATE` |

---

## Rejected auto-link conditions (hard fail)

Consolidated from audit Part 3.3:

1. Name-only / brand-only match  
2. Target in quarantine union (**993** products)  
3. Controlled / HA / LASA without `reviewerRequired`  
4. Ambiguous duplicate strength/route (multiple products)  
5. Inactive concept chain as target  
6. NDC shared across unrelated generics (77 groups) without review  

---

## Expected tests for M1.5D

| Test suite | Cases |
|------------|-------|
| `haitiCanonicalMedicationLinkageValidation.test.ts` | V-A1–A9 on fixture manifest |
| Manifest ↔ Haiti seed | V-C1–C4 using `HAITI_MEDICATION_CATALOG` + `deriveMedicationCatalogCode` |
| Quarantine fixtures | V-B1–B3 with mock product rows (`acetaminophen`, `baseline`) |
| Safety policy | V-E1–E4 with controlled/high-alert manifest snippets |
| Billing policy | V-F1–F4 with M1.4B manifest |
| Tranche partition | All **247** codes; sum = 247; T1 = **82** billable IV |
| Regression | `medication-billing-mapping-validation.spec.ts` still PASS after manifest codegen |

### CI command (M1.5D)

```bash
pnpm --filter @medora/shared test -- haitiCanonicalMedicationLinkageValidation
pnpm --filter @medora/api test -- haiti-canonical-linkage-validation
```

### Read-only DB audit script (optional M1.5D)

SQL report (no writes):

- Manifest codes ⊄ `CatalogMedication`  
- Catalog Haiti codes ⊄ manifest  
- Existing `legacyCatalogMedicationId` conflicts  

---

## Validation output contract

```typescript
export type HaitiLinkageValidationIssue = {
  kind: string;
  catalogMedicationCode?: string;
  message: string;
};

export type HaitiLinkageValidationResult = {
  pass: boolean;
  issues: HaitiLinkageValidationIssue[];
  stats: {
    total: number;
    linkReady: number;
    manualReview: number;
    doNotLink: number;
    missingTarget: number;
  };
};
```

**Pass criteria for M1.5D merge:**

- `pass === true` on full **247** manifest  
- `manualReview` rows documented in CSV for clinical sign-off  
- `0` `QUARANTINE_TARGET` issues  

---

## Part 7–8 validation hooks (billing & safety)

| Domain | Validation hook |
|--------|-----------------|
| Billing | Reuse `computeMedicationBillingCoverageReport` on manifest-derived catalog rows |
| Safety | Reuse `assertControlledSubstanceGovernanceManifest` / HA / LASA validators for code alignment report |
| MAR | No new tests in M1.5D — verify no MAR schema change |

---

## Sign-off gates before M1.5E seed

| Gate | Owner |
|------|-------|
| Validation `pass` in CI | Engineering |
| `MANUAL_REVIEW` CSV signed | Clinical / pharmacy |
| M1.4B seed applied on pilot (billing defaults) | Ops |
| M1.3C–E seed plan approved | Clinical governance |
| Production count replay (247 Haiti codes) | Ops |
