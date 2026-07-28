# MEDUI.D4C.7D — Enterprise ambulatory encounter lifecycle synchronization (audit)

## Git baseline

| Check | Result |
|-------|--------|
| Branch | `d4c7d-enterprise-ambulatory-encounter-lifecycle-synchronization` |
| Base | `origin/main` @ `770f70037` (PR #76 merged D4C.7B+7C) |
| Working tree at branch creation | Clean |
| D4C.7B / D4C.7C present | Yes (`60a9540e8` ancestor of main) |
| D4C.7A / D4C.7 / D4C.6 / D4C.5B.3 | Present on main |
| Package manager | npm workspaces (`package-lock.json`; AGENTS.md) |

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Encounter status | `Encounter.status` OPEN/CLOSED/CANCELLED | ✔ | ✔ (idempotent close) | ✔ |
| Workflow pathway | `Encounter.workflowState` | ✔ | ✔ (COMPLETE_VISIT → close) | ✔ |
| Legal close | `EncountersService.close` / `executeEncounterClose` | ✔ | ✔ | ✔ |
| Provider docs | `providerDocumentationStatus` DRAFT/SIGNED | ✔ | — | ✔ |
| Discharge summary | `dischargeSummaryJson` + D4C.7 ambulatory discharge UI | ✔ | — | ✔ |
| Ambulatory workspace | Active Clinic Workspace D4C.5B | ✔ | ✔ header + close | ✔ |
| Today's Visits | Clinic Care trackboard projection D4C.2 | ✔ | — (canonical CLOSED) | ✔ |
| Clinical Board KPIs | D4C.5A dashboard | ✔ | — (canonical CLOSED) | ✔ |
| Cache | `getRequestDedupe` + follow-up invalidation | ✔ | ✔ lifecycle helper | ✔ |
| ClinicEncounterStatus | — | — | — | ✔ forbidden |
| closeClinicEncounter | — | — | — | ✔ forbidden |

## Terminology (kept distinct)

| Concept | Authority |
|---------|-----------|
| Documentation signed | `providerDocumentationStatus === SIGNED` |
| Documentation “finalized” (product language) | Same as signed / locked chart |
| Discharge ready | `workflowState ∈ {DISCHARGE_READY, FINALIZED}` while OPEN |
| Discharged (clinical departure stamp) | `dischargedAt` set **on** enterprise close |
| Encounter closed | `Encounter.status === CLOSED` |
| Follow-up open | `FollowUp.status === OPEN` (independent) |
| Billing incomplete | `billingFinalizationStatus` (independent) |

## Production defect (evidence)

Screenshots (2026-07-28):

1. Clinical Board: Visites terminées=0, En attente=1, Avec médecin=1
2. Today's Visits: Jean Paul “Sorties en attente” / “Clôturer la rencontre”; KPI Visites=1 vs 2 rows
3. Active Workspace: meta “Statut FINALIZED”, badge “Ouverte”, docs signed/locked

### Reproduction before fix (code-path)

| Layer | Before COMPLETE_VISIT / sign | After FINALIZED + SIGNED (no close) |
|-------|------------------------------|--------------------------------------|
| DB `status` | OPEN | **OPEN** (required transition missing) |
| DB `workflowState` | DISCHARGE_READY or earlier | FINALIZED |
| DB `providerDocumentationStatus` | DRAFT | SIGNED |
| DB `dischargedAt` | null | **null** |
| Header badge | Ouverte | **Ouverte** |
| Header meta | pathway | **raw FINALIZED** |
| Today's Visits stage | … | DISCHARGE_PENDING (still active) |
| Clinical Board COMPLETED_VISITS | needs `status===CLOSED` | **0** |
| Patient flow | … | WITH_PROVIDER (FINALIZED+OPEN) |

**Root cause (evidence-based):** Ambulatory COMPLETE_VISIT only PATCHed `workflowState → FINALIZED`. Docs sign only set SIGNED. Neither called `POST /encounters/:id/close`. KPIs and “Ouverte” badge read `Encounter.status`. Not a cache-only defect (server never CLOSED). Secondary trap: after SIGNED, workflow buttons were hidden (`isEncounterLocked`), so close UI disappeared.

## Canonical terminal-state policy (answers)

| Question | Answer |
|----------|--------|
| Does discharge summary alone close? | **No** |
| Does docs SIGNED/finalize close? | **No** |
| Must both be complete? | Preferred clinically; close still allowed with deficiency ack per enterprise close |
| Docs after discharge? | Docs may be signed while OPEN; close is separate |
| Discharged while open for docs? | Pathway OPEN + DISCHARGE_READY/FINALIZED = operational “sortie / docs” intermediate; legal `dischargedAt` only on close |
| Leave operational queues when? | `Encounter.status === CLOSED` |
| Completed-visit KPI driver | `status === CLOSED` (+ facility-local day on `dischargedAt`) |
| Header badge driver | Lifecycle projection from status (+ pathway/docs for intermediate FR labels) |
| Room release | `close` sets `roomLabel: null` |
| Historical record | CLOSED row retained; Patient / MR unchanged |

## Endpoints

| Endpoint | Role |
|----------|------|
| `POST /encounters/:id/close` | Canonical terminal transition |
| `POST /encounters/:id/close-check` | Deficiency preview |
| `PATCH /encounters/:id` `{workflowState}` | Pathway only (not terminal) |
| `POST …/sign-provider-documentation` | Docs only |
| `GET /clinic-care/trackboard` | Projects OPEN + today’s CLOSED |
| `GET /clinic-care/dashboard` | KPIs from canonical status |

## Cache / events

Clinic Care uses `apiFetch` + GET dedupe (not React Query). After close: `invalidateClinicCareAmbulatoryLifecycleCache` drops encounter + trackboard + dashboard + follow-up GETs. No setTimeout / full-reload-only / local count decrement.

## Schema gap

`closedAt` / `closedByUserId` not on Encounter (HospitalEpisode has `closedAt`). Terminal truth = `status` + `dischargedAt` + audit `ENCOUNTER_CLOSE`. **No migration required** for D4C.7D.
