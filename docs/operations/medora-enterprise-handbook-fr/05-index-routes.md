# Index des routes opérationnelles — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11  
**Section:** I.4  

Ce document recense les **routes utilisateur visibles** dans la navigation opérationnelle Medora-S.  
**Exclus :** routes API internes, pages de développement, endpoints techniques non exposés au personnel clinique.

Source navigation : `apps/web/src/components/app-shell/sidebarNavConfig.ts`

---

## Légende

| Colonne | Description |
|---------|-------------|
| **Mobile** | Pertinence tablette/téléphone en pratique clinique |
| **Vol.** | Volume handbook principal |

---

## Accueil et patients

| Route | Objectif opérationnel | Utilisateurs | Vol. | Mobile |
|-------|----------------------|--------------|------|--------|
| `/app/registration` | Accueil, inscription, ouverture visite | FRONT_DESK, ADMIN | 1 | Partiel |
| `/app/patients` | Recherche et fiche patient | FRONT_DESK, RN, PROVIDER, ADMIN | 1 | Partiel |
| `/app/encounters` | Liste consultations | RN, PROVIDER, ADMIN | 1, 3 | Partiel |
| `/app/trackboard` | Tableau de bord général | ADMIN, PROVIDER, RN | 1 | Oui |

---

## Urgences (ED)

| Route | Objectif opérationnel | Utilisateurs | Vol. | Mobile |
|-------|----------------------|--------------|------|--------|
| `/app/emergency/trackboard` | Tableau des urgences — consultations ouvertes | RN, PROVIDER, ADMIN | 1, 2 | Oui |
| `/app/emergency/triage` | Accueil et saisie triage | RN, ADMIN | 2 | Oui |
| `/app/emergency/active/{id}` | Espace actif consultation urgence | RN, PROVIDER | 2, 3, 4 | Oui |
| `/app/emergency/chart/{id}` | Dossier / chart consultation | RN, PROVIDER | 3, 4 | Oui |
| `/app/hospitalisation` | Observation / hospitalisation | RN, PROVIDER, ADMIN | 6 | Partiel |

---

## Documentation clinique

| Route | Objectif opérationnel | Utilisateurs | Vol. | Mobile |
|-------|----------------------|--------------|------|--------|
| `/app/provider` | Documentation médicale, workspace prestataire | PROVIDER, RN, ADMIN | 3 | Oui |
| `/app/nursing` | Soins infirmiers, réévaluation | RN, PROVIDER, ADMIN | 4 | Oui |
| `/app/follow-ups` | Suivis post-visite | RN, PROVIDER, FRONT_DESK, ADMIN | 6 | Faible |

---

## Auxiliaires — pharmacie, labo, imagerie

| Route | Objectif opérationnel | Utilisateurs | Vol. | Mobile |
|-------|----------------------|--------------|------|--------|
| `/app/pharmacy-worklist` | File pharmacie — ordres à délivrer | PHARMACY, ADMIN | 5 | Partiel |
| `/app/pharmacy` | Hub pharmacie | PHARMACY, ADMIN | 5 | Faible |
| `/app/pharmacy/inventory` | Inventaire médicaments | PHARMACY, ADMIN | 5, 7 | Faible |
| `/app/pharmacy/dispense` | Délivrance | PHARMACY, ADMIN | 5 | Faible |
| `/app/pharmacy/low-stock` | Alertes stock bas | PHARMACY, ADMIN | 5 | Faible |
| `/app/pharmacy/expiring` | Alertes péremption | PHARMACY, ADMIN | 5 | Faible |
| `/app/lab-worklist` | File laboratoire | LAB, RN, ADMIN | 5 | Partiel |
| `/app/lab-worklist/commande/{orderId}` | Détail commande labo | LAB, ADMIN | 5 | Partiel |
| `/app/rad-worklist` | File imagerie | RADIOLOGY, ADMIN | 5 | Partiel |
| `/app/rad-worklist/commande/{orderId}` | Détail commande imagerie | RADIOLOGY, ADMIN | 5 | Partiel |

---

## Facturation

| Route | Objectif opérationnel | Utilisateurs | Vol. | Mobile |
|-------|----------------------|--------------|------|--------|
| `/app/billing` | Facturation | BILLING, ADMIN, FRONT_DESK | — | Faible |

*Hors scope volumes cliniques MVP — référence navigation uniquement.*

---

## Administration

| Route | Objectif opérationnel | Utilisateurs | Vol. | Mobile |
|-------|----------------------|--------------|------|--------|
| `/app/admin` | Hub administration | ADMIN | 7 | Faible |
| `/app/admin/users` | Gestion utilisateurs et rôles | ADMIN | 7 | Faible |
| `/app/admin/audit` | Journal d'audit | ADMIN | 7 | Faible |
| `/app/admin/roi` | Workflow dévoilement dossier (ROI) | ADMIN | 6, 7 | Faible |
| `/app/admin/roi-monitoring` | Surveillance ROI | ADMIN | 6, 7 | Faible |
| `/app/admin/exports` | Exports système | ADMIN | 7 | Faible |
| `/app/admin/go-live` | Checklist go-live | ADMIN | 7, 8 | Faible |
| `/app/admin/system-health` | Santé système | ADMIN | 7, 8 | Faible |
| `/app/admin/backup-readiness` | Préparation sauvegarde | ADMIN | 7 | Faible |
| `/app/admin/compliance` | Conformité | ADMIN | 7 | Faible |
| `/app/admin/medication-master` | Référentiel médicaments | ADMIN | 7 | Faible |
| `/app/admin/medication-governance` | Gouvernance médicaments | ADMIN | 7 | Faible |
| `/app/reports` | Rapports administratifs | ADMIN | 7 | Faible |

---

## Santé publique / MSPP (selon rôle)

| Route | Objectif | Utilisateurs | Vol. |
|-------|----------|--------------|------|
| `/app/public-health/summary` | Synthèse santé publique | ADMIN (selon config) | — |
| `/app/public-health/vaccinations` | Vaccinations | ADMIN | — |
| `/app/public-health/disease-reports` | Déclarations maladies | ADMIN | — |
| `/app/mspp/*` | Modules MSPP | ADMIN (accès restreint) | — |

*Modules santé publique — voir documentation MSPP séparée ; formation ED prioritaire sur Volumes 1–9.*

---

## Landing par rôle (post-connexion)

| Rôle | Route d'atterrissage typique |
|------|------------------------------|
| FRONT_DESK | `/app/registration` |
| RN | `/app/nursing` |
| PROVIDER | `/app/provider` |
| PHARMACY | `/app/pharmacy` |
| LAB | `/app/lab-worklist` |
| RADIOLOGY | `/app/rad-worklist` |
| ADMIN | `/app/admin` |
| BILLING | `/app/billing` |

Source : `apps/web/src/lib/landingRoute.ts`

---

## Notes export / formation

1. Les routes avec `{id}` utilisent l'identifiant de consultation — **ne pas** capturer d'écran avec ID patient réel.  
2. Préférer dossier **formation / test** pour captures (voir [07-index-captures-ecran.md](./07-index-captures-ecran.md)).  
3. En cas de doute sur une route, vérifier le menu latéral du rôle concerné — seules les routes **autorisées RBAC** apparaissent.

---

## Références

- [Index workflows](./04-index-workflows.md)  
- Volume 8 — navigation mobile  
- [sidebarNavConfig.ts](../../../apps/web/src/components/app-shell/sidebarNavConfig.ts)

---

*Fin index routes — M-BOOK.FR.11*
