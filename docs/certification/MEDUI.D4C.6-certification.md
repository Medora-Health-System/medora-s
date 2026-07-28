# MEDUI.D4C.6 — Certification

**Feature:** Ambulatory Orders and Results — Enterprise Order Board and Result Engine Reuse  
**Recommendation:** **CERTIFIED WITH DOCUMENTED DEFERRALS**  
**Date:** 2026-07-28  
**Branch:** `d4c6-ambulatory-orders-results` (uncommitted; no commit/push)

## Verdict

Clinic Care gains **Orders** (`/app/clinic-care/orders`) and **Results** (`/app/clinic-care/results`) as one-click top-nav projections over enterprise `Order` / `Result` authority. Placement uses the enterprise chart Orders tab / `CreateOrderModal`. Acknowledgement uses `POST /orders/:id/result/acknowledge` only (user + time). Critical/abnormal use text badges + borders (not color-only). Front Desk cannot escalate via URL. **No ClinicOrder*, ClinicResult*, second ack engine, second sidebar, Prisma migration, or seed.**

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|-------------------|--------|----------|---------------------|
| Order engine | `OrdersService` + Prisma Order/OrderItem | ✔ | Ambulatory board projection | ✔ No ClinicOrder |
| Order placement | CreateOrderModal + POST encounters/:id/orders | ✔ | Chart deep link | ✔ No Clinic composer |
| Order lifecycle / statuses | OrderStatus + orderItemLifecycle | ✔ | Board filters | ✔ |
| Result engine | `ResultsService` + Prisma Result | ✔ | Results inbox projection | ✔ No ClinicResult |
| Result acknowledgement | POST /orders/:id/result/acknowledge | ✔ | Inbox ack button | ✔ No parallel ack |
| Lab / Rad worklists | worklists + DepartmentOrderDetail | ✔ | Clinic redirects retained | ✔ |
| Chart tabs | Encounter orders/results + ambulatory adapter | ✔ | Path helpers | ✔ |
| Clinical Summary | EncounterResultsTab / ED clinical panels | ✔ | — | ✔ |
| Provider worklist | D4C.5 RESULTS_PENDING | ✔ | Results deep link | ✔ |
| Today's Visits | openOrderCount / resultsPendingCount | ✔ | Accessible badge labels | ✔ |
| Clinical Board / AI | D4C.5A grounded insights | ✔ | Count-only insight helper | ✔ No PHI / revenue |
| Nav / auth | D4C.2A capability tabs | ✔ | orders + results tabs | ✔ No 2nd sidebar |

## Test evidence (A–L)

| Suite | Tests | Result |
|-------|------:|--------|
| `packages/shared/.../clinicCareAmbulatoryOrdersResultsD4c6.test.ts` (A–L) | 12 | Pass |
| `apps/web/.../clinicCareAmbulatoryOrdersResultsD4c6.test.ts` (A–L) | 12 | Pass |
| `apps/api/.../clinic-care.service.spec.ts` (D4C.2 + 5A + 6) | 13 | Pass |
| `apps/web/.../clinicCareProviderWorkspaceD4c5.test.ts` | 12 | Pass |
| `apps/web/.../clinicCareClinicalBoardAnalyticsD4c5a.test.ts` | 12 | Pass |
| `apps/web/.../clinicCareWorkspaceD4c2a1.test.ts` | 7 | Pass |
| **Total executed above** | **68** | **Pass** |

## Builds / Prisma

- `npm run build --workspace=@medora/shared` — pass
- `npm run build --workspace=@medora/api` — pass
- `npm run build --workspace=@medora/web` — pass
- `tsc --noEmit -p apps/web/tsconfig.json` — pass (local typescript binary)
- `prisma validate` + `prisma generate` — pass
- `git diff --check` — pass

**No new Prisma migration. No seed.**

## Documented deferrals

1. Acknowledgement **comment** (no `Result` comment column; avoid migration).
2. Departmental worklist clinical-context badge still maps OUTPATIENT/URGENT_CARE → UNKNOWN; clinic boards filter by encounter type instead.
3. Further ambulatory Rx UX polish beyond enterprise Orders tab.
4. Folding Lab/Rad technician queues into the clinical Results inbox (dept worklists remain SOT).

## Manual validation checklist

- [ ] Clinic top nav shows Ordonnances / Résultats for Provider/RN; hidden for Front Desk
- [ ] `/app/clinic-care/orders` loads dense ambulatory rows; filters work; patient → chart; order → orders tab
- [ ] Place order opens enterprise chart Orders (CreateOrderModal) — no Clinic composer
- [ ] `/app/clinic-care/results` groups Critical/Abnormal/New final/Preliminary/Acknowledged/All
- [ ] Critical/abnormal show text badges (not color-only); ack calls enterprise endpoint; user+time shown
- [ ] Provider RESULTS_PENDING row links to results tab with `workspace=ambulatory`
- [ ] Today's Visits open-order / results-pending chips have accessible French labels
- [ ] Single global Medora sidebar; French UI via `clinicCareD4c6`

## Git

Work left **uncommitted / unpushed** per task rules.
