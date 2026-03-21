# Pharmacy enhancement — Phase 1

## Summary

- **Faster pharmacy UI:** Inventaire pharmacie page with "Ajout rapide au stock", "Voir alertes", "Actualiser". Quick-add flow: search (2+ chars) → select medication → dosage/forme/voie auto-filled → quantity, expiration, lot, reorder, unit → save.
- **Medication autocomplete:** Search after 2 characters; generic names and French display; alias/brand support via `MedicationAlias`; auto-fills name, strength, form, route.
- **Haiti-tailored catalog:** Extended catalog with `displayNameFr`, `genericName`, `strength`, `dosageForm`, `route`, `therapeuticClass`, `sortPriority`, `isEssential`, `searchText`; aliases for common names; seed-catalogs updated for Haiti-focused medications.

## Schema

- **CatalogMedication:** Added `genericName`, `displayNameFr`, `strength`, `dosageForm`, `route`, `therapeuticClass`, `sortPriority`, `isEssential`, `searchText`.
- **MedicationAlias:** New model `(catalogMedicationId, alias, language?, isPrimary)` for generic/brand/alias search.
- **InventoryItem:** Added `isFavorite` for future favorites section.
- **FacilityMedicationUsage:** New model for inventory-add and dispense counts and `lastUsedAt`; used for "recent" and ranking.

Migration: `20260319024736_pharmacy_catalog_autocomplete`.

## Backend

- **MedicationCatalogModule** (`apps/api/src/medication-catalog/`):
  - `GET /pharmacy/medications/search?q=...&limit=20&favoritesFirst=true` — autocomplete; matches name, genericName, displayNameFr, strength, code, searchText, and aliases.
  - `GET /pharmacy/medications/favorites` — medications marked favorite at facility (inventory items with `isFavorite`).
  - `GET /pharmacy/medications/recent` — by `FacilityMedicationUsage.lastUsedAt`.
  - `MedicationCatalogService.recordInventoryAdd` / `recordDispense` — called from PharmacyInventoryService when creating inventory or dispensing.
- **PharmacyInventoryModule:** Imports MedicationCatalogModule; creates inventory and dispense call catalog usage; list catalog returns new fields; list inventory includes extended catalog in response.

## Seed

- **seed-catalogs.ts:** Medications updated with new fields and aliases (Paracétamol, Amoxicilline, Metformine, ORS, Ibuprofène, Aspirine, Oméprazole, Cétirizine, etc.). Run `pnpm run prisma:seed-catalogs` after migration.

## Frontend

- **pharmacyApi:** `searchMedications`, `fetchMedicationFavorites`, `fetchMedicationRecent`; types `MedicationSearchItem`, extended `CatalogMedication`.
- **QuickAddStockModal:** Medication autocomplete (debounced 250 ms, min 2 chars), then read-only Dosage/Forme/Voie and editable Quantité initiale, Date d'expiration, Lot, Seuil d'alerte, Unité; SKU auto-generated; French validation messages.
- **Inventaire pharmacie page:** Title "Inventaire pharmacie"; buttons "Voir alertes", "Actualiser", "Ajout rapide au stock", "Créer un article (avancé)"; QuickAddStockModal for quick-add flow; existing create/receive/adjust modals unchanged.

## Not done in this pass (optional next)

- Dispense page: reuse medication search for "Rechercher dans le stock" (same autocomplete as quick-add).
- Receive modal: add Lot and Date d'expiration to receive-stock DTO/UI if backend supports.
- Adjust modal: add "Motif" dropdown (Correction d'inventaire, Produit endommagé, Perte, etc.) if backend supports.
- Favorites section on inventory page (top-right pills): use `fetchMedicationFavorites` and "Ajouter au stock" / "Délivrer"; toggle `isFavorite` on inventory item.
- Provider Rx modal: optional use of medication search for prescribing (catalog already used).

## Testing

- Open Inventaire pharmacie → "Ajout rapide au stock" → type "par" or "amo" → select Paracétamol or Amoxicilline → fill quantity → Enregistrer; new row appears.
- Search uses aliases: e.g. "doliprane", "amox" should find the right medication.
- Existing create/receive/adjust flows still work.
- Run catalog seed and ensure medications have displayNameFr, strength, aliases.
