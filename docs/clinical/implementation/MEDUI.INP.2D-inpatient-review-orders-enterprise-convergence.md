# MEDUI.INP.2D — Inpatient Review Orders enterprise convergence (implementation)

**Date:** 2026-08-17  
**Baseline:** `d85860136`  
**Branch:** `inp2d-review-orders-enterprise-convergence`  
**Prisma / migration / seed:** NONE

## What shipped

Inpatient **Review Orders** is now a **role-aware projection/action surface** over the existing enterprise `Order` / `OrderItem` engine.

It does **not** create:

- a second inpatient order store
- a medication-order table besides `OrderItem`
- an inpatient-only status model
- duplicated lab/radiology engines
- a task engine masquerading as orders

## Architecture

| Layer | File | Role |
|---|---|---|
| Shared projection | `packages/shared/src/encounters/inpatientReviewOrdersProjectionInp2d.ts` | Pure classifier: groups, buckets, RN/provider actions |
| Inpatient UI | `apps/web/src/features/inpatient-workspace/InpatientReviewOrdersPanel.tsx` | Bedside scan board |
| Mount | `InpatientWorkspacePanel` `case "orders"` | Replaces ED cockpit **only** on inpatient |
| APIs reused | `GET /encounters/:id/orders`, `GET /encounters/:id/order-events`, lifecycle POSTs, Create/Cancel modals, medication hold/DC | Unchanged engines |
| MAR | `MedicationAdministrationTab` (medications section) | Unchanged; Review Orders links **Open MAR** |

ED `EmergencyErOrdersPanel` and Observation’s mount of that panel are **unchanged**.

## Bedside projection

Status filters: Needs action, Changed, All, plus New/unreviewed, Active, Due now, Overdue, Scheduled, PRN, STAT/urgent, Pending verification, Held, Discontinued/cancelled, Completed.

Clinical groups: Medications, Laboratory, Imaging, Nursing, Respiratory, Diet, Activity, Precautions, Consults, Procedures, Other.

Due/overdue/scheduled are classified from durable order fields only (`due` / `overdue` flags, `dueAt` / `nextDueAt` / `overdueAt`, `intendedAdministrationAt`, `frequencyCode`). **No invented schedule math.** Medication `ADMINISTER_CHART` lines are class **D_MAR_DOSE**: frequency may show Scheduled, but dose due/overdue stays MAR. CARE create currently **does not persist** `intendedAdministrationAt` (medication-only write path); unscheduled CARE therefore stays Active, not Due. Prisma / migration / seed: NONE. Dormant `MedicationDoseInstance` unused.

Changed = existing `OrderEvent` types `MODIFIED` / `DISCONTINUED` / `ON_HOLD` / `RESUMED` / `SUPERSEDED`. Viewing never completes.

## Role behavior (existing APIs)

| Actor | UI |
|---|---|
| PROVIDER | Create (`medicationOrderMode=DEFAULT` for standing frequencies), hold/DC/edit meds, cancel per policy |
| RN | Ack chart-admin meds + nursing-actionable CARE; start/complete CARE per catalog; Open MAR; verbal/protocol create only; **no** provider DC |
| PCT | View only |
| Pharmacy verification | Badge only; verify remains pharmacy endpoints |
| ADMIN | Existing API ADMIN paths; signed encounter still blocks mutations |

## MAR boundary

Medication dose charting is **not** on Review Orders. `canComplete` is false for MAR-managed lines. RN/provider open the MAR section.

## Create-order mode

Inpatient create uses `DEFAULT` (standing BID/TID/etc.). ED panel remains `ER_ADMINISTER_ONLY`. This was a verified gap: the previous IP tab inherited ED one-shot frequencies because `medicationOrderMode` was omitted.

## i18n

Feature section `inpatientReviewOrdersInp2d` mirrored in `en.ts` / `fr.ts`. Product UI French.

## Tests

- `packages/shared/src/encounters/inpatientReviewOrdersProjectionInp2d.test.ts`
- `apps/web/src/features/inpatient-workspace/nursingAdmissionReviewOrdersInp2d.test.ts`
- D4A.26 workspace test now expects `InpatientReviewOrdersPanel` (not the ED cockpit on IP)

## Explicit non-goals

- Order signing/cosign (does not exist on the engine)
- Dual-write of JSON consults/isolation into `Order`
- Observation/ED cockpit redesign
- Nursing Admission / Nursing Assessment changes
