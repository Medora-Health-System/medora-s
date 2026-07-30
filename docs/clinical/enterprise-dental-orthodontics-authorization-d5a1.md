# MEDUI.D5A.1 — Authorization & capability proposal (Dental)

**Status:** Proposal only — **no RoleCode / capability persistence changes in D5A.1**.

## Existing roles (Prisma `RoleCode`)

`ADMIN` · `PROVIDER` · `RN` · `FRONT_DESK` · `LAB` · `RADIOLOGY` · `PHARMACY` · `BILLING` · `MEDORA_SUPER_ADMIN` · medication governance roles · `PATIENT_CARE_TECH`

**Finding:** Existing `PROVIDER` + department/service-line scoping may cover early dentists if capabilities are added. Dedicated `DENTIST` / `ORTHODONTIST` / `DENTAL_HYGIENIST` RoleCodes are **optional** and should not be auto-added in D5A.1.

## Proposed capabilities (conceptual)

| Capability | Intent |
|---|---|
| `DENTAL_VIEW` | Open Dental Care workspace |
| `DENTAL_DOCUMENT` | Clinical notes / exam documentation |
| `DENTAL_TREATMENT_PLAN` | Create/edit draft plans |
| `DENTAL_PROCEDURE_PERFORM` | Document performed procedures |
| `ODONTOGRAM_EDIT` | Tooth findings |
| `PERIODONTAL_CHART_EDIT` | Periodontal measurements |
| `ORTHODONTIC_CASE_MANAGE` | Case lifecycle |
| `ORTHODONTIC_PLAN_SIGN` | Accept/sign ortho plans |
| `DENTAL_IMAGE_UPLOAD` | Photos / dental images |
| `DENTAL_CONSENT_MANAGE` | Dental consent workflows |
| `DENTAL_BILLING_VIEW` | Estimates / dental billing UI |
| `DENTAL_ADMIN` | Templates, schedules, service config |

All enforcement: **server-side**. UI mirrors only.

## Responsibility matrix (proposed)

| Actor | May | Must not (default) |
|---|---|---|
| Dentist / Orthodontist / Oral surgeon (as PROVIDER + caps) | Assess, diagnose, odontogram, plans, procedures, Rx if `canPrescribe` | Auto-Rx merely from Dental access |
| Hygienist | Hygiene/perio per scope; delegated procedures | Independent ortho plan signature |
| Assistant | Delegated intake/imaging support | Diagnosis / plan sign |
| Front desk | Registration, appointments, checkout | Clinical finding edit |
| Billing | Estimates, charges, plans, claims | Clinical authorship |
| Admin | Users, schedules, templates, service lines | Automatic clinical authority |

## Prescription

Reuse enterprise outpatient Rx. Require existing prescribe gate (`PROVIDER`/`ADMIN` today) **plus** facility policy. Controlled-substance policy unchanged. Facility identity on print: D4C.7I.

## Pediatric / guardian

Reuse Patient emergency contact + `EnterpriseDocumentSignature` (`signerType`, `relationship`). Do **not** create `DentalGuardian`. Structured legal-guardian entity may be enterprise-wide later — not Dental-only.

## Cross-specialty access

Medical providers see clinically relevant dental summaries per policy; dental users see allergies / meds / PMH needed for safety. No broad break-glass by default.

## Navigation

Capability + `DENTAL` service line → Dental Care nav item (French: Soins dentaires). Parallel to Clinic Care; no bed board route.
