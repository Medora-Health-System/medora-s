# MEDUI.D4B.7 — Enterprise Case Management, Social Work, Utilization Review, and Discharge Planning Audit

**Date:** 2026-07-26  
**Branch:** `d4b7-enterprise-case-management-discharge-planning`  
**HEAD (baseline):** `c1da2bd3c` (Merge PR #58 D4B.6)  
**Mode:** Audit first — **no implementation until this inventory is materially complete**  
**Prerequisites:** `docs/certification/MEDUI.D4B.1|2|3|4|5|6-certification.md` on HEAD / `origin/main`

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b7-enterprise-case-management-discharge-planning` |
| `git status --short` (audit start) | clean |
| `git fetch origin` | ok |
| `git rev-parse HEAD` | `c1da2bd3cd590a732f30c80fcf59aeeec9948417` |
| `git rev-parse origin/main` | `c1da2bd3cd590a732f30c80fcf59aeeec9948417` |
| `merge-base --is-ancestor origin/main HEAD` | **0** |
| `rev-list --left-right --count origin/main...HEAD` | **0 0** |
| D4B.1–D4B.6 certifications on HEAD | ✔ |
| D4B.1–6 architecture / audit docs | ✔ |
| Shared exports D4B.1–6, care-plan registry, IP/Obs hosts | ✔ |
| Unrelated local work | None |
| Prior D4B.7 implementation in working tree | **Absent** |
| Behind `origin/main` | **0** (HEAD == origin/main) |

D4B.6 is present on `origin/main` via PR #58. Safe to proceed.

---

## 2. Audit methodology

1. Repository-wide search for case management / social work / utilization review / discharge planning / LOS / barriers / readmission / payer authorization / care coordination / InterQual / MCG terms.
2. Inspection of D4B.1 lifecycle/registry (disciplines already include CASE_MANAGEMENT / SOCIAL_WORK / UTILIZATION_REVIEW), D4B.6 care plans + discharge_readiness template, D4B.4/5 discharge recommendations, inpatient `dischargePlanning` ops, provider synthesis barriers, ED disposition/nursing discharge execution, observation disposition pathways, consult order codes (`social_work_consult`, case-management workflow tokens).
3. Classification **A–Z** per D4B.7 legend below.
4. Stop-condition review before coding (no provider H&P/MDM/discharge summary; no POE/MAR/diagnosis/disposition engines; no proprietary InterQual/MCG; no predictive AI; no parallel care-plan or documentation foundation; no destructive Prisma migration).

---

## 3. Classification legend (D4B.7)

| Class | Meaning |
|-------|---------|
| **A** | Reusable enterprise care-coordination / CM–SW–UR platform (target — currently absent as governed domain) |
| **B** | Reusable with D4B.1 adapter (lifecycle, registry, authorship, signatures) |
| **C** | Case Management discipline capability / documentation (must stay distinct) |
| **D** | Social Work discipline capability / documentation (sensitive; minimize dashboard exposure) |
| **E** | Utilization Review discipline capability / documentation (criteria placeholders only) |
| **F** | Care-coordination episode / assignment shell (assignment ≠ authorization) |
| **G** | Discharge planning / destination / transition recommendations (≠ final disposition auth) |
| **H** | Barrier registry / avoidable-delay tracking |
| **I** | LOS / avoidable-day views (no invented expected LOS) |
| **J** | Payer / authorization tracking projection (≠ claims/billing) |
| **K** | Readmission-risk rules (transparent configurable; ≠ predictive AI) |
| **L** | D4B.6 interdisciplinary care-plan projection / readiness compose (never overwrite) |
| **M** | D4B.2 nursing contribution / discharge-readiness projection |
| **N** | D4B.3 technician overlap projection |
| **O** | D4B.4 RT discharge recommendation / contribution projection |
| **P** | D4B.5 rehab discharge recommendation / goals projection |
| **Q** | Provider diagnosis / problem-list / MDM / H&P / discharge summary (must remain separate — D4B.8+) |
| **R** | Provider order / POE / MAR / diet / O2 / vent authority |
| **S** | Final disposition / discharge authorization / admission-status mutation engines |
| **T** | Operational display / nav shell / legacy ops JSON |
| **U** | Legacy compatibility (D3E inpatient dischargePlanning / carePlan stubs) |
| **V** | Recommendation ≠ authorization / ≠ order boundary |
| **W** | Sensitive SW content handling (minimize; no full narratives on broad dashboards) |
| **X** | Care-setting projection matrix (ED limited; Obs/IP dashboard) |
| **Y** | Duplicate concept risk if forked |
| **Z** | Deferred (billing/claims/CDI, proprietary InterQual/MCG, predictive AI, final discharge engine, Prisma durable CM tables, new RoleCodes, Pharmacy/Nutrition, Provider workspace D4B.8) |

---

## 4. Existing care-coordination architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **D4B.1 foundation** | Contract + registry + authorship | DRAFT→SIGNED→AMEND/EIE | **B** — **must reuse**; no independent CM/SW/UR signature engine |
| **D4B.1 disciplines** | Enum already includes CM / SW / UR | — | **B** + **C/D/E** — reuse designations; Nest RBAC remains authoritative |
| **D4B.6 IDCP** | Virtual care_plan.* + patient plans | Activation / progress | **L** + **Y** — project readiness; **never** rewrite care plans or fork second plan engine |
| **D4B.6 `discharge_readiness` template** | Care-plan components | Recommendation | **L** + **V** — readiness ≠ discharge authorization |
| **D4B.4/5 `*.discharge_recommendation`** | REFERENCE_VIRTUAL | Rec only | **O/P** + **V** — project into coordination; not auth |
| **Inpatient `dischargePlanning` ops** | `inpatientClinicalOpsV1.dischargePlanning` | PLANNING workflow + destination/barriers text | **T** + **U** + **G** — EXTEND/PROJECT; host D4B.7 UX; do not invent second ops schema |
| **Provider synthesis barriers** | `providerClinicalSynthesisD4a26a` `DischargeBarrierKey` | Display | **H** + **T** — project/extend curated barrier taxonomy |
| **ED disposition + nursing discharge execution** | Disposition panels + readiness utils | Close pathway | **S** + **V** — REUSE/PROJECT readiness; **do not** fork close/auth engines |
| **Observation disposition pathways** | Static pathway list | Display | **T** + **X** — host Obs coordination dashboard; keep pathways as projection |
| **Consult orders** (`social_work_consult`, CM workflow tokens) | Procedure / order catalog | Order | **R** + **V** — project consult presence; workspace ≠ order create |
| **D3E care-plan stub CM/SW labels** | Ops JSON | Stub | **U** + **Y** — legacy only; not authoritative CM/SW engine |
| **Dedicated CM / SW / UR workspace** | **Absent** | — | **A** + **C/D/E** — target of this phase (curated) |
| **InterQual / MCG / proprietary UR** | **Absent (correct)** | — | **Z** — placeholders only |
| **Predictive readmission AI** | **Absent (correct)** | — | **Z** / **K** — rules only |
| **Billing / claims / CDI** | Facility fee / other | — | **Z** — defer |
| **Final discharge authorization engine** | Existing disposition/close paths | Auth elsewhere | **S** — hard separation |

**Safe D4B.7 strategy:** one enterprise care-coordination domain on D4B.1 lifecycle; distinct CM / SW / UR capability profiles and attribution; curated barrier / destination / risk-factor taxonomies; episode + dashboard adapters; project D4B.2–6 and legacy ops without overwrite; Obs + IP dashboards; ED limited projection; hard authority boundaries (planning ≠ discharge auth ≠ POE ≠ MAR ≠ diagnosis ≠ disposition ≠ admission-status mutation; assignment ≠ authorization; no proprietary criteria; no predictive AI; no D4B.6 rewrite); prefer **CERTIFIED WITH DOCUMENTED DEFERRALS** over unsafe breadth.

---

## 5. Complete inventory (selected findings)

### 5.1 D4B.1 lifecycle and registry

| Field | Value |
|-------|--------|
| **Files** | `enterpriseClinicalDocumentContractD4b1.ts`, lifecycle, registry, authorship/adapters |
| **Disciplines** | Already includes `CASE_MANAGEMENT`, `SOCIAL_WORK`, `UTILIZATION_REVIEW` |
| **CM/SW/UR document types** | **Absent** (`cm.*` / `sw.*` / `ur.*` / `care_coord.*` not registered) |
| **Class** | **B** |
| **Action** | Additive curated REFERENCE_VIRTUAL types; reuse lifecycle; `assignmentEqualsAuthorization: false` |

### 5.2 D4B.6 interdisciplinary care plans

| Field | Value |
|-------|--------|
| **Files** | `enterpriseInterdisciplinaryCarePlansD4b6.ts`, web shell, API util, Obs/IP/ED hosts |
| **Class** | **L** + **Y** |
| **Action** | Project care-plan readiness / active plans into coordination dashboard; never overwrite plans or fork IDCP |

### 5.3 Inpatient discharge planning ops / nav

| Field | Value |
|-------|--------|
| **Files** | `inpatientClinicalOpsV1.ts`, `InpatientClinicalOpsPanel` mode=`discharge`, `InpatientWorkspacePanel` `dischargePlanning` |
| **Model** | anticipatedDischargeDate, destination, workflowState, transportation, barriers (free text) |
| **Class** | **T** + **U** + **G** + **H** |
| **Action** | Host D4B.7 primary shell in IP `dischargePlanning`; project legacy ops; keep compatibility |

### 5.4 Provider synthesis barriers / LOS hints

| Field | Value |
|-------|--------|
| **Files** | `providerClinicalSynthesisD4a26a.ts` (`DischargeBarrierKey`, `PENDING_CASE_MANAGEMENT`) |
| **Class** | **H** + **T** |
| **Action** | Align curated barrier taxonomy; do not claim synthesis is the CM engine |

### 5.5 ED disposition / nursing discharge

| Field | Value |
|-------|--------|
| **Files** | `EmergencyDispositionPanel`, `disposition-safety-readiness.util.ts`, `NursingDischargeExecutionSection` |
| **Class** | **S** + **V** + **M** |
| **Action** | Limited ED coordination projection only; do not mutate disposition/close auth |

### 5.6 Observation disposition

| Field | Value |
|-------|--------|
| **Files** | `ObservationWorkspacePanel` `disposition`, pathway constants |
| **Class** | **T** + **X** |
| **Action** | Host Obs care-coordination dashboard alongside pathway projection |

### 5.7 RT / Rehab discharge recommendations

| Field | Value |
|-------|--------|
| **Files** | D4B.4/5 modules + registry `*.discharge_recommendation` |
| **Class** | **O** / **P** + **V** |
| **Action** | Project into interdisciplinary readiness; recommendations remain non-authorizing |

### 5.8 Nursing discharge readiness / EDOC

| Field | Value |
|-------|--------|
| **Files** | EDOC nursing discharge readiness cards, D4B.2 nursing workspace |
| **Class** | **M** + **V** |
| **Action** | Project nursing readiness; preserve nursing authorship |

### 5.9 Consult / order surfaces

| Field | Value |
|-------|--------|
| **Files** | `social_work_consult`, workflow `CASE_MANAGEMENT` tokens |
| **Class** | **R** + **V** |
| **Action** | Project consult status into CM/SW sections; D4B.7 does not create provider orders |

### 5.10 Utilization / LOS helpers

| Field | Value |
|-------|--------|
| **Files** | `observationShortStayEncounter.ts` (utilization-only helpers), admission pathway short-stay messages |
| **Class** | **I** + **Z** |
| **Action** | Display elapsed / status views; **do not invent expected LOS**; billing LOS deferred |

### 5.11 InterQual / MCG / AI

| Field | Value |
|-------|--------|
| **Existing** | **Absent** |
| **Class** | **Z** + **E** |
| **Action** | Criteria-source placeholders (`FACILITY_POLICY`, `CLINICAL_DOCUMENTATION`, `PLACEHOLDER_CRITERIA_LIBRARY`) only; no proprietary content; no predictive models |

### 5.12 Sensitive social-work content

| Field | Value |
|-------|--------|
| **Existing** | No SW narrative workspace |
| **Class** | **W** + **D** |
| **Action** | SW notes marked sensitive; dashboards show status/barrier codes only — not full psychosocial narratives |

### 5.13 Admission status / final disposition engines

| Field | Value |
|-------|--------|
| **Existing** | Admission pathways, ED disposition close, IP discharge workflow |
| **Class** | **S** |
| **Action** | Hard false flags: `mutatesAdmissionStatus`, `mutatesFinalDisposition`, `authorizesDischarge` |

### 5.14 Provider clinical workspace (future)

| Field | Value |
|-------|--------|
| **Existing** | Partial provider shells (D4A / synthesis) — not D4B.8 |
| **Class** | **Q** + **Z** |
| **Action** | D4B.7 must not implement H&P / progress / MDM / discharge summary — next phase D4B.8 |

---

## 6. Duplicate-source matrix

| Concept | Existing sources | Risk if forked | D4B.7 action |
|---------|------------------|----------------|--------------|
| Clinical document lifecycle | D4B.1 | Second signature engine | **REUSE** |
| Interdisciplinary care plan | D4B.6 | Parallel plan engine | **PROJECT only** |
| Discharge readiness checklist | D4B.6 template + nursing EDOC | Confuse with discharge auth | **PROJECT** + banners |
| Discharge destination | IP ops destinations + ED disposition | Second disposition engine | **Taxonomy + plan**; auth stays elsewhere |
| Barriers | Ops free text + synthesis keys | Conflicting taxonomies | **Curated registry**; project legacy |
| CM/SW labels on D3E stub | inpatientCarePlanV1 | Fake CM engine | **LEGACY projection** |
| SW consult orders | Procedure catalog | Workspace creates orders | **PROJECT**; no order create |
| UR medical necessity | Absent | Invent proprietary criteria | **Placeholder sources only** |
| Readmission risk | Absent | Fake AI score | **Transparent rules only** |

---

## 7. Proposed curated MVP taxonomies

### Barriers (selected)
- housing_instability
- transportation
- caregiver_unavailable
- financial_coverage
- placement_delay
- durable_medical_equipment_pending
- home_health_pending
- behavioral_safety
- language_communication
- pending_consult
- pending_test_result
- patient_decline

### Destinations (selected)
- home
- home_with_home_health
- skilled_nursing_facility
- acute_rehab
- long_term_acute_care
- assisted_living
- shelter_or_temporary
- against_medical_advice_planning
- transfer_other_facility
- hospice_community
- undetermined

### Readmission risk factors (rules — not AI)
- prior_admission_30d
- polypharmacy_flag
- incomplete_follow_up_plan
- unresolved_high_barrier
- limited_caregiver_support
- unstable_housing

### UR criteria sources (placeholders)
- FACILITY_POLICY
- CLINICAL_DOCUMENTATION_REVIEW
- PLACEHOLDER_CRITERIA_LIBRARY (explicitly not InterQual/MCG)

Deferred taxonomies / engines documented as **Z**.

---

## 8. Care-setting matrix (proposed)

| Setting | CM/SW/UR dashboard | Episode workflow | Sensitive SW narratives | Disposition/auth mutation |
|---------|--------------------|------------------|-------------------------|---------------------------|
| **EMERGENCY** | Limited projection / awareness | No full episode engine buried in ED note composer | Status only | **Forbidden** |
| **OBSERVATION** | Full coordination dashboard | Episode + barriers + destination planning | Minimized | **Forbidden** |
| **INPATIENT** | Full coordination dashboard + legacy ops projection | Episode + LOS/avoidable-delay views + UR docs | Minimized on dashboard | **Forbidden** |

---

## 9. Stop-condition review

| Stop condition | Status |
|----------------|--------|
| D4B.6 missing / uncommitted only | **Clear** — merged PR #58 on main |
| Wrong branch / dirty unrelated work | **Clear** |
| D4B.7 already present to overwrite unsafely | **Clear** — absent |
| Would require proprietary InterQual/MCG | **Avoided** — placeholders |
| Would require predictive AI | **Avoided** — rules only |
| Would fork D4B.1 or D4B.6 | **Avoided** — adapters/projections |
| Would authorize discharge / mutate disposition | **Avoided** — hard false flags |
| Destructive Prisma migration required for MVP | **Avoided** — zero-schema adapters |

**Proceed to implementation** under documented deferrals.

---

## 10. Absences (honest)

- No durable Prisma CaseManagementEpisode / SocialWorkNote / UtilizationReview tables
- No Nest controllers/endpoints beyond thin projection util (same posture as D4B.4–6)
- No facility payer eligibility engine or claims submission
- No InterQual/MCG content
- No predictive readmission model
- No final discharge authorization UI
- No provider H&P / progress / MDM / discharge summary (D4B.8)
- No Pharmacy / Nutrition clinical workspaces
- No new Prisma RoleCodes

---

## 11. Implementation posture

Prefer **CERTIFIED WITH DOCUMENTED DEFERRALS**. Deliver:

1. Shared D4B.7 module (capabilities, episodes, taxonomies, rules, projections, D4B.1 adapters, summary).
2. Additive D4B.1 registry document types (curated).
3. API projection util + tests.
4. Web shell + IP/Obs hosts + limited ED projection + characterization tests.
5. EN/FR i18n with authority banners (French product UI).
6. Architecture (50 sections) + certification docs.

Do **not** commit or push (phase rules).
