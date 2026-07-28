# MEDUI.D4C.7E — Certification

## Verdict

**CERTIFIED WITH DOCUMENTED DEFERRALS**

### Gates passed

- Clinic facility medication orders use enterprise Orders (`ER_ADMINISTER_ONLY` for ambulatory Clinic)
- Pharmacy routing follows enterprise intent policy
- Clinic MAR reuses `MedicationAdministrationTab` (not empty wrapper / not ClinicMAR)
- Outpatient Rx creates no MAR task (intent + IV defense filter)
- Facility order does not auto-print as outpatient Rx
- Print projection fixed (snapshot + validation); zero-line print blocked
- No Clinic* medication engines
- French i18n keys mirrored (`clinicCareD4c7e.*`)
- No unauthorized migration / seed
- D4C.7D / D4C.5B.3 contracts preserved and extended

### Documented deferrals

| Item | Authority | Why deferred |
|------|-----------|--------------|
| E-prescribing electronic send | External connector | Not configured — honest unsent/manual status only |
| Full pharmacy directory (geo/fax network) | Future integration | MVP destination selection + print |

## Certification id

`MEDUI.D4C.7E`

## Tests (exact)

| Suite | Counts |
|-------|--------|
| Shared D4C.7E A–N | **14 passed** |
| Shared D4C.5B.3 (IV Rx defense updated) | **10 passed** |
| Shared D4C.7D / 7C / 7B / 7A / 7 / D4C.6 regression | **67 passed** |
| Web D4C.7E source guards | **6 passed** |
| Web D4C.5B.3 mounts | **6 passed** |
| Web D4C.7D lifecycle | **5 passed** |
| **Focused D4C.7E (+ related mounts)** | **20 passed** (14 shared + 6 web) |

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
| Orders | EmergencyErOrdersPanel / Order | ✔ | Clinic ambulatory chart-admin mode | ✔ |
| Pharmacy | Worklists / dispense | ✔ | Intent filters unchanged | ✔ |
| MAR | MedicationAdministrationTab | ✔ | Ambulatory presentation params | ✔ |
| Outpatient Rx | CreateOrderModal + RxPrintLayout | ✔ | Print gate + pharmacy board | ✔ |
| Home medications | Triage / clinical data | ✔ | — | ✔ |
| Intent | medicationFulfillmentIntent | ✔ | D4C.7E helpers | ✔ |

## Phase

Phase 1 Clinic MVP — French product UI via i18n.

## Related

- `docs/clinical/clinic-enterprise-medication-orders-mar-rx-separation-d4c7e.md`
- `docs/clinical/clinic-enterprise-medication-orders-mar-rx-separation-d4c7e-audit.md`
