# Infusion Billing Validation (M1.4D)

**Program:** Enterprise Medication Billing & Revenue Integrity  
**Phase:** M1.4D  
**Date:** 2026-06-02  

---

## Test matrix

### Classification

| Case | Expected category | Test |
|------|-------------------|------|
| IV push | `IV_PUSH` | `infusionBillingGovernance.test.ts` |
| Infusion START | `IV_INFUSION_START` | shared |
| Infusion STOP | `IV_INFUSION_STOP` | shared |
| Hydration START | `HYDRATION_START` | shared |
| Non-infusion oral | `NON_INFUSION_ADMINISTRATION` | shared |
| Refused MAR | `MANUAL_REVIEW_REQUIRED` | shared |

### Duration

| Case | Expected reason | Test |
|------|-----------------|------|
| Valid pair (90 min) | none | shared |
| Missing STOP | `MISSING_INFUSION_STOP` | shared |
| Missing START | `MISSING_INFUSION_START` | shared |
| Negative duration | `NEGATIVE_INFUSION_DURATION` | shared |
| Ambiguous STARTs | `AMBIGUOUS_INFUSION_PAIR` | shared |

### Billing capture

| Case | Expected | Test |
|------|----------|------|
| Drug HCPCS + companion CPT separate | `hcpcsCode` + `procedureCode` | `medication-administration-charge-capture.spec.ts` |
| Infusion STOP metadata | category + duration | charge-capture spec |
| M1.4C regression | resolver + enrichment | billing suite (75 tests) |
| High-alert heparin | classifiable + ready | `infusion-billing-governance.spec.ts` |

---

## Validation commands (2026-06-02)

| Command | Result |
|---------|--------|
| `pnpm --filter @medora/api exec prisma validate` | ✅ |
| `pnpm --filter @medora/api test -- billing` | ✅ **75 passed** |
| `pnpm --filter @medora/shared build` | ✅ |
| `infusionBillingGovernance.test.ts` | ✅ **17 passed** |

Run before approval:

```bash
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- orders
pnpm --filter @medora/api run build
pnpm verify:web
pnpm --filter @medora/web test
```

Known allowed failure: `medication-governance-lifecycle.e2e` (pre-existing DB flake).

---

## Verdict summary

| Part | Result |
|------|--------|
| Classification | **PASS** |
| Duration | **PASS** |
| CPT companion readiness | **PARTIAL** (suggestions only) |
| Capture enrichment | **PASS** |
| High-alert compatibility | **PASS** |
| Waste billing | **N/A** (unchanged) |
| Claim/export path | **PASS** (unchanged) |

**Overall:** **SAFE (conditional)** — infusion metadata is billing-ready for biller review; payer-final coding remains manual.
