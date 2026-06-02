# Canonical Stabilization Remediation — Validation (M1.5R)

**Date:** 2026-06-02

---

## Automated tests

| Suite | Path | Result |
|-------|------|--------|
| Shared remediation | `haitiCanonicalStabilizationRemediationValidation.test.ts` | **6 PASS** |
| API remediate/audit/rollback | `haiti-canonical-stabilization-remediation.spec.ts` | **4 PASS** |

---

## Validation commands

```bash
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- haiti-canonical-stabilization-remediation
pnpm --filter @medora/api test -- medication-safety
pnpm --filter @medora/api test -- orders
pnpm --filter @medora/api run build
pnpm --filter @medora/shared test
pnpm verify:web
```

**Note:** Full `pnpm --filter @medora/api test -- medication` may show pre-existing acetaminophen lifecycle e2e flake — not introduced by M1.5R.

---

## Part 1 — Link audit validation

`auditHaitiCanonicalStabilization(prisma)` returns:

- `linkAudit.{correct,incorrect,missing,duplicate,quarantined}`
- `manifestMissingLinks` (expect **192** pre-M1.5E)
- `productsWithLegacyLink`

**Acceptance after remediation:**

- `incorrect + quarantined === 0`
- `duplicate === 0`

---

## Part 3 — Quarantine enforcement

`validateQuarantineRemediationEnforcement()` must return `pass: true`.

Sample blocks verified:

- `19G1-ACET-*` product
- `PRI_ER_ACET*` product
- `baselineAvailable: true`
- insulin / blocked-med generics
- `19G1-ACET-*` catalog code

---

## Part 5 — M1.5E readiness

`validateM15eBackfillReadiness(existingProductCodes)`:

| Field | Expected |
|-------|----------|
| `processable` | **192** |
| `manualReview` | **55** |
| `quarantineBlocked` | **0** |
| `score` | ≥ **75** |

---

## Part 7 — Billing preservation

Remediation touches only:

- `MedicationProduct.legacyCatalogMedicationId` (null)
- `MedicationProduct.governanceNotes` (append marker)
- `CatalogMedication.isActive` (false for pollution only)
- `CatalogMedication.description` (append marker)

**Does not modify:** `billingCodeDefault`, `ndc11`, `BillingCatalog`, `MedicationBillingProfile`, order/MAR tables.

**Verdict:** **PASS**

---

## Part 8 — Governance preservation

No changes to:

- `isControlled`, `requiresWitness`, `requiresDoubleSign` on catalog
- `MedicationSafetyProfile` rows
- Governance manifests or MAR util logic

**Verdict:** **PASS**

---

## Part 9 — Search scenario validation

`validateSearchScenarios(catalogHits)` — 13 queries.

**Pre-remediation:** `acetaminophen`, `tylenol` → `pass: false` if any `19G1-ACET` hit.

**Post-remediation:** all scenarios `pass: true`.

Manual SQL smoke (read-only):

```sql
SELECT code FROM "CatalogMedication"
WHERE "isActive" = true AND code LIKE '19G%';
-- Expect 0 rows after remediation
```

---

## Part 11 — M1.5H recheck helper

`evaluateM15hRecheckAfterRemediation({ incorrectLinks, quarantinedLinks, activePollutionCatalogs, acetSearchCloneHits })`

| Input (post-remediation) | Expected `overall` |
|--------------------------|-------------------|
| All zeros | **PASS** |
| `activePollutionCatalogs > 0` | **FAIL** |
| `acetSearchCloneHits > 0` | **PARTIAL** or **FAIL** |

Use `assumeRemediationApplied: true` on audit for dry-run projection without writes.

---

## Dry-run acceptance

```bash
MEDORA_ENABLE_HAITI_CANONICAL_STABILIZATION_REMEDIATION=1 \
MEDORA_HAITI_STABILIZATION_REMEDIATION_DRY_RUN=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Expect log: `unlinked=64`, `deactivatedCatalogs=73` (local baseline; counts may vary by environment).
