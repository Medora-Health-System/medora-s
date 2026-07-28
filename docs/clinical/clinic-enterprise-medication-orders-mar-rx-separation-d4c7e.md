# MEDUI.D4C.7E — Clinic enterprise medication orders, MAR, and outpatient Rx separation

## Purpose

Restore enterprise medication architecture for Clinic Care:

1. **Facility medication orders** (Orders tile) → enterprise Order → Pharmacy policy → enterprise MAR
2. **Outpatient prescriptions** (Ordonnance Rx tile) → independent Rx path → print / external pharmacy destination
3. **Home medication history** remains recon-only (no order, no Rx, no MAR)

## Canonical discriminator

`OrderItem.medicationFulfillmentIntent`

| Product intent | Stored value |
|----------------|--------------|
| Facility administration | `ADMINISTER_CHART` |
| Outpatient prescription | `PHARMACY_DISPENSE` |
| Home medication history | recon / chart-cert category (not fulfillment) |

No `ClinicMedicationOrder`, `ClinicMAR`, or `ClinicPrescription`.

## Clinic ambulatory Orders mode (D4C.7E)

`clinicAmbulatoryFacilityMedicationOrderMode({ ambulatoryCareSetting: true })` → `ER_ADMINISTER_ONLY`

Applies for **all** Clinic ambulatory workspaces (extends Haiti-only D4C.5B.3 default). ED/Hospital unchanged when not using Clinic ambulatory mounts.

## Print correction

Root cause: post-save success UI cleared `formData.items` and nullified `rxIntentDisplayItems`, so `printRx` rendered header + empty table.

Fix:

- Snapshot medication lines before clear
- Prefer persisted `createdOrder.items` when present
- `validateOutpatientPrescriptionPrintProjection` blocks zero-line and facility-only prints
- `printRx` refuses empty `items`

## External pharmacy board

Destination selection for take-home Rx only. Honest status when no e-prescribing connector: `UNSENT_NO_CONNECTOR` / `SELECTED_MANUAL`. Not the internal Pharmacy worklist.

## Related

- Audit: `docs/clinical/clinic-enterprise-medication-orders-mar-rx-separation-d4c7e-audit.md`
- Certification: `docs/certification/MEDUI.D4C.7E-certification.md`
- Prior: D4C.5B.3, D4C.7D
