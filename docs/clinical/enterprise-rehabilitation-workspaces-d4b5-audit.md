# MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces Audit

**Date:** 2026-07-26  
**Branch:** `d4b5-enterprise-rehabilitation-workspaces`  
**HEAD (baseline):** `6bd2b7305` (Merge PR #56 D4B.4)  
**Mode:** Audit first — **no implementation until this inventory is materially complete**  
**Prerequisites:** `docs/certification/MEDUI.D4B.1|2|3|4-certification.md` on HEAD

---

## 1. Baseline verification

| Check | Result |
|-------|--------|
| `git branch --show-current` | `d4b5-enterprise-rehabilitation-workspaces` |
| `git status --short` (audit start) | clean |
| `git fetch origin` | ok |
| `merge-base --is-ancestor origin/main HEAD` | **0** |
| D4B.1 / D4B.2 / D4B.3 / D4B.4 certifications on HEAD | ✔ |
| D4B.1–4 architecture docs | ✔ |
| Shared exports D4B.1–4 | ✔ |
| Unrelated local work | None |
| Behind `origin/main` | **0** (HEAD == origin/main) |

D4B.4 is present on `origin/main` via PR #56. Safe to proceed.

---

## 2. Audit methodology

1. Repository-wide search for PT / OT / SLP / rehab / mobility / gait / ADL / IADL / swallow / dysphagia / aspiration / diet texture / therapy referral / consult PT|OT|SLP / functional status / ROM / transfer / wheelchair / DME / aphasia / communication disorder terms.
2. Inspection of RoleCode, professionResolver, EncounterNoteType, D4B.1 disciplines/registry, hospital taxonomy/nav, board assignment exclusions.
3. Nursing fall/mobility (EDOC.14, D4B.2), tech mobility/ADL (D4B.3), stroke swallow screen (EDOC.4), diet/NPO CARE orders, discharge pendingPt/Ot heuristics, RT (D4B.4) boundary.
4. Classification **A–M** per D4B.5 prompt §5.
5. Stop-condition review before coding.

---

## 3. Classification legend (D4B.5)

| Class | Meaning |
|-------|---------|
| **A** | Reusable Physical Therapy workflow |
| **B** | Reusable Occupational Therapy workflow |
| **C** | Reusable Speech-Language Pathology workflow |
| **D** | Reusable with D4B.1 adapter |
| **E** | Nursing-owned (project only; do not overwrite) |
| **F** | Technician-owned (project only; do not overwrite) |
| **G** | RT-owned overlap (project only; D4B.4) |
| **H** | Provider order / consult / referral |
| **I** | Historical attribution / narrative stickers |
| **J** | Operational display only |
| **K** | Legacy compatibility |
| **L** | Duplicate concept risk |
| **M** | Deferred (platform / DME / billing / scheduling / proprietary scales / RoleCode / full care plan) |

---

## 4. Existing rehabilitation architectures (summary)

| Architecture | Persistence | Lifecycle today | Verdict |
|--------------|-------------|-----------------|---------|
| **D4B.1 PT/OT/SLP discipline enums** | Contract only | Designation ≠ auth | **D** + **M** |
| **D4B.1 registry pt./ot./slp. types** | **Absent** | — | Soft **L** if invented without adapters |
| **PT/OT/SLP RoleCode / profession** | **Absent** | — | **M** (follow D4B.4 capability profiles) |
| **EncounterNoteType therapy** | PROVIDER/NURSING/TECHNICIAN/OTHER only | MEDNOTE.2 | **K** + **M** |
| **Hospital taxonomy rehab units / support areas** | Constants | Labels only | **J** + **M** |
| **Service-line nav `REHABILITATION`** | Route allowlist | Thin / map-excluded | **J** + **K** + **L** |
| **Board assignment PT/OT/SPEECH** | Explicitly excluded | — | **M** (correct) |
| **Inpatient care-plan stub PT/OT** | Type-only; no durable store | ACTIVE/MET/DISCONTINUED | **M** + **L** (D4B.6) |
| **Discharge destination REHAB / pendingPt/Ot** | Ops synthesis / tags | Heuristic | **J** + **L** |
| **Nursing fall / mobility / Morse** | EDOC.14 + D4B.2 | Nursing | **E** + **L** + **M** (Morse license) |
| **Nursing admission functional / aspirationRisk** | D4A.25 JSON | Nursing | **E** + **L** |
| **Stroke swallow screen** | EDOC.4 | Nursing bedside screen | **E** + **L** (≠ SLP eval) |
| **Tech mobility / ADL assistance** | D4B.3 tasks | Task complete | **F** + **L** |
| **NPO / swallowing precautions CARE** | Order catalog | Provider/RN order | **H** + **E** |
| **Diet texture / IDDSI engine** | **Absent** | — | **M** |
| **Consult PT/OT/SLP order codes** | **Absent** | — | **M** (projection of related CARE only) |
| **Therapy CPT / DME billing** | ER subset **excludes** | — | **M** |
| **D4B.4 RT workspace** | Adapters + EDOC.12 | D4B.1 | **G** — peer pattern; not rehab |
| **Dedicated PT/OT/SLP workspace** | **Absent** | — | Target of this phase |

**Safe D4B.5 strategy:** one shared rehab workspace **shell** with **three distinct discipline modes** (PT / OT / SLP); capability profiles (no Prisma RoleCode); D4B.1 registry types `pt.*` / `ot.*` / `slp.*` as REFERENCE_VIRTUAL / projection adapters; **project** nursing fall/mobility/swallow and tech assist tasks **without overwrite**; diet/equipment/discharge contributions are **recommendations ≠ authority**; **do not** collapse disciplines into generic THERAPY; **defer** DME, IDDSI diet-order engine, scheduling, RoleCode, full interdisciplinary care plan (D4B.6).

---

## 5. Complete inventory (selected findings)

### 5.1 Roles and profession grouping

| Field | Value |
|-------|--------|
| **Files** | `apps/api/prisma/schema.prisma` (`RoleCode`), `packages/shared/src/constants/roles.ts`, `professionResolver.ts`, `adminUserAssignment.ts` |
| **Role codes** | No `PT` / `OT` / `SLP` / `REHAB` / therapist RoleCode |
| **Profession** | No therapy group |
| **Board** | `PT`, `OT`, `SPEECH` in `HOSPITAL_BOARD_EXCLUDED_ASSIGNMENT_ROLES` |
| **Class** | **M** + **J** |
| **Action** | Capability matrices by PT/OT/SLP profiles + RN-with-rehab-permissions proxy (mirror D4B.4); **do not** invent RoleCode in D4B.5 |

### 5.2 D4B.1 disciplines and registry

| Field | Value |
|-------|--------|
| **Files** | `enterpriseClinicalDocumentContractD4b1.ts`, `enterpriseClinicalDocumentRegistryD4b1.ts` |
| **Disciplines** | `PHYSICAL_THERAPY`, `OCCUPATIONAL_THERAPY`, `SPEECH_LANGUAGE_PATHOLOGY` present as designations |
| **Doc types** | RT types from D4B.4 only; **no** `pt.*` / `ot.*` / `slp.*` yet |
| **Class** | **D** |
| **Action** | Extend registry with discipline-distinct types; keep lifecycle on D4B.1 |

### 5.3 Nursing fall / mobility / functional

| Field | Value |
|-------|--------|
| **Files** | `fallRiskSafetyDocumentationPayloads.ts`, D4B.2 `fallMobility`, D4A.25 `FALL_SAFETY` / `FUNCTIONAL_MOBILITY` |
| **Class** | **E** + **L** + **M** (Morse) |
| **Action** | Read-only projection into PT/OT overviews; never replace nursing authorship; no proprietary Morse automation |

### 5.4 Stroke swallow screen / aspiration

| Field | Value |
|-------|--------|
| **Files** | `strokeDocumentationPayloads.ts` (`stroke_swallow_screen`), D4A.25 `aspirationRisk`, CARE `swallowing_*` / `npo_status` |
| **Class** | **E** + **H** + **L** |
| **Action** | Project nursing screen into SLP workspace as **screening ≠ evaluation**; SLP diet recommendation ≠ provider diet order |

### 5.5 Technician mobility / ADL (D4B.3)

| Field | Value |
|-------|--------|
| **Files** | `enterpriseTechnicianNursingAssistantWorkspaceD4b3.ts` |
| **Class** | **F** + **L** |
| **Action** | Project assist tasks; tech ≠ OT ADL evaluation; preserve performer |

### 5.6 Orders / referrals

| Field | Value |
|-------|--------|
| **Files** | `enterpriseProcedureCatalog.ts`, CARE manifests, order sets |
| **Consult codes** | **Absent** dedicated `consult_pt` / `consult_ot` / `consult_slp` |
| **Related** | `npo_status`, `ambulation_trial`, `fall_precautions`, `swallowing_precautions`, `oral_challenge` |
| **Class** | **H** + **M** |
| **Action** | Project related CARE / synthesis flags; therapist docs do not create provider orders |

### 5.7 Ops pending PT/OT / discharge REHAB

| Field | Value |
|-------|--------|
| **Files** | `providerClinicalSynthesisD4a26a.ts`, `enterpriseCommandLayerD4a27.ts`, `inpatientDischargePlanningV1.ts` |
| **Class** | **J** + **L** |
| **Action** | Display only; discharge recommendation ≠ discharge authorization |

### 5.8 RT peer (D4B.4)

| Field | Value |
|-------|--------|
| **Files** | `enterpriseRespiratoryTherapyWorkspaceD4b4.ts`, web shell, API util, i18n, cert |
| **Class** | **G** (pattern to mirror; content out of rehab scope) |
| **Action** | Mirror architecture with **three** discipline modes |

### 5.9 Taxonomy / nav / map

| Field | Value |
|-------|--------|
| **Files** | `hospitalClinicalUnitTaxonomy.ts`, `hospitalServiceLineNavigationV1.ts`, unit map exclusion |
| **Class** | **J** + **K** + **L** |
| **Action** | Do not redesign global shell / census / unit map in D4B.5 |

---

## 6. Duplicate-source risk matrix

| Domain | Existing source | D4B.5 rule |
|--------|-----------------|------------|
| Fall / Morse / gait | EDOC.14 + D4B.2 | Project only; no PT fork |
| Functional mobility baseline | D4A.25 | Project only |
| ADL assist | D4B.3 tech tasks | Project only; ≠ OT eval |
| Swallow / NPO / aspiration | EDOC.4 screen + CARE + admission flag | Screen ≠ SLP eval; rec ≠ diet order |
| Assistive devices | Belongings EDOC9 | Rec ≠ DME procurement |
| Care-plan PT/OT stub | `inpatientCarePlanV1` | Contribution only; full plan = D4B.6 |
| RT airway/O₂ | D4B.4 | Out of rehab scope; optional visibility only |

---

## 7. Stop-condition review

| Condition | Status |
|-----------|--------|
| D4B.4 absent from main | **Clear** — PR #56 on HEAD |
| Unrelated dirty tree | **Clear** |
| Must invent destructive Prisma migration | **Avoided** — adapters + registry |
| Must collapse PT/OT/SLP | **Avoided** — three modes |
| Must implement DME/billing/scheduling/diet-order authority | **Deferred** |
| No safe MVP without RoleCode | **Clear** — D4B.4 RN-proxy pattern |

**Proceed to implementation** with documented deferrals.

---

## 8. Recommended D4B.5 implementation posture

1. Shared rehab workspace shell + **discipline mode** (`PHYSICAL_THERAPY` | `OCCUPATIONAL_THERAPY` | `SPEECH_LANGUAGE_PATHOLOGY`).
2. Separate capability / activity / section / terminology registries per discipline.
3. Extend D4B.1 registry with implementable `pt.*` / `ot.*` / `slp.*` types (REFERENCE_VIRTUAL primary).
4. Project nursing (D4B.2), tech (D4B.3), swallow screen, related CARE; never overwrite.
5. Goals / treatment plan / education / equipment / handoff / discharge as **governed recommendations**.
6. French + English i18n; ED / Obs / IP hosts; characterization tests mirroring D4B.4.
7. Prefer **CERTIFIED WITH DOCUMENTED DEFERRALS**.

---

## 9. Absences (explicit)

- No enterprise rehab workspace module / audit / cert (until this phase)
- No PT/OT/SLP RoleCode, profession, EncounterNoteType, consult order codes
- No IDDSI / texture diet-order engine, DME procurement, therapy scheduling/staffing
- No reusable PT/OT/SLP evaluation engines (classes **A/B/C** empty today)

---

*End of audit — implementation may begin.*
