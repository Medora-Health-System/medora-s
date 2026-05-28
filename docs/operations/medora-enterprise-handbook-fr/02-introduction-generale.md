# Introduction générale — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11  
**Section:** I.1  
**Public:** Tous les lecteurs du manuel — direction, formateurs, personnel clinique et administratif

---

## 1. Qu'est-ce que Medora-S ?

Medora-S est un **dossier médical électronique (DME)** modulaire conçu pour des cliniques et services d'urgence en **environnement à ressources limitées**. Le premier déploiement cible est le **pilote Haïti** (Phase 1 — Clinic MVP).

Medora-S couvre :

- Accueil et inscription patient  
- Triage et documentation aux urgences  
- Documentation médicale (HPI, ROS, examen, MDM)  
- Soins infirmiers et réévaluation  
- Prescriptions, laboratoire, imagerie, pharmacie  
- Orientation, admission, transfert, sortie  
- Administration, audit, dévoilement de dossier (ROI)  
- Formation et intégration opérationnelle  

L'interface utilisateur visible par le personnel est en **français**. Les identifiants techniques (routes, champs API) peuvent rester en anglais.

---

## 2. Environnements de soins visés

| Contexte | Description | Couverture manuel |
|----------|-------------|-------------------|
| **Service d'urgence (ED)** | Parcours complet : accueil → triage → tableau → documentation → ordres → disposition | Volumes 1–4, 6, 8 |
| **Soins urgents / intensifs (UC)** | Consultation ambulatoire accélérée, sans parcours ED identique | Volume 1 (distinction type) |
| **Clinique ambulatoire** | Visites programmées, suivi | Volume 1 (aperçu) |
| **Observation / court séjour** | Admission prolongée sans unité complète | Volume 6 |
| **Auxiliaires** | Pharmacie, labo, imagerie | Volume 5 |
| **Administration** | Utilisateurs, audit, ROI, santé système | Volumes 6–7 |

Ce manuel **ne prétend pas** reproduire un système hospitalier national ou multi-établissements enterprise.

---

## 3. Soins urgents vs urgences (ED)

| Type produit | Libellé UI | Usage |
|--------------|------------|-------|
| `EMERGENCY` | Consultation d'urgence / Urgences | Parcours ED : triage, tableau des urgences, documentation ED |
| `URGENT_CARE` | Soins urgents / intensifs | Consultation ouverte ; parcours ED dédié réduit |
| `OUTPATIENT` | Clinique | Ambulatoire |

**Règle formation :** le personnel d'accueil et de triage doit connaître le **protocole local** pour ouvrir le bon type de consultation. Medora distingue ces types pour la facturation, le tableau de bord et certains droits d'accès.

---

## 4. Philosophie opérationnelle

| Principe | Application |
|----------|-------------|
| **Sécurité patient d'abord** | Identité vérifiée, escalade explicite, pas de contournement silencieux |
| **Simplicité** | Workflows courts, libellés clairs, peu de navigation profonde |
| **Moindre privilège** | Chaque rôle accède uniquement aux écrans nécessaires |
| **Honnêteté produit** | Limites documentées (cloud, pas de diagnostic automatique) |
| **Français UI** | Terminologie canonique — voir [glossaire](./03-glossaire.md) |
| **Phase discipline** | MVP clinique d'abord ; pas de promesse enterprise prématurée |

---

## 5. Philosophie workflow

Le parcours patient type aux urgences :

```
Accueil (Vol. 1) → Triage (Vol. 2) → Tableau urgences
    → Documentation prestataire (Vol. 3) → Ordres / résultats (Vol. 5)
    → Soins / réévaluation (Vol. 4) → Orientation + exécution sortie (Vol. 6)
```

**Distinctions critiques (canon) :**

| Concept | Signification |
|---------|---------------|
| **Orientation** | Décision clinique d'issue (domicile, observation, transfert…) |
| **Disposition** | Panneau / zone dossier / synthèse opérationnelle |
| **Décision prestataire sortie** | Acte médical documenté |
| **Exécution sortie infirmière** | Acte infirmier distinct (Volume 4) |

Voir [french-terminology-canon.md](../french-terminology-canon.md) et [french-terminology-risks.md](../french-terminology-risks.md).

---

## 6. Philosophie responsive / mobile (initiative 19M)

Medora-S adopte une approche **responsive pragmatique** (initiative **19M**) :

- Navigation mobile (drawer, touch targets)  
- Layouts adaptés tablette pour triage, chevet, documentation prestataire  
- Files auxiliaires (pharmacie, labo, imagerie) avec modes compact  

**Ce n'est pas :** une application native offline-first complète.

Volume dédié : [Volume 8 — Mobile et Haïti](../handbook-fr-mobile-tablette-haiti.md).

Checklist terrain : **19M.8** (régression cross-device).

---

## 7. Philosophie gouvernance

### 7.1 Carry-forward (19T)

Les données de triage peuvent être **reprises** en documentation prestataire et infirmière. Le personnel doit **revoir section par section** — la reprise n'est pas une validation automatique.

Référence : `docs/clinical/longitudinal-history-production-validation-19T4.md` · Volume 2.

### 7.2 Intelligence motif (19MDM)

Les **inserts cliquables** (pastilles HPI/ROS/MDM par motif) sont une **aide à la saisie** — insertion **manuelle** uniquement. Ce n'est **pas** un diagnostic automatique.

Référence : Volume 3 · manifeste `COMPLAINT_INTELLIGENCE_SUBGROUP_CANON`.

### 7.3 ROI et export dossier (Phase 5G / 5F)

Le **dévoilement de dossier (ROI)** et l'**export du dossier** sont des workflows **audités**, réservés aux rôles autorisés. Volume 6–7.

### 7.4 Modèles de sortie gouvernés

Les gabarits de sortie et registres de gouvernance clinique sont administrés — ne pas contourner par copier-coller non tracé.

---

## 8. Philosophie déploiement Haïti

| Facteur | Implication manuel |
|---------|-------------------|
| Effectifs réduits | Formation par rôle, super-utilisateurs |
| Connectivité variable | Protocole papier parallèle obligatoire |
| Tablettes chevet | Volume 8 prioritaire |
| Cadre professionnel local | Titres IPS/IDE/médecin validés avec direction |
| Cloud-dépendant | Pas de promesse hors-ligne complet |

Références : `docs/HAITI_MVP_PILOT.md` · [Annexe A — Haïti](./appendices/appendix-a-haiti-deployment.md) · Volume 9.

---

## 9. Mode d'emploi du manuel

| Besoin | Où aller |
|--------|----------|
| Premier jour accueil | Volume 1 + checklist Volume 9 |
| Formation triage | Volume 2 + scénarios Annexe D |
| Cartographie écrans | [Index routes](./05-index-routes.md) |
| Terme inconnu | [Glossaire](./03-glossaire.md) |
| Workflow par rôle | [Index workflows](./04-index-workflows.md) |
| Sigle US (LWBS, EMTALA…) | [Index acronymes](./06-index-acronymes.md) |
| Export PDF formation | [Checklist export](./exports/export-readiness-checklist.md) |
| Revue annuelle | [Gouvernance documentaire](./09-gouvernance-documentaire.md) |

**Ordre lecture recommandé nouvel utilisateur :** Introduction → Glossaire (aperçu) → Volume métier assigné → Volume 8 (mobile) → Volume 9 (certification).

---

## 10. Limites et responsabilité institutionnelle

> **Ce manuel soutient l'exploitation, la formation et l'intégration de Medora-S. Il ne remplace pas les politiques institutionnelles, le jugement clinique, ni les obligations légales locales.**

| Élément | Statut |
|---------|--------|
| Certification opérationnelle Medora (Vol. 9) | Attestation interne établissement — ≠ licence professionnelle |
| Protocole papier panne | Obligation institutionnelle — documenté, non imposé par le logiciel |
| Connectivité cloud | Medora **dépendant du cloud** en production MVP |
| Traduction future EN | Prévue gouvernance documentaire — édition FR = canon opérationnel |

Medora-S **assiste** les workflows. Le personnel et la direction de l'établissement restent responsables de la qualité des soins, de l'exactitude des données et de la conformité locale.

---

## Références

- [Table des matières](./01-table-des-matieres.md)  
- [Canon terminologique](../french-terminology-canon.md)  
- [Inventaire workflows](../french-workflow-inventory.md)  
- [Manifeste d'assemblage](./handbook-manifest-fr.ts)

---

*Fin introduction générale — M-BOOK.FR.11*
