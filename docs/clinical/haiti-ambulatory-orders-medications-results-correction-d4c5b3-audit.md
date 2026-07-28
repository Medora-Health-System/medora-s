# MEDUI.D4C.5B.3 — Haiti ambulatory orders / medications / results correction (audit)

## Git verification

| Check | Result |
|-------|--------|
| Branch | `d4c5b3-haiti-ambulatory-orders-medications-results-correction` |
| Working tree at start | Clean |
| `origin/main` | At merge of D4C.5B.2 (#72); D4C.5B.1, D4C.6, D4C.5B merged |
| Unrelated dirty changes | None |

## STOP gates

| Gate | Result |
|------|--------|
| ClinicMAR / ClinicMedicationOrder / ClinicPrescription / ClinicLabResult / ClinicRadiologyResult | **Not proposed** |
| Duplicate medication/MAR/result/order authorities | **None** — reuse enterprise Order / MAR / Result |
| Global U.S. ED behavior change | **Avoided** — Haiti ambulatory presentation + Orders medication mode only |
| Missing Rx vs onsite discriminator | **Exists** — `OrderItem.medicationFulfillmentIntent` (`ADMINISTER_CHART` \| `PHARMACY_DISPENSE`) |
| Seed / capability silent grant | **STOP documented** — `Facility.allowRnLabResultSubmission` remains facility-admin/seed; D4C.5B.3 does not flip production defaults |

## Discriminator audit

| Field | Model | Onsite MAR | External Rx |
|-------|-------|------------|-------------|
| `medicationFulfillmentIntent` | `OrderItem` | `ADMINISTER_CHART` (legacy empty → chart-admin) | `PHARMACY_DISPENSE` |

No Clinic-only field invented.

## Manual incident mapping

| Incident | Fix |
|----------|-----|
| A. ED evaluation chrome | `presentationMode=SIMPLE_CLINIC_INTAKE` for Haiti ambulatory; hide ESI/trauma/sepsis/stroke/safety/travel/preferred pharmacy; teal title; no red triage border; do not persist hidden ESI/sepsis/stroke/trauma defaults |
| B. Meds in Orders not MAR | Haiti ambulatory Orders → `ER_ADMINISTER_ONLY` default; MAR pending filter excludes `PHARMACY_DISPENSE` |
| C. English med instructions | Display-layer French route/form/status/sig helpers |
| D. Rx mixes lab/IV | Rx tile filters MEDICATION + `PHARMACY_DISPENSE` only |
| E. Result-entry auth | Exact denial keys for role vs facility policy; RN lab seed STOP reported |

## Result capability matrix (documented — not silently seeded)

| Role | Collect | Enter | Verify | Finalize | Ack |
|------|---------|-------|--------|----------|-----|
| Provider | — | — | ✔ | — | ✔ |
| RN | ✔ | LAB if `allowRnLabResultSubmission` | — | — | ✔ |
| Lab Tech | ✔ | ✔ | ✔ | ✔ | — |
| Rad Tech | receive | ✔ | — | ✔ | — |
| Radiologist | — | — | ✔ | ✔ | ✔ |
| Admin | ✔ | ✔ | ✔ | ✔ | ✔ |
| Front Desk | — | — | — | — | — |

## Vasopressor / acetaminophen

Soft safety + advanced class mapping suppress false vasopressor alerts when the medication is acetaminophen/paracetamol without a real pressor token.

## Enterprise domain audit

| Domain | Existing | Reused | Extended | Duplicate prevented |
|--------|----------|--------|----------|---------------------|
| Orders | Order / OrderItem | ✔ | classification helpers | ✔ |
| MAR | MedicationAdministrationTab | ✔ | intent filter | ✔ |
| Rx print | getRxPrintHtml | ✔ | Rx tile gate | ✔ |
| Results | results.service | ✔ | denial message keys | ✔ |
| Intake | EmergencyTriagePanel | ✔ | presentationMode | ✔ |
| Jurisdiction | isHaitiPublicHealthJurisdiction | ✔ | — | ✔ |
