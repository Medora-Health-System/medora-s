# Medication order label integrity (M1.7A.4)

## Problem

Medication orders (e.g. **Hydromorphone**) appeared as **Medication (label unavailable)** in Orders summary, open orders table, MAR rows, and administration modal — despite a valid catalog link.

## Root cause

1. **English label builder** only considered `displayNameEn`, acceptable `manualLabel`, then full **catalog `code`**.
2. Haiti / enterprise rows often have **`genericName`** populated while `displayNameEn` is still null.
3. Catalog codes like `HYDROMORPHONE_2MG_ML_INJECTABLE` are **rejected** as human labels (`ALL_CAPS_SNAKE` guard), so EN resolution returned the typed fallback.
4. **`medicationProductId`** was not resolved to legacy `CatalogMedication` during order enrichment (field exists on `OrderItem` but was unused).
5. MAR snapshot logic duplicated the narrow EN path instead of shared resolution.

## Fix strategy

### Shared (`orderItemDisplayLabels.ts`)

- `medicationInnFromCatalogCode()` — first code segment → title case INN (e.g. Hydromorphone).
- `resolveMedicationCatalogPrimaryLabel(lang, catalogMed, manual?)` — unified fallback order.
- `buildMedicationOrderLabelSnapshot()` — MAR / audit snapshot.

**EN medication primary:** `displayNameEn` → `genericName` → manual → INN from code prefix → fallback.

**FR medication primary:** `displayNameFr` → `displayNameEn` → `genericName` → `name` → manual → code.

### API

- `order-medication-catalog-resolve.util.ts` — load catalog + `MedicationProduct` (legacy catalog + concept).
- `enrichOrderItemsForDisplay` uses `resolveOrderMedicationCatalogRow`.
- `MedicationAdministrationService` uses shared snapshot builder + same catalog resolver.

### Web

- `orderItemDisplayFr.ts` — `resolveMedicationCatalogPrimaryLabel` for catalog-backed medication lines (EN + FR).

## Affected surfaces (fixed via API + web helpers)

| Surface | Mechanism |
|---------|-----------|
| Orders summary / open orders | `displayLabelEn` / `displayLabelFr` from enrichment |
| MAR pending rows | `getOrderItemDisplayLabelForLanguage` + enriched `catalogMedication` |
| Administration modal | MAR snapshot on create + order item labels |
| Chart summary | `displayLabelEn` from API |

## Safety fallback

`Medication (label unavailable)` / `Médicament (libellé indisponible)` only when **no** catalog row, product link, genericName, manual text, or derivable INN exists.

Internal catalog UUIDs and raw codes are **not** shown as primary labels in EN UI.

## Tests

- `packages/shared/src/orders/orderItemDisplayLabels.test.ts` — Hydromorphone, INN derivation, fallback-only-when-empty
- `apps/api/src/orders/orders-medication-label-integrity.spec.ts` — enrichment
- `apps/api/src/medication-administration/medication-order-label-integrity.spec.ts` — MAR snapshot

## Validation

```bash
pnpm --filter @medora/shared test
pnpm --filter @medora/api test -- orders
pnpm --filter @medora/api test -- medication-administration
pnpm --filter @medora/api run build
pnpm verify:web
```

## Out of scope

- No formulary expansion, billing, governance, activation, or provider search cutover
- No migration / seed / SQL required
