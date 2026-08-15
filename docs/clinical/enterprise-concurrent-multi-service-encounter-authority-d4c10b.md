# MEDUI.D4C.10B — Enterprise Concurrent Multi-Service Encounter Policy

**Certification:** MEDUI.D4C.10B  
**Authority:** `evaluateConcurrentEncounterCreate` (extended) + D4C.10A `Encounter.serviceLine`

---

## Principle

OPEN/CLOSED belongs to the Encounter. Distinct known service lines may coexist. Duplicates are prevented by service + operational episode (appointment / unbound retry), not by blocking the Patient.

---

## Decision codes

| Code | Meaning |
|------|---------|
| `OK` | No open conflicts |
| `ALLOW_DISTINCT_SERVICE_LINE` | Distinct known service lines |
| `IDEMPOTENT_REUSE` | Same service + same episode → return existing |
| `ALLOW_ED_PLUS_INPATIENT` | Hospital (preserved) |
| `DUPLICATE_ACTIVE_SERVICE_ENCOUNTER` | Ambiguous / compatible active context |
| `DUPLICATE_INPATIENT` | Uncorrelated IP (preserved) |

---

## Callers wired

- `EncountersService.create`
- `AppointmentsService.checkIn` / `createWalkIn`

Dental UI: reuse path navigates to existing; conflict shows “Ouvrir la rencontre” without asking to close Clinic.

---

## Explicit non-goals

No migration (D4C.10A field). No DentalEncounter. No billing/lifecycle forks.
