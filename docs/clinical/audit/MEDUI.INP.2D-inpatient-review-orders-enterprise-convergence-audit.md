# MEDUI.INP.2D — Inpatient Review Orders enterprise convergence (audit)

**Milestone:** INP.2D  
**Date:** 2026-08-17  
**Baseline:** `d85860136` (main — INP.2B.1 merged)  
**Mode:** Audit first. No new order engine. Prisma not required.

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Clinical orders | Prisma `Order` / `OrderItem` / `OrderEvent` + `OrdersService` | ✔ | ✔ (inpatient projection only) | ✔ |
| Order lifecycle | Frozen `orderItemLifecycle.ts` | ✔ | ✖ | ✔ |
| Medication orders | `Order.type=MEDICATION` + `MedicationOrderLifecycleService` | ✔ | ✖ | ✔ |
| MAR | `MedicationAdministration` + `MedicationAdministrationTab` | ✔ (link only) | ✖ | ✔ |
| Pharmacy verification | `PharmacyVerification` + worklists | ✔ (status projection) | ✖ | ✔ |
| Laboratory | `Order.type=LAB` + `Result` + lab worklist | ✔ | ✖ | ✔ |
| Imaging | `Order.type=IMAGING` + `Result` + radiology worklist | ✔ | ✖ | ✔ |
| Procedures / CARE | `Order.type=CARE` + canonical procedure catalog | ✔ (grouping) | ✖ | ✔ |
| Consults (order) | CARE catalog `CONSULTS` | ✔ (project CARE lines) | ✖ | ✔ |
| Consults (ops JSON) | `admissionSummaryJson.inpatientClinicalOpsV1.consults` | ✖ as SSoT | ✖ | ✔ (not promoted to Order) |
| Diet / activity / precautions | CARE catalog + isolation JSON ops | ✔ CARE lines | ✖ | ✔ |
| Nursing admission | INP.2B / INP.2B.2A | ✔ | ✖ | ✔ |
| Nursing assessment | INP.2C / INP.2C.1 | ✔ | ✖ | ✔ |
| ED order cockpit | `EmergencyErOrdersPanel` | ✖ as IP primary UX | ✖ | ✔ (ED/OBS unchanged) |
| Patient / MRN / facility | Enterprise identity | ✔ | ✖ | ✔ |

**Prisma / migration / seed:** NONE. Durable order identity already exists. Review Orders is a role-aware projection/action surface.

---

## 1. Current authoritative order models and persistence

There is **no `ClinicalOrder` / `InpatientOrder` / `EdOrder` table**.

Authoritative persistence (`apps/api/prisma/schema.prisma`):

| Model | Role |
|---|---|
| `Order` | Parent: `encounterId`, `facilityId`, `patientId`, `type` (string), `status` (`OrderStatus`), `priority` (`OrderPriority`), `orderedBy`, `source`, prescriber fields, cancel fields |
| `OrderItem` | Line: `catalogItemType`, `status`, `lifecycleState`, `frequencyCode`, `medicationLifecycleStatus`, `medicationFulfillmentIntent`, `enterpriseProcedureId`, MAR/result/pharmacy FKs |
| `OrderEvent` | Immutable lifecycle audit |

Create types (Zod `orderCreateDtoSchema`, not a Prisma enum): **`LAB` | `IMAGING` | `MEDICATION` | `CARE`**.

Contract already encoded: `inpatientOrdersUseSharedEnterpriseEngines()` → `true` in `packages/shared/src/encounters/inpatientOrderOwnershipV1.ts`. Placement is encounter-scoped; cross-encounter copy is forbidden.

## 2. Existing ED order engine and reusable shared order infrastructure

The “ED order engine” **is** the enterprise engine, with an ED-shaped cockpit:

- API: `OrdersController` / `OrdersService`
- Frozen lifecycle: `packages/shared/src/orders/orderItemLifecycle.ts` (`ORDER_LIFECYCLE_ENGINE_FROZEN`)
- UI: `EmergencyErOrdersPanel.tsx` (LAB / IMAGING / MEDICATION / CARE tiles; Open / Completed / Cancelled)
- Order-sets registry is **ED-scoped** (`department: "ED"`). Do not fork an inpatient order-set engine in this gate.

**Reusable now for INP.2D: Order/OrderItem APIs, lifecycle mutators, Create/Cancel modals, medication governance, MAR policy, CARE catalog, ownership policy.

**ED-only chrome (do not copy as inpatient primary UX):** trauma protocol assist, ER domain tiles, ER_ADMINISTER_ONLY default (NOW/ONCE/STAT/PRN picker).

## 3. Existing inpatient order APIs

**No inpatient-specific order CRUD.** `InpatientOperationsController` has zero order routes.

| Route | Authority |
|---|---|
| `GET /encounters/:encounterId/orders` | Encounter-scoped list (projection source) |
| `POST /encounters/:encounterId/orders` | Create |
| `GET /encounters/:encounterId/order-events` | Audit/timeline + “changed” |
| `POST /orders/items/:id/{acknowledge,start,complete,cancel}` | Frozen lifecycle |
| `POST /orders/items/:id/{discontinue,hold,resume,edit,discontinue-and-reorder}` | Medication provider lifecycle |
| `POST /orders/items/:id/nurse-complete` | RN chart-admin order-line complete (not MAR) |
| `GET /inpatient-workspace/meta` | Flags + `consumesSharedEngines.orders: true` |

Feature gate: `INPATIENT_DEPARTMENTAL_ORDERS_ENABLED` / `NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED` (production default OFF).

**Current IP Review Orders tab:** `InpatientWorkspacePanel` `case "orders"` mounts **`EmergencyErOrdersPanel`** when the flag is on. Sticky label is already “Review Orders” / “Revoir les ordonnances”. There is **no bedside bucket board**.

## 4. Medication-order authority and relationship to MAR

- **Order authority:** `Order`/`OrderItem` MEDICATION lines.
- **Provider lifecycle:** hold / discontinue / resume / edit — PROVIDER/ADMIN.
- **Fulfillment:** `ADMINISTER_CHART` (MAR) vs `PHARMACY_DISPENSE`.
- **MAR authority:** `MedicationAdministration` append-only log. Completing a MAR row does **not** replace OrderItem. Review Orders **must not** chart doses.
- Policy: `isMedicationAdministrationManagedInMar` / `MEDICATION_ADMINISTRATION_EXECUTION_IN_MAR_ONLY`.
- Inpatient MAR section remains `MedicationAdministrationTab` behind `INPATIENT_MAR_ENABLED`.

`MedicationOrderSchedule` / `MedicationDoseInstance` exist but are **dormant** (no MAR reads this phase). Due/overdue **must not be invented** from last-administration arithmetic.

## 5. Lab order authority

No `LabOrder` table. `Order.type=LAB` / `catalogItemType=LAB_TEST`. Departmental ack/start/complete + `Result` 1:1. Worklists: `GET /worklists/lab`. INP.2D projects these lines; RN does **not** gain LAB departmental ack.

## 6. Imaging/radiology order authority

No `ImagingOrder` table. `Order.type=IMAGING` / `IMAGING_STUDY`. Same lifecycle + `Result`. RN does **not** gain RADIOLOGY ack.

## 7. Procedure order authority

CARE lines with optional `enterpriseProcedureId`. Catalog: `canonicalCareProcedureCatalog` / `enterpriseProcedureCatalog`. Execution profiles already gate acknowledge/complete by role.

## 8. Nursing order authority

Not a separate table. `Order.source` = `PROVIDER_ORDER` | `VERBAL_ORDER` | `NURSING_PROTOCOL`. RN may create MEDICATION/CARE only via verbal (prescriber + readback) or protocol. CARE nursing-actionable codes (`NURSING_TASK`, `executionRoleCategory=NURSING`) are the nursing-order projection.

Technician tasks JSON (`/technician-tasks`) is **not** an order engine.

## 9. Consult order authority

Two stores — **do not collapse in this gate:**

1. **Order engine:** CARE consult codes (`cardiology_consult`, …, category `CONSULTS`).
2. **Ops JSON:** `inpatientClinicalOpsV1.consults` via clinical-ops PATCH (inpatient Consults section).

Review Orders lists **CARE consult OrderItems** only. JSON consults stay the ops shell.

## 10. Diet / activity / precaution order handling

No dedicated `DietOrder` / `ActivityOrder`. Project CARE codes:

| Group | Codes / catalog |
|---|---|
| Diet | `diet`, `npo_status`, `oral_challenge` |
| Activity | `ambulation_trial` |
| Precautions | `fall_precautions`, `isolation_precautions` |

Isolation JSON (`inpatientClinicalOpsV1.isolation`) is ops state, not an Order. Do not dual-write.

## 11. Order status lifecycle

Three parallel machines (do not collapse):

1. **`OrderStatus`** — create writes `PLACED`. Transitions in `ORDER_TRANSITIONS`.
2. **`OrderItemLifecycleState`** — ORDERED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED / REVIEWED / CANCELLED. Frozen actions: acknowledge / start / complete.
3. **`MedicationOrderLifecycleStatus`** — ACTIVE / ON_HOLD / DISCONTINUED / … (provider governance).

STAT is `OrderPriority` (and sometimes `frequencyCode=STAT`). PRN is `frequencyCode`. Held is medication lifecycle `ON_HOLD`, not `OrderStatus`.

**Viewing an order must never complete it.** Ack is an explicit POST.

## 12. Ordering-provider attribution

Persisted: `Order.orderedBy`, `source`, `prescriberName` / `License` / `Contact`. GET enrichment: `orderedByDisplayFr`, `createdByDisplay`, `authority`. Reuse; do not invent a second attribution model.

## 13. Signing / cosign requirements

**No order-level provider signature/cosign workflow.** `OrderStatus.SIGNED` exists but create does not set it. Verbal order attestation is RN read-back, not pending cosign. Encounter documentation sign-lock (`assertEncounterNotSigned`) already blocks mutations. Do not add order signing in this gate.

## 14. Discontinue / cancel authority

- **Cancel** (void): `order-cancel-policy.util.ts` — ADMIN; PROVIDER (own/assigned or MED/CARE); RN limited (own ORDERED line; verbal/protocol rules). Blocked after collection/start/MAR.
- **Discontinue/hold/resume/edit:** medication only, PROVIDER/ADMIN.

RN must not gain provider discontinue via the Review Orders UI.

## 15. RN acknowledgement / review state

Existing durable ACK is `POST /orders/items/:id/acknowledge`:

- Chart-admin meds: **RN** (`assertAckOrStartActor`)
- CARE: procedure execution profile
- Lab/imaging: departmental roles

There is **no** inpatient-only “seen” flag. Do **not** add one. RN “review” = existing ACK on nursing-actionable / chart-admin lines. Lab/imaging remain visible as new/unreviewed without RN departmental ack.

ED panel currently gates MEDICATION line ack to **PHARMACY**, so inpatient nurses may not see the API-legal chart-admin ACK. INP.2D projection should surface RN ACK for `ADMINISTER_CHART` only — still not MAR charting.

## 16. Order execution / completion mechanisms

| Domain | Execution |
|---|---|
| Lab / imaging | Departmental ack → start → complete; results PUT/verify |
| CARE | Lifecycle + `nurse-complete` is **meds only**; CARE uses complete + effective clinical time |
| Chart meds | **MAR** |
| Pharmacy meds | Pharmacy worklist + verification |

## 17. Existing audit trail

`OrderEvent` + `AuditLog` (`ORDER_CREATE`, `ORDER_VIEW`, `ORDER_UPDATE`, `ORDER_CANCEL`, `ORDER_ACK`, `ORDER_START`, `ORDER_COMPLETE`). List: `GET /encounters/:id/order-events`. “Changed” = events `MODIFIED` / `DISCONTINUED` / `ON_HOLD` / `RESUMED` / `SUPERSEDED`.

## 18. Existing notifications / tasks derived from orders

No `Notification` / `ClinicalTask` from orders. Derived surfaces: departmental worklists, trackboard open-count, ED cockpit summary, observation CARE ops indicators, provider workspace JSON task vocabulary (not the order store). Do not create a task engine masquerading as orders.

## 19. Observation dependencies

Observation workspace **already** mounts `EmergencyErOrdersPanel` on the same `GET /encounters/:id/orders`. Ownership: `observationOrderOwnershipV1` — no silent inherit from ED. Template apply creates CARE via `OrdersService.create`.

**INP.2D must not change Observation’s panel mount.**

## 20. ED dependencies

ED uses `EmergencyErOrdersPanel` as the departmental cockpit. Frozen lifecycle tests pin that file.

**INP.2D must not modify `EmergencyErOrdersPanel` behavior** except by not using it as the inpatient primary Review Orders surface.

---

## Verified UX gap (inpatient)

Target bedside questions: what is needed, what changed, what requires my action, what is already handled.

Current IP tab answers ED operational buckets (open/completed/cancelled by LAB/IMAGING/MED/CARE), not:

New/unreviewed · Active · Due · Overdue · Scheduled · PRN · STAT/urgent · Pending verification · Held · Discontinued/cancelled · Completed  

nor clinical groups: Medications · Laboratory · Imaging · Nursing · Respiratory · Diet · Activity · Precautions · Consults · Procedures · Other.

Due/overdue populate **only** when the GET payload already carries due/overdue fields. Do not compute from MAR.

Inpatient create should use `medicationOrderMode="DEFAULT"` (standing frequencies), not the ED `ER_ADMINISTER_ONLY` default currently inherited because the prop is omitted.

## Role governance (existing APIs; projection must not expand)

| Actor | Review Orders |
|---|---|
| PROVIDER | Create/sign via existing create DTO; hold/DC/edit meds; cancel per policy |
| RN | Ack/start/complete nursing-actionable CARE; ack chart-admin meds; complete CARE when profile allows; **Open MAR** for administration; verbal/protocol create only; **no** provider prescribe/DC |
| PCT (`PATIENT_CARE_TECH`) | View only (no new delegated IP procedure list in this gate) |
| PHARMACY | Verification remains pharmacy endpoints/worklist; IP board shows pending-verification badge |
| RT/PT/OT | CARE execution profile already encodes RT (e.g. nebulizer); no new RoleCode |
| ADMIN | Existing API ADMIN paths unchanged; do not treat ADMIN as RN or silent clinical override beyond current D5A.5C |

## Implementation recommendation (smallest useful)

1. Shared pure projection `inpatientReviewOrdersProjectionInp2d.ts` over GET orders + order-events.
2. Inpatient panel `InpatientReviewOrdersPanel` replacing the ED cockpit **only** on the inpatient `orders` section.
3. Actions call existing mutators (`mutateOrderItemLifecycleAction`, medication lifecycle APIs, CreateOrderModal, CancelOrderModal).
4. MAR remains a separate section; medications show Open MAR, not dose charting.
5. Observation + ED panels unchanged.
6. Nursing Admission / Assessment untouched.
7. **No Prisma.**

## Stop gates (not taken)

- New order tables or inpatient status enum — not needed.
- Dual-writing JSON consults/isolation into Order — product decision, not this gate.
- Order signing/cosign — does not exist; do not invent.
- Due-time engine from dormant `MedicationDoseInstance` — out of scope.
