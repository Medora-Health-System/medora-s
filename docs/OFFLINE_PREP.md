# Préparation mode hors ligne (catalogues & signes vitaux)

Objectifs du **Sprint 8** (référence technique, sans activer le mode offline tout de suite).

## 1. DTO compacts

- Les réponses `GET /catalog/*/search` renvoient déjà des objets légers (`id`, `code`, `displayNameFr`, `secondaryText`, métadonnées ciblées).
- Conserver ce contrat pour les futurs bundles SQLite / IndexedDB.

## 2. Adaptateur de recherche locale

- Implémentation de référence : `apps/web/src/lib/catalog/localCatalogSearchAdapter.ts`.
- `SharedCatalogAutocomplete` peut demain accepter un `searchFn` injecté : en ligne = fetch API, hors ligne = recherche sur snapshot local (texte plein sur `searchText` / libellés).

## 3. Libellés sans enchaînement de requêtes

- L’UI doit afficher `displayNameFr` (+ `secondaryText`) retournés par la recherche, sans refetch par `id` pour chaque ligne.
- Les enrichissements post-création (ex. ordre médicament) restent optionnels côté serveur.

## 4. Snapshots

- **Catalogues** : export JSON périodique (même forme que les items de recherche + `searchText` si besoin).
- **Signes vitaux** : le patient expose `latestVitalsJson` / historique triage ; réutiliser pour l’entête dossier offline.

## 5. Prochaines étapes code

1. Brancher un `CatalogSearchPort` dans `SharedCatalogAutocomplete` (défaut = API actuelle).
2. Service worker ou hook `useCatalogSnapshot` pour charger/remplacer le port.
3. Stratégie de conflit : lecture seule offline, file d’attente pour créations (hors périmètre MVP).
