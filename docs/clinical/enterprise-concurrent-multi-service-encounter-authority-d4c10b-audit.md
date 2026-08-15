# MEDUI.D4C.10B — Audit: Concurrent Multi-Service Encounter Policy

**Branch:** `d4c10a-enterprise-encounter-service-line-provenance` (same PR as D4C.10A)  
**Depends on:** D4C.10A `Encounter.serviceLine` (applied locally)

---

## Old global blocker root cause

1. `EncountersService.create` — hard `findFirst` any OPEN → 400  
2. `evaluateConcurrentEncounterCreate` GENERAL_CREATE — any OPEN → `OPEN_ENCOUNTER_EXISTS`  
3. Appointments check-in / walk-in — same global open check  

UI mapped that to “close the consultation first,” blocking Clinic + Dental.

---

## Registration-only finding

Patient registration creates **Patient** only. Clinical OPEN encounters come from walk-in, check-in, ED create, or Dental start. A freshly registered patient with no OPEN rows → Dental ALLOW (`OK`).

---

## Null legacy rule (documented)

| Existing | Requested | Decision |
|----------|-----------|----------|
| Known distinct `serviceLine` | Other known line | ALLOW |
| Known same `serviceLine` + same episode | Same | IDEMPOTENT_REUSE |
| Known same line + different `appointmentId` | Same | ALLOW (parallel episode) |
| `serviceLine` null + OUTPATIENT | DENTAL / EMERGENCY | ALLOW (null ≠ Dental) |
| `serviceLine` null + OUTPATIENT | CLINIC / URGENT_CARE | DUPLICATE_ACTIVE_SERVICE_ENCOUNTER (conservative) |

Never invent CLINIC for null.

---

## Hospital non-regression

DIRECT_ADMISSION / PLACEMENT / NURSE_ADMISSION_INTAKE unchanged: ED+IP allow, uncorrelated IP block, correlation reuse.
