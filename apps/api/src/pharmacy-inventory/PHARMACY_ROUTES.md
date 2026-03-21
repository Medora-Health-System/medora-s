# Medora Pharmacy MVP – Routes & Notes

## Route list

| Method | Path | Roles | Description |
|--------|------|--------|-------------|
| POST | `/pharmacy/inventory` | PHARMACY, ADMIN | Create inventory item |
| GET | `/pharmacy/inventory` | PHARMACY, ADMIN, PROVIDER, RN | List inventory (with filters) |
| GET | `/pharmacy/inventory/:id` | PHARMACY, ADMIN, PROVIDER, RN | Get one inventory item |
| POST | `/pharmacy/inventory/:id/receive` | PHARMACY, ADMIN | Receive stock |
| POST | `/pharmacy/inventory/:id/adjust` | PHARMACY, ADMIN | Adjust stock |
| POST | `/pharmacy/dispenses` | PHARMACY, ADMIN | Dispense medication |
| GET | `/pharmacy/inventory-low-stock` | PHARMACY, ADMIN, PROVIDER, RN | List items at or below reorder level |
| GET | `/pharmacy/inventory-expiring` | PHARMACY, ADMIN, PROVIDER, RN | List items expiring within N days |

**Auth:** All routes require JWT (`AuthGuard("jwt")`) and `x-facility-id` (or `user.facilityId`).

**Role restrictions:** PHARMACY and ADMIN can create/update inventory and dispense; PROVIDER and RN can only view inventory and low-stock/expiring lists.

---

## Query params (GET /pharmacy/inventory)

- `medicationNameOrCode` – search by catalog medication name or code (case-insensitive)
- `activeOnly` – `true` / `1` to return only active items
- `lowStockOnly` – `true` / `1` to return only items where `quantityOnHand <= reorderLevel`
- `expirationBefore` – ISO date; return items with `expirationDate <= this date`
- `limit` – page size (default 100, max 200)
- `offset` – skip (default 0)

## Query params (GET /pharmacy/inventory-expiring)

- `withinDays` – include items expiring within this many days (default 90, max 365)

---

## Request/response shapes

- **POST /pharmacy/inventory**  
  Body: `CreateInventoryItemDto` (catalogMedicationId, sku, lotNumber?, expirationDate?, quantityOnHand?, reorderLevel?, unit?).  
  Returns: created `InventoryItem` with `catalogMedication` and `facility`.

- **GET /pharmacy/inventory**  
  Returns: `{ items: InventoryItem[], total: number }` (items include `catalogMedication`, `facility`).

- **GET /pharmacy/inventory/:id**  
  Returns: single `InventoryItem` with relations.

- **POST /pharmacy/inventory/:id/receive**  
  Body: `{ quantity: number, notes?: string }`.  
  Returns: updated `InventoryItem` (incremented `quantityOnHand`).

- **POST /pharmacy/inventory/:id/adjust**  
  Body: `{ quantity: number, notes?: string }` (quantity can be negative).  
  Returns: updated `InventoryItem`. Rejects if adjustment would make `quantityOnHand` negative.

- **POST /pharmacy/dispenses**  
  Body: `DispenseMedicationDto` (inventoryItemId, patientId, encounterId, quantityDispensed, dosageInstructions?, notes?).  
  Returns: created `MedicationDispense` with patient, catalogMedication, inventoryItem.  
  Side effects: decrements `quantityOnHand`, creates `InventoryTransaction` (type DISPENSE), audit log `MEDICATION_DISPENSED`.

- **GET /pharmacy/inventory-low-stock**  
  Returns: array of `InventoryItem` where `quantityOnHand <= reorderLevel` and `isActive`.

- **GET /pharmacy/inventory-expiring**  
  Returns: array of `InventoryItem` with `expirationDate` within `withinDays`, ordered by `expirationDate` ascending.

---

## Assumptions

1. **Facility scope** – All operations are scoped by `facilityId` from the request (header or JWT). No cross-facility access.
2. **Dispense** – Encounter must belong to the same facility and patient; dispenser is the authenticated user. Audit uses existing `AuditAction.MEDICATION_DISPENSED`.
3. **InventoryTransaction quantity** – RECEIPT stores positive quantity; DISPENSE stores negative quantity (ledger style). ADJUSTMENT stores the delta (+ or -).
4. **Low-stock filter** – Implemented in-memory (fetch then filter by `quantityOnHand <= reorderLevel`) because Prisma cannot express “column <= other column” in a single where.
5. **Zod** – `zod` was added to `apps/api` dependencies for DTO validation in this module; shared package already uses zod for other DTOs.
6. **Route order** – `inventory-low-stock` and `inventory-expiring` are declared before `inventory/:id` so they are not matched as `:id`.
7. **One-clinic MVP** – No multi-warehouse, purchasing, or billing; single facility and simple inventory only.

---

## app.module.ts wiring

`PharmacyInventoryModule` is imported in `AppModule` (see `app.module.ts`). No other app-level changes required.
