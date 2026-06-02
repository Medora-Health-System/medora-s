# Controlled-substance waste & witness workflow (M1.3F.4)

**Phase:** M1.3F.4 — first controlled MAR enforcement  
**Builds on:** M1.3C, M1.3F.1 schema, M1.3F.3 MAR UI governance display  
**Migration:** `20260904120000_m1_3f4_controlled_substance_mar_audit_actions` (audit enum only)

## Workflow implemented

When a nurse records **administered** on a **controlled** medication order line:

1. **Witness** (if `requiresWitness` from catalog/profile):
   - Select witness via facility roster (`/roster/clinical-users`) **or**
   - Enter witness display name (metadata on verification row) **or**
   - **Override** with reason + explicit acknowledgment checkbox
2. **Waste** (if partial dose vs order quantity, or user documents waste):
   - `wasteAmount`, `wasteUnit`, optional `wasteReason`
   - Creates `MedicationWasteDocumentation` with status `COMPLETED`
3. **Persistence** (same transaction as MAR create):
   - `MedicationAdministrationVerification` (`WITNESS`, `COMPLETED`) when witness provided
   - `MedicationAdministrationOverride` (`CONTROLLED_SUBSTANCE_OVERRIDE`) when override used
   - `MedicationWasteDocumentation` when waste amount &gt; 0

## API

`POST /encounters/:encounterId/medication-administrations` — optional fields (backward compatible):

| Field | Purpose |
|-------|---------|
| `witnessUserId` | Staff witness (UUID) |
| `witnessDisplayName` | Fallback when roster id unavailable |
| `wasteAmount` / `wasteUnit` / `wasteReason` | Controlled waste |
| `overrideReason` | Required with override path |
| `controlledOverrideAcknowledged` | Must be `true` for override |

**400** when controlled rules fail (French messages). Non-controlled lines ignore new fields.

## Audit events (PHI-safe metadata)

| Action | When |
|--------|------|
| `MEDICATION_WITNESS_VERIFICATION_COMPLETED` | Witness verification row created |
| `MEDICATION_WASTE_RECORDED` | Waste row created |
| `MEDICATION_WASTE_WITNESSED` | Waste row has witness user id |
| `CONTROLLED_SUBSTANCE_OVERRIDE` | Override row created |

Existing `CREATE` on `MEDICATION_ADMINISTRATION` unchanged.

## UI

- `MarControlledSubstanceFields` in MAR record modal only (controlled + administered)
- Governance badges/summary from M1.3F.3 remain informational
- Controlled section: red border, labeled fields, keyboard-accessible inputs

## Enforced

- Witness or override for controlled + `requiresWitness` on **administered**
- Waste amount + unit when partial dose (administered qty &lt; ordered qty) unless override
- Witness cannot be same user as administrator
- Override requires reason (min 8 chars) + acknowledgment flag

## Deferred

- Pharmacy queue / `PharmacyVerification` workflow
- Shift count / inventory decrement
- eMAR scheduling / barcode
- Chart export surfacing of verification/waste rows (schema ready; export unchanged)
- `PENDING` deferred witness (not silently marked completed)
- Double-sign enforcement (`requiresDoubleSign` display only via M1.3F.3)

## Rollback

- Revert application code; audit enum values cannot be removed from PostgreSQL easily — safe to leave unused
- Governance rows are append-only; do not delete in production without legal review

## Performance / accessibility

- No new npm dependencies; reuses `ClinicalUserRoleAutocomplete`
- Witness search debounced (existing roster endpoint)
- Section `role="region"`, labeled inputs, alert styling with text (not color-only)

## Verification

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- controlled-substance
pnpm --filter @medora/api test -- medication-safety
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- orders
pnpm verify:web
```
