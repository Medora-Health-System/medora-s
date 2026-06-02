# MAR / eMAR — Audit & Legal Chart Design (M1.3F)

**Phase:** M1.3F (audit + design only)  
**Date:** 2026-05-31  

---

## Part 9 — Audit events

Existing `AuditAction` enum is **generic** (`CREATE`, `UPDATE`, `ORDER_CREATE`, `MEDICATION_DISPENSED`, …). M1.3F proposes **medication-specific actions** (string codes in metadata or enum extension in M1.3F.8).

### Event catalog

| Event | Actor | Metadata (PHI-safe) | Legal chart | Correction policy |
|-------|-------|----------------------|-------------|-------------------|
| `MEDICATION_ADMINISTRATION_SCHEDULED` | System | `orderItemId`, `facilityId`, `dueAt[]` | Due list export | Reschedule audit |
| `MEDICATION_ADMINISTRATION_STARTED` | RN | `orderItemId`, `encounterId`, `infusionPhase?` | MAR + timeline | Append-only |
| `MEDICATION_ADMINISTERED` | RN | `administrationId`, `orderItemId`, `marAction`, `route`, `doseValue`, `doseUnit`, `conceptCode?`, `productCode?` | MAR row + chart export | Effective-time correction only; no delete |
| `MEDICATION_HELD` | RN | `orderItemId`, `holdReasonCode`, `untilAt?` | Held entry | Release documented |
| `MEDICATION_REFUSED` | RN | `orderItemId`, `refusalReasonCode` | Refusal entry | Amend reason via new audit |
| `MEDICATION_MISSED` | RN / system | `orderItemId`, `missedReasonCode`, `scheduledDueAt` | Missed entry | Late admin = new ADMINISTERED |
| `MEDICATION_WASTED` | RN | `administrationId`, `wasteAmount`, `wasteUnit` | Waste doc | Append correction note |
| `MEDICATION_WASTE_WITNESSED` | Witness RN | `wasteEventId`, `witnessUserId` | Witness line | No delete |
| `MEDICATION_OVERRIDE_USED` | RN | `orderItemId`, `overrideReasonCode`, `governanceDomain` | Override EDOC | Supervisor review queue |
| `HIGH_ALERT_DOUBLE_CHECK_COMPLETED` | RN (2nd) | `orderItemId`, `checkerUserId`, `highAlertClass` | EDOC verification | Immutable |
| `CONTROLLED_SUBSTSTANCE_WASTE_RECORDED` | RN | `schedule`, `wasteQty`, `catalogCode?` | Waste + controlled audit | Inventory adjust separate |
| `LASA_WARNING_ACKNOWLEDGED` | RN | `lasaGroupCode`, `lasaSeverity`, `orderItemId` | Ack in chart | Re-ack on change |
| `PHARMACY_VERIFICATION_COMPLETED` | Pharmacist | `orderItemId`, `verifyType`, `override?` | Verify stamp | Re-verify audit |
| `MAR_ENTRY_CORRECTED` | RN / supervisor | `administrationId`, `field`, `version`, `reason` | Shows corrected effective time | Version increment (exists pattern) |
| `EMAR_SCAN_OVERRIDE` | RN | `scanType`, `overrideReason`, `orderItemId` | BCMA override log | Enterprise only |

### PHI-safe metadata rules

- **Include:** facilityId, encounterId, orderItemId, administrationId, userId, role codes, catalog/product codes, enums, timestamps, reason codes.
- **Exclude:** patient name, MRN, free-text clinical narrative (use entry id reference).
- Pattern: follow `audit-metadata-summary.util.ts` (S18).

### Legal chart visibility

| Source | Included in chart export today | M1.3F target |
|--------|----------------------------------|--------------|
| `MedicationAdministration` rows | Yes (`chart-export.service`) | + governance flags summary |
| `AuditLog` timeline | Yes (mapped) | + new med-specific actions |
| EDOC entries | Yes (clinical documentation section) | + cross-ref MAR ids |
| Pharmacy dispense | Yes (domain pharmacy.encounterDispenses) | + verify record |

### Correction policy principles

1. **Never delete** `MedicationAdministration` rows — append correction via `effectiveAdministeredAt` + version (existing).
2. **Never hard-delete** EDOC entries — amend/addendum pattern only.
3. **Overrides** always pair reason + user + timestamp.
4. **Witness events** immutable once signed.

---

## Alignment with existing audit

| Existing | M1.3F relationship |
|----------|-------------------|
| `ORDER_CREATE` / `ORDER_CANCEL` | Keep; map to ORDERED / CANCELLED |
| `MEDICATION_DISPENSED` | Keep for pharmacy dispense |
| `ENCOUNTER_CLINICAL_DOCUMENTATION_*` | Keep for EDOC |
| `MEDICATION_MAR_ENABLED_AUDIT` | Product activation only |

Enum extension vs metadata `subAction` — **decision deferred to M1.3F.8** (prefer explicit enum values for reporting).
