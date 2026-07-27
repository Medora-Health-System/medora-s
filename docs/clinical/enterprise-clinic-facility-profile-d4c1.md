# MEDUI.D4C.1 — Clinic / Urgent Care Facility Profile and Care-Setting Foundation

**Date:** 2026-07-27  
**Phase:** MEDUI.D4C.1  
**Architecture:** Medora One Shared Core with independent presentation (ED, Obs, IP, Clinic Care)

---

## Purpose

Establish the **facility profile and ambulatory care-setting foundation** so Clinic / Urgent Care sites can operate as an independent presentation over the shared clinical core — without duplicating patients, encounters, orders, results, medications, billing, identity, or audit engines.

Full Clinic Care shell and colorful trackboard → **MEDUI.D4C.2**.

---

## Facility profile authority

| Profile | Meaning |
|---------|---------|
| `CLINIC` | Ambulatory clinic |
| `URGENT_CARE` | Ambulatory urgent care |
| `CLINIC_AND_URGENT_CARE` | Hybrid ambulatory |
| `FREESTANDING_ER` | Preserved ED freestanding |
| `HOSPITAL` | Preserved inpatient/hospital |
| `OUTSIDE_DIAGNOSTIC` | Outside lab/rad/pharmacy |

Resolved from `Facility.facilityType` + optional `facilityCareProfileJson` + service lines. **Never** silently converts Hospital / FSER / outside facilities to Clinic.

---

## Ambulatory care-setting

- Care setting authority: `AMBULATORY` (shared module — not a new Prisma enum spanning all products).
- Operating modes: `CLINIC` | `URGENT_CARE` | `CLINIC_AND_URGENT_CARE`.
- Subtypes (labels only): primary care clinic, specialty clinic, urgent care center, hybrid.

Maps carefully onto existing D4B.1 / EDOC / billing `ClinicalWorkflowType.AMBULATORY` vocabularies without inventing a parallel engine.

---

## Service lines (config-driven)

New ambulatory tokens (never facility names):

- `CLINIC`
- `URGENT_CARE`

**Defaults (D4C.1):**

| Facility type | Default service lines |
|---------------|----------------------|
| CLINIC | `CLINIC`, `LABORATORY` |
| URGENT_CARE | `URGENT_CARE`, `LABORATORY`, `RADIOLOGY` |

Legacy seed rows that already store `OBSERVATION`+`LABORATORY` are **unchanged** (no silent conversion).

---

## Module capabilities & navigation

- Capabilities: clinic care, urgent care, ED, observation, inpatient, lab, rad, pharmacy, public health, billing, registration.
- Navigation area: `CLINIC_CARE` → `/app/clinic-care` (placeholder in D4C.1).
- Authority: `resolveFacilityNavigation(...)` (server-authoritative; wraps existing profession nav).
- Pure Clinic/UC: **hide ED and Hospital/Obs** unless hybrid service lines enable them.
- URGENT_CARE is ambulatory by default; FSER-style UC only when `EMERGENCY` line is explicitly configured.

---

## Address & print identity

Stored in additive `Facility.facilityCareProfileJson`:

- Operational address (line1/2, city, state/province, postal, country, phone)
- Optional print display name
- Projection: `projectFacilityPrintIdentity` → reuses `printFacilityHeader` shape; falls back to billing address when operational address empty

---

## Role / workspace mapping

| Profession | Clinic Care shell | Trackboard / Today's Visits | Nursing/MA | Provider docs | Registration | Lab | Rad |
|------------|-------------------|-----------------------------|------------|---------------|--------------|-----|-----|
| ADMIN | ✔ | ✔ | ✔ | ✔ | ✔ | if module on | if module on |
| PROVIDER | ✔ | ✔ | ✖ | ✔ | ✖ | if module on | if module on |
| RN | ✔ | ✔ | ✔ (nursing) | ✖ | ✔ | if module on | if role+module |
| FRONT_DESK | ✖ | ✖ | ✖ | ✖ | ✔ | ✖ | ✖ |
| TECHNICIAN | ✔ | ✔ | ✔ **technician-safe projection only** | ✖ | ✖ | if **LAB** role + module | if **RADIOLOGY** role + module |
| PHARMACY / BILLING | module-gated | — | — | — | — | — | — |

### Technician Clinic Care eligibility (MEDUI.D4C.1 correction)

An **authorized technician** at Clinic or Urgent Care may access:

- Clinic Care shell
- shared Clinic trackboard projection (D4C.2 UI deferred)
- Today's Visits projection where shell-authorized
- assigned technician tasks
- technician-safe Nursing / MA operational dashboard projection (vitals, height/weight, rooming, specimen collection, POC tests, ECG tasks, vision/hearing screening, procedure assistance, room prep, supply/equipment, escalation)
- Laboratory when facility enables Lab **and** user is Lab-authorized
- Radiology when facility enables Rad **and** user is Radiology-authorized

Technician remains **denied** (shell visibility never grants these):

- provider documentation / diagnosis authority / problem-list mutation
- provider-order authority / prescribing
- independent nursing-assessment authorship
- unrestricted medication administration
- disposition / encounter-completion authority
- nursing or provider signature authority

Front Desk does **not** gain clinical documentation authority.

**Governance:** facility module eligibility ≠ user authorization; assignment ≠ authorization; projection ≠ source authority.

Reuses D4B.3 technician capability prohibitions; does not invent a parallel tech authority engine. Capability escalation fields from clients are rejected.

---

## Billing defaults

| Profile | Default billing mode |
|---------|---------------------|
| CLINIC | `CLINIC_ONLY` |
| URGENT_CARE / hybrid ambulatory | `URGENT_CARE_ONLY` |
| FSER / Hospital | existing 19UCED modes |

Reuses 19UCED workflow engine.

---

## D4C.2 metric contracts (typed only)

| Id | Mapping basis |
|----|---------------|
| `TODAYS_VISITS` | Facility-local today encounters |
| `WAITING` | `ARRIVED` / `TRIAGE` open |
| `IN_PROGRESS` | `IN_TREATMENT` / `DISPOSITION` open |
| `RESULTS_PENDING` | `RESULTS_PENDING` ± pending diagnostic orders |
| `READY_FOR_DISCHARGE` | `DISCHARGE_READY` / `FINALIZED` open |
| `FOLLOW_UPS_DUE` | Open `FollowUp` due today |

---

## Admin configuration

Create/Edit facility supports: type, care profile, service lines, billing workflow, operational address / print identity, optional modules, language, timezone, **Reset to type defaults**. Writes require platform/admin; audited via `FACILITY_CARE_PROFILE_UPDATED`.

---

## Deferrals

- Full colorful Clinic Care trackboard UI
- Clinic Care menu depth beyond placeholder shell
- Visit status workflow UX redesigns
- Facility-scoped trackboard filters UI

→ **MEDUI.D4C.2 — Clinic Care Shell and Color Clinical Trackboard**
