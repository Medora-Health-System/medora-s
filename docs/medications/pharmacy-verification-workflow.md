# Pharmacy verification workflow (M1.3F.7)

**Phase:** M1.3F.7 — pharmacy verification governance for medication orders and MAR  
**Migration:** `20260907120000_m1_3f7_pharmacy_mar_audit_actions` (audit enum only)

## Status mapping (no duplicate enum)

| Design term | `PharmacyVerificationStatus` (Prisma) |
|-------------|--------------------------------------|
| PHARMACY_REVIEW_PENDING | `PENDING` |
| PHARMACY_VERIFIED | `VERIFIED` |
| PHARMACY_REJECTED | `REJECTED` |
| Override at MAR | `MedicationAdministrationOverride` + audit `PHARMACY_VERIFICATION_OVERRIDE` |

## When verification is required

Before **administered** MAR, pharmacy verification is required when:

- Controlled substance **Schedule II or III** (catalog/profile schedule), or
- High-alert class: `HIGH_ALERT_INSULIN`, `HIGH_ALERT_ANTICOAGULANT` (heparin), `HIGH_ALERT_THROMBOLYTIC`, `HIGH_ALERT_VASOPRESSOR`, `HIGH_ALERT_CHEMOTHERAPY`, or
- Safety requirement code `REQUIRES_PHARMACY_VERIFICATION`

Configurable expansion: extend `PHARMACY_REQUIRED_HIGH_ALERT_CLASSES` in `@medora/shared`.

## MAR enforcement

| Status | MAR `administered` |
|--------|-------------------|
| `VERIFIED` | Allowed |
| `NOT_REQUIRED` | Allowed |
| `PENDING` | Blocked unless override |
| `REJECTED` | Blocked unless override |

Override: `pharmacyVerificationOverrideReason` (≥8 chars) + `pharmacyVerificationOverrideAcknowledged` → `MedicationAdministrationOverride` (`PHARMACY_PENDING_OVERRIDE`, metadata `overrideKind: PHARMACY_VERIFICATION_OVERRIDE`).

## Pharmacist API

- `POST /orders/items/:orderItemId/pharmacy-verification/complete` — roles `PHARMACY`, `ADMIN`
- `POST /orders/items/:orderItemId/pharmacy-verification/reject` — roles `PHARMACY`, `ADMIN`

Creates `PharmacyVerification` row and audit `PHARMACY_VERIFICATION_COMPLETED` or `PHARMACY_VERIFICATION_REJECTED`.

## UI

- `MarPharmacyVerificationPanel` — pending/rejected banners, verified-by/at, override fields
- Governance badges: `PHARMACY_VERIFY`, `PHARMACY_VERIFIED`
- Order items expose `medicationSafetyGovernance.pharmacyVerificationStatus`, `pharmacyVerifiedAt`, `pharmacyVerifiedByDisplay`

## Combined governance

Controlled (F.4), high-alert (F.5), LASA (F.6), and pharmacy (F.7) validate independently on the same MAR create.

## Deferred

- Full pharmacy worklist / queue UI
- Auto-create `PENDING` row on order place
- Barcode / eMAR
- Chart export surfacing
- `PHARMACY_VERIFICATION_OVERRIDE` as separate `MedicationOverrideType` enum value (uses `PHARMACY_PENDING_OVERRIDE` + metadata)

## Rollback

Revert application code; leave audit enum values unused if already deployed.

## Verification

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- pharmacy-mar-governance
pnpm verify:web
```
