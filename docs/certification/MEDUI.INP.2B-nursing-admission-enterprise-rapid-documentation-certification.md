# MEDUI.INP.2B — Certification evidence

**Certification id:** MEDUI.INP.2B  
**Branch:** `inp2b-nursing-admission-enterprise-rapid-documentation`  
**Verdict (local):** **MEDUI.INP.2B CERTIFIED** — not merged / not deployed / no commit

**Live encounter:** `9c1296eb-c7a6-403c-96a2-b81f16205e82` (OPEN inpatient, Clinique Bon Samaritain Haiti)  
**Actors exercised:** RN (`rn@medora.local`), PROVIDER (`provider@medora.local`), facility ADMIN (`admin@medora.local`), platform principal alone (`atranchant@medora.local` with facility ADMIN temporarily deactivated then restored)

## Live UAT A–Q

| Gate | Result | Evidence summary |
|---|---|---|
| A RN starts admission | **PASS** | UI opens Admission infirmière; Save Draft / Save & Continue present; no false read-only; facility Haiti; no architecture strings |
| B Save draft / reload | **PASS** | Live PATCH + GET + UI Save Draft; values persist with author/timestamp |
| C Arrival rapid documentation | **PASS** | Source / mode / interpreter / Other path exercised; no silent clinical defaults |
| D Inline history / allergy review | **PASS** | MEDICAL_HISTORY + ALLERGIES review acknowledgements persisted; allergy header Penicillin projected (no nursing-only allergy list) |
| E Home medication review | **PASS** | HOME_MEDICATIONS review + source acknowledgment; no second med list |
| F Code status / directives boundary | **PASS** | Header projection “En-tête patient”; advanceDirectiveKnown nursing review only; no competing code-status write |
| G Safety / fall / isolation | **PASS** | Fall precautions persisted; isolation remains header/ops authority |
| H Mobility / skin / nutrition | **PASS** | Rapid mobility / skin / nutrition / elimination answers persisted |
| I Psychosocial / discharge baseline | **PASS** | Residence / social work / case management screening only; not discharge authorization |
| J Save and continue stages | **PASS** | Previous/Next/Save Draft/Save & Continue; Étape X / 6 · Complété Y / 20; open ≠ complete |
| K Overview projection | **PASS** | Overview shows source/mode/interpreter/reviews/mobility/skin/residence; Continuer l’admission infirmière; read-only |
| L Right-side context | **PASS** | Contexte d’admission rail; `data-persistence="none"`; no rail write CTA |
| M Provider read-only | **PASS** | Live API GET 200; PATCH/sign/verify **403** Required roles: RN, ADMIN (MFA enrolled properly, not weakened) |
| N Facility admin governance | **PASS** | Facility ADMIN PATCH allowed; MEDORA_SUPER_ADMIN alone (ADMIN row deactivated) GET/PATCH **403** (ADMIN restored after proof) |
| O French bedside workflow | **PASS** | After UAT defect fix: condition chips + OVERVIEW field labels French; no STABLE/GUARDED raw leaks |
| P Nursing Assessment regression | **PASS** | Assessment board + Ajouter une colonne intact; separate from Admission |
| Q ED / Observation regression | **PASS** | Observation focused 7/7 PASS; no Nursing Admission coupling. Broad `emergency` suite has pre-existing print/locale fails unrelated to INP.2B |

## Defects found during UAT

1. **FR condition-on-arrival chips leaked raw codes** (`STABLE`, `GUARDED`, …) via `catalogAsOptions` underscore formatting (INP.2B).  
2. **FR OVERVIEW free-text field labels** still English in `hospitalAdmissionD4a25.fr.ts` (visible on bedside FR) (INP.2B i18n scope).  
3. **Partial section PATCH replaces answers** (admin UAT sent `{comments}` only and wiped arrival fields) — **pre-existing API merge semantics**; UI sends full answer objects; not redesigned in this gate.

## Defects fixed

1. Added `CONDITION_ON_ARRIVAL_RAPID_OPTIONS` (bilingual) and wired rapid OVERVIEW control.  
2. Translated visible FR OVERVIEW field labels + condition option strings used by structured form/overview.

## Automated gates (post-fix)

| Suite | Count |
|---|---|
| `nursingAdmissionRapidDocumentationInp2b.test.ts` | **10 / 10 PASS** |
| Focused inpatient web (INP.2B + INP.1B + INP.2A chrome/header/assessment/nav) | **64 / 64 PASS** (8 files) |
| Shared `inpatientWorkspaceRecoveryD4a27b` + `inpatientRapidConvergenceD4a27c` | **12 / 12 PASS** |
| Observation focused | **7 / 7 PASS** |
| API `inpatient-operations` jest filter | **15 / 15 PASS** |
| Broad `emergency`+`observation` vitest | 4 pre-existing fails (print header / disposition locale / archive) — **not INP.2B** |

## Build / schema

| Check | Result |
|---|---|
| shared build | PASS |
| api build | PASS |
| web `tsc --noEmit` | PASS |
| web build | PASS |
| prisma validate | PASS (`The schema at prisma/schema.prisma is valid`) |
| git diff --check | PASS (exit 0) |
| Migration | **NONE** |
| Seed | **NONE** |

## Preservation

- Timeline / Notes / Care Plan / MAR / Discharge engines untouched beyond Overview projection reads  
- Historical care-plan cert **INP.2** untouched  
- No Prisma schema / migration / seed  
- No INP.2C–2H implementation  
- MFA not weakened (PROVIDER/ADMIN enrolled via legitimate enroll/verify)

## Stop gate

**commit = NONE · push = NONE · PR = NONE · deploy = NONE**  
Awaiting operator approval.
