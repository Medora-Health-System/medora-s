# MEDUI.D4A.4.3 — Pre-implementation Ownership Consumer Audit

**Branch base:** `d4a4-3-enterprise-operational-ownership-completion`  
**Merge tip:** `d4a4-2` (MAR ownership) + `d4a4-2a` (census duplicate prevention) on D4A.4.1  
**Date:** 2026-07-26  
**Rule:** No migration until this inventory is complete.

---

## 0. Branch / certification posture

| Item | Status |
|------|--------|
| D4A.4.1 resolver | Present (`4aabcd1b5`) |
| D4A.4.2 MAR ownership | Present (`eeb0e49a1`) |
| D4A.4.2A census duplicate prevention | Merged from `d4a4-2a` (`95673b51c`) |
| Gap | None — tip includes 4.1 + 4.2 + 4.2A |

---

## 1. Certified authority (do not reimplement)

| API | Role |
|-----|------|
| `resolveActiveEncounterOwnership` / `Batch` | Shared pure authority |
| Nest `EnterpriseAssignmentService.resolveActiveEncounterOwnership(Batch)` | DB load + map |
| `resolveMarNursingOwnership` (D4A.4.2) | Thin MAR adapter over 4.1 |

**STRICT OBS/IP:** missing/empty bag → UNASSIGNED; never silent ED-column fallback.  
**Security:** assignment ≠ authorization / chart ACL.  
**Historical / billing / authorship:** out of scope for active operational ownership.

---

## 2. Complete inventory + classification

Legend — **Action:** `ALREADY` (verify only) · `MIGRATE` (this ticket) · `DEFER` (documented) · `N/A` (not operational ownership)

| # | Consumer | Path(s) | Setting | Class | Action | Notes |
|---|----------|---------|---------|-------|--------|-------|
| 1 | Ownership resolver (source) | `packages/shared/.../enterpriseEncounterOwnershipResolverD4a41.ts` | Shared | Operational resolver | ALREADY | Authority |
| 2 | Nest ownership adapter | `apps/api/.../enterprise-assignment.service.ts` | Shared | Batch/Operational | ALREADY | |
| 3 | MAR nursing adapter | `packages/shared/.../enterpriseMarOwnershipD4a42.ts` + Nest MAR utils | Shared | Operational | ALREADY | D4A.4.2 |
| 4 | MAR shift timeline | `mar-shift-timeline.service.ts` (+ fallback/canceled) | Shared | Operational | ALREADY | |
| 5 | Medication pass queue | `medication-pass-queue.service.ts` | Shared | Operational | ALREADY | |
| 6 | Hospital census projection | `hospitalCensusV1.ts` + `hospital-census.service.ts` | OBS/IP | Operational/Projection | ALREADY | Bag STRICT; **do not change 4.2/4.2A logic** |
| 7 | Census duplicate prevention | `hospitalCensusDuplicatePreventionD4a42a.ts` | IP | Projection | ALREADY | D4A.4.2A — do not change |
| 8 | **Order cancel authority** | `order-cancel-policy.util.ts`, `orders.service.ts` cancel paths | Shared | Operational/Auth | **MIGRATE** | Compares actor to raw ED `physicianAssignedUserId` / `nurseAssignedUserId` |
| 9 | **Observation assign gaps (engine)** | `packages/shared/src/observationOperational.ts` | OBS (INPATIENT type) | Operational | **MIGRATE** | `assignPhysicianGap` / `assignRnGap` from ED columns only |
| 10 | Trackboard OBS snapshot wiring | `trackboard.service.ts` | OBS | Operational/Projection | **MIGRATE** | Passes ED columns into #9; has bag + billingClassification available |
| 11 | Chart summary OBS snapshot | `chart-summary.service.ts` | OBS | Operational/Projection | **MIGRATE** | Same ED-column defect |
| 12 | Encounter detail OBS client snapshot | `apps/web/.../encounters/[id]/page.tsx` (`observationOpsClient`) | OBS | Operational/UI | **MIGRATE** | Client recompute uses ED columns |
| 13 | **Observation board gaps / staffing** | `observationBoardOperational.ts` | OBS | Operational | **MIGRATE** | Gap prefers bag then **falls back to ED**; staffing pressure **counts ED ids** |
| 14 | Hospital board My Patients filters | `hospitalMyPatientsFilter.ts` | OBS/IP | Operational | DEFER* | Already bag-only via `projectHospitalBoardAssignments`; equivalent STRICT for hospital rows |
| 15 | Hospitalization board care-team labels | `HospitalizationBoardView.tsx` | OBS/IP | Operational display | DEFER* | Explicit bag-only (never ED) |
| 16 | Inpatient workspace header care team | `inpatient-operations.service.ts` bootstrap | IP | Operational display | DEFER* | Bag-only |
| 17 | Observation workspace header care team | `observation-operations.service.ts` bootstrap | OBS | Operational display | DEFER* | Bag-only |
| 18 | Unit / provider census boards | `UnitBoardShell.tsx`, `ProviderCensusBoard.tsx` | IP | Operational display | DEFER* | Consume census / assignment API (bag-projected) |
| 19 | Observation active workspace | `ObservationActiveWorkspaceView.tsx` | OBS | Operational display | DEFER* | Bootstrap header from bag |
| 20 | ED My Patients filter | `edMyPatientsFilter.ts` | ED | Operational | N/A / ALREADY | Correct: ED columns are authority for EMERGENCY |
| 21 | ED trackboard assign / self-assign | Trackboard + `EncounterOperationalPanel` | ED | Operational write | N/A | Persistence / ED adapter — **do not change** |
| 22 | Encounter chrome assigned physician | `encounterDisplay.ts` + encounter page chrome/summary | Shared | Operational display | **MIGRATE** (thin) or DEFER | Shows `physicianAssigned` relation (ED). Wrong for OBS/IP active care team |
| 23 | Enterprise command tasks | `enterpriseCommandLayerD4a27.ts`, workflow orchestration | Shared | Task ownership | DEFER | Task `ownerUserId` is task-document assignment, not encounter care-team ownership |
| 24 | Clinical / departmental queues | `queues.service.ts` (billing readiness uses `physicianAssignedUserId`) | Shared | Billing | DEFER | Billing readiness / attending for claims — not active clinical ownership |
| 25 | Billing claim provider role | `claim-provider-role-resolution.util.ts` + revenue cycle | Shared | Billing/Historical | DEFER | Explicit billing attribution |
| 26 | Clinical synthesis | `clinical-synthesis.service.ts` | Shared | Authorship/projection | DEFER | Uses ED physician id as synthesis actor context — not board ownership |
| 27 | Chart certification B1–B3 | shared chartCertification* | Shared | Historical/cert | DEFER | Snapshot of recorded columns |
| 28 | Order encounter ownership (D3E/D3DA) | `inpatientOrderOwnershipV1.ts`, `observationOrderOwnershipV1.ts` | OBS/IP | Encounter-scope | N/A | Encounter-id ownership of orders, not care-team slots |
| 29 | Assignment engine / bag writers | `enterpriseAssignmentEngineD4a30.ts`, Nest assignment mutations | OBS/IP | Persistence | N/A | **Do not change** bag schema / write paths |
| 30 | Encounter persistence dual-write | `encounters.service.ts` physician/nurse columns on create/update | Shared | Persistence | DEFER | Dual-write removal is later phase (4.1 deferred list) |
| 31 | MAR historical administration | medication-administration enrichment | Shared | Historical | DEFER | Administered-by unchanged (4.2 contract) |
| 32 | Audit history | audit logs | Shared | Historical | DEFER | |
| 33 | Signatures / cosign | documentation / notes | Shared | Authorship | DEFER | |
| 34 | Reports exporting assignee columns | `reports.service.ts` | Shared | Projection/Historical | DEFER | Export of stored columns |
| 35 | Hospitalization assign merge (UI patch) | `hospitalizationBoardAssignMerge.ts` | OBS/IP | Write UX | N/A | Merges assign API response; not a second precedence engine |
| 36 | Admission pathways `assignedNurseMissing` | `admissionPathwaysV1.ts` | Admission | Workflow hint | DEFER | Pathway completeness flag — not active ownership resolve |
| 37 | Remaining MAR Nest selects | `nurseAssignedUserId: true` on encounter select | Shared | Input fields | ALREADY | Required inputs to resolver; not authority |

\*DEFER* = already hospital-bag STRICT for OBS/IP display/filter; optional future thin-wrap to `resolveActiveEncounterOwnership` for literal “one call site” purity without behavior change. Not high-risk ED-column defects.

---

## 3. High-risk defects (migrate now)

### 3.1 Order cancellation authority

- **Symptom:** Provider/RN cancel rules match `encounter.physicianAssignedUserId` / `nurseAssignedUserId` (ED columns). On OBS/IP, hospital bag PRIMARY_* is ignored → wrong allow/deny.
- **Fix:** Resolve active ownership (batch-safe single resolve on already-loaded encounter) before policy; pass resolved primary provider/nurse userIds into cancel policy. Keep role RBAC separate (assignment ≠ authorization beyond this operational match).

### 3.2 Observation operational assign gaps

- **Symptom:** `computeObservationOperationalSnapshot` sets gaps from ED columns → false “assigned” when only ED receiving nurse/MD remain, or false gaps when bag is populated but ED empty.
- **Fix:** Resolve ownership inside snapshot (or accept resolved ids from callers). STRICT empty bag → gaps true.

### 3.3 Callers of observation snapshot

- Trackboard, chart-summary, encounter detail client — must supply bag fields (`admissionSummaryJson`, `billingClassification`, placement type if needed) so resolver can classify OBS vs IP.

### 3.4 Observation board operational helpers

- Gap helpers: bag present → bag; **else ED** — violates STRICT.
- Staffing pressure: counts ED column ids even when bag is authoritative.
- **Fix:** Use D4A.4.1 resolver for both gaps and staffing assignee ids.

### 3.5 Encounter chrome assigned physician (OBS/IP)

- Shows ED `physicianAssigned` name as active assigned physician.
- **Fix:** Prefer ownership-resolved clinical attending / primary provider display name when care setting is OBS/IP; ED unchanged.

---

## 4. Intentionally deferred (with justification)

| Item | Why defer |
|------|-----------|
| Billing / claim / revenue-cycle attending | Billing attribution, not active care-team ownership |
| Historical MAR administrator / audit / signatures | Authorship boundary (D4A.4.1 §6) |
| Dual-write removal on encounter create | Persistence change; deferred since 4.1 |
| Covering/break promotion | No durable active-break flag (4.2 deferral) |
| Enterprise task `ownerUserId` | Task document field; not encounter ownership engine |
| Census / 4.2A | Certified; do not re-touch |
| Hospital board bag projectors already STRICT | Low risk; optional pure-resolver wrap later |
| ED My Patients / ED self-assign | Correct ED authority |

---

## 5. Migration plan (post-audit)

1. Characterization tests for cancel + OBS gaps (ED populated / bag empty → STRICT unassigned; bag PRIMARY wins).
2. Shared helpers if needed (thin cancel / observation adapters over 4.1 — no second engine).
3. Wire Nest cancel + trackboard + chart-summary + web OBS board + encounter chrome.
4. Re-run D4A.4.1 / 4.2 / 4.2A suites + new tests.
5. Certification `docs/certification/MEDUI.D4A.4.3-certification.md`.
6. **STOP** — no commit/push; do not start D4A.4.4.

---

## 6. Performance / security notes for migration

- Prefer pure resolve over already-loaded encounter fields (cancel already loads encounter; trackboard already selects bag).
- No N+1: no per-row Nest resolveActive when fields are present.
- Cancel policy remains role-gated; ownership match only substitutes assignee identity source.
- Resolver output must not become chart ACL.

---

**AUDIT COMPLETE — migration may begin.**
