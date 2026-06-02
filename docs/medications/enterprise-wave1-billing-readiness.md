# Enterprise Wave 1 — Billing Readiness (M1.6B)

## Mandatory before activation

Every Wave 1 medication must have:

1. `MedicationBillingProfile` on default package  
2. Valid **NDC** (11-digit) on catalog and package  
3. **HCPCS** or **J-code** (oral anticoag/chronic: `J3490`; injectables: `J1650`/`J1644`; vaccines: `906xx` product + `90471` admin CPT)  
4. Vaccines: **CVX** in manifest + **administration CPT**

Validation: `packages/shared/src/medication/enterpriseWave1BillingValidation.ts`  
Billing manifest: `packages/shared/src/medication/enterpriseWave1BillingManifest.ts`

## Activation gate (Part 5)

API gate: `apps/api/src/medication-master/enterprise-wave1-billing-gate.util.ts`

Blocks product activation when governance notes include `ENTERPRISE_M16B_WAVE1_FORMULARY` and:

- `MedicationBillingProfile` missing → `BILLING_REVIEW_REQUIRED`
- NDC missing → `NDC_REVIEW_REQUIRED`
- HCPCS/J missing → `BILLING_CODE_REQUIRED`

## Coverage metrics (readiness report)

After seed, `seedEnterpriseWave1Formulary` returns:

- `ndcCoveragePct`, `hcpcsCoveragePct`, `jCodeCoveragePct`
- `billingReadinessPct`, `wave1ReadinessPct`
- Per-medication PASS/FAIL in `readinessReport.perMedication`

## Production note

Staging NDC/HCPCS values are **illustrative placeholders** (`00000…` pattern). Replace with licensed payer/product identifiers before production billing.

## Illustrative codes (not production claims)

| Class | HCPCS / CPT pattern |
|-------|---------------------|
| Oral DOAC / statin / psych | `J3490` |
| Enoxaparin | `J1650` |
| Heparin | `J1644` |
| Vaccine product | `906xx` / `907xx` / `91309` |
| Vaccine administration | `90471` |
