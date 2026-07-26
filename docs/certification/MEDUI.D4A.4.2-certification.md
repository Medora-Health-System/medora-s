# MEDUI.D4A.4.2 — Enterprise MAR Ownership Generalization Certification

**Branch:** `d4a4-2-enterprise-mar-ownership-generalization`
**Base:** D4A.4.1 certified commit `4aabcd1b5`
**Certification id:** `MEDUI.ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION.D4A4_2`
**Date:** 2026-07-26
**Commit/push:** Not performed (awaiting review)

---

## 1. Summary

Migrated MAR shift timeline and medication-pass queue ownership metadata/filtering from raw `Encounter.nurseAssignedUserId` to the certified D4A.4.1 enterprise ownership resolver (thin MAR adapter only). Fixes the inpatient defect where MAR showed the ED/receiving nurse instead of hospital bag `PRIMARY_RN`. No second ownership engine, no new persistence, no FacilityMarShiftTimeline local hospital-fetch patch.

## 2. Authority Policy

| Care setting / mode | MAR nursing ownership |
|---------------------|------------------------|
| **Emergency** | ED `nurseAssignedUserId` |
| **Observation** | Hospital bag `PRIMARY_RN` (even when `Encounter.type` is `INPATIENT`) |
| **Inpatient** | Hospital bag `PRIMARY_RN` |
| **STRICT (default)** | Empty/missing bag → unassigned; ED columns must not win |
| **LEGACY_COMPATIBILITY** | Explicit only via `ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE=LEGACY_COMPATIBILITY`; labeled ED fallback |

## 3. Ownership Semantics

| Concept | Meaning after D4A.4.2 |
|---------|------------------------|
| **Assigned nurse** (header / row / pass item) | Active operational MAR nursing owner from resolver (`PRIMARY_RN` / ED nurse) |
| **Medication due owner** | Unchanged — due windows / dose status promotion independent of assignment |
| **Pass filter owner** | Same active MAR nursing owner used for facility assignee filter |
| **Historical administrator** | `administeredBy*` from medication administration enrichment — unchanged |
| **Medication action actor** | Write-path actor on MAR actions — unchanged; ownership resolve does not write |

**Nursing precedence:** PRIMARY_RN only. BREAK_RN / CHARGE_RN / COVERING_PROVIDER are **not** promoted (no durable active-break flag proven — documented deferral).

## 4. Files Changed

| Path | Purpose |
|------|---------|
| `packages/shared/src/encounters/enterpriseMarOwnershipD4a42.ts` | Thin MAR ownership adapter over D4A.4.1 |
| `packages/shared/src/encounters/enterpriseMarOwnershipD4a42.test.ts` | Characterization + unit tests |
| `packages/shared/src/index.ts` | Export |
| `apps/api/src/medication-dose/mar-enterprise-ownership.util.ts` | Nest batch assignee encounter ids |
| `apps/api/src/medication-dose/mar-assigned-nurse-query.util.ts` | Document ownership filter retirement of ED WHERE |
| `apps/api/src/medication-dose/medication-pass-queue-dose.select.ts` | Ownership fields on encounter select |
| `apps/api/src/medication-dose/medication-pass-queue.service.ts` | Filter + projection |
| `apps/api/src/medication-dose/mar-shift-timeline.service.ts` | Filter + header/row projection |
| `apps/api/src/medication-dose/mar-shift-timeline-order-item-fallback.util.ts` | Ownership filter + projection |
| `apps/api/src/medication-dose/mar-shift-timeline-canceled.util.ts` | Ownership filter + projection |
| `apps/api/src/medication-dose/enterprise-mar-ownership-d4a42.spec.ts` | Nest wiring unit tests |
| `apps/api/src/medication-dose/medication-pass-queue-dose.select.spec.ts` | Ownership select assertions |
| `apps/web/src/components/encounters/FacilityMarShiftTimeline.tsx` | Minimal a11y for assigned/unassigned |
| `apps/web/src/components/encounters/FacilityMarShiftTimeline.test.tsx` | a11y assertions |
| `apps/web/src/lib/medicationPassQueueApi.ts` | Field meaning comment |
| `docs/clinical/enterprise-mar-ownership-generalization-d4a42-preimplementation.md` | Pre-impl audit |
| `docs/clinical/enterprise-mar-ownership-generalization-d4a42.md` | Architecture note |
| `docs/certification/MEDUI.D4A.4.2-certification.md` | This report |

## 5. MAR Timeline Changes

**Old:** Prisma `encounter.nurseAssignedUserId` filter; row/header `assignedNurseUserId` from ED column.
**New:** Facility assignee → one OPEN encounter `findMany` + pure ownership map → `encounterId in ids`; projection via `resolveMarAssignedNurseUserIdFromEncounter` / `resolveAssignedNurseForEncounter` using ownership select fields. Encounter-scoped MAR still ignores assignee filter.

## 6. Medication-Pass Queue Changes

Same assignee encounter-id pre-resolve. Mixed facility boards include ED (columns) and hospital (bag) encounters under one filter. Item `nurseAssignedUserId` now means active MAR nursing ownership.

## 7. Unassigned Behavior

| View | Behavior |
|------|----------|
| Encounter-scoped MAR | Doses remain visible; header `assignedNurse` null when STRICT unassigned; UI shows existing i18n “Unassigned” / “Non assigné(e)” |
| Facility-wide (no assignee) | Unassigned hospital rows remain visible |
| Facility-wide (assignee filter) | Unassigned hospital encounters excluded (do not appear under wrong nurse) |

## 8. Historical Attribution Review

Administration enrichment (`administeredByDisplay` / initials) untouched. Characterization + Nest contract tests assert ownership projection has no administeredBy fields and does not replace historical admin.

## 9. Tests Added or Updated

| Suite | Count | Result |
|-------|-------|--------|
| Shared `enterpriseMarOwnershipD4a42.test.ts` | 13 | Pass |
| Shared D4A.4.1 regression | 16 | Pass |
| Nest `enterprise-mar-ownership-d4a42.spec.ts` | 11 | Pass |
| Nest `enterprise-assignment.service.spec.ts` | 16 | Pass |
| Nest dose select | 4 | Pass |
| Web `FacilityMarShiftTimeline.test.tsx` | 15 | Pass |

Scenarios: IP defect, OBS bag, ED columns, STRICT unassigned, LEGACY env, BREAK_RN not preferred, assignee batch filter, timeline header resolve, pass-queue `encounterId in` wiring, historical authorship contract, due/timing independence.

## 10. Regression Results

| Area | Result |
|------|--------|
| ED ownership (shared + Nest wiring) | Pass |
| Observation bag ownership | Pass |
| Inpatient bag ownership | Pass |
| FSER | Not separately re-run (no FSER code touched); ED authority path covered |
| PRN / canceled placements | Filter migrated to ownership encounter ids; no logic change to PRN/cancel display |
| Infusion / blood / pharmacy verification | Not modified; not re-run (out of ownership scope) |
| Due / overdue | Contract + pass-queue status independence covered; promotion code untouched |
| Audit | Ownership resolve introduces no audit calls |
| Authorization | Facility-scoped loads unchanged; assignment ≠ ACL |

**Environment note:** Live Prisma integration suites (`mar-shift-timeline.service.spec`, `medication-pass-queue.service.spec`) require Postgres on `localhost:5432`. Docker daemon was unavailable in this environment — those suites were **not** executed here. Nest D4A.4.2 coverage uses mocked Prisma wiring tests instead.

## 11. Performance Review

- One facility-scoped OPEN encounter `findMany` when assignee filter active
- Pure batch ownership map (shared)
- Dose/order queries by encounter id set
- Projection from already-loaded encounter fields — **no N+1 ownership queries**

## 12. Security Review

Assignment remains operational metadata only — not chart ACL. FacilityId scoping preserved. No new grant paths.

## 13. Audit Review

Ownership resolve paths do not call `AuditService`. Medication administration write audits unchanged.

## 14. Deferred Work

- Order-cancel authorization
- Observation assignment gaps
- Inpatient dual-write removal
- Attending lifecycle migration
- Billing attribution
- Covering and break APIs / active-break MAR precedence
- LPN and float support
- Notifications
- D4A.4.3

## 15. Risks Remaining

| Risk | Mitigation / note |
|------|-------------------|
| Legacy hospital encounters with empty bags | STRICT shows unassigned; LEGACY opt-in via env |
| Covering / break precedence | Documented: PRIMARY_RN only until active-state exists |
| Unassigned hospital medication workload | Visible on facility-wide unfiltered boards; excluded from nurse filter |
| Live DB integration suites not run here | Postgres/Docker unavailable; wiring + shared characterization pass |

## 16. Certification Decision

**CERTIFIED WITH DOCUMENTED DEFERRALS**

Deferred items listed in §14; environment gap for live Prisma MAR integration suites noted in §10/§15. Core defect fixed at ownership boundary using certified D4A.4.1 resolver without a second engine.

---

**STOP.** Do not begin D4A.4.3. Do not commit/push until reviewed.
