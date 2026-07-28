# MEDUI.D4C.7G — Enterprise MAR authority audit (Clinic order→MAR + pure outpatient Rx)

**Status:** AUDIT COMPLETE — clear to implement (no STOP gates triggered)  
**Certification id:** `MEDUI.D4C.7G`  
**Package manager:** npm workspaces (`package-lock.json` / AGENTS.md) — not pnpm  
**Date:** 2026-07-28

---

## 0. Git verification

| Check | Result |
|-------|--------|
| `git fetch origin` | OK — `main` advanced to `2635870ad` |
| Branch (start) | `d4c7f-clinic-encounter-transition-closure-pharmacy-navigation` @ `481229976` |
| Working tree at start | **clean** (7F already committed; no uncommitted 7F to preserve) |
| D4C.7F on `origin/main` | **Yes** — PR #79 merge `2635870ad` |
| Branch creation | `git checkout -B d4c7g-enterprise-mar-audit-clinic-order-rx-correction origin/main` |
| HEAD / `origin/main` | `2635870ad57106fcd357b25a11c4666317f366da` |
| Ancestry 7F→7E→7D→7C→7B→7A→7→6 | Present on `origin/main` |
| Unrelated dirty work | None |

**Baseline:** D4C.7F tip on `origin/main` (not uncommitted 7F branch work).

---

## 1. Production defects (mapped)

| ID | Defect | Audit finding |
|----|--------|---------------|
| A | Rx modal shows Protocoles/Lab/Imaging/Médicaments/Soins | `ClinicCareAmbulatoryPrescriptionPanel` mounts `CreateOrderModal` with `medicationOrderMode="DEFAULT"` + `initialOrderTab="MEDICATION"` only — full tab strip remains |
| B | Rx blocked by `PILOT_SCOPE_REQUIRED` / `FACILITY_NOT_IN_PILOT_SCOPE` | `OrdersService.assertPilotMedicationOrderAllowed` runs on **every** `MEDICATION` create, intent-agnostic — includes outpatient `PHARMACY_DISPENSE` |
| C | Rx shows “À administrer…” / “À envoyer à la pharmacie” | `DEFAULT` mode renders destination radios in `SelectedMedicationItems` / ManualOrderEntry |
| D | Clinic Orders “géré dans le MAR” but Médicaments empty | Orders labels MAR-managed correctly for `ADMINISTER_CHART`; Médicaments hides Facility MAR timeline for Haiti **and** legacy OrderItem task UI is off |

---

## 2. ED medication path A–E (canonical enterprise)

### A. Order creation

| Piece | Canonical |
|-------|-----------|
| UI | `apps/web/src/features/emergency/EmergencyErOrdersPanel.tsx` (`medicationOrderMode` default `"ER_ADMINISTER_ONLY"`) → `CreateOrderModal` |
| API | `POST /encounters/:encounterId/orders` — `OrdersController.create` |
| DTO | `orderCreateDtoSchema` / `orderItemCreateDtoSchema` — `packages/shared/src/schemas/patient.ts` |
| Service | `OrdersService.create` — `apps/api/src/orders/orders.service.ts` |
| Item builder | `buildOrderItemCreateInput` — `apps/api/src/orders/orders.types.ts` |
| Models | `Order` (`type: MEDICATION`, `status: PLACED`) + `OrderItem` (`catalogItemType: MEDICATION`, `status: PLACED`) |
| Intent | `medicationFulfillmentIntent`: ED forces `ADMINISTER_CHART`; server maps non-`ADMINISTER_CHART` → `PHARMACY_DISPENSE` |
| Schedule | Optional `MedicationOrderSchedule` / `MedicationDoseInstance` via `persistMedicationOrderSchedulesForCreatedOrder` |
| Encounter | Must be `OPEN`, facility-scoped, not signed |
| Activation | **No separate activate API** — `PLACED` is immediately MAR-listable for chart-admin intent |

### B. Pharmacy routing

| Piece | Behavior |
|-------|----------|
| Dispense worklist | `WorklistsService.getPharmacyWorklist` — includes `null` / `PHARMACY_DISPENSE`; **excludes** `ADMINISTER_CHART` |
| Verification | `PharmacyVerificationService` — informational for MAR (`marPharmacyVerificationBlocksAdministration()` → `false`) |
| Inventory | Not required for MAR visibility or `MedicationAdministrationService.create` |
| Dispense of chart-admin | Refused (bedside admin, not pharmacy dispense) |

### C. MAR projection

| Piece | Canonical |
|-------|-----------|
| UI | `MedicationAdministrationTab` + `FacilityMarShiftTimeline` (`MAR_TAB_UNIFIED_TIMELINE_ONLY = true`) |
| Pending lines | Client filter `isOrderItemPendingNurseMedication` → `isAmbulatoryOnsiteMarMedicationItem` on `GET /encounters/:id/orders` |
| Documented | `GET/POST …/medication-administrations` — `MedicationAdministrationService` |
| Timeline | `GET /facilities/:facilityId/mar-shift-timeline` — `MarShiftTimelineService` (dose instances + `loadMarShiftTimelineOrderItemFallbackPlacements` requiring exact `ADMINISTER_CHART`) |
| Pass queue | Derived projection — **no** `MedicationPass` Prisma model |
| Ownership | `enterpriseMarOwnershipD4a42.ts` / `mar-enterprise-ownership.util.ts` |

### D. Materialization

Enterprise MAR pending UI reads **OrderItem** rows created by `OrdersService.create` (status `PLACED`).  
Optional schedule/dose rows: `maybeCreateMedicationOrderScheduleForOrderItem` → `expandMedicationDosesForScheduleInTransaction`.  
`MedicationAdministration` rows are created only on RN documentation (`MedicationAdministrationService.create`) — not at order create.

**Precise root statement (ED happy path):**  
Enterprise MAR pending query/filter reads `OrderItem` with onsite intent created by `OrdersService.create` (no separate `.activate()`). Schedule expansion is optional; OrderItem fallback / pending filter is sufficient for MAR visibility.

### E. Existing ED / Hospital proof tests

| File | Proves |
|------|--------|
| `apps/api/src/medication-administration/medication-administration-ondansetron.spec.ts` | MAR create from order line |
| `apps/api/src/medication-administration/medication-administration-hydromorphone.spec.ts` | Pharmacy pending does not block MAR |
| `apps/api/src/medication-administration/pharmacy-mar-governance.spec.ts` | M1.7A.9 informational pharmacy |
| `apps/api/src/medication-administration/medication-administration-history.service.spec.ts` | Admin → history |
| `apps/api/src/medication-dose/mar-shift-timeline.service.spec.ts` | Timeline / doses |
| `apps/api/src/medication-dose/enterprise-mar-ownership-d4a42.spec.ts` | Hospital vs ED ownership |
| `apps/web/src/features/emergency/medicationOrderMarExecutionPolicy.test.ts` | MAR-managed Orders labels |
| Inpatient | Same `MedicationAdministrationTab` behind `NEXT_PUBLIC_INPATIENT_MAR_ENABLED` |

---

## 3. Layer comparison table (required)

| Layer | Canonical file/service/model | ED behavior | Clinic behavior | Gap |
|-------|------------------------------|-------------|-----------------|-----|
| Order create UI | `CreateOrderModal` / `EmergencyErOrdersPanel` | `ER_ADMINISTER_ONLY` → `ADMINISTER_CHART` | Orders tile: same via `clinicAmbulatoryFacilityMedicationOrderMode` | None for facility Orders |
| Order create API | `OrdersService.create` | `PLACED` Order/OrderItem | Same endpoint | None |
| Intent persistence | `buildOrderItemCreateInput` | Explicit `ADMINISTER_CHART` | Same when ER_ADMINISTER_ONLY | Historical `DEFAULT` lines may be `PHARMACY_DISPENSE` |
| Schedule/dose | `persistMedicationOrderSchedulesForCreatedOrder` | Optional expand | Same | None |
| Pharmacy queue | `getPharmacyWorklist` | Excludes chart-admin | Same | None |
| MAR pending filter | `isOrderItemPendingNurseMedication` | OrderItem projection | Same filter computed in tab | **Presentation suppressed** |
| MAR timeline | `MarShiftTimelineService` + OrderItem fallback | Shown (`showFacilityMarShiftTimeline=true`) | Haiti: `shouldHideMarShiftTimelineForHaitiAmbulatory` → timeline **off** | **Empty Médicaments** |
| Legacy MAR tasks | `MAR_TAB_SHOW_LEGACY_SECTIONS` | `false` (unified timeline only) | Also `false` | No fallback when timeline hidden |
| “Managed in MAR” label | `isMedicationAdministrationManagedInMar` | True for chart-admin | True for chart-admin | **False success signal** when MAR UI blank |
| Outpatient Rx UI | N/A (ED chart-admin) | — | `ClinicCareAmbulatoryPrescriptionPanel` + `CreateOrderModal` `DEFAULT` | Multi-category + destination radios |
| Pilot gate | `assertPilotMedicationOrderAllowed` | Applies to MEDICATION | Same — blocks Rx for pilot catalog codes OOS | **Rx must not depend on pilot/stock** |
| Home meds | Triage / clinical data | History only | History only | None |

---

## 4. Precise root causes (unacceptable-vague banned)

1. **Clinic Médicaments empty while Orders says MAR-managed:**  
   Enterprise MAR pending authority is `OrderItem` filtered by `isOrderItemPendingNurseMedication` / timeline fallback on `ADMINISTER_CHART`. Clinic facility Orders correctly create those rows via `OrdersService.create` with `ER_ADMINISTER_ONLY`. Clinic Haiti mount sets `showFacilityMarShiftTimeline={false}` via `shouldHideMarShiftTimelineForHaitiAmbulatory` while `MAR_TAB_UNIFIED_TIMELINE_ONLY=true` forces `MAR_TAB_SHOW_LEGACY_SECTIONS=false`, so **neither** FacilityMarShiftTimeline **nor** OrderItem task table renders — Orders still labels “Actif — géré dans le MAR” via `isMedicationAdministrationManagedInMar`.

2. **Rx multi-category modal:**  
   `ClinicCareAmbulatoryPrescriptionPanel` reuses general `CreateOrderModal` without a medication-only / outpatient-Rx mode — only `initialOrderTab="MEDICATION"`.

3. **Rx administer destination:**  
   `medicationOrderMode="DEFAULT"` keeps “À administrer au patient” / “À envoyer à la pharmacie” radios (`SelectedMedicationItems`).

4. **Rx pilot / facility scope:**  
   `OrdersService.create` always calls `assertPilotMedicationOrderAllowed` for `MEDICATION`, including pure `PHARMACY_DISPENSE` outpatient Rx — surfacing `PILOT_SCOPE_REQUIRED` / `FACILITY_NOT_IN_PILOT_SCOPE` inside `PILOT_MEDICATION_ORDER_BLOCKED`.

---

## 5. Competing authorities / STOP gate assessment

| Gate | Result |
|------|--------|
| MAR authority ambiguous | **No** — single enterprise authority: OrderItem + MedicationAdministration + MarShiftTimeline |
| ED separate legacy MAR | **No** — legacy gated off; ED uses unified timeline |
| Competing MAR engines | **No** — presentation conflict only (hide + legacy-off); forbidden ClinicMAR not present |
| Clinic needs enterprise schema change | **No** — `MedicationFulfillmentIntent` exists |
| Intent missing | **No** — D4C.7E intents present |
| Rx/facility share unsafe persistence | Shared `Order`/`OrderItem` with typed intent is intentional enterprise reuse; separation is intent + UI mode |
| Clinic-only task/status needed | **No** |
| Migration required | **No** |

**Verdict:** CLEAR TO IMPLEMENT — repair presentation + Rx mode + pilot bypass for outpatient Rx only. No new Clinic* engines. No schema migration.

---

## 6. Architecture (preserved)

```
Facility order → Orders (ADMINISTER_CHART) → Pharmacy if needed → MAR → admin events
Outpatient Rx → prescription (PHARMACY_DISPENSE) → print/external → no MAR → no inventory/pilot requirement
Home med → history only
```

Preserve D4C.7E intent separation and D4C.7F encounter closure / pharmacy navigation — extend, do not fork.

---

## 7. Implementation plan (post-audit)

1. Ambulatory Médicaments: when Facility shift timeline is hidden, render pending OrderItem MAR tasks from the same `isOrderItemPendingNurseMedication` authority (or show timeline for actionable facility-admin) — no UI lie.
2. Add strict `OUTPATIENT_RX_ONLY` (or equivalent) CreateOrderModal mode: medication-only tabs; force `PHARMACY_DISPENSE`; remove administer destination; external/print destinations only.
3. Skip `assertPilotMedicationOrderAllowed` when every medication line is outpatient `PHARMACY_DISPENSE` (keep gate for facility-admin / inventory-bound paths).
4. Observability: typed exclusion / projection failure codes without unnecessary PHI.
5. Tests: ED proof reuse, Hospital, Clinic MAR visibility, Rx purity, roles, regression 7F→6.
6. Docs: this audit + clinical + certification.

---

## 8. Migration / seed

None expected. STOP if schema change appears during implementation.
