# Traduction UI Medora-S — Français uniquement

## Fichiers modifiés

| Fichier | Modifications |
|--------|----------------|
| `apps/web/app/app/pharmacy/page.tsx` | Titre « File pharmacie », liens Stock / Délivrance, tableau (Patient, NIR, Médicament, Priorité, Statut, Actions), boutons Vérifier / Dispenser, « Voir la consultation », statuts et priorités affichés en français, messages chargement / vide / erreur |
| `apps/web/app/app/pharmacy/inventory/page.tsx` | « Active only » → « Actifs uniquement », « Apply filters » → « Appliquer les filtres », message catalogue, « X item(s) » → « X article(s) », texte d’aide modal Ajuster (positif/négatif, stock non négatif) |
| `apps/web/app/app/pharmacy/low-stock/page.tsx` | Déjà en français (titres, liens, Chargement…) |
| `apps/web/app/app/pharmacy/expiring/page.tsx` | Déjà en français |
| `apps/web/app/app/pharmacy/dispense/page.tsx` | Déjà en français |
| `apps/web/app/app/pharmacy/inventory/layout.tsx` | Fallback Suspense « Loading… » → « Chargement… » |
| `apps/web/app/app/layout.tsx` | Libellé nav « Stock périmé » → « Stock à péremption » |
| `apps/web/src/components/pharmacy/PharmacyAlertsCard.tsx` | Lien « Réceptionner stock » → « Stock » |
| `apps/web/src/components/pharmacy/Modal.tsx` | `aria-label="Fermer"` (déjà fait précédemment) |
| `apps/web/src/components/pharmacy/InventoryTable.tsx` | Déjà en français (Médicament, Code, SKU, Lot, Péremption, En stock, Réappro., Actions, Réceptionner, Ajuster) |
| `apps/web/app/app/public-health/summary/page.tsx` | Commune « (none) » → « — », statuts déclarations (Suspect, Confirmé, Écarté) dans les cartes et le tableau détail |
| `apps/web/app/app/public-health/disease-reports/page.tsx` | Affichage statut dans le tableau : SUSPECTED/CONFIRMED/RULED_OUT → Suspect / Confirmé / Écarté |
| `apps/web/app/app/public-health/vaccinations/page.tsx` | Déjà en français |
| `apps/web/app/app/patients/[id]/page.tsx` | « Last updated » → « Dernière mise à jour », message erreur résolution diagnostic, « Failed to create encounter » → « Impossible de créer la consultation », « Failed to update patient » → « Impossible de modifier le patient » |

## Résumé des zones traduites

- **Pharmacie**
  - Page file (queue) : titre, liens, description, en-têtes de tableau, libellés de statut/priorité, boutons Vérifier / Dispenser, lien consultation, états chargement / vide / erreur.
  - Stock (inventory) : filtres « Actifs uniquement », « Appliquer les filtres », message catalogue, compteur « X article(s) », texte d’aide modal Ajuster.
  - Composant alertes : lien « Stock » vers l’inventaire.
  - Layout app : libellé « Stock à péremption » dans la navigation.

- **Santé publique**
  - Résumé : valeur commune par défaut « — », statuts des déclarations en français (Suspect, Confirmé, Écarté) dans les cartes et le tableau détail.
  - Déclarations de cas : colonne Statut du tableau en français via mapping.

- **Dossier patient**
  - Résumé du dossier : « Dernière mise à jour » au lieu de « Last updated ».
  - Messages d’erreur : clôture diagnostic, création consultation, mise à jour patient.

- **Navigation / accessibilité**
  - Libellé « Stock à péremption » dans le menu principal.
  - Bouton fermer du modal pharmacie : `aria-label="Fermer"`.

## Glossaire des termes UI (EN → FR)

| Anglais | Français |
|--------|----------|
| Pharmacy | Pharmacie |
| Pharmacy Queue | File pharmacie |
| Pharmacy inventory | Stock pharmacie |
| Dispense from stock | Délivrance depuis le stock |
| Dispense Medication | Délivrance de médicament / Dispenser un médicament |
| Inventory | Stock |
| Low Stock | Stock faible |
| Expiring Stock / Stock expiring | Stock à péremption |
| Patient | Patient |
| MRN | NIR |
| Medication | Médicament |
| Priority | Priorité |
| Status | Statut |
| Actions | Actions |
| Verify | Vérifier |
| Dispense | Dispenser |
| View Encounter | Voir la consultation |
| Loading… | Chargement… |
| No medication orders in queue | Aucun ordre de médicament en file |
| Active only | Actifs uniquement |
| Apply filters | Appliquer les filtres |
| item(s) | article(s) |
| Public Health | Santé publique |
| Vaccinations | Vaccinations |
| Disease Reports | Déclarations maladies / Signalements de maladies |
| Summary | Résumé |
| Chart Summary | Résumé du dossier |
| Follow-up | Suivi |
| Last updated | Dernière mise à jour |
| Failed to update status | Impossible de mettre à jour le statut |
| Failed to resolve diagnosis | Impossible de clôturer le diagnostic |
| Failed to create encounter | Impossible de créer la consultation |
| Failed to update patient | Impossible de modifier le patient |
| Close | Fermer |
| Suspect(ed) | Suspect |
| Confirmed | Confirmé |
| Ruled out | Écarté |
| PENDING | En attente |
| IN_PROGRESS | En cours |
| COMPLETED | Terminé |
| ROUTINE / URGENT / STAT | Routine / Urgent / Stat (inchangés) |

Les identifiants de code (noms de variables, clés API, routes) restent en anglais ; seuls les textes visibles par l’utilisateur ont été passés en français.
