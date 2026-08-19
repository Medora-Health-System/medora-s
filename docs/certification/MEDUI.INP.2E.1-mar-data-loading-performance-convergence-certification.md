# MEDUI.INP.2E.1 — MAR data-loading & performance convergence

**Certification id:** MEDUI.INP.2E.1  
**Program:** MEDUI.INP.2  
**Branch:** `medui-inp2e1-mar-data-loading-performance-convergence`  
**Base:** `origin/main` `77508bc5d` (`Merge pull request #145` — INP.2D.1 Orders restoration)  
**HEAD (uncommitted):** same as base + working tree (INP.2E.1 only)  
**Verdict (local):** **MEDUI.INP.2E.1 CERTIFIED**  
**Prisma / migration / seed:** **NONE**  
**Commit / push / PR / merge / deploy:** **NO**  
**INP.2E.2:** **NOT STARTED** (DUE/OVERDUE shortcut not restored)

INP.2D / INP.2D.1 / Nursing Admission / Nursing Assessment / RES.1 were **not** reopened. The MAR timeline engine was **not** replaced. MFA was **not** weakened. No new UX.

**Live fixture (operational, non-PHI):** Haiti facility `4687866b-a30e-4123-b02a-2287d6518bf0`; OPEN inpatient encounter `9c1296eb-c7a6-403c-96a2-b81f16205e82`; RN session `rn@medora.local` (Marie Claire). Facility TZ `America/Port-au-Prince`.

This final pass fixed the Gate F projection defect and re-ran the required tests/builds. Timestamps were **not** rewritten: scheduled time still owns the planned cell; clinical/administered time annotates the event; `createdAt` remains audit/provenance.

---

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Medication order | `Order` / `OrderItem` | ✔ | ✖ | ✔ |
| Dose instance | `MedicationDoseInstance` | ✔ | ✔ bind on POST | ✔ no second dose identity |
| Administration | `MedicationAdministration` + existing APIs | ✔ | ✔ persist `medicationDoseInstanceId` | ✔ |
| MAR timeline projection | `MarShiftTimelineService` + `resolveMarUniversalShiftTimelineDosePlacementInstant` | ✔ | ✔ `resolveMarScheduledDoseInstanceShiftCellInstant` for planned-cell ownership | ✔ no second MAR engine |
| MAR UI | `FacilityMarShiftTimeline` + `MedicationAdministrationTab` | ✔ | ✔ load gating only | ✔ no second MAR engine |
| Pass queue | existing `medication-pass-queue` API | ✔ deferred | ✖ | ✔ API retained |
| Order events | existing `order-events` | ✔ deferred from MAR standalone | ✖ | ✔ |
| Allergy | `evaluateMarAllergySafetyForAdministration` + GET encounter | ✔ deferred until administer | ✖ | ✔ no second allergy store |
| Vitals | `vitals-history` / `ClinicalLatestVitalsBanner` | ✔ reuse workspace latest | ✖ | ✔ no second vitals store |
| Clinical ops / med recon | `InpatientClinicalOpsPanel` | ✔ idle-deferred | ✖ | ✔ authority unchanged |
| Correction history | `fetchMedicationAdministrationHistory` | ✔ on-demand | ✖ | ✔ |
| Encounter clinical cache | `EncounterClinicalDataProvider` | ✔ ED/encounter page only | ✖ | ✔ **not** wrapped on inpatient |
| Orders surface | `EmergencyErOrdersPanel` `medicationOrderMode="DEFAULT"` | ✔ INP.2D.1 mount untouched | ✖ | ✔ |

---

## Timestamp authority (do not collapse)

| Concept | Field | Controls |
|---|---|---|
| **Scheduled / planned time** | `MedicationDoseInstance.scheduledAt` | Planned MAR cell ownership, shift membership, hour column for records **with** `medicationDoseInstanceId` (routine scheduled / `FIXED_ADMINISTRATION`) |
| **Clinical documented / administered time** | `MedicationAdministration.administeredAt` / clinical documented time | Event annotation: DONE/REFUSED text, `completionSummary` (`MC 00:15`), late/early if existing policy applies |
| **Server authored / created time** | `createdAt` | Audit / provenance only |

Infusion / IVPB / fluid bolus-continuous / `PRN_EVENT` keep **clinical-time** placement (H9F/H9K). NOW/STAT / unscheduled / legacy rows **without** a dose instance keep existing fallback placement.

---

## Gate F root cause (now fixed)

Prisma already fetched the 09:00 dose on 7A–7P (query is by dose `scheduledAt` / due window).  
`resolveMarUniversalShiftTimelineDosePlacementInstant` correctly used clinical time `00:15` for the **event**. The service then used that instant for:

- `doseOverlapsMarShiftTimelineWindow`
- `resolveMarShiftTimelineColumnKey`

`00:15` is not a 7A–7P hour column → `if (!columnKey) continue` dropped the cell. 7P–7A never fetched the 09:00 dose. Persist was already correct.

**Fix:** `resolveMarScheduledDoseInstanceShiftCellInstant` — scheduled `scheduledAt` owns overlap + column key for scheduled dose instances. Clinical instant still annotates status, actual time, nurse, variance.

---

## GATE 1 — Live dose-instance binding

### Specimen A (original Gate F defect — now reconciled)

| Field | Value |
|---|---|
| Order item | `f47e9b81-c138-4170-8b3b-2416aaead9e2` (`INP2E1 UAT bind acetaminophen 500 mg`) |
| Dose instance | `7ac0fad5-a9f3-44c6-bcaf-07e6bea8ff87` |
| Scheduled | `2026-08-19T13:00:00.000Z` = **09:00** Haiti |
| Clinical administered | `2026-08-19T04:15:00.000Z` = **00:15** Haiti |
| Persisted row | `3f22a202-0803-4222-9260-eca315b0d2e3` — **same** `medicationDoseInstanceId` (exactly one) |
| After fix — 7A–7P | **09A** · `COMPLETED` · `DONE` · `scheduledAt` 13:00Z · `administeredAt` 04:15Z · `completionSummary` **`MC 00:15`** · `readOnly` |
| After fix — 7P–7A | **absent** (does not move to the night shift) |

**E = PASS. F = PASS** for the original vanished cell (reload GET of `mar-shift-timeline`).

### Specimen C — fresh scheduled DUE (required live stop-gate)

Provider MFA created standing BID orders (`INP2E1 recon bind/refuse acetaminophen 500 mg`). Today’s 09:00 instances were promoted to **DUE** (status only; scheduled time unchanged).

| Field | Bind | Refuse |
|---|---|---|
| Order item | `b8c7d924-9440-49f8-84e5-1842cb8cd127` | `2ac07aba-dd36-485a-9da0-f113b0886e6b` |
| Dose instance | `497caf8f-ab2f-4420-b349-74e5cbef49e5` | `a0eef2fc-fe3f-496f-b13d-af9011493bc6` |
| Before | 7A–7P **09A** · **DUE** · `ADMIN` | 7A–7P **09A** · **DUE** · `ADMIN` |
| RN POST | **201** `87a6b09b-c2c8-400d-b00b-812ab5ab9582` · `marAction=administered` · `administeredAt=2026-08-19T04:15:00.000Z` (**00:15**) · **same** dose instance | **201** `e3418ae6-fc54-45b3-a239-5d421c609fb5` · `marAction=refused` · notes `Refused: PATIENT_REFUSED` · **same** dose instance |
| After | **09A** · `COMPLETED` · `DONE` · `MC 00:15` · `readOnly` | **09A** · `COMPLETED` · `REFUSED` · `MC 00:20` · `readOnly` |
| Reload GET | same 09A COMPLETED / `MC 00:15` | same 09A REFUSED / `MC 00:20` |
| Rapid repeat | **400** `Cette dose est déjà terminée` · admin count **1** | admin count **1** |

Stop-gate A–G:

| Check | Result |
|---|---|
| **A** exactly one `MedicationAdministration` | ✔ bind count = 1 |
| **B** same dose instance ID persisted | ✔ `497caf8f-…` |
| **C** original scheduled cell remains visible | ✔ 09A |
| **D** cell → administered/completed | ✔ `COMPLETED` / `DONE` |
| **E** actual clinical time displayed separately | ✔ `scheduledAt` 09:00 vs `MC 00:15` |
| **F** reload preserves it | ✔ second GET identical |
| **G** rapid repeat creates zero extra rows | ✔ 400 + count 1 |

**D = PASS** (fresh scheduled DUE). **E = PASS. F = PASS. G = PASS. H = PASS** (scheduled path).

### Specimen B — NOW/STAT (unchanged existing behavior)

| Field | Value |
|---|---|
| Order item | `9590dbc5-b803-4204-9265-2d83cd67f6aa` |
| Dose instance | `null` (NOW / DIRECT_MAR — expected) |
| Cell | `INP2E1 DONE MC 00:19` on 7P–7A (clinical-time placement preserved) |

---

## GATE 2 — Refusal / missed

### Missed / not-given without reason (J)

UI: **“Un motif est requis.”** — **no POST**. API safety suite still rejects missed without reason.

**J = PASS.**

### Refuse (I)

Scheduled dose-instance refuse is now proven (Specimen C). NOW refuse from the prior pass remains (`be82344a-…`, `MC 00:14`).

**I = PASS.**

---

## GATE 3 — History lazy load

Unchanged from the certified-performance pass: history GET is not on first paint; correction drawer still loads it on demand.

**K = PASS. L = PASS.**

---

## GATE 4 — Provider refresh (MFA not weakened)

Provider login remains **MFA**. This pass: POST 201 for `INP2E1 recon bind/refuse` standing orders. Prior discontinue `a81c93e4-…` still `ANNULÉ` / CANCELLED on 7A–7P.

**N = PASS. O = PASS.**

---

## GATE 5 — Role boundaries

Unchanged. RN live administer/refuse. Provider MFA create. Pharmacy MFA not weakened. PCT still code-proof.

---

## GATE 6 — Cold performance

Prior certified UI remounts (timeline-first, 0 Next RSC, no duplicate standalone MAR bundle):

| | Click → first MAR request | Click → timeline ready | Click → first usable cell |
|---|---|---|---|
| Run 1 | **15 ms** | **141 ms** | **141 ms** |
| Run 2 | **24 ms** | **169 ms** | **169 ms** |
| Run 3 | **25 ms** | **129 ms** | **129 ms** |
| **Median** | **24 ms** | **141 ms** | **141 ms** |

This reconciliation pass did **not** add fetches, RSC, or a second MAR bundle. Client load path is unchanged (`replaceState` + immediate `GET mar-shift-timeline`).

Post-fix RN `GET …/mar-shift-timeline` (7A–7P, includeCompleted, same encounter): **54 / 37 / 35 ms**, median **37 ms**, 10 cells each (includes the restored/completed scheduled cells). Server projection cost is not meaningfully worse than the 141 ms first-usable baseline.

A later automation-tab navigation lost the hydrated MAR shell (`/app` “Redirection…”), so the exact click→mark 3-run was not recaptured after the live administer. The load contract was re-checked in source + the three timeline GETs above.

**C = PASS** (no regression vs 141 ms baseline; 0 RSC contract unchanged).

---

## GATE 7 — EN / FR

Unchanged. **U = PASS. V = PASS.**

---

## Load path

User clicks MAR → `setSection("medications")` + `replaceState` → `MedicationAdministrationTab` + `FacilityMarShiftTimeline` mount → **immediate** `GET mar-shift-timeline`.

Local dev: `MEDICATION_DOSE_GATED_MAR=true` (not committed).

---

## Final gate table (A–Y)

| Gate | Status |
|---|---|
| **A** MAR opens | **PASS** |
| **B** timeline-first load | **PASS** |
| **C** cold performance median | **PASS** (141 ms UI baseline; post-fix GET median 37 ms; no extra bundle / RSC) |
| **D** DUE dose administration | **PASS** (fresh scheduled DUE + prior NOW DUE) |
| **E** doseInstanceId persisted | **PASS** (`7ac0fad5-…` and `497caf8f-…`) |
| **F** cell changes to administered | **PASS** (09A stays; `DONE` + `MC 00:15`) |
| **G** reload durability | **PASS** (scheduled COMPLETED + REFUSED survive second GET) |
| **H** rapid repeat blocked | **PASS** (400; count stays 1) |
| **I** refusal state | **PASS** (scheduled 09A `REFUSED` + reload) |
| **J** missed reason validation | **PASS** |
| **K** history deferred on open | **PASS** |
| **L** history loads on correction | **PASS** |
| **M** allergy safety | **PASS** |
| **N** provider create refresh | **PASS** (MFA) |
| **O** provider discontinue refresh | **PASS** (MFA) |
| **P** RN authority | **PASS** |
| **Q** Provider boundary | **PASS** |
| **R** PCT boundary | **CODE-PROOF** |
| **S** Pharmacy boundary | **DEFERRED** + code |
| **T** ADMIN boundary | **PASS** |
| **U** EN | **PASS** |
| **V** FR | **PASS** |
| **W** Orders regression | **PASS** (INP.2D.1 restore suite) |
| **X** ED/Observation regression | **PASS** (focused policy suites) |
| **Y** builds / Prisma / diff | **PASS** (re-run this pass) |

CERTIFIED requires **D, E, F, G, H, and C** all PASS. **All PASS.**

---

## Automated verification (this pass)

| Check | Result |
|---|---|
| Shared placement unit tests | **10/10 PASS** |
| Web vitest — `marScheduledDoseInstanceCellPlacementInp2e1`, `marTimelineFirstLoad`, MAR K3–K10B*, K10A, infusion-stop, PRN, safety, INP.2D.1 restore, ED/Observation | **PASS** |
| API Jest — INP.2E.1 timeline (3), dose-gated MAR, safety governance, infusion start | **PASS** |
| Shared `tsc` build | **PASS** |
| API `tsc --noEmit` (`tsconfig.build.json`) | **PASS** |
| API `nest build` | **PASS** |
| Web `tsc --noEmit` | **PASS** |
| Web `next build` | **PASS** (173/173 pages; first attempt raced with `next dev` on `.next`, retry after stopping :3002 succeeded) |
| Prisma validate | **PASS** (schema valid; **no** migration / seed) |
| `git diff --check` | **PASS** |
| Migration | **NONE** |
| Seed | **NONE** |

Untracked local UAT helper only: `apps/api/scripts/uat-inp2e1-live-cert-provider-orders.ts` (not product; MFA not weakened). Do not commit unless operator asks.

---

## INP.2E.2 DUE/OVERDUE shortcut

**Do not proceed automatically.** INP.2E.1 is CERTIFIED. Do not restore `isRoutineMarDueAdministerShortcut` unless a new explicit INP.2E.2 mandate is issued.

---

## Git / release

39. **git status:** dirty working tree on `medui-inp2e1-mar-data-loading-performance-convergence` (no commit).  
40. **commit = NO**  
41. **push = NO**  
42. **PR = NO**  
43. **merge = NO**  
44. **deploy = NO**
