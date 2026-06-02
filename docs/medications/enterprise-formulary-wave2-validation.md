# M1.6D — Enterprise Formulary Wave 2 validation

## Automated tests

```bash
pnpm --filter @medora/shared test -- enterpriseWave2
pnpm --filter @medora/api test -- enterprise-wave2
pnpm --filter @medora/api test -- medication-safety
pnpm --filter @medora/api test -- billing
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api run build
pnpm verify:web
```

## Validation dimensions

| Dimension | Validator |
|-----------|-----------|
| Manifest integrity | `validateEnterpriseWave2FormularyManifest` — no Wave 1 overlap, 75+ rows, billing alignment |
| Canonical integrity | Seed creates Concept + Product + Package + `legacyCatalogMedicationId` |
| Billing readiness | `validateWave2MedicationBillingReadiness` — HCPCS/J, NDC, profile |
| Governance readiness | Controlled schedule, high-alert flags on manifest rows; safety profile seed |
| Alias readiness | M1.6C alias manifest includes Wave 2 rows |
| Activation readiness | `isActive=false`, `REVIEW_REQUIRED`, Wave 2 billing gate |
| Search readiness | `computeWave2SearchReadinessScore` ≥ 95% on indexed mock |

## Post-seed SQL (optional)

```sql
SELECT COUNT(*) FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16D_WAVE2_FORMULARY%';

SELECT COUNT(*) FROM "MedicationProduct" p
JOIN "MedicationPackage" pkg ON pkg."productId" = p.id
JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
WHERE p."governanceNotes" LIKE '%ENTERPRISE_M16D_WAVE2_FORMULARY%';
```

Expect marker count = billing profile count = **89** after full seed.
