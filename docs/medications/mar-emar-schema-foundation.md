# MAR/eMAR schema foundation (M1.3F.1)

**Phase:** M1.3F.1 — schema only  
**Authority:** M1.3F — MAR/eMAR Governance Architecture  
**Migration:** `20260903120000_m1_3f1_mar_emar_schema_foundation` (`m1_3f1_mar_emar_schema_foundation`)

## Purpose

Additive Prisma models and enums to support future medication administration governance (witness/cosign, waste, overrides, legal corrections, pharmacy verification). This phase does **not** change runtime MAR/eMAR, order, pharmacy, billing, or search behavior.

## Schema additions

### Enums

| Enum | Values |
|------|--------|
| `MedicationVerificationType` | `WITNESS`, `COSIGN`, `DUAL_VERIFICATION`, `INDEPENDENT_DOUBLE_CHECK`, `LASA_ACKNOWLEDGMENT`, `HIGH_ALERT_CHECK`, `CONTROLLED_SUBSTANCE_CHECK` |
| `MedicationVerificationStatus` | `PENDING`, `COMPLETED`, `REJECTED`, `CANCELLED` |
| `MedicationWasteStatus` | `DRAFT`, `COMPLETED`, `VOIDED` |
| `MedicationOverrideType` | `PHARMACY_PENDING_OVERRIDE`, `HIGH_ALERT_OVERRIDE`, `CONTROLLED_SUBSTANCE_OVERRIDE`, `LASA_OVERRIDE`, `BARCODE_SCAN_OVERRIDE`, `SCHEDULE_OVERRIDE`, `OTHER` |
| `PharmacyVerificationStatus` | `NOT_REQUIRED`, `PENDING`, `VERIFIED`, `REJECTED`, `OVERRIDDEN` |
| `MedicationCorrectionStatus` | `RECORDED`, `VOIDED` |

### Models

| Model | Role |
|-------|------|
| `MedicationAdministrationVerification` | Witness, cosign, dual verification, high-alert / LASA / controlled checks tied to a MAR row |
| `MedicationWasteDocumentation` | Controlled-substance and partial-dose waste |
| `MedicationAdministrationOverride` | Append-only MAR override audit |
| `MedicationAdministrationCorrection` | Legal correction trail (`previousValues` / `correctedValues` JSON) |
| `PharmacyVerification` | Per–order-line pharmacy verification state (history allowed; no unique on `orderItemId`) |

All models use `onDelete: Restrict` for clinical parents (`Facility`, `Encounter`, `MedicationAdministration`, `OrderItem` where required) and `SetNull` for optional catalog/user links.

### Reused (unchanged)

- `MedicationAdministration` — append-only MAR; effective-time fields remain on the administration row for existing ER-3.2 / Phase 15F-B behavior.
- `MedicationSafetyProfile` — M1.3C–E flags (not enforced at administration time in this phase).
- `AuditLog`, `EncounterClinicalDocumentationEntry` — future linkage via services/metadata; no new FK columns in M1.3F.1.

## Indexes

Indexes support future queries by `facilityId`, `encounterId`, `orderItemId`, `medicationAdministrationId`, `catalogMedicationId`, status/type enums, actor/verifier user IDs, and `createdAt`. No broad unique constraints on `orderItemId` or `medicationAdministrationId` (multiple verification/waste/override rows allowed).

## Intended future use (not implemented here)

- Enforce witness/double-check from `MedicationSafetyProfile` at MAR save.
- Pharmacy queue UI and status transitions on `PharmacyVerification`.
- Waste capture at bedside for controlled substances.
- EDOC / `AuditLog` emission on verification, override, and correction events.
- eMAR scheduling and BCMA (later M1.3F.x phases).

## Intentionally not enforced yet

- No API routes, services, or UI for new tables.
- No seed data.
- No change to order lifecycle, dispense, MAR write paths, or medication search.
- No automatic creation of verification/waste rows on administration.

## Rollback considerations

- **Dev:** `prisma migrate reset` or revert migration folder and reset DB (destructive).
- **Deployed environments:** use `prisma migrate deploy` forward only after review; dropping tables loses governance audit history. Prefer forward-fix migrations over editing applied migration SQL.
- Removing models after data exists requires a coordinated data export and migration plan.

## Verification

```bash
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api exec prisma generate
pnpm --filter @medora/api test -- medication-safety
```

Tests: `apps/api/src/medication-safety/mar-emar-schema-foundation.spec.ts`
