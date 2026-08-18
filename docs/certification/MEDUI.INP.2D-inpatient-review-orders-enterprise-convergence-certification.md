# MEDUI.INP.2D — Certification evidence (gap-closure pass)

**Certification id:** MEDUI.INP.2D  
**Program:** MEDUI.INP.2  
**Branch:** `inp2d-review-orders-enterprise-convergence`  
**HEAD:** `d85860136` (`Merge pull request #141` — INP.2B.1 on main)  
**Pass:** Final gap-closure (RN action visibility, due/overdue authority, pharmacy boundary, Overview rail)  
**Verdict (local):** **MEDUI.INP.2D CERTIFIED** — not committed / not pushed / no PR / not merged / not deployed

The prior live UAT was treated as **CERTIFIED WITH BLOCKING DEFERRALS — NOT MERGE READY**. This pass closes those deferrals honestly. MFA was **not** weakened. Prisma / migration / seed: **NONE**. INP.2E and INP.2D.1 were **not** started. The order engine was **not** redesigned.

---

## Environment

| Item | Value |
|---|---|
| API | `http://127.0.0.1:3001` — `/health` **200** |
| Web | `http://localhost:3002` — Next.js 15.5.13 |
| Database | Local PostgreSQL |
| Prisma / migration / seed | **NONE** |
| Facility | Clinique Bon Samaritain (Haiti) `4687866b-a30e-4123-b02a-2287d6518bf0` |
| Encounter | OPEN inpatient `9c1296eb-c7a6-403c-96a2-b81f16205e82` |
| RN | `rn@medora.local` — userId `0a58567f-0520-4e27-8af9-8d919011ad10` |
| PROVIDER | `provider@medora.local` — MFA via existing `decryptMfaSecret` + TOTP |
| ADMIN | `admin@medora.local` — same MFA path |
| PHARMACY | `pharmacy@medora.local` — `mfaEnrollmentRequired`; **not enrolled** |
| Header | `x-facility-id: 4687866b-a30e-4123-b02a-2287d6518bf0` |
| Workspace | `/app/hospitalisation/inpatient/active/9c1296eb-c7a6-403c-96a2-b81f16205e82/nursing?section=orders` |
| Password | `MedoraAdmin123!` |

---

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Clinical orders | `Order` / `OrderItem` / `OrderEvent` | ✔ | ✔ projection only | ✔ |
| Cancel authority | Shared `orderCancelPolicy` (API + UI) | ✔ | ✔ extracted to shared | ✔ |
| Order lifecycle | Frozen `orderItemLifecycle` | ✔ | ✖ | ✔ |
| Medication orders | MEDICATION `OrderItem` + lifecycle service | ✔ | ✖ | ✔ |
| MAR | `MedicationAdministration` + `MedicationAdministrationTab` | ✔ link only | ✖ | ✔ |
| Dose timing | `MedicationDoseInstance` / MAR timeline | ✔ unused by Review Orders | ✖ | ✔ |
| Lab / imaging | Same Order engine + `Result` | ✔ | ✖ | ✔ |
| CARE / consults / diet / activity / precautions | Canonical CARE catalog | ✔ grouping | ✖ | ✔ |
| Pharmacy verification | `POST …/pharmacy-verification/complete` `@RequireRoles(PHARMACY, ADMIN)` | ✔ | ✖ | ✔ |
| Overview / rail | INP.2A `projectInpatientOverview` | ✔ same GET orders | ✔ counts overlay | ✔ |
| Nursing Admission | INP.2B family | ✔ | ✖ | ✔ |
| Nursing Assessment | INP.2C family | ✔ | ✖ | ✔ |
| ED / Observation cockpits | `EmergencyErOrdersPanel` | ✔ unchanged | ✖ | ✔ |
| Patient / facility / MRN | Enterprise identity | ✔ | ✖ | ✔ |

---

## Gap 1 — RN must not see provider-only cancel / discontinue

**Root cause:** Review Orders previously allowed cancel chrome for RN on provider-owned lines while the API returned **403**.

**Fix:** UI cancel uses the same enterprise policy as the API (`packages/shared/src/orders/orderCancelPolicy.ts` → `orderCancelPolicyAllowsRequestor`). Hold / discontinue / prescribe remain `canPrescribe` (PROVIDER/ADMIN). Panel renders **Annuler** / **Cancel** only when `actions.canCancel`.

| Proof | Result |
|---|---|
| Unit: RN on provider-owned line `canCancel=false`, `canHoldDiscontinue=false` | PASS |
| Unit: Provider on same line `canCancel=true`, `canHoldDiscontinue=true` | PASS |
| Unit: RN may cancel own ORDERED / verbal-protocol line | PASS |
| Live API: RN cancel/discontinue/hold on provider CARE + MED **403** | PASS |
| Live bedside: `data-testid=inpatient-review-order-cancel-*` count **0**; no « Gérer le médicament » | PASS |
| EN `Cancel` / FR `Annuler` exist as i18n keys; hidden by authority, not by language | PASS |

API guards are unchanged (defense in depth).

---

## Gap 2 — Due / overdue / scheduled (authoritative only)

### Architecture (audit — no Prisma)

| Field | Where | Use in Review Orders |
|---|---|---|
| `OrderItem.intendedAdministrationAt` | Prisma; comment: one-shot clinical time, **not** recurrence | Class **A** for **non-MAR** lines |
| `OrderItem.frequencyCode` | Prisma; medication cadence | Class **B** → **Scheduled**, never Due/Overdue by itself |
| `due` / `overdue` / `dueAt` / `nextDueAt` / `overdueAt` | **Not** Prisma columns | Honored **if** GET payload carries them (A_EXPLICIT); not invented |
| `effectiveClinicalAt` | CARE documentation-of-performance | **Not** due time |
| `MedicationOrderSchedule` | Recurrence rows | **Not** read (no second scheduler) |
| `MedicationDoseInstance` | MAR dose instances (dormant/MAR) | Class **D** — Review Orders **must not** use as due |

**CARE write path:** `buildOrderItemCreateInput` persists `intendedAdministrationAt` **only for MEDICATION**. CARE create accepts the field in JSON then **drops** it. Live UAT: CARE posted with `intendedAdministrationAt=2020-01-01` → persisted **null** → not Overdue.

**Classification**

| Class | Meaning | Bucket |
|---|---|---|
| **A_EXPLICIT** | `due`/`overdue` flags or durable timestamps on a **non-MAR** line | Due / Overdue / Scheduled from clock |
| **B_FREQUENCY** | `frequencyCode` only (non-PRN) | Scheduled, not Due |
| **C_UNSCHEDULED** | No due semantics | **Active**, not falsely Due |
| **D_MAR_DOSE** | `ADMINISTER_CHART` (or default) medication | Frequency may show Scheduled; **dose Due/Overdue stays MAR** |

**STOP before migration:** Nursing CARE still has **no durable due time** on create. Closing that would be an order-engine **write** extension on an existing column (or a new `dueAt` column). That is **not** an INP.2D projection change and was **not** done.

Live GET on this encounter projected only `C_UNSCHEDULED,D_MAR_DOSE`. Unit tests prove A_EXPLICIT when fields exist. Viewing does not change due/completion.

---

## Gap 3 — Pharmacy verification

`POST /orders/items/:id/pharmacy-verification/complete` is `@RequireRoles(PHARMACY, ADMIN)`. MFA was not disabled.

| Path | Result |
|---|---|
| RN complete | **403 PASS** (CARE line and provider MED line) |
| ADMIN complete on UAT acetaminophen | **400** « Ce médicament ne requiert pas de vérification pharmacie. » — ADMIN **reached** the same endpoint (not Pharmacy user; not a VERIFIED row) |
| `pharmacy@medora.local` | **DEFERRED** — `mfaEnrollmentRequired`; not enrolled |

Positive **VERIFIED** row was not produced. Catalog fishing for a `requiresPharmacyVerification` medication was not performed. Do not claim Pharmacy live UAT ran.

---

## Overview / right-side

INP.2A Overview now fetches the **same** `GET /encounters/:id/orders` + order-events as Review Orders, projects with `projectInpatientReviewOrders`, and overlays counts (new/unreviewed, STAT, due nursing-actionable, overdue nursing-actionable, held). No new persistence. MAR due rail remains MAR synthesis, not Review Orders dose timing.

---

## Live gate table

| Gate | Result |
|---|---|
| **A** RN acknowledge | **PASS** (API 200 + bedside Accuser réception) |
| **B** RN provider-actions hidden | **PASS** (no Annuler/cancel testid; no hold/DC chrome) |
| **C** RN direct provider mutation denied | **PASS** (cancel/hold/DC/prescribe **403**) |
| **D** Provider create | **PASS** (CARE + standing MED BID) |
| **E** Provider hold/resume | **PASS** |
| **F** Provider discontinue | **PASS** |
| **G** New/unreviewed projection | **PASS** (bucket + Overview overlay) |
| **H** Due projection | **N/A-authority** live (no A_EXPLICIT CARE/MED on GET); **PASS** unit when `due` / timestamps exist |
| **I** Overdue projection | **N/A-authority** live (CARE intended time not persisted; MAR not overdue); **PASS** unit for past `intendedAdministrationAt` on non-MAR |
| **J** Scheduled projection | **PASS** (live `SCHEDULED` from frequency; unit future intended) |
| **K** Held projection | **PASS** (unit + provider hold lifecycle) |
| **L** Discontinued projection | **PASS** (live primary bucket DISCONTINUED) |
| **M** Completed projection | **PASS** (bucket chrome + unit) |
| **N** MAR administration isolation | **PASS** (0 `POST …/medication-administrations`; Open MAR navigates only) |
| **O** Pharmacy/ADMIN verification positive | **DEFERRED** (Pharmacy MFA not enrolled; ADMIN 400 on non-required med — authorized path, not VERIFIED) |
| **P** RN pharmacy verification denied | **PASS** |
| **Q** EN | **PASS** (mirrored keys; Review Orders / Due / Overdue / Scheduled / Held / Discontinued / Completed / Acknowledge / Cancel) |
| **R** FR | **PASS** (Revoir les ordonnances / À faire / En retard / Planifiées / Suspendues / Arrêtées / Terminées / Accuser réception / Annuler) |
| **S** ED regression | **PASS** (`EmergencyErOrdersPanel` still ED/Observation; trackboard tests) |
| **T** Observation regression | **PASS** (d3d + d3da departmental) |
| **U** Nursing Admission regression | **PASS** (INP.2B family tests + live GET 200) |
| **V** Nursing Assessment regression | **PASS** (INP.2C tests + live GET 200/404) |
| **W** Builds / Prisma / diff-check | **PASS** (shared build, web `tsc --noEmit`, nest build, prior `next build`, prisma validate, `git diff --check`; Prisma **NONE**) |

---

## Automated gates (this pass)

| Suite | Result |
|---|---|
| Shared INP.2D + admission + observation order | **36/36 PASS** (projection **17/17**) |
| Shared nursing assessment | **11/11 PASS** |
| Web INP.2D + Overview/chrome + 2B + MAR + ED + Observation | **119/119** then + **27** assessment + **3** d3da |
| API `orders-cancel` + medication lifecycle | **17/17 PASS** |
| `git diff --check` | PASS |
| Prisma validate | PASS — no schema change |

---

## Bedside (RN Haiti FR)

`uat-inp2d-review-orders-browser.mjs`: panel **PASS**; buckets New/Active/Due/Overdue/Scheduled/Held/Discontinued/Completed **PASS**; groups **PASS**; RN cancel hidden **PASS**; Open MAR **PASS**; **0** MAR POSTs; not ED cockpit **PASS**. Screenshots: `/tmp/inp2d-uat/`.

---

## Governance

- **commit:** NO  
- **push:** NO  
- **PR:** NO  
- **merge:** NO  
- **deploy:** NO  

Working tree remains dirty on `inp2d-review-orders-enterprise-convergence`.

---

## Remaining (non-blocking / documented)

1. No Haiti `PATIENT_CARE_TECH` user — PCT live login not exercised; GET already excludes PCT.  
2. Pharmacy user MFA enrollment not performed; no live VERIFIED row.  
3. Nursing CARE due/overdue remains **N/A** until the order **write** path persists a durable due time (existing `intendedAdministrationAt` or a future column). Do not invent due from labels.  
4. CARE consult OrderItems vs JSON consults remain two stores.

## Recommendation

Accept **MEDUI.INP.2D CERTIFIED** on this local dirty tree: RN visibility matches API, due/overdue is honest against authority (N/A where the engine has none), MAR boundary intact, provider lifecycle pass, pharmacy boundary documented without a false live Pharmacy test. Authorize commit / PR only when policy requires; this session did not commit, push, PR, merge, or deploy.
