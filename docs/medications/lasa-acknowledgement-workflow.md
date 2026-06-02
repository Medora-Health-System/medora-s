# LASA acknowledgement workflow (M1.3F.6)

**Phase:** M1.3F.6 — LASA MAR enforcement  
**Builds on:** M1.3E, M1.3F.1 schema, M1.3F.3 display, M1.3F.4 controlled, M1.3F.5 high-alert  
**Migration:** `20260906120000_m1_3f6_lasa_mar_audit_actions` (audit enum only)

## Workflow implemented

When a nurse records **administered** on a medication with **LASA_HIGH** or **LASA_MEDIUM** (or LASA group without LOW/NONE severity):

1. **Acknowledgement**
   - `lasaAcknowledged` — warning read
   - `lasaMedicationSelectionConfirmed` — correct product selected
2. **Optional second read**
   - `lasaSecondReadUserId` or `lasaSecondReadDisplayName`
3. **Override** (if acknowledgement not provided)
   - `lasaOverrideReason` + `lasaOverrideAcknowledged`
4. **Persistence** (same transaction as MAR create)
   - `MedicationAdministrationVerification` (`LASA_ACKNOWLEDGMENT`, `COMPLETED`)
   - `verifierUserId` = administrator; `witnessedByUserId` = second-read user when provided
   - `MedicationAdministrationOverride` (`LASA_OVERRIDE`) on override path

**LASA_LOW:** informational only (badge/summary); no MAR block.

## Combined governance

Controlled, high-alert, and LASA sections may all appear in the MAR modal. Each workflow validates independently; server persists verifications/overrides in order: controlled → high-alert → LASA.

## API

Optional POST fields:

| Field | Purpose |
|-------|---------|
| `lasaAcknowledged` | Warning acknowledged |
| `lasaMedicationSelectionConfirmed` | Correct medication confirmed |
| `lasaSecondReadUserId` | Optional second-read staff id |
| `lasaSecondReadDisplayName` | Fallback display name |
| `lasaOverrideReason` | Override without acknowledgement |
| `lasaOverrideAcknowledged` | Must be `true` for override |

**400** when LASA rules fail (French messages).

## Audit events (PHI-safe metadata)

| Action | When |
|--------|------|
| `LASA_WARNING_ACKNOWLEDGED` | LASA verification row created |
| `LASA_OVERRIDE` | LASA override row created |

## UI

- `MarLasaFields` — purple region, group/severity/medication display, checkboxes, optional second read
- `marLasa.*` i18n (French product strings)
- `sr-only` LASA warning prefix

## Enforced

- Acknowledgement + medication selection **or** override for LASA_HIGH / LASA_MEDIUM
- Second read cannot be same user as administrator
- No silent bypass

## Deferred

- Pharmacy queue, barcode, eMAR scheduling
- Chart export surfacing
- `PENDING` deferred LASA acknowledgement

## Rollback

- Revert application code; audit enum values may remain unused in PostgreSQL

## Performance / accessibility

- No new dependencies; reuses `ClinicalUserRoleAutocomplete`
- Labeled checkboxes, keyboard navigable, text + `sr-only` warning

## Verification

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- lasa-mar-governance
pnpm --filter @medora/api test -- controlled-substance-mar-governance
pnpm --filter @medora/api test -- high-alert-mar-governance
pnpm verify:web
```
