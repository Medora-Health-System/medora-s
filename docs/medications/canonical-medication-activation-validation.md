# Canonical medication activation validation (M1.5G)

## Validator layers

### 1. Manifest structure

- T1 count ≤ 82.
- No duplicate catalog codes / product codes / package codes in pilot manifest.

### 2. Eligibility

- `pilotEligible === true` required.
- Excludes: controlled, high-alert, LASA, opioid, insulin, anticoagulant, `MANUAL_REVIEW`, quarantine codes.

### 3. Canonical chain

- `MedicationConcept`, `MedicationProduct`, `MedicationPackage`, `CatalogMedication` present.
- `legacyCatalogMedicationId` matches catalog row (M1.5E).
- Not quarantined (`isQuarantinedCanonicalProduct`, import-artifact prefixes).

### 4. Duplicate prevention

Detects blocking duplicates across pilot DB snapshots:

- Same catalog code / generic / alias / NDC.
- Same linked catalog id.
- Same provider search identity (catalog id inflation).

### 5. Billing preservation

Validates per row:

- `billingCodeDefault` vs M1.4B HCPCS manifest.
- Package `MedicationBillingProfile` HCPCS alignment.
- NDC manifest vs catalog `ndc11`.

Warnings only when M1.4B not applied locally (no HCPCS/NDC).

### 6. Governance preservation

- Safety profile presence (warning if missing).
- Controlled / high-alert drift vs manifest (warnings).
- No governance **rule** changes in this phase.

### 7. Provider search non-regression

`validateProviderSearchNonRegression`: catalog id set before vs after activation must be identical (no inflation, no removal).

## Activation gate

`validatePilotActivationCandidate` aggregates all checks. Any **blocking** issue prevents `seedHaitiCanonicalActivationPilot` from activating that row.

Linkage integrity pre-check: **≥ 75%** of batch rows must have `legacyCatalogMedicationId` set.

## Tests

| Suite | Path |
|-------|------|
| Shared validation | `haitiCanonicalActivationPilotValidation.test.ts` |
| API seed/rollback | `haiti-canonical-activation-pilot.spec.ts` |

## Validation commands

```bash
pnpm --filter @medora/shared test
pnpm --filter @medora/api test -- haiti-canonical-activation-pilot
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api run build
```
