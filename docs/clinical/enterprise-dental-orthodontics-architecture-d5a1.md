# MEDUI.D5A.1 — Enterprise Dental Care & Orthodontics architecture

**ID:** `MEDUI.D5A.1`  
**Status:** Architecture audit complete — implementation deferred to D5A.2+.

## One Medora platform

```
Medora
├── Clinic Care
├── Emergency Care
├── Hospital Care
├── Dental Care          ← new configurable workspace (not a fork)
├── Laboratory
├── Radiology / Imaging
├── Pharmacy
├── Billing
├── Public Health
└── Administration
```

Dental Care is a **specialty workspace** over shared Patient / Encounter / Appointment / Orders / Results / Imaging / Rx / Documents / Billing / Follow-up / Audit.

## Non-negotiable reuse

- One patient identity (`Patient`)
- One longitudinal medical **and** dental record
- One appointment authority (`Appointment`)
- One Orders / Results / Imaging / Prescription / Billing / Consent / Audit trail
- No `DentalPatient`, `OrthodonticPatient`, facility-specific product branch

## Facility configuration

**Preferred:**

```
Facility
  └─ serviceLines: [CLINIC, DENTAL, …]
       └─ dental specialties / capabilities:
            GENERAL_DENTISTRY | ORTHODONTICS | …
       └─ role-aware Dental navigation
```

Do **not** require a separate facility record for dental vs medicine.  
Do **not** make `FacilityType` the sole capability source (extend `MedoraServiceLine` in D5A.2).

Facility letterhead: reuse D4C.7I enterprise operational identity (`facilityCareProfileJson`) — no `DentalFacilityAddress`.

## Target workspace map (projections only)

### Dental Care shell

Dashboard · Today’s appointments · Worklist · Providers · Patients · Encounters · Treatment plans · Orthodontic cases · Imaging · Follow-up · Billing · Admin

### Active Dental Workspace

Patient overview · Medical history · Dental history · Odontogram · Periodontal · Oral exam · Diagnoses · Treatment plan · Procedures · Imaging · Prescriptions · Notes · Consents · Follow-up · Summary

### Orthodontic case workspace

Case overview · Assessment · Occlusion · Measurements · Imaging / photos · Treatment plan · Appliances · Progress · Retention · Documents · Financial plan · Summary

## Encounter vs case

| Concept | Authority | Lifecycle |
|---|---|---|
| Visit | `Encounter` (OUTPATIENT) | OPEN → CLOSED |
| Orthodontic treatment | `OrthodonticCase` (proposed D5A.7) | CONSULTATION → … → RETENTION / COMPLETED |
| Link | Encounter → optional OrthodonticCaseId | Many encounters per case |

## Inpatient semantics

Forbidden in routine Dental Care: beds, census, admission/transfer as hospital episode, inpatient discharge.

Allowed: appointment states (waiting, checked in, seated/operatory, in treatment, checkout) + optional chair label.

## Configuration policy

| Tier | Examples |
|---|---|
| 1 Configuration | Service line, specialty, roles/capabilities, templates, appointment types, consents |
| 2 Enterprise extension | Dentition, OrthodonticCase, periodontal measurements (shared models) |
| 3 Facility content | Logos, local instructions, schedules, policies |

**Forbidden:** private patient model, duplicated engines, hard-coded facility workflow, copied Dental app per customer.

## Internationalization

UI: French product language via i18n; English message parity. Proposed keys include Soins dentaires, Odontogramme, Cas orthodontiques, …  
Enums store codes; UI maps labels. Authored clinical text preserves locale.

## Offline / Haiti

Lightweight worklists; draft recovery; upload retry; no false “saved”; odontogram **not** browser-only authority (D5A.12 hardening).

## Security

Facility-scoped access; authorize image URLs; guardian/minor consent; dental photos sensitive; server-side capabilities; audit all clinical mutations.

## Cephalometrics

D5A early: upload + report association. Native landmark tracing / SNA–SNB engine: **future** (document requirements only in D5A.1).

## Next

See roadmap (`enterprise-dental-orthodontics-roadmap-d5a.md`). D5A.2 = service line, capabilities, navigation — still no odontogram persistence.
