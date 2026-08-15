# MEDUI.D4C.10A — Enterprise Encounter Service-Line Provenance

**Certification ID:** MEDUI.D4C.10A  
**Companion audit:** `enterprise-encounter-service-line-provenance-d4c10a-audit.md`

---

## Purpose

Establish trustworthy, first-class `Encounter.serviceLine` provenance for concurrency (D4C.10), billing, reporting, audit, and Patient Medical Record — without Dental-specific columns or parallel encounter models.

---

## Contract

```
ONE PATIENT · ONE FACILITY · MANY SERVICE LINES
Encounter.serviceLine ∈ MedoraServiceLine (nullable legacy)
OPEN/CLOSED remains Encounter status
Billing remains encounterId-bounded
```

---

## Shared authority

Module: `packages/shared/src/encounters/enterpriseEncounterServiceLineProvenanceD4c10a.ts`

| Helper | Use |
|--------|-----|
| `resolveAuthoritativeEncounterServiceLine` | Server create resolution |
| `assertEncounterServiceLineEnabledForFacility` | Facility/capability gate |
| `normalizePersistedEncounterServiceLine` | Read normalize |
| `serviceLinesMatchForConcurrency` | D4C.10 prep (null ≠ CLINIC) |
| `inferDeterministicHistoricalServiceLine` | Backfill / docs only |

---

## API

- `EncounterCreateDto.serviceLine` optional hint; server resolves + validates.
- Client cannot invent unknown tokens; incompatible type/line → `SERVICE_LINE_TYPE_MISMATCH`.
- Disabled line → `SERVICE_LINE_NOT_ENABLED` (with module-capability bridge for legacy incomplete `serviceLinesJson`).
- Dental create stamps `serviceLine=DENTAL` and merges dental tag in the same create write.
- Historical encounters remain readable when a service line is later disabled.

---

## Billing / reporting / PMR / audit

| Area | Behavior |
|------|----------|
| Billing | Field available on encounter selects; **no** workflow auto-change; no CDT; no engine fork |
| Reporting | Group by `facilityId` + `serviceLine` + `encounterId` |
| D4C.8 index | Projects `serviceLine` when present; two OUTPATIENT rows with different lines stay distinct |
| Audit | `ENCOUNTER_CREATE` metadata includes `serviceLine` + source |

---

## Migration

Folder: `20261109120000_d4c10a_enterprise_encounter_service_line_provenance`  
Additive column + index + deterministic UPDATEs only.  
**Do not deploy / do not `db push` in this milestone without explicit ops approval.**

---

## Explicit non-goals (this milestone)

- Full D4C.10 concurrent multi-service create policy
- `DentalEncounter` / patient forks
- Fabricating CLINIC for all historical OUTPATIENT
