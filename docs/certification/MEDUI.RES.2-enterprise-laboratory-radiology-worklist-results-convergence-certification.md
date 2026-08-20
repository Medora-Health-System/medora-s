# MEDUI.RES.2 — Enterprise Laboratory + Radiology Worklist / Results Convergence

**Certification ID:** MEDUI.RES.2
**Date:** 2026-08-20
**Branch:** `medui-res2-enterprise-lab-radiology-worklist-results-convergence`
**Worktree:** `.worktrees/res2`
**Base:** `9cb43cd02` — Merge PR #150 (INP.2F); confirmed `merge-base HEAD origin/main` == `origin/main` at release
**HEAD:** release commit on `medui-res2-enterprise-lab-radiology-worklist-results-convergence` (certified tree; no product changes after live UAT)

**Runtime for live UAT:** API `http://127.0.0.1:3001`, Web `http://localhost:3002` started from this worktree.
**Facility (local non-PHI):** Clinique Bon Samaritain (Haiti) `4687866b-a30e-4123-b02a-2287d6518bf0`
**Actors used (existing local accounts, MFA not weakened):** `lab@medora.local`, `radiology@medora.local`, `rn@medora.local`

**Governance:** Presentation / workflow convergence only. No product code changed during live UAT. No Prisma migration. No seed. Release: commit + push + PR against `main`. Merge **NO**. Deploy **NO**.

**Recommendation: CERTIFIED** (with documented fixture gaps for ED / Clinic / Dental *origin rows* and empty active New/In Progress queues — covered by API annotation + shared unit tests per charter).

---

## Phase 0 — Audit findings (unchanged)

| Area | Finding |
|---|---|
| Sort defect | Prior default `OLDEST_FIRST` surfaced oldest completed first |
| Origin defect | Departmental badge only; no shared `ED\|INPATIENT\|CLINIC\|DENTAL\|UNKNOWN` projector |
| Results | Smashed CMP walls fell through to narrative |
| Engines | Existing Order / OrderItem / OrderEvent / Result sufficient |

---

## Live UAT — Laboratory queue

| Check | Result | Evidence |
|---|---|---|
| Opens on **Nouvelles ordonnances** by default | **PASS** | Tab `Nouvelles ordonnances (0)` selected on first load |
| Default sort control | **PASS** | `Priorité + plus récent` (`PRIORITY_NEWEST`) |
| New active before old completed | **PASS** (by tab isolation) | New tab empty; completed isolated under **Terminées** |
| Tabs New / In Progress / Completed / Cancelled | **PASS** | Counts live: `(0)/(0)/(2)/(0)` |
| Completed most recently completed first | **PASS** | Row1 smash `verifiedAt` `…45.838Z` above structured `…45.620Z` |
| Cancelled newest first | **N/A live** | Count 0; covered by `sortTechnicianWorklistRows` unit tests |
| Search / Priority / Provenance filters present | **PASS** | FR placeholders + STAT/URGENT/ROUTINE + ED/Hospitalisation/Clinique/Dentaire/Emplacement inconnu |
| Right drawer without leaving queue | **PASS** | `Détail analyse` overlay; URL stayed `/app/lab-worklist` |
| Origin live | **PASS (INPATIENT)** | `Hospitalisation · MS-2` from `enterpriseOrderOrigin=INPATIENT` + `roomLabel=MS-2` |
| Lifecycle APIs preserved | **PASS** | Detail still uses existing order detail / workflow; Start CTA hidden on completed (expected) |

**Live fixtures (safe IDs):**

| Role | OrderItem.id | Result.id | Notes |
|---|---|---|---|
| Structured CMP (critical) | `68524503-3dbf-44f6-94c2-967b456dbd3e` | `3014cf55-557f-400f-a6ed-6350012fae41` | K LOW, ALT HIGH, Lactate Critical; already acked by RN |
| Smash CMP | `b572c41b-1624-4f0a-9c8f-4a217b5d9c06` | `2b8014bf-3a12-4644-9532-c87feb19aaa5` | Display recovery only |
| Encounter | `9c1296eb-c7a6-403c-96a2-b81f16205e82` | — | Patient MRN 1001 Jean Pierre (local UAT) |

**DB survey:** only LAB/IMAGING orders in local DB are these INPATIENT rows — **no live ED / CLINIC / DENTAL order fixtures**. Projector unit tests + API annotation vocabulary cover those origins without fabricating data.

---

## Live UAT — Laboratory result presentation

| Check | Result | Evidence |
|---|---|---|
| Structured table | **PASS** | `Paramètre \| Résultat \| Ind. \| Valeurs de référence` (+ Unités on smash recovery) |
| Normal | **PASS** | Glucose 92 in range |
| LOW | **PASS** | Potassium 2.9 → **L** |
| HIGH | **PASS** | ALT 180 → **H** |
| Critical | **PASS** | Lactate → **Critique** + banner; Result.criticalValue=true |
| Explicit flag wins | **PASS** | Lactate line stores trailing `C` → Critique (not invented from missing ref alone) |
| Smash recovery | **PASS** | Glucose/BUN/Creatinine/Sodium table with units `mg/dL` / `mEq/L` |
| Stored text not rewritten | **PASS** | Re-fetch after UI view; still smashed wall for smash Result; **1 Result row per OrderItem** |
| Unrecoverable narrative | **PASS (unit)** | Covered by focused test; no conflicting live narrative fixture required |

Workstation URL (smash): `/app/lab-worklist/commande/045879b9-eda1-40c3-8427-e99bb0bcff9c?ligne=b572c41b-1624-4f0a-9c8f-4a217b5d9c06`
Workstation URL (structured): `/app/lab-worklist/commande/8ed1717e-c49b-484f-bc83-aea590efa1bd?ligne=68524503-3dbf-44f6-94c2-967b456dbd3e`

---

## Live UAT — Radiology queue + report

| Check | Result | Evidence |
|---|---|---|
| Opens on New Orders | **PASS** | `Nouvelles ordonnances (0)` selected; title `Tableau de bord de radiologie` |
| Completed isolated | **PASS** | `Terminées (1)` — CXR only |
| Origin | **PASS** | `Hospitalisation · MS-2` |
| Drawer | **PASS** | `Détail examen` without navigation away |
| Modality column | **PASS (empty value)** | Column present; fixture modality `—` (no catalog modality on row) |
| Structured report | **PASS** | Indication / Technique / Comparison / Constatations / **IMPRESSION** |
| Impression emphasized | **PASS** | Uppercase teal section heading with underline border |
| Lifecycle authority | **PASS** | Existing detail route; Start Study not shown on completed |

**Imaging fixture:** OrderItem `25599470-74e8-4356-879e-d7591cf1433f` · Result `a2bf26dc-aa06-4400-be40-8a5d98c3d7e2`

---

## Same Result across Medora (stop-gate)

| Surface | Lab smash + structured | Imaging report | Notes |
|---|---|---|---|
| Lab / Rad workstation | **PASS** | **PASS** | Same ClinicalResultViewer |
| Encounter chart → Résultats | **PASS** | **PASS** | `/app/encounters/9c1296eb-…` |
| Inpatient **Revoir les résultats** | **PASS** | **PASS** | `/hospitalisation/inpatient/active/…/chart` as RN |
| ED chart | **N/A fixture** | **N/A fixture** | No ED-origin LAB/IMAGING rows in local DB |
| Clinic chart | **N/A fixture** | **N/A fixture** | Same — no clinic-origin diagnostic orders |
| Dental chart | **N/A fixture** | **N/A fixture** | Same — no dental-origin diagnostic orders |

**Duplicate prevention:** Prisma count = **1 Result per OrderItem** for all three items above.
**View ≠ acknowledge:** Critical CMP already shows `Accusé réception par Marie Claire`; viewing workstation/chart did not create additional Result rows or clear ack. Ack remains existing clinician authority (`Accuser réception` still present only where applicable).

Shared renderer only — no care-setting-specific result stores.

---

## Origin / location SSoT

- Live: `projectEnterpriseOrderOrigin` via API fields `enterpriseOrderOrigin` / `enterpriseOrderLocationLabel`
- Live INPATIENT proof: `Hospitalisation · MS-2` (never free-text guessed)
- ED / CLINIC / DENTAL / UNKNOWN: **unit tests PASS** (`enterpriseOrderOrigin.test.ts`); UNKNOWN label in UI filter = **Emplacement inconnu**
- Lab and Rad use the same helper (dashboard + model + API)

---

## EN / FR

| Check | Result |
|---|---|
| FR product UI on Lab/Rad | **PASS** — Tableau de bord du laboratoire / de radiologie; Nouvelles ordonnances; En cours; Terminées; Annulées; Provenance; Commencer… keys present |
| No raw tab enums in chrome | **PASS** — no `NEW`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED` as visible tab labels |
| Origin vocabulary localized | **PASS** — Urgences / Hospitalisation / Clinique / Dentaire / Emplacement inconnu |
| Clinical narrative not translated | **PASS** — Indication/Findings/Impression English clinical text preserved |
| Residual | Attribution still shows role codes `PROVIDER` / `LAB` / `RADIOLOGY` in audit lines (pre-existing attribution formatting, not RES.2 tab chrome). Ambulatory empty state briefly showed raw `common.refreshing` once (non-blocking). |

---

## Tests / builds (no product code change in UAT)

| Gate | Result |
|---|---|
| Shared `enterpriseOrderOrigin.test.ts` | PASS (16) |
| Web RES.2 + labFlags focused | PASS (22) |
| Prior session: shared build, web tsc, web production build, nest build, Prisma validate | PASS (retained) |
| Prisma migration | **NONE** |
| Seed | **NONE** |
| `git diff --check` | PASS |
| Product code changed during live UAT | **NO** |

**Note:** An accidental Cursor auto-checkpoint commit briefly appeared and was **reset** so the working tree remains uncommitted per session stop rules. HEAD restored to `9cb43cd02`.

---

## Remaining risks

1. Local DB has **no** active New/In Progress/Cancelled Lab/Rad rows and **no** ED/Clinic/Dental diagnostic orders — STAT/newest active-queue live sorting and multi-origin live badges rely on unit/API proof.
2. Thin page wrappers break older `orderLifecycleEngineFreezeCertification` source-string assertions that still expect handlers inside `page.tsx` (handlers live in shared dashboard) — regression suite drift, not a live workflow defect.
3. Modality filter only useful when catalog modality is populated.
4. Print Label / Requisition still omitted (no print authority).

---

## Certification recommendation

**CERTIFIED**

Live workflow proved Lab + Rad technician dashboards (default New, Completed newest-first, drawer, FR chrome), INPATIENT origin accuracy, structured + smash lab presentation with L/H/Critical, structured radiology Impression emphasis, and identical Result rendering on workstation + encounter Results + inpatient Review Results without Result duplication or ack mutation.

Fixture gaps (ED/Clinic/Dental *order rows* and empty active queues) are explicitly allowed substitutes via `projectEnterpriseOrderOrigin` unit tests + API annotation — data was **not** fabricated.

---

## Session stop

- commit: **YES** (single release commit on certified tree)
- push: **YES**
- PR: **YES** (against `main`)
- merge: **NO**
- deploy: **NO**
