# MEDUI.D4C.5B.3 — Haiti ambulatory evaluation simplification, medication/MAR reconciliation, Rx separation, diagnostic order completion

## Purpose

Correct Haiti ambulatory Clinic workspace presentation and classification:

- Lightweight Evaluation (`SIMPLE_CLINIC_INTAKE`) — no ED triage chrome
- Facility-administered meds → enterprise MAR
- Rx = take-home / external prescriptions only
- French display helpers (stored enums unchanged)
- Capability-governed result completion messaging
- No duplicate engines; no global U.S. ED regression

## Jurisdiction

`Facility.country` via `isHaitiPublicHealthJurisdiction` only. Locale ≠ jurisdiction.

## Tile order

Eval → Med Eval → Ordonnances → Médicaments → Résultats → Diagnostics → Données cliniques → Infirmier/MA → Notes → **Rx** → Suivi/sortie → Résumé

## Key contracts

- `packages/shared/src/auth/clinicCareHaitiAmbulatoryOrdersMedicationsResultsD4c5b3.ts`
- Discriminator: `OrderItem.medicationFulfillmentIntent`
- Haiti Orders medication mode: `haitiAmbulatoryOrdersMedicationMode` → `ER_ADMINISTER_ONLY`
- Rx panel: `ClinicCareAmbulatoryPrescriptionPanel` + `filterAmbulatoryExternalPrescriptionOrders` + print gate

## Explicit non-goals

- No ClinicMAR / ClinicPrescription / ClinicLabResult / ClinicRadiologyResult
- No Prisma migration
- No silent production flip of `Facility.allowRnLabResultSubmission`

## Related

- Audit: `docs/clinical/haiti-ambulatory-orders-medications-results-correction-d4c5b3-audit.md`
- Certification: `docs/certification/MEDUI.D4C.5B.3-certification.md`
