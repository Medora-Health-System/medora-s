# High-alert double-check workflow (M1.3F.5)

**Phase:** M1.3F.5 — first high-alert MAR enforcement  
**Builds on:** M1.3D, M1.3F.1 schema, M1.3F.3 MAR UI governance display, M1.3F.4 controlled workflow  
**Migration:** `20260905120000_m1_3f5_high_alert_mar_audit_actions` (audit enum only)

## Workflow implemented

When a nurse records **administered** on a medication requiring **independent double-check**:

1. **Second verifier** (if `requiresDoubleSign` + `isHighAlert`, or safety codes `REQUIRES_INDEPENDENT_DOUBLE_CHECK` / `REQUIRES_DUAL_VERIFICATION` / `REQUIRES_COSIGN`):
   - Select via facility roster (`ClinicalUserRoleAutocomplete`) **or**
   - Enter verifier display name **or**
   - **Override** with `highAlertOverrideReason` + `highAlertOverrideAcknowledged`
2. **Persistence** (same transaction as MAR create, after controlled governance if applicable):
   - `MedicationAdministrationVerification` (`INDEPENDENT_DOUBLE_CHECK`, `DUAL_VERIFICATION`, or `COSIGN`, status `COMPLETED`)
   - `MedicationAdministrationOverride` (`HIGH_ALERT_OVERRIDE`) when override used

## Controlled + high-alert overlap

- Both sections may appear in the MAR modal (orange high-alert, red controlled).
- Verifier **must differ** from administrator and from controlled-substance **witness** user id.
- When controlled override is active, high-alert may reuse the **same override reason**; a separate high-alert acknowledgment checkbox still applies.

## API

`POST /encounters/:encounterId/medication-administrations` — optional fields:

| Field | Purpose |
|-------|---------|
| `highAlertVerifierUserId` | Second verifier (UUID) |
| `highAlertVerifierDisplayName` | Fallback display name |
| `highAlertOverrideReason` | Override without verifier |
| `highAlertOverrideAcknowledged` | Must be `true` for override |
| `highAlertVerificationType` | Optional hint: `INDEPENDENT_DOUBLE_CHECK` \| `DUAL_VERIFICATION` \| `COSIGN` |

**400** when rules fail (French messages). Informational high-alert (`isHighAlert` without double-check flags) is unchanged.

## Audit events (PHI-safe metadata)

| Action | When |
|--------|------|
| `HIGH_ALERT_DOUBLE_CHECK_COMPLETED` | Verification row created |
| `HIGH_ALERT_OVERRIDE` | Override row created |

## UI

- `MarHighAlertFields` — MAR record modal only (double-check required + administered)
- M1.3F.3 badges/summary remain informational
- Orange border region, labeled fields, `sr-only` warning prefix

## Enforced

- Verifier or override for high-alert double-check on **administered**
- Verifier ≠ administrator; verifier ≠ controlled witness user id
- Override requires reason (min 8 chars) + acknowledgment

## Deferred

- Pharmacy queue / barcode / eMAR scheduling
- `PENDING` deferred double-check
- Chart export surfacing of verification rows
- Full `safetyRequirementCodes` on order-item read API (enforcement uses catalog + product profile server-side)

## Rollback

- Revert application code; leave unused audit enum values in PostgreSQL
- Governance rows are append-only

## Performance / accessibility

- No new npm dependencies; reuses roster autocomplete
- `role="region"`, labeled inputs, text + `sr-only` warning

## Verification

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- high-alert-mar
pnpm --filter @medora/api test -- controlled-substance-mar
pnpm --filter @medora/api test -- medication-safety
pnpm verify:web
```
