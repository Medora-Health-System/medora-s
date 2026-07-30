# MEDUI.D4C.7I — Enterprise facility identity, onboarding, and document-header projection

**Certification ID:** `MEDUI.D4C.7I`  
**Branch:** `d4c7i-enterprise-facility-identity-onboarding-print-projection`  
**Package manager:** npm workspaces  

## Summary

Medora now captures **international facility address and contact** during Add Facility and Facility Admin edit, stores them on the **enterprise** `facilityCareProfileJson` operational identity (no Clinic* forks, no Prisma migration), and projects that identity into Rx, discharge, and laboratory/radiology print headers. Historical / document prints prefer the **document’s facilityId** over an unrelated browser-selected facility when both are known.

## Canonical authority

| Layer | Module |
|---|---|
| Shared projection + validation | `packages/shared/src/auth/enterpriseFacilityIdentityOnboardingPrintProjectionD4c7i.ts` |
| Care profile address shape | `packages/shared/src/auth/facilityClinicCareProfileD4c1.ts` |
| Zod create / service-config | `packages/shared/src/schemas/facilities.ts` |
| Web print helper | `apps/web/src/lib/printFacilityHeader.ts` |
| Rx print | `apps/web/src/components/pharmacy/RxPrintLayout.tsx` |

## Onboarding — FACILITY ADDRESS AND CONTACT

Required: country, address line 1, city/commune, phone (+ facility name).  
Optional: line 2, state/department/province, postal code, secondary phone, fax, email, website, legal name, print display name.

French labels via `facilityIdentityD4c7i.*` (Pays, Adresse, Ville / commune, Téléphone, …).

## Edit facility

`FacilityOperationalIdentityModal` → `PATCH /admin/facilities/:id/service-config` with operational address fields. Authorization: platform principal **or** facility `ADMIN` (`assertCanManageFacilityBilling`). Audit: `FACILITY_CARE_PROFILE_UPDATED` with `operationalIdentityUpdated`.

## International address

- No US-only required state / ZIP / NPI for operational identity.  
- Haiti: commune + département optional region; postal optional; phones like `+509 …` accepted.  
- US: state / ZIP optional extras when provided.  
- Country-aware city/region i18n keys.

## Document projection

- `printFacilityInfoFromEnterpriseSource` / `projectEnterpriseFacilityIdentity`  
- `resolveDocumentFacilityIdentitySource` + session `UserFacilityOption.careProfileJson` catalog  
- Wired: Clinic discharge, ED closure / packet, encounter discharge, Clinic/ED/encounter results (lab/rad), pharmacy Rx by `order.facilityId`

## Service lines / Dental

`D5A_FUTURE_DENTAL_SERVICE_LINES` reserved. Dental chart **not** implemented in D4C.7I. Integration point: `facilityTypeRegistry` / `MedoraServiceLine` in D5A.

## Migration / seed

- **No migration** (JSON extension)  
- **No seed changes**

## Deferrals

1. Full letterhead merge into every billing invoice PDF / referral / consent pack where no print pack exists yet.  
2. Immutable snapshot of facility identity at document sign time (Order still scoped by `facilityId`; print uses current care profile for that facility).  
3. Selectable Dental service lines in admin UI (D5A).  
4. First-class Prisma columns for address (not required; JSON sufficient).
