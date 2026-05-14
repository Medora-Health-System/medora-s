# Observation order template (Phase 13E / 13F)

Internal workflow note — product UI remains **French**; this document is **English** for engineering.

## Purpose

Speed up **observation / short-stay** stays by letting a **provider or admin** confirm a **pre-built list of CARE order lines** (manual French labels). **No medications** and **no catalog LAB/IMAGING** in the default template v1.

## Flow

1. **Trigger**
   - After saving an **admission packet** whose **care level** matches observation / short stay, the encounter detail page may open the template modal (provider/admin only).
   - From the **INPATIENT** hospitalization banner, the same user can reopen the modal while the encounter is **OPEN** and care level still matches.

2. **Modal**
   - **Checkboxes** by group (monitoring, nursing/reassessment, comfort, diagnostics hint, disposition).
   - **Créer les ordres sélectionnés** — `POST /encounters/:id/observation-order-template/apply` with `selectedItemIds`.
   - **Ignorer le modèle** — closes without API call (no orders).
   - **Annuler** — same as skip for persistence (no orders).

3. **Backend**
   - **RBAC:** `PROVIDER` or `ADMIN` only.
   - **Guards:** INPATIENT, encounter **OPEN**, not **signed**, unknown template ids rejected.
   - **Duplicate (13F):** If a **non-cancelled CARE order** already exists for this encounter whose **CREATED** `OrderEvent` metadata contains `protocolName === medora_observation_order_set_v1`, apply is **rejected** with `400` (no second bundle).
   - **Creation:** Always **`OrdersService.create`** — one CARE **order** with multiple **items**; same billing/chart/MAR visibility as any other CARE order.

4. **After success (UI)**
   - Modal shows a **short success panel** (line count, pointer to **Orders** tab), then auto-closes; orders list should be refreshed by the parent.

## Audit

- `ORDER_CREATE` (critical, in transaction) from `OrdersService`.
- Supplementary `ORDERS_CREATED` with PHI-safe metadata: `templateId`, `selectedItemIds`, `selectedCount`, `source: OBSERVATION_ORDER_SET`, etc.

## Chart / authority label

- Provider-order CARE bundles from this template carry `protocolName = medora_observation_order_set_v1` in order authority.
- The Orders tab maps that id to a **short French label** via i18n (`orderAuthority.observationOrderTemplateBundle`).

## Out of scope (later)

- Medication lines in the template (must use full med safety path).
- Facility-specific template libraries.
- Applying a second bundle after cancelling the first (today: allowed once the duplicate query returns no row).
