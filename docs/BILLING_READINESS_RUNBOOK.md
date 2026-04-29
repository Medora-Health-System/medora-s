# Billing Readiness Runbook

This runbook defines what Medora-S can treat as production-billable versus review-only for the current ER billing coverage work.

## Current Billing Status

Latest generated report:

- `official_validated`: 28
- `candidate_only`: 9
- `missing`: 1
- `pending_license`: 12

Report command:

```sh
pnpm exec tsx scripts/generate-billing-coverage-report.ts
```

Generated report path:

```text
~/medora-data/processed/medora-billing-coverage-report.json
```

## Status Definitions

- `official_validated`: exact official source match. For current ER coverage, this means an exact match against the parsed official CMS CLFS file for lab billing codes.
- `candidate_only`: supporting evidence only, not billable. Examples include HCPCS J-code candidates for medications or FDA NDC identity evidence.
- `pending_license`: requires licensed CPT source review and/or facility chargemaster review before production billing use.
- `missing`: no safe code found from available approved sources.

## Go-Live Billing Rule

- Only `official_validated` items can be auto-billed.
- `candidate_only` items require manual billing review and must not be auto-billed.
- `pending_license` items require manual billing review and must not be auto-billed until licensed source or chargemaster approval is complete.
- `missing` items must not be billed automatically.

## Current Blockers

- Imaging CPT license / facility chargemaster review is not complete.
- Procedure CPT license / facility chargemaster review is not complete.
- Medication billing policy is not complete, including J-code dose-unit validation.
- `ER_ETOH` blood ethanol billing code remains unresolved; parsed CLFS only showed breath ethanol, not blood ethanol.

## Required Before Production Billing

- Licensed CPT source or facility chargemaster review for imaging and procedures.
- Pharmacy billing policy for medication charge capture, including dose units and medication-specific billing rules.
- Billing UAT signoff with finance/billing staff.
- Review and approval of the top ER order billing coverage report.

## Operating Procedure

1. Regenerate the report:

   ```sh
   pnpm exec tsx scripts/generate-billing-coverage-report.ts
   ```

2. Review:

   ```text
   ~/medora-data/processed/medora-billing-coverage-report.json
   ```

3. Confirm only `official_validated` rows are eligible for auto-billing.
4. Send `candidate_only`, `pending_license`, and `missing` rows to manual billing review.
5. Do not promote any candidate medication, imaging, or procedure code to production billing without approved source evidence.

## Safety Notes

- Do not add CPT codes from unlicensed sources.
- Do not treat HCPCS J-code candidates as final medication billing mappings without policy and dose-unit validation.
- Do not treat FDA NDC as reimbursement proof; it is product identity evidence only.
- Do not auto-bill unresolved or pending rows.
