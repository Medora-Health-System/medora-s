# MEDUI.D4C.7G — Certification

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

### Gates passed

- Enterprise MAR authority audited (ED OrderItem → MAR pending / timeline / MedicationAdministration)
- Clinic facility orders use same create/materialization as ED (`OrdersService.create`, `ADMINISTER_CHART`)
- Clinic Médicaments no longer blank when Haiti timeline hidden — OrderItem pending MAR fallback
- Pure outpatient Rx mode (`OUTPATIENT_RX_ONLY`) — medication-only; no administer destination
- Pilot/facility-scope blockers skipped for pure `PHARMACY_DISPENSE` Rx only
- No ClinicMedicationAdministration / ClinicMAR / ClinicPrescription
- French i18n keys `clinicCareD4c7g.*` mirrored
- No unauthorized migration / seed
- D4C.7E / D4C.7F contracts preserved and extended

### Documented deferrals

| Item | Authority | Why deferred |
|------|-----------|--------------|
| E-prescribing electronic send | External connector | Honest `UNSENT_NO_CONNECTOR` / manual print (D4C.7E) |
| Full inpatient shift-timeline chrome on Haiti ambulatory | Presentation | Intentionally compact OrderItem pending surface; same authority |
| Historical mis-tagged `PHARMACY_DISPENSE` facility lines | Data | New Orders force `ADMINISTER_CHART`; optional backfill not in scope |

## Certification id

`MEDUI.D4C.7G`

## Tests (exact)

| Suite | Counts |
|-------|--------|
| Shared D4C.7G A–G | **7 passed** |
| Shared D4C.7E | **14 passed** |
| Shared D4C.5B.2 | **12 passed** |
| Shared 7F→7D→7C→7B→7A→7→D4C.6 + D4C.5B.3 | **87 passed** |
| Web D4C.7G guards | **7 passed** |
| Web D4C.7E | **6 passed** |
| Web D4C.5B.2 | **12 passed** |
| Web D4C.5B.3 + D4C.7F + MAR policy + marOrderMarManaged | **24 passed** |
| Web MAR K3/K4 | **23 passed** |
| Focused shared 7G+7E+5B.2 | **33 passed** |
| Focused web 7G+7E+5B.2+K3+K4 | **48 passed** |

## Validation

| Check | Result |
|-------|--------|
| `@medora/shared` build | OK |
| `@medora/api` build | OK |
| `@medora/web` build | OK |
| web `tsc --noEmit` | OK |
| `prisma validate` | OK |
| `git diff --check` | OK |
| Migration | none |
| Seed | none |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Orders | EmergencyErOrdersPanel / Order / OrderItem | ✔ | — | ✔ |
| Pharmacy | Worklists / intent filters | ✔ | Pilot skip Rx-only | ✔ |
| MAR | MedicationAdministrationTab / OrderItem filter | ✔ | Ambulatory pending fallback | ✔ |
| Outpatient Rx | CreateOrderModal + RxPrintLayout | ✔ | `OUTPATIENT_RX_ONLY` | ✔ |
| Home medications | Triage / clinical data | ✔ | — | ✔ |
| Intent | medicationFulfillmentIntent | ✔ | D4C.7G helpers | ✔ |

## Phase

Phase 1 Clinic MVP — French product UI via i18n.

## Related

- `docs/clinical/enterprise-mar-authority-clinic-order-rx-d4c7g-audit.md`
- `docs/clinical/enterprise-mar-authority-clinic-order-rx-d4c7g.md`
- `docs/certification/MEDUI.D4C.7E-certification.md`
- `docs/certification/MEDUI.D4C.7F-certification.md`
