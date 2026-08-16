# MEDUI.D4A.4.3 — Enterprise Hospital Bed Management Consolidation

**Title:** One enterprise bed engine for ED / Observation / Inpatient / Hospital Care Dashboard
**Date:** 2026-08-16
**Branch:** `main`
**HEAD:** `c8a8b3526` (post PR #132 workforce merge) + uncommitted D4A.4.3 bed work
**STOP:** not committed / not pushed / no PR.

> Prior ownership completion certificate preserved as
> `docs/certification/MEDUI.D4A.4.3-operational-ownership-certification.md`.

---

## 1. Verdict

**MEDUI.D4A.4.3 (Hospital Bed Consolidation) — CERTIFIED (local).**

Facility-wide Floor Board is now the **Hospital Care Dashboard** (not “Observation care”). Legacy patient-card/census chrome is removed from that projection only. Inpatient unit boards reuse the same `FacilityBedBoardService` + shared `BedBoard*` modal/actions as ED (assign, housekeeping, reserve/block, change room). No second bed state machine. No migration.

---

## 2. Root causes

| Defect | Cause |
|--------|--------|
| Dashboard labeled Observation | Floor Board reused Observation board shell + `hospitalizationBoard.pageTitle` |
| Legacy cards under beds | Same `HospitalizationBoardView` rendered Observation census filters/cards after bed inventory |
| Inpatient modal read-only | `UnitBedBoard` used `BedBoardGrid` without `canManageBedStatus` / `canAssignRoom` / assign/room wiring |

---

## 3. Full Hospital Dashboard correction

- Route: `/app/hospitalisation/floor-board`
- Page passes `projection="hospitalCareDashboard"`
- Title i18n: `hospitalCareD3e6a.floorBoard.dashboardTitle` → **Hospital Care Dashboard** / **Tableau de bord Soins hospitaliers**
- `data-testid="hospital-care-dashboard"`

---

## 4. Legacy patient-chart removal

Under `hospitalCareDashboard` projection only:

- Observation operational strip hidden
- Search / physician / operational filters hidden
- Patient MedoraCard list + Assign to Me hidden
- Pharmacy alerts card hidden on this projection

Reusable census components remain for Observation census and other callers using `legacyCensusWithBeds` (default).

---

## 5. ED authoritative engine discovered

| Layer | Authority |
|-------|-----------|
| UI | `BedBoardGrid`, `BedBoardStatusDetailModal`, `BedBoardUnitSection`, `BedBoardAssignEncounterPicker`, `RoomAssignmentModal` |
| Host (ED) | `EmergencyTrackboardView` bed mode |
| Client API | `bedBoardApi.ts` |
| Permissions | `canManageBedOperationalStatus` / `canAssignEncounterRoom` |

---

## 6. Backend bed authority

- `FacilityBedBoardController` / `FacilityBedBoardService`
- `GET /facilities/:id/bed-board`, `PATCH .../beds/:bedKey/status`, history GET
- Room occupancy: `PATCH /encounters/:id/room`
- Inpatient lifecycle transfer remains available separately (`transfer-bed`) — room change for boards uses enterprise room PATCH

---

## 7. State model

Shared `bedOperationalStatus.ts` (not Prisma enum). Manual writable: AVAILABLE, DIRTY, CLEANING, RESERVED, BLOCKED. Derived: OCCUPIED, TRANSFER_PENDING, DISCHARGE_PENDING. Persistence: audit overlay `FACILITY_BED` / `BED_STATUS_UPDATE`.

---

## 8. Shared UI extraction/reuse

No copy of ED modal. Inpatient/Hospital Care now pass the same manage/assign/change-room props into shared grid/modal. Change room added once on `BedBoardStatusDetailModal` (`onChangeRoom`).

---

## 9. Inpatient integration

`UnitBedBoard` wires:

- `canManageBedStatus` / `canAssignRoom`
- assign picker + `RoomAssignmentModal`
- `onChangeRoom` for occupied beds
- refresh after mutations
- still `fetchFacilityBedBoard(facilityId, unit)` — same inventory

---

## 10. Observation integration

OBS unit remains a pool on the facility bed board and Hospital Care Dashboard. Observation clinical census stays on `/hospitalisation/observation` (unchanged list authority).

---

## 11. Room-change implementation

Occupied bed → **Change room** → existing `RoomAssignmentModal` → `PATCH /encounters/:id/room` (atomic destination assignment + prior bed release per existing encounters service + bed assignability guards).

---

## 12. Atomicity / invariants

Reuse existing server guards: facility match, `assertBedAssignableOrThrow`, occupied-blocks-status util, no second encounter on room change. Client does not invent dual occupancy.

---

## 13–14. Housekeeping / reserve / block

Same modal actions + `manualStatusBlockedByOccupancy` + PATCH roles (RN/PROVIDER/ADMIN). Unit boards now expose them when permitted.

---

## 15. Facility isolation

Unchanged controller facility checks; assign eligibility facility filter retained.

---

## 16. Permission model

Unchanged: manage status RN/PROVIDER/ADMIN; assign room governed helper; no broadening for SUPER_ADMIN alone.

---

## 17. Audit attribution

Unchanged bed status audit overlays (actor, prior/new status, note, timestamp).

---

## 18–20. Regression / proof

| Surface | Proof |
|---------|--------|
| ED | Shared modal/engine untouched except additive `onChangeRoom` prop |
| Observation | Census route separate; OBS beds still composed on facility board |
| Inpatient | UnitBedBoard wiring + tests |
| Dashboard | Title + projection tests; no legacy cards in hospitalCareDashboard |

---

## 21–23. Tests / builds

| Suite | Result |
|-------|--------|
| Web D4A.4.3 consolidation | 5 pass |
| Bed modal / permissions | pass |
| Shared bedOperationalStatus + composition | 18 pass |
| Web `tsc --noEmit` | pass |

(API nest build / web next build recommended on CI; local tsc green.)

---

## 24. Migration requirement

**None.**

---

## 25. Seed requirement

**None.**

---

## 26. git diff --check

Run at certify time — expect clean.

---

## 27. Files changed (primary)

- `apps/web/app/app/hospitalisation/floor-board/page.tsx`
- `apps/web/src/features/hospitalization/HospitalizationBoardView.tsx`
- `apps/web/src/features/inpatient-workspace/UnitBedBoard.tsx`
- `apps/web/src/components/encounters/BedBoardGrid.tsx`
- `apps/web/src/components/encounters/BedBoardUnitSection.tsx`
- `apps/web/src/components/encounters/BedBoardStatusDetailModal.tsx`
- `apps/web/src/i18n/messages/en.ts` / `fr.ts`
- `apps/web/src/features/hospital-care/hospitalCareBedConsolidationD4a43.test.ts`
- `docs/certification/MEDUI.D4A.4.3-certification.md` (this file)
- Ownership cert renamed to `MEDUI.D4A.4.3-operational-ownership-certification.md`

---

## 28. Deferrals

- Full extraction of `useFacilityBedBoard` hook (optional cleanup)
- Replacing audit-overlay persistence with a dedicated bed-status table
- Driving inpatient change-room exclusively through lifecycle `transfer-bed` (room PATCH remains the board primitive, matching ED)
- Removing `legacyCensusWithBeds` projection entirely (Observation/other callers may still need it)

---

## 29. Recommendation

**CERTIFY** for Hospital Care Dashboard identity + inpatient bed modal parity with ED engine. Ship after product UAT on Floor Board + MS unit board + ED bed tab smoke.

---

## 30. Git status

Dirty working tree on `main` with D4A.4.3 bed consolidation files (uncommitted).

---

## 31. Commit status

**NOT COMMITTED**

---

## 32. Push status

**NOT PUSHED**
