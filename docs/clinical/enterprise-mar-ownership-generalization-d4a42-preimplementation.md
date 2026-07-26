# MEDUI.D4A.4.2 — Pre-Implementation Verification Note

**Branch:** `d4a4-2-enterprise-mar-ownership-generalization` (from `d4a4-1-enterprise-ownership-resolver` @ `4aabcd1b5`)
**Mode:** Verification before MAR code edits
**Date:** 2026-07-26

## 0. Baseline confirmation

| Check | Result |
|-------|--------|
| HEAD | `4aabcd1b5` — `feat(assignments): add enterprise encounter ownership resolver D4A.4.1` |
| Working tree | Clean at branch create |
| Shared D4A.4.1 tests | 16/16 pass (`enterpriseEncounterOwnershipResolverD4a41`) |
| Nest D4A.4.1 tests | 16/16 pass (`enterprise-assignment.service.spec`) |
| Commit / push | **Deferred** until review |

## 1. Confirmed files to modify / add

| Path | Purpose |
|------|---------|
| `packages/shared/src/encounters/enterpriseMarOwnershipD4a42.ts` | **Add** — MAR nursing ownership projection over D4A.4.1 resolver |
| `packages/shared/src/encounters/enterpriseMarOwnershipD4a42.test.ts` | **Add** — characterization + unit tests |
| `packages/shared/src/index.ts` | Export MAR ownership helper |
| `apps/api/src/medication-dose/mar-enterprise-ownership.util.ts` | Nest batch encounter-id resolve for assignee filters |
| `apps/api/src/medication-dose/medication-pass-queue-dose.select.ts` | Add ownership fields (`physicianAssignedUserId`, `billingClassification`) |
| `apps/api/src/medication-dose/medication-pass-queue.service.ts` | Ownership filter + projected `nurseAssignedUserId` |
| `apps/api/src/medication-dose/mar-shift-timeline.service.ts` | Ownership filter + header/row assigned nurse |
| `apps/api/src/medication-dose/mar-shift-timeline-order-item-fallback.util.ts` | Ownership filter + projected assignee |
| `apps/api/src/medication-dose/mar-shift-timeline-canceled.util.ts` | Ownership filter + projected assignee |
| `apps/api/src/medication-dose/mar-assigned-nurse-query.util.ts` | Document: Prisma column filter retired for ownership |
| Specs for pass queue / timeline | IP defect, OBS, ED, STRICT, LEGACY, historical admin |
| `docs/clinical/enterprise-mar-ownership-generalization-d4a42.md` | Architecture note |
| Certification report | Full MEDUI.D4A.4.2 sections 1–16 |

**Do not modify (deferred):** order-cancel, OBS assign gaps, IP dual-write removal, attending lifecycle, billing, covering/break APIs, LPN/float, notifications, D4A.4.3, FacilityMarShiftTimeline local hospital-fetch patch.

## 2. Re-audit: `nurseAssignedUserId` in MAR / pass paths

| Location | Use today | Classification | D4A.4.2 action |
|----------|-----------|----------------|----------------|
| `medication-pass-queue.service.ts` Prisma `encounter.nurseAssignedUserId` filter | Facility assignee gate | **DEFECT** for IP/OBS | Replace with ownership-resolved encounter ids |
| `medication-pass-queue.service.ts` item `nurseAssignedUserId` projection | Response metadata | **DEFECT** | Project MAR nursing ownership userId |
| `mar-shift-timeline.service.ts` Prisma filter | Facility assignee gate | **DEFECT** | Same as pass queue |
| `mar-shift-timeline.service.ts` row `assignedNurseUserId` | Row metadata | **DEFECT** | Ownership primary nurse |
| `mar-shift-timeline.service.ts` `resolveAssignedNurseForEncounter` | Header metadata | **DEFECT** | Ownership resolve (read-only) |
| `mar-shift-timeline.service.ts` PRN projection select | Loads ED column for row meta | **DEFECT** | Ownership from loaded fields |
| `mar-shift-timeline-order-item-fallback.util.ts` filter + `assignedNurseUserId` | Fallback placements | **DEFECT** | Ownership |
| `mar-shift-timeline-canceled.util.ts` filter + `assignedNurseUserId` | Canceled markers | **DEFECT** | Ownership |
| `medication-pass-queue-dose.select.ts` select | Loads ED column | Keep field for resolver input; add physician + billing | Extend select |
| `mar-assigned-nurse-query.util.ts` | Whether encounter-scoped clears filter | Keep semantics; filtering moves off ED column | Keep util; document |
| Administration enrichment `administeredBy*` | Historical authorship | **OUT OF SCOPE / PRESERVE** | No change |
| Order-cancel `nurseAssignedUserId` | Cancel policy | **DEFERRED D4A.4.x** | Do not touch |
| Web `FacilityMarShiftTimeline` | Displays API `assignedNurse` | Consumer only | Minimal UI only if unassigned needs a11y/copy |
| Web pass-queue API type `nurseAssignedUserId` | Displays projected id | Remains field name; meaning = MAR ownership | Type comment if needed |

## 3. Existing helpers to reuse (no second resolver)

- `resolveActiveEncounterOwnership` / `resolveActiveEncounterOwnershipBatch` (D4A.4.1)
- Nest `EnterpriseAssignmentService.resolveActiveEncounterOwnership(Batch)` optional — prefer pure shared over already-loaded encounter fields to avoid N+1 / module churn
- `readHospitalAssignmentBag` / bag workflow `PRIMARY_RN`
- `resolveMarAssignedNurseFilter` (encounter-scoped still disables assignee gating)

## 4. Nursing precedence (explicit)

| Concept | MAR use |
|---------|---------|
| `PRIMARY_RN` (hospital bag) / ED `nurseAssignedUserId` | **Authoritative** active MAR nursing ownership |
| `BREAK_RN` | Slot exists on bag; **no durable structured “active break coverage” flag** proven in repo | **Documented deferral** — MAR does **not** promote BREAK_RN over PRIMARY_RN |
| `CHARGE_RN` | Not MAR primary ownership | Ignored for assignee filter / header |
| `COVERING_PROVIDER` | Provider covering, not nursing | Ignored for nurse filter |

Default compatibility mode: **STRICT**. `LEGACY_COMPATIBILITY` only when certified env/mode passes through to D4A.4.1 resolver.

## 5. Batch-compatible query architecture

1. Facility assignee filter (no `encounterId`):
   - One `encounter.findMany` (OPEN + facility + ownership fields)
   - Pure batch ownership map → encounter ids where MAR nursing owner === assignee
   - Dose / order-item queries use `encounterId: { in: ids }` (empty → empty result)
2. Encounter-scoped MAR: no assignee gate (unchanged)
3. Projection: resolve ownership from fields already on dose/order encounter selects (no per-row ownership DB)
4. No audit on ownership reads; no writes

## 6. Risks

| Risk | Mitigation |
|------|------------|
| IP shows ED receiving nurse | Hospital authority = bag; STRICT ignores ED columns |
| Assignee filter misses hospital patients | Encounter-id pre-resolve via bag, not ED column WHERE |
| Due/overdue drift | Timing/status paths untouched; only ownership metadata/filter |
| Historical admin rewritten | Administration enrichment unchanged; characterization tests |
| N+1 | Batch encounter load + pure map |
| Second ownership engine | Thin MAR adapter only over D4A.4.1 |

## 7. Characterization tests before consumer edits

Shared: IP bag PRIMARY_RN wins vs ED receiving nurse; OBS bag; ED columns; empty bag STRICT unassigned; LEGACY labeled fallback; BREAK_RN not preferred; historical authorship untouched (contract comment + unit); due timing independence.

Nest: timeline/pass queue IP defect; assignee filter hospital; encounter-scoped ignores assignee; ED regression; STRICT unassigned header; LEGACY mode; administeredBy preserved.
