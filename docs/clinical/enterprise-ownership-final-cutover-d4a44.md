# MEDUI.D4A.4.4 — Enterprise Ownership Final Cutover (Architectural Document)

**Date:** 2026-07-26  
**Branch:** `d4a4-4-enterprise-ownership-final-cutover`  
**HEAD:** `bc5ddc526a17924753d63c21c3cf3f38fd0f1a4c` (origin/main after PR #51)  
**Mode:** Release gate — audit first; **no production ownership code changes** after audit  
**Decision posture:** CERTIFIED WITH DOCUMENTED DEFERRALS (see certification)

---

## 1. Program overview

D4A.4 established **one governed, care-setting-aware authority** for **current operational encounter ownership** across Emergency, Observation, and Inpatient — covering MAR, medication-pass, order-cancel assignee match, observation gaps/boards, encounter chrome, hospital boards, and census projections.

| Principle | Rule |
|-----------|------|
| Authority | `resolveActiveEncounterOwnership` (D4A.4.1) + thin 4.2/4.3 adapters |
| ED | `physicianAssignedUserId` / `nurseAssignedUserId` |
| OBS / IP | Hospital assignment bag (`enterpriseHospitalAssignmentV1` PRIMARY_*) |
| STRICT (default) | Empty/missing bag → UNASSIGNED; **never** silent ED-column fallback |
| LEGACY_COMPATIBILITY | Explicit mode only (env / caller); labeled; never default |
| Historical | `administeredBy` / order author / signatures unchanged |
| Security | Assignment ≠ chart ACL / facility access |

D4A.4.4 is a **release gate**: complete inventory, regression proof, and closure recommendation — not a new feature phase.

---

## 2. Certified phase lineage

| Phase | Status | Evidence |
|-------|--------|----------|
| **D4A.4.1** Resolver | CERTIFIED | `4aabcd1b5` → main via PR #48 |
| **D4A.4.2** MAR ownership | CERTIFIED | `eeb0e49a1` → main via PR #49 |
| **D4A.4.2A** Census duplicate prevention | CERTIFIED | `95673b51c` → main via PR #50 |
| **D4A.4.3** Operational ownership completion | CERTIFIED WITH DOCUMENTED DEFERRALS | PR #51 merge `bc5ddc526` (feature tip `6c99be5dd`; branch tip `38f55c138` is ancestor of HEAD) |
| **D4A.4.4** Final cutover | This gate | Docs on `d4a4-4-…` from post–PR #51 main |

---

## 3. Baseline verification

Recorded 2026-07-26 after `git fetch origin` and `git reset --hard origin/main` onto `d4a4-4-enterprise-ownership-final-cutover`:

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4a4-4-enterprise-ownership-final-cutover` |
| `git status --short` (audit start) | clean |
| `merge-base --is-ancestor origin/main HEAD` | **0** |
| `merge-base --is-ancestor 38f55c138… HEAD` | **0** (D4A.4.3 tip still ancestor after squash/merge) |
| `merge-base --is-ancestor bc5ddc526 HEAD` | **0** (PR #51 merge) |
| D4A.4.3 content present | Yes (`enterpriseOperationalOwnershipCompletionD4a43*`, order-cancel ownership, OBS board, chrome) |
| Working tree at certification | Docs-only untracked D4A.4.4 files |

---

## 4. Audit methodology

1. Exact ripgrep across `apps/` + `packages/` (excluding `node_modules`, `dist`, `.next`, `docs`) for required ownership terms.
2. File-level inventory of every `physicianAssignedUserId` / `nurseAssignedUserId` consumer (~118 TS/TSX files).
3. Semantic inspection of high-risk operational paths (cancel, MAR, pass-queue, OBS gaps/boards, chrome, census, boards, dual-write, billing, synthesis, tasks).
4. Classification **A–L** per finding (see §5).
5. Care-setting contract, historical boundary, auth separation, deferral review, performance, data integrity.
6. Full applicable test matrix + shared/api/web builds; DB-dependent Nest suites marked unavailable when Postgres down.
7. **No code change** unless Class L silent wrong-source remained in certified matchers — none found in MAR/cancel/gaps/boards/chrome/census.

---

## 5. Complete repository inventory

Legend — **A** certified resolver consumer · **B** bag projection · **C** ED intentional · **D** historical/authorship · **E** auth · **F** billing · **G** task ownership · **H** dual-write · **I** covering/break · **J** already-STRICT hospital · **K** obsolete/dead candidate · **L** defect requiring correction.

| # | Consumer | Path / symbol | Setting | R/W | Op/Hist | Current source | Expected | Class | Action |
|---|----------|---------------|---------|-----|---------|----------------|----------|-------|--------|
| 1 | Ownership resolver | `enterpriseEncounterOwnershipResolverD4a41.ts` | Shared | R | Op | Care-setting authority | Same | A | Keep |
| 2 | Nest ownership adapter | `enterprise-assignment.service.ts` | Shared | R | Op | findMany → pure resolve | Same | A | Keep |
| 3 | MAR adapter | `enterpriseMarOwnershipD4a42.ts` + Nest util | Shared | R | Op | Resolver PRIMARY_RN | Same | A | Keep |
| 4 | MAR timeline / pass-queue | `mar-shift-timeline*`, `medication-pass-queue*` | Shared | R | Op | MAR util / batch | Same | A | Keep |
| 5 | Order-cancel assignees | `resolveOrderCancelOperationalAssignees` → `orders.service` | Shared | R | Op | Resolver PRIMARY_* | Same | A | Keep |
| 6 | Cancel policy actor | `order-cancel-policy.util.ts` | Shared | R | Op | Caller-resolved ids + RBAC | Same | A/E | Keep |
| 7 | OBS assign gaps | `observationOperational.ts` + D4a43 gaps | OBS | R | Op | Resolver STRICT | Same | A | Keep |
| 8 | Trackboard / chart-summary OBS | `trackboard.service`, `chart-summary.service` | OBS | R | Op | Bag+billing into #7 | Same | A | Keep |
| 9 | OBS board gaps/staffing | `observationBoardOperational.ts` | OBS | R | Op | `resolveActiveEncounterOwnership` | Same | A | Keep |
| 10 | Encounter chrome provider | `formatActiveEncounterProviderAssigned` | Shared | R | Op | Resolver display adapter | Same | A | Keep |
| 11 | Hospital board project | `projectHospitalBoardAssignments` | OBS/IP | R | Op | Bag PRIMARY_* only | Same | B | Keep |
| 12 | Census row care team | `hospitalCensusV1` + `hospital-census.service` | OBS/IP | R | Op | #11 | Same | J/B | Keep |
| 13 | Census duplicate prevention | `hospitalCensusDuplicatePreventionD4a42a` | IP | R | Proj | Encounter identity | Same | J | Keep |
| 14 | Hospital My Patients / board UI | `hospitalMyPatientsFilter`, `HospitalizationBoardView` | OBS/IP | R | Op | Bag / census | Same | J | Keep |
| 15 | IP/OBS workspace headers | `inpatient-operations` / `observation-operations` bootstrap | OBS/IP | R | Op | Bag project | Same | J | Keep |
| 16 | ED My Patients / trackboard | `edMyPatientsFilter`, `EmergencyTrackboardView` | ED | R/W | Op | ED columns | ED | C | Keep |
| 17 | ED self-assign / operational PATCH | `encounters.service` Phase 10A | ED | W | Op | ED columns | ED | C | Keep |
| 18 | ER cancel UX visibility | `shouldShowErOrderLineCancelAction` | ED | R | Op | Role + lifecycle | Same | C/E | Keep |
| 19 | ED print provider line | `formatEncounterProviderAssigned` | ED print | R | Hist/print | ED relation | ED | C/D | Keep |
| 20 | Clinical synthesis attending | `clinical-synthesis.service` | Shared | R | Hist/proj | ED physician | Deferred | D | Defer |
| 21 | IP nursing print attending (one path) | `inpatient-operations` print select | IP | R | Hist/print | ED relation (workspace header uses bag) | Bag preferred | D | Defer |
| 22 | MAR administeredBy | medication-administration enrichment | Shared | R | Hist | Event actor | Event actor | D | Keep |
| 23 | Chart certification B1–B3 | chartCertification* | Shared | R | Hist/cert | Stored columns snapshot | Same | D | Defer |
| 24 | Claims / billing readiness | claim-provider-role*, queues billing | Shared | R | Billing | ED / providerId | Billing attr. | F | Defer |
| 25 | Reports ED visit filter | `reports.service` | ED export | R | Hist | ED columns | ED scope | C/D | Keep |
| 26 | Task `ownerUserId` | `enterpriseCommandLayerD4a27` | Shared | R/W | Task | Task document | Task | G | Defer |
| 27 | Encounter create/update dual-write | `encounters.service` physician/nurse cols | Shared | W | Persist | ED columns | Residual | H | Defer |
| 28 | IP direct-admit seed dual-write | `inpatient-operations` create | IP | W | Persist | ED cols + bag | Residual | H | Defer |
| 29 | Hospital assign merge UX | `hospitalizationBoardAssignMerge` | OBS/IP | W UX | Op | Merges API fields | Not 2nd engine | H/N-A | Keep |
| 30 | BREAK_RN / COVERING promotion | MAR / bag slots | OBS/IP | — | Op | PRIMARY only | Future staffing | I | Defer |
| 31 | Unused cancel strict mirror | `canShowOrderLineCancelControl` | Shared | R | Op | Raw ctx ids | Unused | K | Defer remove |
| 32 | Unused open-encounters table | `OpenEncountersTable.tsx` | Mixed | R | Op | ED relation | No prod imports | K | Defer remove |
| 33 | LEGACY_COMPATIBILITY path | Resolver + MAR env gate | Shared | R | Op | Labeled ED | Explicit only | Keep gated | N/A |
| 34 | Shared encounter ED operational panel | `EncounterOperationalPanel` on `/encounters/[id]` | **OBS/IP via shared page** | R/W | Op | ED `physicianAssigned*` | Hospital assign / gate ED-only | **L→defer** | Document (see §18) |
| 35 | Admission pathway nurse hint | `admissionPathwaysV1.assignedNurseMissing` | Admission | R | Hint | Pathway flag | Hint | D/G | Defer |
| 36 | Order encounter-id ownership | `inpatientOrderOwnershipV1` / OBS D3DA | OBS/IP | R | Encounter-scope | Encounter id | N/A care-team | N/A | Keep |

**Class L note:** #34 is the only residual **wrong-source operational UI** on the shared encounter page. It does **not** create silent bag→ED fallback in certified matchers (STRICT ignores leftover ED columns for OBS/IP). Chrome already uses the resolver. Documented deferral — not an unacknowledged defect.

---

## 6. Final ownership source-of-truth matrix

| Consumer | ED source | Observation source | Inpatient source |
|----------|-----------|--------------------|------------------|
| Encounter ownership resolver | ED ownership fields | Assignment bag | Assignment bag |
| MAR timeline | ED assigned RN | PRIMARY_RN | PRIMARY_RN |
| Medication-pass queue | ED assigned RN | PRIMARY_RN | PRIMARY_RN |
| Order-cancel assignee match | Certified ED assignments | PRIMARY_* | PRIMARY_* |
| Observation operational gaps | N/A | Assignment resolver | N/A (OBS lane) |
| Observation board staffing | N/A | Assignment resolver | N/A |
| Encounter chrome | ED provider names | PRIMARY_PROVIDER / clinical attending | PRIMARY_PROVIDER / clinical attending |
| Hospital boards / My Patients | ED-independent | Assignment bag | Assignment bag |
| Census care-team projection | Encounter-authoritative rows | Canonical bag projection | Canonical bag projection |
| Shared ED operational panel (#34) | ED fields (correct) | **ED panel residual (deferred)** | **ED panel residual (deferred)** |

---

## 7. ED operational ownership behavior

- Authority: ED encounter columns.
- Trackboard assign / self-assign / My Patients / ER cancel UX: intentional Class C.
- Order-cancel on EMERGENCY: resolver returns ED primary provider/nurse; RBAC unchanged.
- MAR on EMERGENCY: ED assigned RN.
- Chrome: ED physicianAssigned display names via `authoritySource === ED_ENCOUNTER_COLUMNS`.

---

## 8. Observation operational ownership behavior

- Authority: hospital bag via resolver (care setting from bag / billing / helpers — not type alone).
- STRICT empty bag → gaps true, cancel match null, MAR nurse unassigned — **ED receiving columns do not win**.
- Board staffing counts resolver primary ids only.
- Workspace headers: bag-only projection (Class J).

---

## 9. Inpatient operational ownership behavior

- Same bag STRICT contract as Observation.
- Census + 4.2A duplicate collapse: projection-safe; no care-team ED fallback.
- Workspace headers: bag-only.
- Dual-write of ED columns on create remains Class H (ignored by STRICT active ownership).

---

## 10. MAR and medication-pass ownership

- Thin adapter `resolveMarNursingOwnership` over D4A.4.1.
- Nest: one OPEN-encounter `findMany` + pure map for assignee filters (no N+1).
- `administeredBy` / historical administration enrichment unchanged.
- COVERING / BREAK_RN not promoted to active MAR owner (documented I).
- LEGACY only if `ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE=LEGACY_COMPATIBILITY` (not default; not in `.env.example`).

---

## 11. Order-cancel ownership

- API resolves operational assignees via D4A.4.3 before `resolveOrderCancelPolicyActor`.
- OBS/IP: PRIMARY_* from bag; STRICT empty → no ED match.
- ED: ED columns.
- UI: `shouldShowErOrderLineCancelAction` is role+lifecycle visibility; backend authoritative.
- Unused `canShowOrderLineCancelControl` remains Class K (tests only).

---

## 12. Board, census, and chrome projections

| Surface | Source |
|---------|--------|
| Hospitalization board / My Patients | Bag project / census bag fields |
| Unit / provider census boards | Census API (bag-projected) |
| Hospital census metrics | Encounter-authoritative + 4.2A collapse |
| Shared chrome provider line | `formatActiveEncounterProviderAssigned` |
| Shared ED operational panel | Deferred residual (#34) |

---

## 13. Operational versus historical separation

Confirmed untouched / not reinterpreted as current owner:

- administeredBy, orderedBy, signedBy, cosignedBy, verifiedBy, performedBy, createdBy, modifiedBy, documentedBy, authoredBy, canceledBy

Clinical synthesis / cert snapshots / some print paths may **display** stored ED physician for historical/context attribution (Class D) — not board/MAR/cancel authority.

---

## 14. Assignment versus authorization separation

- Resolver output is **not** chart ACL.
- Facility-scoped Nest loads remain authoritative.
- Cancel assignee match is subordinate to role RBAC.
- Self-assign / operational PATCH do not grant facility or role membership.
- No finding that assignment alone grants medication administration or signature rights.

---

## 15. Performance findings

| Consumer | Input | Query shape | Resolver strategy | Complexity | Batching | Limitation |
|----------|-------|-------------|-------------------|------------|----------|------------|
| MAR assignee filter | Facility OPEN encounters | 1× findMany select ownership fields | Pure map | O(n) encounters | Yes (single load) | Loads all OPEN encounters for facility filter |
| Pass-queue / MAR timeline | Dose list + encounter fields | Existing selects include bag/ED | Pure per row | O(doses) CPU | Encounter load already present | — |
| Order cancel | Single order+encounter | Already loaded | Pure once | O(1) | N/A | — |
| Trackboard / chart-summary OBS | Encounter row | Existing select | Pure | O(1)/row | No Nest ownership DB | — |
| OBS board | Board rows | Client/API payload | Pure in-memory | O(rows) | N/A | — |
| Census | Facility census query | Existing | Bag project pure | Unchanged vs 4.2A | — | — |
| Nest `resolveActiveEncounterOwnershipBatch` | id list | 1× findMany | Pure map | O(n) | Yes | Not required on list paths that already have fields |

**No N+1 ownership DB pattern** in boards / census / MAR / cancel. No speculative optimization performed.

---

## 16. Data-integrity findings

D4A.4 ownership work does **not**:

- delete / merge / auto-close encounters
- rewrite historical authorship or MAR administration history
- change admission correlation identity
- silently mutate assignment bags on read
- alter 4.2A projection-only duplicate collapse into durable remediation

Existing durable duplicate inpatient encounters remain subject to **controlled manual remediation** (4.2A deferral).

---

## 17. Remaining compatibility mechanisms

| Mechanism | Status |
|-----------|--------|
| ED columns as ED authority | Required (Class C) |
| Dual-write ED columns on hospital create/update | Present (Class H) — STRICT ignores for active OBS/IP ownership |
| LEGACY_COMPATIBILITY | Gated; not production default |
| Shared EncounterOperationalPanel on hospital charts | Residual UI (#34) — deferred |
| Unused cancel strict helper / OpenEncountersTable | Class K candidates — not removed (not fully proven for all contracts) |

---

## 18. Documented deferrals

| Deferral | Safety / silent-fallback check | Blocks D4A.4? | Roadmap destination |
|----------|--------------------------------|---------------|---------------------|
| Billing / claims attending | No clinical ownership silent fallback | No | Revenue-cycle / billing governance |
| Dual-write removal | STRICT ignores ED for OBS/IP active ownership | No | Controlled persistence migration |
| Covering / BREAK_RN promotion | No durable active-break flag | No | Staffing coverage / handoff |
| Task `ownerUserId` | Task document, not care-team engine | No | Enterprise task ownership |
| Historical authorship / cert snapshots / synthesis | Explicitly non-operational | No | Document lifecycle / legal-record |
| Already-STRICT board purity wraps | Behavior already correct | No | Optional one-call-site purity |
| D4A.4.2A durable duplicate remediation | Projection-safe; manual process | No | Controlled operational remediation |
| Shared ED operational panel on OBS/IP (#34) | Writes ED only; STRICT matchers ignore; chrome correct | No | Gate panel to EMERGENCY / hospital assign API |
| Class K dead helpers | Unused; latent if rewired wrongly | No | Safe deletion after contract proof |
| IP print attending ED path | Print attribution; workspace header bag-correct | No | Print source alignment |

---

## 19. Future roadmap destinations

Suggested destinations (do **not** implement in D4A.4.4):

- Billing → revenue-cycle governance  
- Task owner → enterprise task ownership  
- Covering/break → staffing handoff  
- Dual-write removal → persistence migration  
- Historical authorship → clinical document lifecycle  
- Durable duplicates → controlled remediation process  
- Next program phase after D4A.4 closure: **MEDUI.D4B.1 — Enterprise Clinical Documentation Foundation**

---

## 20. Tests and verification

See certification §7–9 for exact commands and results.

Summary: shared D4A.4.1/4.2/4.2A/4.3 + OBS + assignment + census benchmark **pass**; Nest ownership unit specs **pass**; web OBS board / hospital & ED My Patients / cancel UX **pass**; MAR timeline + pass-queue Nest suites **unavailable** (Postgres `localhost:5432` down — infrastructure); shared/api/web **build pass**; lint scripts placeholder.

---

## 21. Release prerequisites

1. Human review of this audit + certification.  
2. Confirm production does **not** set `ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE=LEGACY_COMPATIBILITY` unless intentionally labeled.  
3. Optional follow-up (non-blocking): gate `EncounterOperationalPanel` to EMERGENCY on shared `/encounters/[id]`.  
4. Optional: re-run MAR timeline / pass-queue Nest suites when Postgres available.  
5. **Do not start D4B.1** until this gate is accepted.

---

## 22. Final closure recommendation

**CERTIFIED WITH DOCUMENTED DEFERRALS.**

High-risk **current operational** consumers (resolver, MAR, pass-queue wiring, order-cancel, OBS gaps/boards, chrome, census/boards) honor care-setting authority without silent OBS/IP → ED fallback.

Remaining items are documented, non-blocking for D4A.4 program closure, with clear roadmap destinations.

**D4A.4 may close.** Next phase: **MEDUI.D4B.1 — Enterprise Clinical Documentation Foundation** (not started).

**STOP.** Do not commit/push/merge in this gate without human instruction.
