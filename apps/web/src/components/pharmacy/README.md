# Pharmacy MVP (web)

## API integration (`src/lib/pharmacyApi.ts`)

All calls go through `apiFetch` → `/api/backend/*` with `x-facility-id` and cookies (JWT).

| UI | Method | Backend path |
|----|--------|--------------|
| Create item | POST | `/pharmacy/inventory` |
| List / filter | GET | `/pharmacy/inventory?...` |
| Catalog dropdown | GET | `/pharmacy/catalog-medications` |
| Receive | POST | `/pharmacy/inventory/:id/receive` |
| Adjust | POST | `/pharmacy/inventory/:id/adjust` |
| Dispense | POST | `/pharmacy/dispenses` |
| Low stock | GET | `/pharmacy/inventory-low-stock` |
| Expiring | GET | `/pharmacy/inventory-expiring?withinDays=` |
| Patient search (dispense) | GET | `/patients/search?q=` |
| Encounters (dispense) | GET | `/patients/:id/encounters` |

## Routes

- `/app/pharmacy/inventory` — table, filters, create/receive/adjust (write for PHARMACY/ADMIN)
- `/app/pharmacy/dispense` — dispense flow (PHARMACY/ADMIN only in UI)
- `/app/pharmacy/low-stock` — low-stock table
- `/app/pharmacy/expiring` — expiring window (default 90 days)

## Shared components

- `InventoryTable.tsx` — medication table
- `Modal.tsx` — modal shell + `Field` / `inputStyle`

## Backend changes applied for this MVP

- `GET /pharmacy/catalog-medications` — list active medications for create form
- `PHARMACY` role added to `GET /patients/search` and `GET /patients/:id/encounters` so dispensers can pick patient + encounter
