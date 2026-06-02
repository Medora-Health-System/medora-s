# M1.6B.3 — Wave 1 marker remediation validation

## Local / CI commands

```bash
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api run build
pnpm --filter @medora/api test -- enterprise-wave1
pnpm --filter @medora/api test -- medication-safety
pnpm --filter @medora/shared test
pnpm verify:web
```

Target specs for M1.6B.3:

- `enterprise-wave1-marker-remediation.spec.ts`
- `enterprise-wave1-billing-gate.util.spec.ts`
- `enterprise-wave1-billing-readiness.spec.ts` (if present in `enterprise-wave1` filter)

## Staging re-seed

```bash
DATABASE_URL="<RAILWAY_STAGING_DATABASE_URL>" \
MEDORA_ENABLE_ENTERPRISE_WAVE1_FORMULARY=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Expect log field `wave1MarkersUpdated=9` on first run after M1.6B.3 deploy (0 on immediate re-run).

## Post-seed SQL audit (Railway / staging)

```sql
-- Wave 1 marker count (governance notes)
SELECT COUNT(*) AS marker_products
FROM "MedicationProduct" p
WHERE p."governanceNotes" LIKE '%ENTERPRISE_M16B_WAVE1_FORMULARY%';

-- Billing profiles for Wave 1 catalog codes (manifest-driven list in app; sample check)
SELECT COUNT(DISTINCT p.code) AS wave1_with_billing
FROM "MedicationProduct" p
JOIN "MedicationPackage" pkg ON pkg."productId" = p.id
JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
WHERE p."governanceNotes" LIKE '%ENTERPRISE_M16B_WAVE1_FORMULARY%';

-- Missing marker among the nine remediated ENRICH codes
SELECT p.code
FROM "MedicationProduct" p
JOIN "MedicationPackage" pkg ON pkg."productId" = p.id
JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
WHERE p.code IN (
  'AMLODIPINE_5_MG_COMPRIME_ORAL',
  'CARVEDILOL_6.25_MG_COMPRIME_ORAL',
  'HYDROCHLOROTHIAZIDE_25',
  'LEVOTHYROXINE_50_MCG_COMPRIME_ORAL',
  'LISINOPRIL_10',
  'LOSARTAN_50',
  'OMEPRAZOLE_20',
  'PANTOPRAZOLE_40_MG_COMPRIME_ORAL',
  'SIMVASTATIN_20_MG_COMPRIME_ORAL'
)
AND (p."governanceNotes" IS NULL OR p."governanceNotes" NOT LIKE '%ENTERPRISE_M16B_WAVE1_FORMULARY%');

-- Activation safety: still inactive + review required
SELECT COUNT(*) FILTER (WHERE NOT p."isActive" AND p."governanceStatus" = 'REVIEW_REQUIRED') AS inactive_review,
       COUNT(*) AS total_wave1_marker
FROM "MedicationProduct" p
WHERE p."governanceNotes" LIKE '%ENTERPRISE_M16B_WAVE1_FORMULARY%';
```

## Pass criteria

| Check | Expected |
|-------|----------|
| `marker_products` | **45** |
| `wave1_with_billing` | **45** (profiles present; distinct product codes with marker + profile) |
| Missing-marker query | **0 rows** |
| `inactive_review` | equals `total_wave1_marker` (45) |
| Second seed run | `wave1MarkersUpdated=0`, no duplicate marker lines |

## Pilot verdict

| State | Verdict |
|-------|---------|
| Staging before M1.6B.3 re-seed (36 markers, 9 gaps) | **NOT SAFE** — full 45-product pilot |
| Staging after re-seed (45 markers, 0 gaps, profiles intact) | **SAFE (conditional)** — billing gate applies to all Wave 1 products; activation still requires explicit governance |

## Git (after approval)

```bash
git add \
  apps/api/prisma/helpers/seed-enterprise-wave1-formulary.ts \
  apps/api/prisma/seed-catalogs.ts \
  apps/api/src/medication-master/enterprise-wave1.constants.ts \
  apps/api/src/medication-master/enterprise-wave1-billing-gate.util.ts \
  apps/api/src/medication-master/enterprise-wave1-marker-remediation.spec.ts \
  docs/medications/wave1-marker-remediation.md \
  docs/medications/wave1-marker-remediation-validation.md

git commit -m "$(cat <<'EOF'
fix(m1.6b.3): append Wave 1 marker on ENRICH alreadyLinked seed path

Nine M1.5E-linked chronic products were skipped in the ENRICH branch, bypassing
the activation billing gate. Idempotent merge preserves M1.5E notes.
EOF
)"

git push -u origin HEAD
```
