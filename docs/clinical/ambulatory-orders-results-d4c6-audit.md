# MEDUI.D4C.6 — Ambulatory Orders & Results Audit

**Date:** 2026-07-28  
**Branch:** `d4c6-ambulatory-orders-results`  
**Baseline:** `origin/main` @ `7a23792c2` (includes D4C.1–D4C.5A)

## Git verification

| Check | Result |
|-------|--------|
| Branch | `d4c6-ambulatory-orders-results` |
| Working tree (start) | Clean |
| D4C.5A present | ✔ `MEDUI.D4C.5A-certification.md` + merge PR #68 |
| Unrelated dirty tree | None at start |

## Enterprise order authority (reused)

| Concern | Exact path |
|---------|------------|
| Orders module | `apps/api/src/orders/orders.module.ts` |
| Orders service | `apps/api/src/orders/orders.service.ts` |
| Orders controller | `apps/api/src/orders/orders.controller.ts` |
| Lifecycle machine | `apps/api/src/common/workflow/order-item-lifecycle.machine.ts` |
| Shared lifecycle | `packages/shared/src/orders/orderItemLifecycle.ts` |
| Create DTO | `packages/shared/src/schemas/patient.ts` (`orderCreateDtoSchema`) |
| Composer UI | `apps/web/src/components/orders/CreateOrderModal.tsx` |
| Chart Orders tab | `apps/web/app/app/encounters/[id]/page.tsx` |
| ED orders panel | `apps/web/src/features/emergency/EmergencyErOrdersPanel.tsx` |
| IP reuse of ED panel | `apps/web/src/features/inpatient-workspace/InpatientWorkspacePanel.tsx` |
| Lab/Rad/Pharmacy worklists | `apps/web/app/app/{lab,rad,pharmacy}-worklist/page.tsx` |
| Worklists API | `apps/api/src/worklists/worklists.service.ts` |
| Status enums | Prisma `OrderStatus`, `OrderItemLifecycleState`, `OrderPriority` |

**No ClinicOrder* tables, controllers, or composers introduced.**

## Enterprise result authority (reused)

| Concern | Exact path |
|---------|------------|
| Results service | `apps/api/src/results/results.service.ts` |
| Results controller | `apps/api/src/results/results.controller.ts` |
| Clinician ack | `POST /orders/:id/result/acknowledge` → `acknowledgeResultByClinician` |
| Ack metadata | `Result.acknowledgedByUserId`, `Result.acknowledgedByProviderAt` |
| Chart results tab | `apps/web/src/components/encounters/EncounterResultsTab.tsx` |
| Viewer | `apps/web/src/components/clinical/ClinicalResultViewer.tsx` |
| ED/IP/Obs panels | `EmergencyResultsPanel.tsx` (reused) |
| Critical flag | `Result.criticalValue` + `POST /orders/:id/critical` |
| Abnormal heuristics | `providerClinicalSynthesisD4a26a.ts` + D4C.6 `classifyClinicCareAmbulatoryResult` |

**Ack comment:** not on `Result` model — **deferred** (no Prisma migration).

**No ClinicResult* tables or parallel ack endpoints.**

## ED / Hospital engine reuse

- Order placement: same `CreateOrderModal` + `POST /encounters/:id/orders`
- Results review/ack: same `EncounterResultsTab` + enterprise ack endpoint
- Department ops: existing lab/rad/pharmacy worklists (clinic tabs still redirect)
- Trackboard ops aggregates: `TrackboardService.getOperationalAggregatesForEncounterIds` (open orders / results pending)

## Clinic presentation (D4C.6)

| Surface | Route | Projection |
|---------|-------|------------|
| Order board | `/app/clinic-care/orders` | `GET /clinic-care/orders-board` |
| Results inbox | `/app/clinic-care/results` | `GET /clinic-care/results-inbox` |
| Chart adapter | `/app/encounters/:id?tab=orders\|results&workspace=ambulatory` | Existing D4C.5 tabs |
| Nav | Clinic top tabs `orders` / `results` | `clinicWorkspaceCapabilityNavigationD4c2a.ts` |

**REFERENCE_VIRTUAL:** `AMBULATORY` = facility + `OUTPATIENT` \| `URGENT_CARE` filter. Not a new durable care-setting enum on Order/Result.

## Auth matrix (summary)

| Role | Orders board | Place/sign | Results inbox | Ack |
|------|--------------|------------|---------------|-----|
| PROVIDER / ADMIN | ✔ | ✔ (enterprise) | ✔ | ✔ |
| RN | ✔ (nursing) | ✖ | ✔ | ✔ |
| MA / TECH | tech-safe ✔ | ✖ | tech-safe ✔ | ✖ |
| Pharmacy | ✔ (module) | ✖ | ✖ (dept board) | ✖ |
| Lab / Rad | via diagnostics / redirects | existing | dept worklists | existing |
| Front Desk / Billing | ✖ | ✖ | ✖ | ✖ |

## Duplicate prevention

| Anti-pattern | Status |
|--------------|--------|
| ClinicOrder* | Prevented |
| ClinicResult* | Prevented |
| Second acknowledgement authority | Prevented (enterprise endpoint only) |
| Second order board engine | Prevented (projection only) |
| Second sidebar | Prevented (D4C.2A.1 top tabs) |
| Prisma migration / seed | None |
