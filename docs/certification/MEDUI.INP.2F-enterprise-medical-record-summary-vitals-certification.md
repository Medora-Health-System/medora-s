# MEDUI.INP.2F — Enterprise Inpatient Medical Record Summary + Vitals Authority Convergence

**Certification ID:** `MEDUI.INP.2F`  
**Branch:** `medui-inp2f-enterprise-medical-record-summary-vitals`  
**Base SHA (origin/main after PR #149):** `482479ff8b495ec03489ba63a7138931bd8b3764`  
**HEAD (implementation uncommitted):** same base + local INP.2F working tree  
**Worktree:** `.worktrees/inp2f`  
**Date:** 2026-08-20  

**Live fixture (non-PHI):** Facility `4687866b-a30e-4123-b02a-2287d6518bf0` — Clinique Bon Samaritain (Haiti); OPEN INPATIENT encounter `9c1296eb-c7a6-403c-96a2-b81f16205e82`; RN `rn@medora.local` (Marie Claire). Web `http://localhost:3012` · API `http://localhost:3001`.

**Gates:** commit = NO · push = NO · PR = NO · merge = NO · deploy = NO

---

## Phase 0 — Lineage / safety

| Check | Result |
|---|---|
| PR #149 merged into `origin/main` | **Yes** — merge commit `482479ff8` (INP.2E.2) |
| Branch from `origin/main` | **Yes** |
| Restored Summary component | `InpatientEncounterMedicalRecordSummaryView` (new read-only projection); sticky `section=summary` restored |

### Original Summary lineage

| Item | Finding |
|---|---|
| Former panel | `InpatientProviderWorkspacePanel` `mode="summary"` — light provider synthesis card |
| Removal | Commit `228a41988` (INP.2A) removed Summary from sticky nav / redirected to Overview |
| INP.2F | Summary sticky again (after Overview); Overview kept; Timeline still redirects to Overview |

**Sticky nav (live FR):** Vue d’ensemble · Dossier médical · Admission infirmière · Évaluation infirmière · Revoir les ordonnances · MAR · Revoir les résultats · Plan de soins · Sortie

---

## Authoritative engines reused (no second clinical store)

| Domain | Authority |
|---|---|
| Overview | `InpatientOverviewView` / `projectInpatientOverview` (unchanged role) |
| Nursing Admission | `fetchNursingAdmissionDocumentation` + `projectNursingAdmissionOverview` |
| Nursing Assessment | `GET …/inpatient-nursing-assessment-events` + `projectInpatientNursingAssessmentOverview` |
| Provider | `fetchProviderWorkspace` |
| Orders / MAR | `fetchOrdersForEncounter` / `GET …/medication-administrations` |
| Results | Enterprise `EmergencyResultsPanel` (`canAcknowledgeResults={false}`) |
| Vitals | Enterprise triage PUT + `TriageVitalsReading` + `vitals-history` + `VitalSummaryPanel` |
| Print | `printEncounterChartLivePreview` / `fetchEncounterChartPreviewData` |
| Letterhead | `buildRxPrintFacilityIdentity` / `projectFacilityPrintIdentity` (dynamic) |
| Header vitals | `projectHospitalHeaderVitalsLiteFromJson` + `readCanonicalVitalsMeasurements` |

**New persistence:** **None.** No `summaryJson` clinical copy. No new vitals/MAR/results/nursing engines. Opening Summary creates **zero** MedicationAdministration POSTs (MAR count remained **13** after Summary GET bundle).

---

## Vitals root cause (exact)

Canonical storage already used `bpSys`/`bpDia`/`heightCm`/`weightKg`. Defects were **projection-only** (header bootstrap aliases `systolic`/`sbp`; hardcoded null height/weight).

### Live write proof (enterprise PUT `/encounters/:id/triage` with `measuredAt`)

| Field | Written | Authoritative response | Header bootstrap | Overview Current | Summary vitals table |
|---|---|---|---|---|---|
| BP | 126 / 78 | `bpSys=126`, `bpDia=78` | systolic/diastolic **126/78** | **126/78** | **126/78** |
| Height | 170 cm | `heightCm=170` | **170** | (header dual) | **170 cm** |
| Weight | 84.37 kg | `weightKg=84.37` | **84.37** | header **84.4 kg** (display round) | **84.4 kg** |
| HR/RR/Temp/SpO₂/Pain | 82 / 16 / 36.8 / 98 / 2 | canonical keys | all present | Current row present | history row present |

`vitals-history` gained ACTIVE reading; `patient.latestVitalsJson` refreshed. **No new inpatient vitals persistence.**

---

## Live UAT gates A–O

| Gate | Result | Evidence |
|---|---|---|
| **A Navigation** | **PASS** | Nine sticky modules live; `?section=summary` mounts `inpatient-panel-summary-live`; Overview still operational dashboard |
| **B Summary authority** | **PASS** | Read-only projection banner; domains from existing GETs; empty domains not invented; no `summaryJson` |
| **C BP** | **PASS** | Write → canonical → reload → header/Overview/Summary **126/78** |
| **D Height** | **PASS** | UI/API chain via enterprise triage; `heightCm=170` projected |
| **E Weight** | **PASS** | `weightKg=84.37` projected (display 84.4); BMI only if derived at presentation |
| **F Existing vitals** | **PASS** | HR/RR/Temp/SpO₂/Pain on header + Summary history |
| **G Nursing** | **PASS** | Admission: Signé · Marie Claire · RN · clinical times; Assessment: REASSESSMENT · author · clinical time from events authority |
| **H Provider** | **PASS (honest empty signed H&P)** | Workspace exposes `hpDraft.status=DRAFT`; Summary shows draft state — no signed H&P invented |
| **I Orders/MAR** | **PASS** | Orders + MAR labels from authority; Summary `data-readonly`; no MAR POSTs on open |
| **J Results** | **PASS** | Enterprise panel: CMP analytes/values/ranges/units; radiology indication/technique/findings/impression; not smashed `resultText` wall |
| **K Print** | **PASS** | Print Entire Chart → composed HTML (~40k); centered `.facility-letterhead`; name **Clinique Bon Samaritain (Haiti)**; patient identifiers; **no** sticky nav/buttons; clinical content incl. BP; no clinical mutation |
| **L Facility generalization** | **PASS** | No facility UUID/name hardcodes in Summary/print/vitals projector; letterhead from session facility; Haiti address lines empty in care profile (dynamic empty, not hardcoded) |
| **M EN/FR** | **PASS (FR live; EN catalog mirrored)** | FR live: Dossier médical, Signes vitaux, TA, Taille, Poids, documentation infirmière/médicale, Ordonnances, MAR, Résultats, Imagerie, Plan de soins, Sortie, Imprimer le dossier complet. EN keys mirrored in `inpatientMedicalRecordSummaryInp2f.en.ts`. Haiti facility language forces FR for product chrome |
| **N Roles** | **PASS** | RN read access; Summary readonly; MFA not weakened (RN `mfaEnabled=false` pre-existing) |
| **O Reload** | **PASS** | After reload/navigation, Summary remounts with BP/height/weight/nursing/orders/MAR/results from authority |

### Live defects fixed during UAT (INP.2F scope only)

1. Nursing Assessment projection used nested `.assessment.assessment` — empty section; fixed to project event `assessment` V1.  
2. Nursing Admission omitted signer/credentials — now includes `nurseSignature.displayName` / `credentials` / `signedAt`.  
3. Orders/MAR display ignored `items[].notes` / `medicationLabelSnapshot` / `administeredBy` — fixed field mapping.  
4. UAT web required `NEXT_PUBLIC_INPATIENT_*` flags in worktree `apps/web/.env.local` (local only; not a clinical redesign).

### English leaks observed (reported; not all fixed)

API/clinical enums and shared Results chrome still surface English tokens in FR UI (e.g. `PLACED`, `CANCELLED`, `DRAFT`, `REASSESSMENT`, `SAVED`, `ALERT`, `ADMIN`, event narrative “Inpatient encounter open — provider review pending”, Results “urgences”/“Vue cockpit”). Medication/lab names intentionally untranslated. No new INP.2F i18n chrome leaks for Summary title/print/vitals labels.

---

## Tests / builds / Prisma

| Gate | Result |
|---|---|
| Shared `vitalsCanonicalFields` + sticky-nav recovery | **Pass** (9 tests) |
| Web chrome + compact header | **Pass** (30 tests) |
| Overview d4a34 + MAR INP.2E.2 | **Pass** (25 tests) |
| `@medora/shared` build | **Pass** |
| API `tsc -p tsconfig.build.json` | **Pass** |
| API `nest build` | **Pass** |
| API full `tsc -p tsconfig.json` | Pre-existing e2e/spec errors (professionCode / vitest) — **out of INP.2F** |
| Web `tsc --noEmit` | **Pass** (after Summary cast fix) |
| Web production build | **Pass** |
| Prisma validate | **Pass** |
| Migration | **NONE** |
| Seed | **NONE** |
| `git diff --check` | **PASS** (exit 0) |

---

## Remaining risks

1. Haiti facility print **address** fields empty in care profile — letterhead name centers correctly; address lines omit when unset.  
2. Provider H&P remains **DRAFT** on fixture — Summary correctly does not invent a signed note.  
3. Browser print pop-up may be blocked in automation; composition verified via print HTML capture.  
4. Facility default language locks FR on Haiti; EN product strings proven via mirrored catalogs + login EN chrome, not a second facility clinical walk.  
5. Production `next build` can disturb a concurrent `next dev` process — restart dev after build for further UI work.

---

## Certification recommendation

**CERTIFIED — MEDUI.INP.2F**

Live medical-record Summary, print letterhead, and vitals authority convergence gates **passed** on OPEN non-PHI inpatient encounter `9c1296eb-…` with RN session. Summary is the official read-only encounter medical-record projection; BP/height/weight defects were projection bugs against canonical storage.

Do **not** commit, push, PR, merge, or deploy until explicitly authorized.
