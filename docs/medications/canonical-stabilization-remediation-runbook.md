# Canonical Stabilization Remediation — Runbook (M1.5R)

**Audience:** Engineering + pharmacy informatics  
**Scope:** Staging first · production only after M1.5H re-pass

---

## Prerequisites

- Database backup (staging snapshot)
- `pnpm --filter @medora/shared build`
- M1.5R code deployed on branch
- **Do not** enable M1.5G pilot or M1.5E in same run until remediation verified

---

## Step 1 — Read-only audit

From `apps/api` (or CI script invoking Prisma):

```typescript
import { PrismaClient } from "@prisma/client";
import { auditHaitiCanonicalStabilization } from "./prisma/helpers/seed-haiti-canonical-stabilization-remediation";

const prisma = new PrismaClient();
const report = await auditHaitiCanonicalStabilization(prisma);
console.log(report);
```

**Record:**

- `linkAudit.incorrect + linkAudit.quarantined` (expect **64** on baseline dev)
- `activePollutionCatalogs` (expect **73** `19G*` active)
- `m15eReadiness.processable` (expect **192**)

---

## Step 2 — Dry-run remediation

```bash
MEDORA_ENABLE_HAITI_CANONICAL_STABILIZATION_REMEDIATION=1 \
MEDORA_HAITI_STABILIZATION_REMEDIATION_DRY_RUN=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Or programmatic:

```typescript
await remediateHaitiCanonicalStabilization(prisma, { dryRun: true });
```

**Acceptance:** `unlinkedInvalidProducts` and `deactivatedPollutionCatalogs` match audit counts; `state.writes === 0`.

---

## Step 3 — Apply remediation (staging)

```bash
MEDORA_ENABLE_HAITI_CANONICAL_STABILIZATION_REMEDIATION=1 \
MEDORA_HAITI_STABILIZATION_REMEDIATION_DRY_RUN=0 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Writes:**

1. **64** products: `legacyCatalogMedicationId = null` + M1.5R unlink marker  
2. **73** catalogs: `isActive = false` + M1.5R description marker  

**Does not write:** orders, MAR administrations, billing ledger, catalog deletes.

---

## Step 4 — Post-remediation audit

```typescript
const post = await auditHaitiCanonicalStabilization(prisma);
```

**Must show:**

- `linkAudit.incorrect === 0`
- `linkAudit.quarantined === 0`
- `activePollutionCatalogs === 0`
- `m15hRecheck.overall === "PASS"`
- `gates.readyForM15eStaging === true`

---

## Step 5 — Search smoke (manual)

In provider medication search UI or API `GET /catalog/medications/search?q=acetaminophen`:

- **No** results with code prefix `19G1-ACET`
- **Yes** Haiti `PARACETAMOL_*` / `ACETAMINOPHEN_*` rows as applicable

Repeat for query list in M1.5H Part 9.

---

## Step 6 — M1.5E staging backfill (separate maintenance window)

**Not part of M1.5R apply** — run only after Step 4 PASS.

```bash
# Dry-run first (custom script or seed with dryRun if added)
MEDORA_ENABLE_HAITI_CANONICAL_LINKAGE_BACKFILL=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expected:**

| Metric | Value |
|--------|------:|
| `createdProducts` | up to **192** |
| `linkedCatalogMedications` | **192** |
| `skippedManualReview` | **55** |
| `skippedQuarantine` | **0** |

**Rollback (M1.5E):** Deactivate Haiti chains; clear `legacyCatalogMedicationId`; retain concepts for audit — see M1.5E backfill doc. Do not delete catalog rows.

---

## Step 7 — M1.5G pilot (after M1.5E PASS)

```bash
MEDORA_ENABLE_HAITI_CANONICAL_ACTIVATION_PILOT=1 \
MEDORA_HAITI_CANONICAL_ACTIVATION_PILOT_DRY_RUN=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Pilot **≤38** auto-eligible T1 rows · one facility · rollback drill required.

---

## Rollback — M1.5R catalog deactivation only

```typescript
import { rollbackHaitiCanonicalStabilizationCatalogRemediation } from "./prisma/helpers/seed-haiti-canonical-stabilization-remediation";

await rollbackHaitiCanonicalStabilizationCatalogRemediation(prisma, { dryRun: false });
```

**Restores:** `isActive = true` on catalogs with M1.5R marker in `description`.

**Does not restore:** invalid product `legacyCatalogMedicationId` (must not re-link clones).

To restore bad links would require manual DB intervention — **not recommended**.

---

## Rollback — full M1.5R (operational)

| Layer | Action |
|-------|--------|
| Catalog pollution | `rollbackHaitiCanonicalStabilizationCatalogRemediation` |
| Product unlink | **No auto rollback** — re-run M1.5E to create correct links only |
| M1.5E chains | M1.5E rollback pattern (deactivate + clear FK) |
| M1.5G pilot | `rollbackHaitiCanonicalActivationPilot` |

---

## Production policy

| Step | Production |
|------|------------|
| M1.5R apply | Only after staging PASS + pharmacy sign-off on deactivated SKU list |
| M1.5E | Staging → pilot clinic → production |
| M1.5G | Single pilot facility |
| M1.6A | Blocked until M1.5H **STABILIZED** |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `unlinked=0` but audit shows incorrect | Remediation already applied | Re-audit |
| Search still shows `19G` | Catalog still `isActive` | Re-run deactivate; check `description` marker |
| M1.5E quarantine error | Linking to clone product | Re-run M1.5R unlink first |
| Orders fail lookup | Catalog deleted (should not happen) | M1.5R never deletes — restore from backup |

---

## Contacts / sign-off

- Engineering: audit JSON attached to ticket  
- Pharmacy: review list of **73** deactivated `19G` catalog codes  
- Medical director: acknowledge before production apply
