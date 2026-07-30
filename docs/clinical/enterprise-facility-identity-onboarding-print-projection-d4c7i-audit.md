# MEDUI.D4C.7I — Audit: enterprise facility identity, onboarding address/contact, print projection

**Certification ID:** `MEDUI.D4C.7I`  
**Branch:** `d4c7i-enterprise-facility-identity-onboarding-print-projection`  
**Base:** `origin/main` @ `216c9a1218b7c0b5ca45cdc07b531b0f5a016a2d` (includes D4C.7H via PR #81)  
**Package manager:** npm workspaces  
**Date:** 2026-07-29  

## Git verification (recorded)

```
git fetch origin
git branch --show-current
# d4c7i-enterprise-facility-identity-onboarding-print-projection

git rev-parse HEAD
# 216c9a1218b7c0b5ca45cdc07b531b0f5a016a2d

git rev-parse origin/main
# 216c9a1218b7c0b5ca45cdc07b531b0f5a016a2d
```

Working tree created from updated `origin/main` with D4C.7H merged.  
**DO NOT COMMIT / PUSH / MERGE** (milestone policy).

---

## Production requirement

Add Facility onboarding captured name / language / type / service lines / billing workflow but **not** operational address and contact required for letterhead on:

- prescriptions, discharge instructions, laboratory / imaging reports  
- referrals, billing documents, consent forms, letters, patient statements  

---

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Facility name / country / timezone | `Facility` Prisma scalars | ✔ | ✔ (create uses operational country) | ✔ |
| Operational / print identity | `Facility.facilityCareProfileJson` (D4C.1) | ✔ | ✔ (phoneSecondary, fax, email, website, legalName) | ✔ |
| Billing claim identity | `Facility.billingLegalName`, billing address columns | ✔ | — (claim/UB; not letterhead) | ✔ (kept separate) |
| Facility print projection | `projectFacilityPrintIdentity` + D4C.7I enterprise projection | ✔ | ✔ | ✔ |
| Rx print header | `RxPrintLayout` / `buildRxPrintFacilityIdentity` | ✔ | ✔ (fax from profile) | ✔ |
| Discharge header | `DischargePrintLayout` + ED/Clinic print callers | ✔ | ✔ | ✔ |
| Lab / radiology result headers | `resultPrintPacket` via `PrintFacilityInfo` | ✔ | ✔ (wired from workspace callers) | ✔ |
| Service-line registry | `facilityTypeRegistry` / `MedoraServiceLine` | ✔ | ✔ (D5A dental tokens reserved only) | ✔ |

**Forbidden forks not created:** `ClinicFacilityAddress`, `PrescriptionFacilityAddress`, `DentalFacilityAddress`, `HospitalFacilityPhone`.

---

## Existing schema fields (authoritative)

| Field | Location | Role |
|---|---|---|
| `Facility.name` | Prisma | Display / operational name |
| `Facility.country` | Prisma | Jurisdiction / international |
| `Facility.timezone` | Prisma | Clinical clock |
| `Facility.facilityCareProfileJson` | Prisma JSON | Care profile + **operational address / print identity** |
| `Facility.billingLegalName`, address*, `billingNpi`, … | Prisma | Billing / claim identity (separate) |

**Migration decision:** canonical operational identity already lives in `facilityCareProfileJson` → **no Prisma migration** (extend JSON shape only).

---

## Existing JSON fields (`facilityCareProfileJson`)

Pre-D4C.7I (D4C.1): `schemaVersion`, care profile / ambulatory mode / subtype, `optionalModules`, `address` (`line1`, `line2`, `city`, `stateProvince`, `postalCode`, `country`, `phone`), `printDisplayName`.

**D4C.7I extensions (additive, null-safe):**

- `legalName`
- `address.phoneSecondary`, `address.fax`, `address.email`, `address.website`

---

## Duplicate identity findings

| Finding | Resolution |
|---|---|
| Billing address columns vs operational address | Keep both; letterhead uses operational / care profile; billing remains claim identity |
| Hard-coded create `country: "Haiti"` | Replaced by operational / DTO country with Haiti default only when omitted |
| Onboarding DTO already accepted `operationalAddress` but UI did not send it | Add Facility form now captures and posts operational identity |
| Print surfaces used facility **name** only | Wired through `printFacilityInfoFromEnterpriseSource` / `buildRxPrintFacilityIdentity` |
| Session-selected facility vs document facility | `resolveDocumentFacilityIdentitySource` + session catalog (`UserFacilityOption.careProfileJson`) for Rx/historical preference |

---

## Print surfaces consuming facility identity

| Surface | Pre-7I | Post-7I |
|---|---|---|
| Outpatient Rx | Name + partial address (D4C.7H) | Full enterprise projection incl. fax |
| Pharmacy worklist Rx | Session care profile | Prefer `order.facilityId` catalog row |
| Clinic ambulatory Rx | Care profile | Unchanged path + identity fields |
| Discharge (encounter / Clinic / ED) | Often name-only | Enterprise `PrintFacilityInfo` |
| Lab / imaging result print | Name optional | Callers pass enterprise `facility` |
| Billing documents | Billing columns | Unchanged claim identity (defer letterhead merge) |
| Referrals / consent / letters | Sparse / name | Same header helper available; full surface wiring deferred where no print pack exists |

---

## Canonical identity authority

**One authority:** `Facility.name` + `Facility.country` + `Facility.facilityCareProfileJson` operational address / print fields, projected by:

`packages/shared/src/auth/enterpriseFacilityIdentityOnboardingPrintProjectionD4c7i.ts`

Billing columns remain fallback for address only when operational address empty (existing D4C.1 behavior).

---

## Service-line extensibility / D5A

Reserved constants (not selectable UI, no schema enum change in 7I):

`DENTAL`, `GENERAL_DENTISTRY`, `ORTHODONTICS`

**Proposed D5A integration point:** add tokens to `MedoraServiceLine` + `facilityTypeRegistry` defaults when Dental chart ships; **reuse** enterprise facility identity — do **not** create `DentalFacilityAddress`.

---

## Migration / seed STOP gate

- Schema fields exist in JSON → **no migration**  
- **No seed changes**  
- If a future milestone requires first-class columns, STOP and propose: nullability, normalization, careProfileJson backfill, Clinic/Hospital/ED/Pharmacy/Dental/print impact, rollback
