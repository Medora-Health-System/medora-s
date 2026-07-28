# MEDUI.D4C.7E — Audit

## 0. Git verification

| Check | Result |
|-------|--------|
| Branch | `d4c7e-clinic-medication-orders-mar-rx-separation` |
| Base | `origin/main` @ `7955b0def` (PR #77 — D4C.7D merged) |
| Creation | `git checkout -B d4c7e-clinic-medication-orders-mar-rx-separation origin/main` |
| Working tree at branch create | clean |
| Package manager | **npm** workspaces (`package-lock.json` / AGENTS.md) |

D4C.7D was on `origin/main` after fetch (`7955b0def`). Uncommitted 7D path not required.

## 1. Production defects (screenshots)

| ID | Evidence | Finding |
|----|----------|---------|
| A | Screenshot 1 (Orders: NaCl + acetaminophen PLACED); Screenshot 4 (Médicaments tile empty/vitals only) | Facility meds in Orders not reliably projected as MAR tasks when intent was `PHARMACY_DISPENSE` / DEFAULT mode |
| B | Screenshot 3 (mixed administer/pharmacy success); Screenshot 8 (NaCl IV + acetaminophen as « Prescription externe ») | Outpatient Rx tile mixed with facility-admin / IV lines |
| C | Screenshot 9 (print header, empty medication table after save) | Success print used cleared form state → zero rows |

Home-med search (screenshots 2, 5) and enterprise MAR (screenshots 6–7) remain reference patterns to reuse — not duplicate.

## 2. Enterprise authorities (canonical)

| Domain | Authority | Clinic reuse |
|--------|-----------|--------------|
| Orders | `Order` / `OrderItem` + `EmergencyErOrdersPanel` / `CreateOrderModal` | ✔ parameterized |
| Pharmacy | Worklists + dispense / verify | ✔ policy filters by intent |
| MAR | `MedicationAdministration` + `MedicationAdministrationTab` | ✔ embedded ambulatory |
| Rx | `PHARMACY_DISPENSE` Order lines + `ClinicCareAmbulatoryPrescriptionPanel` + `RxPrintLayout` | ✔ filter + print gate |
| Home meds | Triage / clinical data recon | ✔ no auto order/Rx/MAR |

## 3. Intent model

Typed enterprise field exists: `MedicationFulfillmentIntent` = `ADMINISTER_CHART` \| `PHARMACY_DISPENSE`.

D4C.7E maps product labels:

- Facility administration → `ADMINISTER_CHART`
- Outpatient prescription → `PHARMACY_DISPENSE`
- Home medication history → separate recon category (not fulfillment)

**No STOP** — schema gap closed by existing enum. No Clinic-only boolean.

## 4. Duplicate-authority audit

Forbidden names asserted in tests: `ClinicMedicationOrder`, `ClinicMAR`, `ClinicPrescription`, `ClinicDrugCatalog`, etc. — none introduced.

## 5. Corrections shipped

1. Clinic ambulatory Orders → always `ER_ADMINISTER_ONLY` (`clinicAmbulatoryFacilityMedicationOrderMode`)
2. Rx filter excludes IV/infusion even if mis-tagged `PHARMACY_DISPENSE`
3. CreateOrderModal snapshots lines before clear; print validates outpatient projection; facility-only hides print
4. `printRx` blocks empty items
5. External pharmacy destination board with honest unsent status
6. Shared + web tests A–N / source guards

## 6. Migration / seed

None. No unauthorized Prisma migration or seed flip.

## 7. Deferrals

| Item | Why |
|------|-----|
| Live e-prescribing send | No connector configured — honest `UNSENT_NO_CONNECTOR` / manual print-fax |
| Full external pharmacy directory geospatial search | Destination free-text + preferred selection MVP; connector/directory expansion later |
| Expanding create-order API response contract docs | Create already returns enriched order; UI prefers `createdOrder.items` when present |

## 8. Builds / tests

Recorded in certification document after validation run.
