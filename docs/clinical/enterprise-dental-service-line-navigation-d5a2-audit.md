# MEDUI.D5A.2 — Audit: Enterprise Dental service line and navigation

**Certification id:** `MEDUI.D5A.2`  
**Branch:** `d5a2-enterprise-dental-service-line-navigation`  
**Base:** `origin/main` @ `5e7cc19e5` (D5A.1 + D4C.7J merged)  
**Phase:** Phase 1 Clinic MVP  

---

## Current architecture (pre-implementation)

| Concern | Authority | Path |
|---------|-----------|------|
| Service lines | `MedoraServiceLine` + `facility.serviceLinesJson` | `facilityTypeRegistry.ts`, Prisma `Facility` |
| Care profile | `facilityCareProfileJson` | `facilityClinicCareProfileD4c1.ts` |
| Navigation areas | `NavigationArea` + sidebar | `navigationAuthorization.ts`, `sidebarNavConfig.ts` |
| Care-setting gates | `FACILITY_CARE_SETTING_ROUTE_GATES` | `clinicWorkspaceCapabilityNavigationD4c2a.ts` |
| Clinic parallel | `/app/clinic-care` + `CLINIC_CARE` | Clinic Care shell |
| Capabilities | Profession ∩ facility modules (no `RequireCapability` decorator) | D4C.1 / D4C.2A pattern |
| Facility identity | D4C.7I operational address / print | Unchanged |

Dental was **reserved** in D4C.7I / D5A.1 (`D5A_FUTURE_DENTAL_SERVICE_LINES`) but **not** in the live `MedoraServiceLine` registry until D5A.2.

## Reuse opportunities

- Extend `MedoraServiceLine` with `DENTAL` (no new facility type)
- Add `NavigationArea.DENTAL_CARE` parallel to Clinic / ED / Hospital
- Derive `dentalCareEnabled` in `FacilityModuleCapabilitiesD4c1`
- Persist specialties in additive `facilityCareProfileJson.dentalSpecialties`
- Mirror Clinic Care shell + route-gate pattern for `/app/dental`
- Server guard patterned on `ClinicCareReadAccessGuard`

## Duplicate risks (prevented)

| Forbidden | Status |
|-----------|--------|
| DentalPatient / OrthodonticPatient | Not introduced |
| DentalAppointment / DentalEncounter | Not introduced |
| DentalOrder / DentalPrescription / DentalBillingEngine | Not introduced |
| DentalFacilityAddress | Not introduced (D4C.7I) |
| Inpatient bed/census semantics | Not introduced |
| Odontogram / OrthodonticCase persistence | Deferred (D5A.4 / D5A.7) |

## Missing extension points filled by D5A.2

1. `DENTAL` in registry + Zod + admin checkboxes  
2. `DENTAL_CARE` nav area + sidebar item (`nav.dentalCare` → Soins dentaires)  
3. `dentalCareEnabled` capability + route gate `/app/dental`  
4. Capability codes (`DENTAL_VIEW`, …) with profession∩facility derivation  
5. Specialty config (`GENERAL_DENTISTRY` … `ORAL_MEDICINE`)  
6. Dashboard + Active Workspace **shells only**  
7. Server `DentalCareReadAccessGuard`  

## Package manager

npm workspaces (`package-lock.json`).
