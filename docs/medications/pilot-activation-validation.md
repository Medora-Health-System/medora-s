# M1.6F — Pilot Activation Validation

## Automated tests

```bash
pnpm --filter @medora/shared test -- enterpriseFormularyPilot
pnpm --filter @medora/api test -- enterprise-formulary-pilot
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api run build
pnpm verify:web
```

## Validation dimensions

| Dimension | Validator |
|-----------|-----------|
| Tranche manifest | `validateTrancheAManifestStructure` — 10–15 rows, all eligible |
| Eligibility | Excludes controlled, high-alert, LASA, injectables, anticoag |
| Canonical chain | `validateEnterprisePilotChain` — product, package, legacy link, enterprise marker |
| Billing | `validateEnterprisePilotBilling` — Wave 1 billing manifest + profile HCPCS + NDC |
| Governance | Safety profile must not be controlled/high-alert/LASA |
| Search | ≥1 alias on linked catalog |
| Bulk guard | Refuses >15 catalog codes in one request |
| Provider search | Refuses activation if `orderSearchEnabled` already true |

## Staging audit (read-only)

```bash
DATABASE_URL="…" npx ts-node --transpile-only -e "
const { auditEnterpriseFormularyPilotTrancheA } = require('./prisma/helpers/seed-enterprise-formulary-pilot-activation');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
auditEnterpriseFormularyPilotTrancheA(prisma).then(console.log).finally(() => prisma.\$disconnect());
"
```

**Latest Railway result:** 12/12 eligible, 0 blocked, activationReadinessPct=100.

## Post-activation checks (when pilot runs)

```sql
SELECT code, "isActive", "governanceStatus"
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%';

-- Expect orderSearchEnabled absent or false in governanceNotes JSON
```
