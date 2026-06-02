# Haiti Canonical Linkage Backfill — Validation (M1.5E)

**Date:** 2026-06-02

---

## Pre-run checks

1. `pnpm --filter @medora/shared build`
2. `assertHaitiCanonicalLinkageManifest` passes (247 rows)
3. `validateManifest(manifest, { formularyRows, existingTargets })` with DB targets loaded
4. No proposed product code on quarantine deny-list (`PRI_ER_*`, `19G*`, acetaminophen/insulin/blocked-med clones)

---

## Dry-run

```ts
const summary = await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: true });
```

- **Zero** Prisma writes (`writes` counter in tests)
- Reports projected `createdConcepts`, `createdProducts`, `createdPackages`, `linkedCatalogMedications`
- Surfaces `conflicts` and `warnings` without persisting

---

## Expected counts (manifest-driven)

| Metric | Expected (full Haiti catalog present) |
|--------|--------------------------------------|
| `manifestEntries` | 247 |
| `skippedManualReview` | 55 |
| `skippedDoNotLink` | 0 |
| Processable `MISSING_CANONICAL_TARGET` | 192 |
| `skippedMissingCatalog` | 0 when all 247 catalog codes exist |
| Run 2 `created*` | 0 |
| Run 2 `alreadyLinked` | ≈ processable count |

Local DB without full Haiti seed will increase `skippedMissingCatalog`.

---

## Quarantine enforcement

Hard failure (`HaitiCanonicalLinkageBackfillError`) when:

- Proposed or existing target returns `QUARANTINE` from `isQuarantinedCanonicalProduct`
- Import artifact prefix on proposed code
- Catalog already linked to a quarantined product

---

## Billing / safety preservation

| Rule | Behavior |
|------|----------|
| Existing `billingCodeDefault` / package HCPCS | Not overwritten |
| Missing HCPCS / NDC | Create profile / package NDC from M1.4B manifest when present |
| M1.4B not applied locally | Warning only (no fail) |
| Conflicting non-null HCPCS or NDC | Fail with `conflicts` |

| Safety | Create `MedicationSafetyProfile` only if missing; copy catalog controlled/witness flags |

---

## Tests

`apps/api/src/medication-master/haiti-canonical-linkage-backfill.spec.ts`

---

## CI commands

```bash
pnpm --filter @medora/shared test
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- haiti-canonical-linkage-backfill
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- medication-safety
pnpm --filter @medora/api test -- orders
pnpm --filter @medora/api run build
pnpm verify:web
```

**Known allowed failure:** `medication-governance-lifecycle.e2e` acetaminophen provider-search flake (pre-existing).
