# Manuel d'exploitation entreprise Medora-S — Assemblage export

**Phase:** M-BOOK.FR.12  
**Langue:** Français  
**Statut:** Assemblage automatique — revue direction requise avant diffusion  

> Ce manuel soutient l'exploitation et la formation. Il ne remplace pas les politiques institutionnelles ni le jugement clinique. Medora-S est **dépendant du cloud** en production MVP.

---



<!-- SECTION: Page de garde -->

# Manuel d'exploitation entreprise Medora-S

## Édition française — assemblage opérationnel

**Phase:** M-BOOK.FR.11  
**Version:** 1.0.0-draft  
**Statut:** Assemblage documentation — prêt pour export PDF/DOCX, formation et revue direction  
**Langue produit:** Français (interface et manuel)  
**Public:** Direction clinique, direction technique, formateurs, super-utilisateurs, personnel opérationnel

---

## Identification du document

| Champ | Valeur |
|-------|--------|
| Titre complet | Manuel d'exploitation entreprise Medora-S — Édition française |
| Collection | M-BOOK.FR.1 à M-BOOK.FR.11 |
| Volumes opérationnels | 9 (Accueil → Formation) |
| Documents transverses | Canon terminologique, inventaire workflows, registre risques, guide de style |
| Déploiement cible | Pilote Haïti — clinique MVP Phase 1 |

---

## Avertissement institutionnel

> **Ce manuel soutient l'exploitation, la formation et l'intégration de Medora-S. Il ne remplace pas :**
>
> - les politiques institutionnelles de l'établissement ;
> - le jugement clinique des professionnels de santé ;
> - les obligations légales et réglementaires locales ;
> - les protocoles papier de continuité en cas de panne.

Medora-S **assiste** les workflows ; la responsabilité des soins et des décisions reste au personnel et à la direction de l'établissement.

---

## Dépendance technique

Medora-S est **dépendant du cloud** pour la synchronisation des données en production. Ce manuel documente les pratiques de continuité (protocole papier, vérification post-reconnexion) sans prétendre à un mode hors-ligne complet.

---

## Structure de la collection

1. **Partie I — Fondations** — Introduction, glossaire, index (workflows, routes, acronymes)
2. **Partie II — Volumes opérationnels 1–9** — Parcours métier par rôle
3. **Partie III — Annexes** — Haïti, mobile, référence rapide, scénarios, panne
4. **Partie IV — Assets visuels** — Inventaires captures et diagrammes (intégration future)
5. **Partie V — Gouvernance documentaire** — Versionnement, revue, traduction

---

## Références d'assemblage

- [Table des matières](./01-table-des-matieres.md)
- [Manifeste machine](./handbook-manifest-fr.ts)
- [Gouvernance documentaire](./09-gouvernance-documentaire.md)
- [Checklist export](./exports/export-readiness-checklist.md)

---

*Document d'assemblage M-BOOK.FR.11 — Medora-S*


\newpage



<!-- SECTION: Table des matières -->

# Table des matières — Manuel entreprise Medora-S (FR)

**Phase:** M-BOOK.FR.11  
**Format:** Structure logique pour export PDF/DOCX — numérotation enterprise  
**Version:** 1.0.0-draft

---

## Partie 0 — Couverture et métadonnées

| § | Titre | Fichier |
|---|-------|---------|
| 0.1 | Page de garde | [00-page-garde.md](./00-page-garde.md) |
| 0.2 | Table des matières | [01-table-des-matieres.md](./01-table-des-matieres.md) |
| 0.3 | Manifeste d'assemblage | [handbook-manifest-fr.ts](./handbook-manifest-fr.ts) |

---

## Partie I — Fondations transverses

| § | Titre | Fichier | Pages (PDF est.) |
|---|-------|---------|------------------|
| I.1 | Introduction générale | [02-introduction-generale.md](./02-introduction-generale.md) | — |
| I.2 | Glossaire canonique | [03-glossaire.md](./03-glossaire.md) | — |
| I.3 | Index des workflows | [04-index-workflows.md](./04-index-workflows.md) | — |
| I.4 | Index des routes opérationnelles | [05-index-routes.md](./05-index-routes.md) | — |
| I.5 | Index des acronymes | [06-index-acronymes.md](./06-index-acronymes.md) | — |

### I.1 Introduction générale — sous-sections

1. Qu'est-ce que Medora-S  
2. Environnements de soins ciblés  
3. Soins urgents vs urgences (ED)  
4. Philosophie opérationnelle  
5. Philosophie workflow  
6. Philosophie responsive / mobile (19M)  
7. Philosophie gouvernance (19T, 19MDM, ROI)  
8. Philosophie déploiement Haïti  
9. Mode d'emploi du manuel  
10. Limites et responsabilité institutionnelle  

### I.2 Glossaire — domaines

- Terminologie Medora de base  
- Documentation clinique (HPI, ROS, MDM)  
- Triage et soins infirmiers  
- Orientation / disposition / sortie  
- Mobile et connectivité  
- ROI et gouvernance  
- Carry-forward et intelligence motif  

---

## Partie II — Volumes opérationnels (M-BOOK.FR.2–10)

| Vol. | Phase | Titre | Source | Public principal |
|------|-------|-------|--------|------------------|
| **1** | FR.2 | Accueil, inscription et arrivée patient | [handbook-fr-registration-intake.md](../handbook-fr-registration-intake.md) | Accueil, triage |
| **2** | FR.3 | Triage et intake clinique | [handbook-fr-triage-clinical-intake.md](../handbook-fr-triage-clinical-intake.md) | Infirmier triage |
| **3** | FR.4 | Workflow prestataire et documentation | [handbook-fr-provider-workflow-documentation.md](../handbook-fr-provider-workflow-documentation.md) | Médecin, IPS |
| **4** | FR.5 | Workflow infirmier et exécution sortie | [handbook-fr-nursing-discharge-execution.md](../handbook-fr-nursing-discharge-execution.md) | Infirmier ED |
| **5** | FR.6 | Pharmacie, laboratoire et imagerie | [handbook-fr-pharmacy-lab-radiology.md](../handbook-fr-pharmacy-lab-radiology.md) | Auxiliaires |
| **6** | FR.7 | Orientation, admission, transfert et ROI | [handbook-fr-disposition-admission-transfer-roi.md](../handbook-fr-disposition-admission-transfer-roi.md) | Médecin, admin |
| **7** | FR.8 | Administration et gouvernance plateforme | [handbook-fr-administration-governance-operations.md](../handbook-fr-administration-governance-operations.md) | Administrateur |
| **8** | FR.9 | Mobile, tablette et déploiement Haïti | [handbook-fr-mobile-tablette-haiti.md](../handbook-fr-mobile-tablette-haiti.md) | Tous (transversal) |
| **9** | FR.10 | Formation, intégration et certification | [handbook-fr-training-onboarding-certification.md](../handbook-fr-training-onboarding-certification.md) | Formateurs, direction |

Index volumes : [volumes/README.md](./volumes/README.md)

---

## Partie III — Documents transverses canon (M-BOOK.FR.1)

| Doc. | Titre | Source |
|------|-------|--------|
| C.1 | Canon terminologique français | [french-terminology-canon.md](../french-terminology-canon.md) |
| C.2 | Guide de style manuel | [french-handbook-style-guide.md](../french-handbook-style-guide.md) |
| C.3 | Inventaire des workflows | [french-workflow-inventory.md](../french-workflow-inventory.md) |
| C.4 | Registre des risques terminologiques | [french-terminology-risks.md](../french-terminology-risks.md) |

---

## Partie IV — Annexes opérationnelles

| Annexe | Titre | Fichier |
|--------|-------|---------|
| A | Déploiement Haïti | [appendix-a-haiti-deployment.md](./appendices/appendix-a-haiti-deployment.md) |
| B | Sécurité mobile / tablette | [appendix-b-mobile-safety.md](./appendices/appendix-b-mobile-safety.md) |
| C | Référence rapide | [appendix-c-quick-reference.md](./appendices/appendix-c-quick-reference.md) |
| D | Scénarios de formation | [appendix-d-training-scenarios.md](./appendices/appendix-d-training-scenarios.md) |
| E | Workflow papier / panne | [appendix-e-downtime-paper-workflow.md](./appendices/appendix-e-downtime-paper-workflow.md) |

---

## Partie V — Assets visuels (intégration future)

| § | Titre | Fichier |
|---|-------|---------|
| V.1 | Inventaire captures d'écran | [07-index-captures-ecran.md](./07-index-captures-ecran.md) |
| V.2 | Inventaire diagrammes | [08-index-diagrammes.md](./08-index-diagrammes.md) |
| V.3 | Dossiers placeholders | [assets-placeholders/](./assets-placeholders/) |

---

## Partie VI — Gouvernance et export

| § | Titre | Fichier |
|---|-------|---------|
| VI.1 | Gouvernance documentaire | [09-gouvernance-documentaire.md](./09-gouvernance-documentaire.md) |
| VI.2 | Checklist préparation export | [exports/export-readiness-checklist.md](./exports/export-readiness-checklist.md) |

---

## Ordre d'assemblage recommandé (PDF monolithique)

1. Page de garde (0.1)  
2. Table des matières (0.2)  
3. Introduction générale (I.1)  
4. Glossaire (I.2)  
5. Index workflows, routes, acronymes (I.3–I.5)  
6. Volumes 1 → 9 (Partie II)  
7. Annexes A → E (Partie IV)  
8. Inventaires visuels (Partie V) — placeholders jusqu'à capture  
9. Gouvernance documentaire (VI.1)  
10. Canon terminologique complet (annexe ou volume séparé selon taille export)

---

## Références externes (hors manuel)

- `docs/HAITI_MVP_PILOT.md`  
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`  
- `docs/DEPLOYMENT_RUNBOOK.md`  
- `docs/clinical/longitudinal-history-production-validation-19T4.md`

---

*Fin table des matières — M-BOOK.FR.11*


\newpage



<!-- SECTION: Introduction générale -->

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


\newpage



<!-- SECTION: Glossaire -->

# Glossaire — Manuel entreprise Medora-S (FR)

**Phase:** M-BOOK.FR.11  
**Section:** I.2  
**Source canonique:** [french-terminology-canon.md](../french-terminology-canon.md)  
**Registre risques:** [french-terminology-risks.md](../french-terminology-risks.md)

Ce glossaire **consolide** les termes opérationnels pour l'assemblage enterprise. En cas de conflit, le canon terminologique prévaut.

---

## 1. Terminologie Medora de base

| Terme (EN) | Terme français officiel | Définition opérationnelle | Volume(s) |
|------------|-------------------------|---------------------------|-----------|
| Patient | Patient | Personne identifiée dans le dossier | 1 |
| Encounter | Consultation | Instance de prise en charge liée à une visite | 1, 3 |
| Visit | Visite | Épisode administratif ou clinique | 1 |
| ED encounter | Consultation d'urgence | Type EMERGENCY — parcours ED complet | 1, 2 |
| Urgent care | Consultation de soins urgents | Type URGENT_CARE | 1 |
| Clinic visit | Consultation clinique | Type OUTPATIENT | 1 |
| Triage | Triage | Évaluation initiale gravité + accueil urgences | 2 |
| Trackboard | Tableau des urgences | Vue consultations ouvertes | 1, 2, 8 |
| Reassessment | Réévaluation | Nouvelle évaluation clinique après intervalle | 2, 4 |
| Chief complaint | Motif de consultation | Raison principale de la visite | 2, 3 |
| Orders | Ordres ; Prescriptions / demandes | Médicaments, labo, imagerie | 3, 5 |
| Results | Résultats | Valeurs labo / comptes-rendus imagerie | 5 |
| Follow-up | Suivi | Continuité après la visite | 1, 6 |
| Task queue | File de travail ; File | Liste ordonnée tâches département | 5 |
| Assignment | Attribution ; Affectation | Médecin / infirmier responsable | 2, 4 |
| Escalation | Escalade | Montée en charge équipe / supervision | 2, 4, 8 |
| Boarding | Attente de lit ; Séjour prolongé | Délai long aux urgences sans orientation | 2, 6 |
| Critical patient | Patient critique | ESI 1–2 ou gravité équivalente | 2 |

---

## 2. Orientation, disposition et sortie

| Terme | Terme français | Notes | Volume(s) |
|-------|----------------|-------|-----------|
| Disposition (decision) | **Orientation** | Acte décisionnel médical | 3, 6 |
| Disposition (panel) | **Disposition** | Panneau / zone dossier / synthèse | 3, 6 |
| Discharge (decision) | Sortie (décision) | Décision prestataire | 3, 6 |
| Discharge execution | Exécution sortie | Acte infirmier distinct | 4, 6 |
| Observation | Observation ; Observation et court séjour | Prise en charge prolongée | 6 |
| Admission | Admission | Décision admission observation | 6 |
| Transfer | Transfert | Vers autre établissement | 6 |
| Return precautions | Consignes de retour ; Signes d'alarme | Instructions réévaluation si aggravation | 3, 4, 6 |
| LWBS | Départ avant fin de prise en charge | Acronyme US — expansion FR en formation | 6 |
| LAMA | Contre avis médical (LAMA) | Sortie contre avis | 6 |

**Règle canon :** ne pas confondre **orientation** (décision) et **disposition** (panneau).

---

## 3. Documentation clinique

| Sigle / terme | Terme français | Notes |
|---------------|----------------|-------|
| HPI | Histoire de la maladie (HPI) | Sigle autorisé |
| ROS | Revue des systèmes (ROS) ; Revue ciblée | ED : revue ciblée |
| Physical exam | Examen physique | — |
| MDM | Aide à la décision médicale (MDM) | Sigle entre parenthèses |
| Clinical impression | Impression clinique | — |
| Differential diagnosis | Diagnostic différentiel | — |
| Red flags | Signaux d'alerte ; Signes d'alarme | Éviter « red flags » en UI FR |
| Provider documentation | Documentation médicale | Section médecin ED |
| Shared planning | Planification partagée ; Dossier partagé | Champs communs équipe |

---

## 4. Triage et soins infirmiers

| Terme | Terme français | Notes |
|-------|----------------|-------|
| ESI | Indice ESI ; Gravité triage ESI | Sigle conservé |
| Pain scale | Échelle de douleur | Protocole local |
| MAR | Administration de médicament | Acte infirmier |
| Nursing care | Soins infirmiers | Volume 4 |
| Discharge execution | Exécution sortie ; Exécution équipe | ≠ décision médicale |
| IDE | Infirmier(ère) diplômé(e) d'État | Contexte Haïti — UI : Infirmier(ère) |

---

## 5. Carry-forward et historique (19T)

| Terme | Terme français | Définition |
|-------|----------------|------------|
| Carry-forward history | Reprise d'antécédents ; Antécédents repris | Données triage reprises en documentation |
| Longitudinal history | Historique longitudinal | Vue multi-consultations |
| Reconciliation | Réconciliation | Revue section par section obligatoire |
| Clinical history | Antécédents cliniques | Allergies, médicaments, problèmes actifs |

**Gouvernance 19T :** la reprise assiste la saisie ; le clinicien **valide** chaque section.

---

## 6. Intelligence motif (19MDM)

| Terme | Terme français | Règle |
|-------|----------------|-------|
| Complaint intelligence | Intelligence motif (inserts cliquables) | Aide saisie — **pas** diagnostic auto |
| Clickable inserts | Pastilles cliquables | Insertion **manuelle** |
| Template subgroup | Sous-groupe de motif | 8 sous-groupes canon (manifeste) |
| Discharge template | Modèle de sortie | Gabarit gouverné — distinct registre |

**Interdit en formation :** « appliquer automatiquement », « diagnostic suggéré par le système ».

---

## 7. ROI, audit et gouvernance

| Terme | Terme français | Notes |
|-------|----------------|-------|
| ROI | Dévoilement de dossier (ROI) | Workflow audité Phase 5G |
| Chart export | Export du dossier | Phase 5F |
| Audit log | Journal d'audit | Actions sensibles |
| Clinical governance | Gouvernance clinique | Modèles, garde-fous |
| Pending results | Résultats en attente | Analyses non finalisées |
| Pending sync | Synchronisation en attente | Post-reconnexion — vérifier |

---

## 8. Mobile, tablette et connectivité

| Terme | Terme français | Notes |
|-------|----------------|-------|
| Mobile nav | Navigation mobile | Drawer, menu principal |
| Touch target | Zone tactile | Initiative 19M |
| Responsive layout | Mise en page responsive | 19M.1–19M.9 |
| Cloud-dependent | Dépendant du cloud | Pas de mode offline complet MVP |
| Paper protocol | Protocole papier | Continuité panne |
| Bedside tablet | Tablette chevet | Usage clinique Haïti |

---

## 9. Rôles (libellés formation)

| Rôle (EN) | Terme français | Route landing typique |
|-----------|------------------|----------------------|
| FRONT_DESK | Personnel d'accueil | `/app/registration` |
| RN | Infirmier(ère) | `/app/nursing` |
| PROVIDER | Médecin ; Professionnel de santé | `/app/provider` |
| PHARMACY | Pharmacien | `/app/pharmacy-worklist` |
| LAB | Technicien de laboratoire | `/app/lab-worklist` |
| RADIOLOGY | Technicien en imagerie | `/app/rad-worklist` |
| ADMIN | Administrateur | `/app/admin` |
| BILLING | Facturation | `/app/billing` |

---

## 10. Abréviations approuvées (aperçu)

Liste complète : [06-index-acronymes.md](./06-index-acronymes.md)

| Sigle | Expansion FR |
|-------|--------------|
| ED | Urgences (service) |
| UC | Soins urgents |
| ESI | Échelle de gravité infirmière (Emergency Severity Index) |
| HPI | Histoire de la maladie |
| ROS | Revue des systèmes |
| MDM | Aide à la décision médicale |
| ROI | Dévoilement de dossier (Release of Information) |
| PMH | Antécédents médicaux |
| PSH | Antécédents chirurgicaux |
| EMTALA | Loi fédérale US transferts urgences — contexte pilote |

---

## Références

- [Canon terminologique complet](../french-terminology-canon.md)  
- [Manifeste machine](./handbook-manifest-fr.ts)  
- [Index acronymes](./06-index-acronymes.md)

---

*Fin glossaire — M-BOOK.FR.11*


\newpage



<!-- SECTION: Index workflows -->

# Index des workflows — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11  
**Section:** I.3  
**Source:** [french-workflow-inventory.md](../french-workflow-inventory.md)

Index croisé pour formation, revue direction et export. Références volumes M-BOOK.FR.2–10.

---

## Légende

| Colonne | Valeurs |
|---------|---------|
| **Priorité manuel** | P1 = go-live · P2 = post go-live |
| **Mobile** | Oui / Partiel / Faible |
| **Gouvernance** | Sensibilité données / décisions / audit |
| **Urgence** | Critique / Élevé / Moyen / Faible (impact erreur) |

---

## 1. Index par rôle

### Personnel d'accueil (FRONT_DESK)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| Accueil et inscription patient | 1 | P1 | Partiel | Identité — élevée |
| Ouverture visite / consultation | 1 | P1 | Partiel | Élevée |
| Distinction UC vs ED | 1 | P1 | — | Moyenne |
| Exécution sortie (accueil) | 6 | P1 | Partiel | Élevée |

### Infirmier(ère) triage (RN)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| Triage aux urgences | 2 | P1 | Oui | Critique |
| Tableau des urgences | 2 | P1 | Oui | Élevée |
| Carry-forward / reprise triage | 2 | P2 | Oui | Moyenne (19T) |
| Réévaluation ESI | 2 | P1 | Oui | Critique |

### Médecin / IPS (PROVIDER)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| Documentation médicale ED | 3 | P1 | Oui | Critique |
| Intelligence motif (19MDM) | 3 | P2 | Oui | Moyenne |
| Prescription et demandes | 3, 5 | P1 | Partiel | Critique |
| Orientation / disposition | 3, 6 | P1 | Partiel | Critique |
| Historique longitudinal | 3 | P2 | Partiel | Moyenne |

### Infirmier(ère) soins (RN)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| Soins infirmiers et réévaluation | 4 | P1 | Oui | Élevée |
| Exécution sortie | 4, 6 | P1 | Oui | Critique |
| Administration médicament (MAR) | 4 | P1 | Oui | Critique |

### Pharmacie (PHARMACY)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| File pharmacie et délivrance | 5 | P2 | Faible | Critique |
| Inventaire / stock | 5, 7 | P2 | Faible | Élevée |

### Laboratoire (LAB)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| File laboratoire | 5 | P2 | Partiel | Élevée |
| Résultats et réconciliation | 5 | P2 | Partiel | Élevée |

### Imagerie (RADIOLOGY)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| File imagerie | 5 | P2 | Partiel | Élevée |
| Résultats critiques | 5 | P2 | Partiel | Élevée |

### Administration (ADMIN)

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| Utilisateurs et rôles | 7 | P2 | Faible | Critique |
| Journal d'audit | 7 | P2 | Faible | Critique |
| ROI (dévoilement dossier) | 6, 7 | P2 | Faible | Critique |
| Santé système / go-live | 7, 8 | P2 | Faible | Élevée |
| Gouvernance médicaments | 7 | P2 | Faible | Élevée |

### Transversal — tous rôles

| Workflow | Vol. | Priorité | Mobile | Gouvernance |
|----------|------|----------|--------|-------------|
| Navigation mobile (19M) | 8 | P1 | Oui | Moyenne |
| Connectivité / pending sync | 8 | P1 | Oui | Élevée |
| Formation / certification | 9 | P1 | Partiel | Faible |
| Protocole papier panne | 8, Annexe E | P1 | — | Critique |

---

## 2. Index par département

| Département | Workflows clés | Volumes |
|-------------|----------------|---------|
| Accueil | Inscription, routage, identité | 1 |
| Urgences — triage | Triage, ESI, tableau | 2 |
| Urgences — médical | Documentation, ordres, orientation | 3, 6 |
| Urgences — infirmier | Soins, réévaluation, exécution sortie | 4, 6 |
| Observation | Admission, handoff | 6 |
| Pharmacie | File, dispense, stock | 5, 7 |
| Laboratoire | File, résultats | 5 |
| Imagerie | File, comptes-rendus | 5 |
| Dossiers médicaux | ROI, export | 6, 7 |
| IT / Admin | Utilisateurs, audit, déploiement | 7, 8 |
| Formation | Onboarding, certification | 9 |

---

## 3. Index par urgence opérationnelle

| Niveau | Workflows |
|--------|-----------|
| **Critique — erreur = risque patient majeur** | Triage ESI, documentation MDM, dispense pharmacie, orientation/sortie, identité patient |
| **Élevé** | Tableau urgences, soins infirmiers, résultats labo/rad, ROI, audit |
| **Moyen** | Carry-forward, intelligence motif, mobile ergonomie |
| **Faible** | Navigation générale, libellés cosmétiques |

---

## 4. Index par pertinence mobile

| Mobile | Workflows | Volumes |
|--------|-----------|---------|
| **Oui (priorité capture)** | Triage, chevet, documentation prestataire, réévaluation, tableau urgences | 2, 3, 4, 8 |
| **Partiel** | Accueil, ordres, files labo/rad, disposition | 1, 5, 6 |
| **Faible** | Admin, ROI, inventaire pharmacie détaillé | 5, 7 |

Voir [07-index-captures-ecran.md](./07-index-captures-ecran.md).

---

## 5. Index par sensibilité gouvernance

| Domaine | Workflows | Référence gouvernance |
|---------|-----------|----------------------|
| **Orientation vs disposition** | Décision vs panneau vs exécution | Canon · Vol. 6 |
| **Carry-forward (19T)** | Reprise triage | 19T4 · Vol. 2 |
| **Intelligence motif (19MDM)** | Pastilles HPI/ROS/MDM | Manifeste sous-groupes · Vol. 3 |
| **ROI (5G)** | Dévoilement dossier | Vol. 6–7 |
| **Export dossier (5F)** | Extraction légale | Vol. 6–7 |
| **Modèles sortie** | Gabarits gouvernés | Vol. 3, 6, 7 |
| **Identité patient** | Inscription, doublons | Vol. 1 · risques terminologiques |

---

## 6. Matrice synthèse P1 / P2

| P1 (go-live) | P2 (post go-live) |
|--------------|-------------------|
| Accueil, triage, tableau, doc prestataire, soins, disposition, mobile | Pharmacie, labo, imagerie, transfert, ROI, admin, historique, intelligence motif |

---

## Références routes

[Index routes opérationnelles](./05-index-routes.md)

---

*Fin index workflows — M-BOOK.FR.11*


\newpage



<!-- SECTION: Index routes -->

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


\newpage



<!-- SECTION: Index acronymes -->

# Index des acronymes — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11  
**Section:** I.5  

Acronymes **approuvés** pour formation et manuel. En UI française, préférer l'expansion lors de la première occurrence sur un écran de formation.

Source : [french-terminology-canon.md](../french-terminology-canon.md) · manifeste `APPROVED_FR_UI_ABBREVIATIONS`

---

## Acronymes cliniques et documentation

| Sigle | Expansion française | Signification opérationnelle | Précaution gouvernance |
|-------|---------------------|------------------------------|------------------------|
| **ED** | Urgences (service) ; Emergency Department | Service d'urgence type parcours EMERGENCY | Distinct de UC |
| **UC** | Soins urgents ; Urgent Care | Consultation URGENT_CARE — parcours réduit | Ne pas confondre avec ED |
| **ESI** | Échelle de gravité infirmière (Emergency Severity Index) | Score triage 1–5 | ≠ certification ESI internationale complète |
| **HPI** | Histoire de la maladie (History of Present Illness) | Narratif motif et chronologie | — |
| **ROS** | Revue des systèmes (Review of Systems) | Symptômes par système | ED : « revue ciblée » |
| **MDM** | Aide à la décision médicale (Medical Decision Making) | Complexité et justification décision | Ne pas traduire par « diagnostic auto » |
| **PMH** | Antécédents médicaux (Past Medical History) | Historique médical | — |
| **PSH** | Antécédents chirurgicaux (Past Surgical History) | Chirurgies antérieures | — |
| **MAR** | Administration de médicament | Registre actes infirmiers médicaments | Critique sécurité |
| **NIR** | Numéro d'identification / registre patient | Identifiant patient (contexte local) | Valider mapping Haïti |

---

## Acronymes orientation / sortie / conformité

| Sigle | Expansion française | Signification opérationnelle | Précaution gouvernance |
|-------|---------------------|------------------------------|------------------------|
| **ROI** | Dévoilement de dossier (Release of Information) | Accès audité au dossier patient | Phase 5G — admin uniquement |
| **LWBS** | Départ avant fin de prise en charge (Left Without Being Seen) | Patient quitte avant évaluation complète | Terme US — adapter manuel Haïti |
| **LAMA** | Contre avis médical (Left Against Medical Advice) | Sortie refusant recommandations | Documenter clairement |
| **EMTALA** | Loi fédérale US sur les transferts d'urgence | Contexte conformité pilote US | Expliquer portée limitée Haïti |

---

## Acronymes produit et gouvernance

| Sigle | Expansion | Signification | Précaution |
|-------|-----------|---------------|------------|
| **19M** | Initiative responsive mobile Medora | Layouts, touch, cross-device | 19M.1–19M.9 |
| **19T** | Initiative carry-forward / historique | Reprise triage, longitudinal | Revue section par section |
| **19MDM** | Initiative intelligence motif | Pastilles HPI/ROS/MDM | Insertion manuelle seulement |
| **5F** | Phase export dossier | Chart export | Audit requis |
| **5G** | Phase ROI | Dévoilement dossier | Gouvernance stricte |
| **M-BOOK** | Manuel opérationnel Medora | Collection documentation FR | FR.1–FR.11 |
| **DME** | Dossier médical électronique | Synonyme EMR/EHR en contexte FR | — |
| **IDE** | Infirmier(ère) diplômé(e) d'État | Titre Haïti | UI : Infirmier(ère) préféré |
| **IPS** | Infirmier(ère) praticien(ne) spécialisé(e) | Provider avancé selon licence | Valider cadre local |
| **MSPP** | Ministère Santé Publique et Population (Haïti) | Modules épidémiologie | Distinct ED |

---

## Acronymes formation (Volume 9)

| Sigle | Expansion | Notes |
|-------|-----------|-------|
| **SU** | Super-utilisateur | Niveau certification 3 |
| **P1 / P2** | Priorité manuel go-live / post go-live | Inventaire workflows |
| **Onboarding** | Intégration initial | Parcours nouvel utilisateur |

---

## Acronymes anatomiques (documentation — sigles anglais acceptés)

Utilisés dans sous-groupes intelligence motif — **glossaire formation obligatoire** :

| Sigle | Expansion |
|-------|-----------|
| GU | Appareil génito-urinaire |
| MSK | Musculo-squelettique |
| ORL | Oto-rhino-laryngologie |
| CV | Cardio-vasculaire |
| GI | Gastro-intestinal |

---

## Règles d'usage manuel / UI

1. **Première occurrence** dans un chapitre formation : sigle + expansion FR entre parenthèses.  
2. **UI produit** : préférer termes français canon — voir registre risques pour fuites anglais.  
3. **Ne pas inventer** de traductions littérales dangereuses (« médicalement autorisé », « patient stable », « normal » pour résultats) — voir [french-terminology-risks.md](../french-terminology-risks.md).  
4. **Haïti** : valider titres professionnels (médecin, IDE, IPS) avec direction clinique pilote.

---

## Références

- [Glossaire](./03-glossaire.md)  
- [Canon terminologique](../french-terminology-canon.md)

---

*Fin index acronymes — M-BOOK.FR.11*


\newpage



<!-- SECTION: Volume 1 — Accueil -->

# Volume 1 — Accueil, inscription et arrivée patient

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.2  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Personnel d’accueil, infirmier(ère) de triage, équipe urgences, superviseurs, administrateurs  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 1 — Accueil, inscription et arrivée |
| Routes principales | `/app/registration`, `/app/patients`, `/app/emergency/triage`, `/app/emergency/trackboard`, `/app/trackboard` |
| Rôles cibles | `FRONT_DESK`, `RN`, `PROVIDER`, `ADMIN` |
| Révision recommandée | Annuelle ou après changement majeur de parcours |

---

# 1. Introduction

## 1.1 Qu’est-ce que Medora-S ?

Medora-S est un dossier médical électronique (DME) conçu pour des cliniques et services d’urgence en environnement à ressources limitées, avec une priorité de déploiement en **Haïti**. Il soutient l’accueil patient, la documentation clinique, les ordres, les résultats, la pharmacie, la facturation et la gouvernance — dans une interface **française** pour le personnel.

Medora-S **assiste** les workflows ; il ne remplace pas le jugement clinique ni la responsabilité du personnel.

## 1.2 Accueil et inscription : sens opérationnel

Dans ce manuel :

| Terme | Signification opérationnelle |
|-------|------------------------------|
| **Accueil** | Point d’entrée navigation (`Accueil` dans le menu) — orientation du patient et du personnel |
| **Inscription** | Création ou mise à jour de la **fiche patient** (identité, contact, assurances) |
| **Intake (accueil clinique)** | Ouverture d’une **consultation** (visite) et saisie du contexte d’arrivée |
| **Triage** | Évaluation initiale de gravité (ESI, signes vitaux, allergies) — souvent **après** l’ouverture de la consultation d’urgence |

**Note terminologique :** le menu affiche **Accueil** ; la page principale affiche **Inscription**. Les deux désignent le même parcours d’entrée — voir [risques terminologiques](./french-terminology-risks.md).

## 1.3 Rôle du personnel d’accueil

Le personnel d’accueil est le **gardien de l’identité patient** et du routage initial :

- Rechercher ou créer la fiche patient avec exactitude ;
- Orienter vers la bonne voie (clinique, soins urgents, urgences) selon protocole local ;
- Ne pas improviser de décisions cliniques ;
- Signaler immédiatement toute ambiguïté d’identité, doublon suspect ou patient critique.

## 1.4 Importance de la qualité d’inscription

Une inscription inexacte entraîne :

- Erreurs de dossier (mauvais patient) ;
- Retards de soins ;
- Problèmes de facturation et de continuité ;
- Risques médico-légaux.

**Règle d’or :** vérifier **nom, date de naissance et identifiant** à chaque transition majeure.

## 1.5 Philosophie opérationnelle : soins urgents vs urgences

| Type (produit) | Libellé UI | Usage opérationnel |
|----------------|------------|-------------------|
| **Consultation d’urgence** (`EMERGENCY`) | Urgences | Parcours ED complet : accueil urgences, tableau des urgences, documentation ED |
| **Soins urgents / intensifs** (`URGENT_CARE`) | Soins urgents / intensifs | Consultation ouverte via dossier patient ; **pas** de parcours ED dédié identique aux urgences |
| **Clinique** (`OUTPATIENT`) | Clinique | Visites programmées ou ambulatoires |

Medora distingue ces types pour la **facturation**, le **tableau de bord** et les **droits d’accès**. Le personnel d’accueil doit connaître le protocole local : **qui** ouvre quel type de consultation et **quand** escalader vers les urgences.

## 1.6 Responsabilité du personnel

> **Medora-S assiste les workflows. Le personnel reste responsable de l’exactitude des données, de la vérification d’identité et des décisions opérationnelles.**

Le système peut suggérer des patients similaires ou afficher des rappels — il **ne bloque pas** automatiquement toutes les erreurs d’identité.

---

# 2. Définitions des rôles

## 2.1 Agent d’accueil / inscription

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Recherche patient, création fiche, assurances, orientation, liens vers feuille de face et visite |
| **Peut modifier** | Données démographiques et administratives autorisées par RBAC ; assurances sur dossier |
| **Ne peut pas** | Documenter clinique (HPI, triage complet, ordres, disposition médicale) |
| **Attentes** | Double vérification identité ; zéro supposition sur l’orthographe du nom |
| **Escalade** | Doublon non résolu, patient agressif, mineur non accompagné, identité inconnue, refus de consentement |

**Route typique :** `/app/registration` (rôle `FRONT_DESK`).

## 2.2 Infirmier(ère) de triage

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Accueil urgences (ouverture consultation urgence), salle, motif ; triage ESI et signes vitaux sur dossier actif |
| **Peut modifier** | Triage, signes vitaux, allergies documentées au triage |
| **Ne peut pas** | Décision d’orientation finale (médecin) ; facturation |
| **Attentes** | Re-vérifier identité à l’accueil urgences ; ESI cohérent avec protocole |
| **Escalade** | ESI 1–2, détresse, suspicion AVC, patient instable |

**Routes :** `/app/emergency/triage` → `/app/emergency/active/{id}`.

## 2.3 Personnel urgences (ED)

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Suivi tableau des urgences, assignation, réévaluation, coordination |
| **Peut modifier** | Selon rôle (IDE vs médecin) — voir volumes infirmier et médecin |
| **Attentes** | Consultations **ouvertes** visibles ; assignation claire médecin / infirmier |

**Route :** `/app/emergency/trackboard`.

## 2.4 Personnel clinique (médecin / IPS)

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Évaluation, ordres, documentation, orientation |
| **Peut modifier** | Documentation médicale, ordres, décision d’orientation |
| **Ne peut pas** | Contourner RBAC ; fusionner des dossiers patients (non disponible) |
| **Escalade** | Acuité croissante, transfert, LAMA, LWBS |

## 2.5 Superviseur

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Effectifs, flux, exceptions, conflits, boarding |
| **Peut** | Arbitrer routage, ouvrir voies parallèles en surcharge |
| **Escalade vers admin** | Problème compte, ROI, panne prolongée |

## 2.6 Administrateur

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Comptes, établissement, audit, configuration |
| **Peut modifier** | Utilisateurs, droits — pas le contenu clinique libre |
| **Attentes** | Tracer toute correction d’identité majeure avec processus local |

---

# 3. Workflows d’arrivée patient

Chaque workflow ci-dessous décrit le **comportement Medora actuel** sauf mention « cible / futur ».

## 3.1 Nouvelle inscription patient

### Flux opérationnel

```
Accueil (/app/registration)
  → Nouveau patient (/app/patients?new=1)
  → Saisie identité (nom, DOB, sexe, contact, NIR/identifiant national si disponible)
  → Enregistrer
  → Retour accueil ou ouverture dossier
```

### Bonnes pratiques

1. Demander **pièce d’identité** ou témoin fiable si disponible.  
2. Saisir le nom **exactement** comme sur la pièce.  
3. Vérifier la **date de naissance** à voix haute avec le patient.  
4. Si le formulaire signale **patients similaires** : STOP — comparer avant de continuer.

### Points de contrôle sécurité

- [ ] Nom et prénom complets  
- [ ] DOB confirmée  
- [ ] Téléphone ou contact d’urgence  
- [ ] Doublons examinés  

### Erreurs fréquentes

- Créer un doublon parce que le nom était mal orthographié à une visite antérieure.  
- Ignorer l’alerte « patients similaires » (le système permet **Continuer quand même** — responsabilité staff).

### Escalade

Doublon probable → superviseur ; impossible de confirmer identité → protocole patient non identifié (§7.4).

[CAPTURE D’ÉCRAN — Formulaire nouveau patient avec alerte doublons]

---

## 3.2 Recherche patient existant

### Flux

```
Accueil → Recherche (nom, téléphone, MRN/NIR affiché)
  → Sélection patient
  → Espace d'inscription (résumé, assurances, liens dossier / feuille de face / visite)
```

### Bonnes pratiques

- Rechercher par **téléphone** si nom incertain.  
- Confirmer **deux identifiants** (nom + DOB ou MRN).  
- Ne pas ouvrir le mauvais dossier par similarité de nom.

### Escalade

Aucun résultat mais patient insiste avoir un dossier → recherche élargie, variantes orthographiques, superviseur.

[CAPTURE D’ÉCRAN — Espace d'inscription avec patient actif]

---

## 3.3 Prévention des doublons

### Comportement Medora

| Mécanisme | Effet |
|-----------|--------|
| Alerte patients similaires (création patient) | **Avertissement** — pas de blocage systématique |
| Unicité MRN par établissement | **Empêche** deux MRN identiques au même site |
| Une consultation **ouverte** par patient | **Empêche** deux consultations OPEN simultanées |
| Fusion de dossiers | **Non disponible** — processus manuel / admin futur |

### Checklist anti-doublon

- [ ] Recherche avant création  
- [ ] Comparaison DOB + téléphone  
- [ ] Alerte similarité traitée  
- [ ] Superviseur informé si doute persistant  

---

## 3.4 Patient walk-in — urgences (ED)

### Flux

```
Recherche / inscription patient
  → Accueil urgences (/app/emergency/triage)
  → Sélection patient
  → Salle (si applicable), motif de visite, médecin optionnel
  → Ouvrir la consultation (type : consultation d'urgence)
  → Redirection dossier actif urgences
  → Triage complet (ESI, signes vitaux) sur dossier actif
  → Visible sur Tableau des urgences
```

### Bonnes pratiques

- Patient critique : **ne pas** retarder les soins pour la saisie — protocole local « soins d’abord » puis documentation.  
- Motif saisi = aide au tableau, pas diagnostic.

### Erreurs fréquentes

- Confondre **accueil urgences** (ouverture consultation) et **triage complet** (sur dossier actif).  
- Oublier de changer de patient si plusieurs arrivées simultanées.

[DIAGRAMME — Walk-in ED : inscription → accueil urgences → triage → tableau]

---

## 3.5 Patient soins urgents (UC)

### Flux actuel (produit)

```
Dossier patient → Consultations → Nouvelle consultation
  → Type : Soins urgents / intensifs (URGENT_CARE)
  → Documentation sur parcours consultation générique
```

**Important :** les consultations UC **n’apparaissent pas** sur le **Tableau des urgences** (filtre consultations d’urgence uniquement). Elles peuvent apparaître sur le **Tableau de bord des consultations** (`/app/trackboard`).

### Bonnes pratiques

- Utiliser UC seulement si le protocole local le permet.  
- Surveiller l’évolution : si acuité augmente → §4 (conversion UC → urgence).

---

## 3.6 Patient clinique programmé

### Flux

```
Dossier patient → Nouvelle consultation → Type Clinique (OUTPATIENT)
  OU liste Consultations existante
```

Pas de passage obligatoire par accueil urgences.

---

## 3.7 Arrivée ambulance / EMS

### État actuel

Medora-S **ne dispose pas** d’un module EMS/préhospitalier dédié.

### Pratique opérationnelle recommandée

1. Inscription / identification patient (ou protocole non identifié).  
2. Saisir le **mode d’arrivée** en texte libre lors de l’intake si le champ est disponible sur la consultation.  
3. Documenter dans le motif / notes : « Arrivée ambulance — [service] — heure approximative ».  
4. Procéder comme walk-in ED si consultation d’urgence requise.

**Futur produit :** champs structurés EMS — hors scope volume 1.

[CAPTURE D’ÉCRAN — Champ mode d'arrivée (placeholder)]

---

## 3.8 Escalade patient critique

### Signaux

- Détresse respiratoire, hémodynamique, altération majeure conscience  
- ESI 1–2 au triage  
- Suspicion AVC, sepsis, traumatisme grave (protocole local)

### Actions

1. **Soins immédiats** selon protocole (ne pas attendre Medora).  
2. Ouvrir ou compléter consultation d’urgence dès que possible.  
3. Assigner médecin / infirmier sur tableau.  
4. Alerter superviseur / responsable salle.

```
[CRITIQUE] Soins + appel équipe
     ↓
Documentation parallèle dans Medora
     ↓
Tableau des urgences : acuité Critique / Surveillance
```

---

## 3.9 Patient transféré entrant

### Flux opérationnel

1. Inscription ou recherche patient.  
2. Ouvrir **consultation d’urgence** ou reprendre consultation ouverte selon cas.  
3. Documenter : établissement d’origine, raison transfert, documents reçus.  
4. Motif et triage à jour.

### Escalade

Refus de transfert, instabilité en route → médecin responsable + protocole réception.

---

## 3.10 Patient de retour (visite récente)

### Flux

1. Recherche patient — **ne pas recréer** la fiche.  
2. Vérifier consultation **encore ouverte** (une seule OPEN autorisée).  
3. Si consultation précédente **terminée** : nouvelle consultation selon type (ED, UC, clinique).  
4. Reprendre allergies et antécédents affichés ; confirmer avec patient.

### Erreur fréquente

Tenter d’ouvrir une deuxième consultation ouverte → message d’erreur API — résoudre en clôturant ou reprenant la bonne consultation.

---

# 4. Workflow hybride UC → urgence (conversion)

> **Section prioritaire formation** — distingue **cible opérationnelle** et **capacités produit actuelles**.

## 4.1 État actuel du produit Medora-S

| Capacité | Statut |
|----------|--------|
| Créer consultation UC | **Disponible** |
| Créer consultation urgence | **Disponible** |
| Convertir automatiquement UC → urgence | **Non disponible** |
| Conversion manuelle type de consultation UC → EMERGENCY en un clic | **Non disponible** |
| Déclenchement auto par motif de consultation | **Non** — jamais |

**Conséquence aujourd’hui :** si un patient UC devient une urgence, le protocole local doit définir comment **clôturer ou gérer** la consultation UC et **ouvrir une consultation d’urgence** (ou autre voie approuvée par direction), en documentant la continuité.

## 4.2 Workflow cible (orientation entreprise — évolution produit)

Workflow **conceptuel** pour déploiements hybrides clinique + urgences :

```
Patient inscrit en SOINS URGENTS (UC)
        ↓
Évaluation clinique (médecin / IPS / infirmier selon protocole)
        ↓
Identification d'une préoccupation de plus haute acuité
        ↓
Information du patient / aidant :
  • changement de niveau de service (UC → urgences)
  • implications facturation / frais (selon politique établissement)
        ↓
Accusé de réception signé (papier ou électronique — politique locale)
        ↓
Conversion de la visite en CONSULTATION D'URGENCE
        ↓
Même dossier patient Medora — documentation continue
        ↓
Tableau des urgences + parcours ED complet
```

### Principes non négociables

1. **Conversion initiée par le staff clinique** — jamais par le motif saisi seul.  
2. **Accord / information patient** requis selon politique locale avant changement de classification facturation.  
3. **Documentation** : qui a décidé, quand, ce qui a été expliqué au patient.  
4. **Refus patient** : protocole local (LAMA partiel, retour UC, contre-avis documenté).

## 4.3 Exemples opérationnels

### Douleur thoracique en UC

| Étape | Action |
|-------|--------|
| 1 | Patient initialement en UC pour symptôme mineur ; douleur thoracique apparaît ou s’intensifie |
| 2 | Médecin évalue — ne pas attendre conversion système pour ECG / protocole local |
| 3 | Expliquer passage en **consultation d’urgence** et impact facturation |
| 4 | Signature / accord → conversion (cible) ou ouverture consultation urgence (aujourd’hui) |
| 5 | Documentation : HPI, ECG, troponine si indiqué — parcours ED |

### Douleur abdominale avec signes d’alarme

- Même schéma : décision clinique → information patient → escalade → documentation.

### Motifs à haut risque (liste indicative formation)

- Douleur thoracique, dyspnée aiguë, déficit neurologique, hémorragie active, traumatisme majeur, suspicion sepsis.

**Ne pas escalader automatiquement** sans évaluation : simple rhinite en UC reste UC.

## 4.4 Quand ne pas convertir

- Symptômes stables compatibles avec protocole UC local.  
- Patient refuse après information → voir §4.5.  
- Ressources ED saturées **ne justifient pas** de rétrograder un patient qui remplit critères urgence — escalade superviseur.

## 4.5 Refus du patient

1. Documenter ce qui a été expliqué.  
2. Documenter le refus.  
3. Appliquer protocole **contre avis médical (LAMA)** ou sortie UC selon cas.  
4. Superviseur informé si risque vital.

## 4.6 Implications facturation (orientation)

- La classification **UC vs urgence** affecte typically codes et tarification — **politique établissement**, pas Medora.  
- Medora enregistre le **type de consultation** ; la caisse / facturation applique les règles locales.  
- L’accusé de réception UC→ED doit être **archivé** selon politique (papier ou future capture Medora).

### 4.6.1 Préparation export / voie de facturation (19UCED.3)

- Medora affiche un **aperçu de préparation export** selon la **classification de facturation** de la consultation (UC, urgences, observation, etc.).
- **Aucune réclamation n’est soumise** depuis cet aperçu — pas de clearinghouse, pas de montant de remboursement calculé.
- La voie d’export (professionnel CMS-1500, établissement UB-04, ou les deux) et les éléments manquants (diagnostic, identité de facturation établissement, payeur) sont **indicateurs de révision** pour l’équipe facturation.
- **La politique institutionnelle de facturation reste requise** ; Medora n’auto-convertit pas la classification selon le motif, l’ESI ou les ordres.

### 4.6.2 Séparation professionnel / établissement (19UCED.4)

- Medora sépare la **préparation facturation professionnelle** (CMS-1500) de la **préparation facturation établissement** (UB-04) en **aperçu uniquement**.
- **Aucune réclamation n’est générée ni soumise** — pas de montant, pas de clearinghouse.
- **Une consultation, un dossier, un flux clinique** : seuls les indicateurs de grand livre / export sont séparés pour la révision facturation.
- La politique institutionnelle reste requise pour décider quels côtés s’appliquent (ex. observation, hospitalisation).

### 4.6.3 Frais d'établissement et opérations observation (19UCED.5)

- Medora ajoute un **aperçu opérationnel** des frais d'établissement et de l'observation : statut observation, révision boarding, séjour prolongé, révision hospitalisation.
- **Aucune réclamation générée** — pas de codes revenus auto-sélectionnés, pas de montant de remboursement.
- Les indicateurs sont **informatifs et non bloquants** pour le flux clinique.
- **Une consultation, un dossier** — la gouvernance institutionnelle de facturation reste requise.

### 4.6.4 Espace révision capture de charges et revenus (19UCED.6)

- Medora introduit un **espace de révision capture de charges / revenus** pour les équipes facturation et administration.
- **Aperçu uniquement** — aucune réclamation générée ni soumise ; pas d'auto-codage CPT/HCPCS ; pas de clearinghouse.
- **Une consultation, un dossier, un flux clinique** — la révision organise les métadonnées de préparation facturation sans dupliquer le dossier ni bloquer le flux clinique.
- La **politique institutionnelle de facturation et de codage** reste requise pour toute décision finale.

### 4.6.5 Intégrité codage et révision documentation (19UCED.7)

- Medora ajoute une **couche opérationnelle de révision intégrité codage / documentation** pour les équipes facturation, codage, conformité et administration.
- Indicateurs : complétude documentation, clarification prestataire, révision observation, révision conformité — **métadonnées de révision uniquement**.
- **Aperçu opérationnel uniquement** — pas d'auto-codage CPT/ICD, pas de génération ni soumission de réclamation.
- **Une consultation, un dossier, un flux de documentation** — aucune modification automatique des notes, diagnostics ou MDM.

## 4.7 Attentes de documentation

- Motif de conversion et heure.  
- Clinicien responsable.  
- Résumé de l’information donnée au patient.  
- Accusé de réception ou note de refus.  
- Continuité des allergies et antécédents — **revérifier identité**.

[DIAGRAMME — Conversion consultation UC → urgence]  
[CAPTURE D’ÉCRAN — Exemple accusé de réception UC→ED (placeholder)]

---

# 5. Introduction au tableau des urgences

## 5.1 Deux tableaux — ne pas confondre

| Écran | Route | Contenu |
|-------|-------|---------|
| **Tableau des urgences** | `/app/emergency/trackboard` | Consultations **d’urgence** ouvertes uniquement |
| **Tableau de bord des consultations** | `/app/trackboard` | Consultations ouvertes (clinique, UC, urgence, etc.) |

Formation accueil / triage ED : focus **Tableau des urgences**.

[CAPTURE D’ÉCRAN — Tableau des urgences]

## 5.2 Informations visibles (vue opérationnelle)

- **Patient** — nom, âge/sexe, MRN/NIR affiché  
- **Motif** — motif de consultation  
- **Arrivée** — heure d’ouverture  
- **Durée** (LOS) — temps depuis ouverture ; codes couleur selon seuils  
- **Acuité ESI** — pastilles Critique / Surveillance / Stable  
- **Affectations** — médecin, infirmier(ère) ; « — — — » si non assigné  
- **Orientation** — badges sortie, admission, observation, transfert, LAMA, LWBS, etc.

## 5.3 Assignation

- **M’assigner — médecin** / **M’assigner — infirmier(ère)** : prise en charge visible pour l’équipe.  
- Erreur si consultation **terminée** ou rôle insuffisant.

## 5.4 États d’attente

- Médecin non assigné  
- Disposition en attente  
- Résultats en attente  
- Réévaluation due  

## 5.5 Réévaluation

Cycle infirmier / médecin : réévaluer patient, mettre à jour triage et documentation — visible via indicateurs ops et dossier actif.

## 5.6 Orientation (disposition)

- **Décision médicale** : enregistrer l’**orientation** (sortie, admission/observation, transfert, etc.).  
- **Exécution infirmière** : sortie, instructions, impression — distinct de la décision.

Ne pas interpréter un badge seul comme « patient parti » sans vérifier exécution équipe.

---

# 6. Sécurité identité patient

## 6.1 Prévention mauvais patient

| Moment | Action |
|--------|--------|
| Accueil | Nom + DOB + MRN/NIR |
| Accueil urgences | Re-confirmer avant ouverture consultation |
| Avant médicament / procédure | Protocole local double identifiant |
| Avant orientation | Confirmer dossier ouvert = bon patient |

## 6.2 Doublons et dossiers multiples

- Traiter alerte similarité **avant** création.  
- **Pas de fusion** Medora — escalade admin / processus papier pour rapprochement.

## 6.3 Orthographe et DOB

- Orthographe légale prioritaire.  
- DOB : jour/mois/année confirmés verbalement.  
- Corriger via **modification patient** autorisée — tracer selon politique.

## 6.4 Identifiant national / NIR

- Champ **identifiant national** si disponible.  
- UI peut afficher **NIR** pour MRN établissement — former staff à la distinction.  
- Pas d’interface registre national automatique (saisie manuelle).

## 6.5 Patient non identifié (urgence)

Protocole local recommandé :

1. Création temporaire avec identifiant établissement.  
2. Nom placeholder approuvé (ex. « INCONNU — [date/heure] »).  
3. Rattachement identité dès que possible.  
4. Superviseur informé.

## 6.6 Allergies et antécédents

- Reprendre données existantes ; **confirmer avec patient ou aidant**.  
- Ne pas supposer que le dossier est complet.

## 6.7 Reprise d’antécédents (carry-forward)

Lors du triage / documentation urgence, Medora peut **proposer** des éléments du triage — le clinicien **valide** ; pas d’application silencieuse sans revue.

---

# 7. Mobile et tablette

## 7.1 Alignement initiative 19M (responsive)

Medora a renforcé **urgences, documentation médecin, disposition, listes labo/radio** pour tablettes. L’**accueil / inscription** reste **partiellement** adapté — utilisable mais moins optimisé que le tableau des urgences.

## 7.2 Appareils recommandés

| Zone | Recommandation |
|------|----------------|
| Accueil fixe | PC + écran ; tablette acceptable recherche patient |
| Triage / salle attente ED | Tablette ou PC — paysage pour saisie prolongée |
| Médecin au chevet | Tablette ≥ 10" paysage |

## 7.3 Limitations mobile

- Petits écrans : risque d’erreur de tap — préférer PC pour création patient longue.  
- Menu **Navigation** (drawer) : même entrées que desktop — former au geste hamburger.

## 7.4 Connectivité Haïti

- Bandeau **Hors ligne** / **Synchronisation** possible — ne pas créer patient complexe offline si évitable.  
- Message : **vérification doublons limitée hors ligne** — resynchroniser dès que possible.  
- Voir `docs/ER_PILOT_DOWNTIME_RUNBOOK.md` pour procédures panne.

[CAPTURE D’ÉCRAN — Menu navigation mobile]

---

# 8. Sécurité opérationnelle et escalade

## 8.1 Quand appeler le superviseur

- Boarding extrême / saturation salle  
- Conflit identité ou doublon  
- Refus de soins / agitation  
- Demande exception RBAC  
- Panne Medora > seuil local  

## 8.2 Correction d’inscription

1. Ouvrir dossier patient → modifier champs autorisés.  
2. Documenter correction (note locale / registre papier si requis).  
3. Admin si erreur MRN / compte.

## 8.3 Panne système (haut niveau)

- Passer registre papier accueil.  
- Après reprise : saisie **sans antidater** champs système — heure papier en note structurée.  
- Voir runbook downtime.

## 8.4 Barrière linguistique

- Interprète ou staff bilingue.  
- Documenter langue utilisée et personne traduisant.  
- Ne pas deviner consentement.

## 8.5 Patient agressif ou perturbateur

- Sécurité physique prioritaire — protocole établissement.  
- Documentation ultérieure dans dossier si sécurité le permet.

## 8.6 Consentement et litiges paiement

- Consentement : protocole juridique local — admin / direction.  
- Paiement : **escalade administrative**, pas décision infirmière/médicale clinique.

---

# 9. Résumé opérationnel rapide

## 9.1 Checklist inscription

- [ ] Recherche effectuée avant création  
- [ ] Nom légal + DOB confirmés  
- [ ] Contact ou aidant  
- [ ] Alerte doublon traitée  
- [ ] Assurances si applicable  

## 9.2 Checklist intake (accueil clinique)

- [ ] Bon patient sélectionné  
- [ ] Type de consultation correct (clinique / UC / urgence)  
- [ ] Motif saisi  
- [ ] Salle / arrivée documentée si protocole  
- [ ] Orientation vers triage ou clinicien  

## 9.3 Checklist anti-doublon

- [ ] Similarités examinées  
- [ ] Superviseur si doute  
- [ ] Pas de nouvelle fiche si dossier existe  

## 9.4 Checklist escalade UC → urgence

- [ ] Décision **clinique** documentée  
- [ ] Patient informé (facturation / niveau de soins)  
- [ ] Accusé ou refus documenté  
- [ ] Consultation urgence ouverte / convertie selon protocole  
- [ ] Identité re-vérifiée  
- [ ] **Pas** de conversion auto par motif seul  

## 9.5 Checklist anti mauvais patient

- [ ] Nom + DOB à l’accueil  
- [ ] Re-vérification à accueil urgences  
- [ ] MRN/NIR cohérent sur écran et bracelet local  
- [ ] Antécédents / allergies confirmés  

---

# 10. Gouvernance du manuel

## 10.1 Versionnement

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0.0-draft | M-BOOK.FR.2 | Équipe Medora-S | Volume 1 initial |

## 10.2 Maintenance

| Rôle | Responsabilité |
|------|----------------|
| **Direction clinique pilote** | Validation contenu clinique/opérationnel |
| **Administration Medora / IT** | Exactitude routes et RBAC |
| **Référent terminologie** | Alignement [canon](./french-terminology-canon.md) |

## 10.3 Mises à jour

- Toute modification de parcours produit → révision du volume concerné.  
- Lien obligatoire vers manifeste tests `frenchTerminologyCanonManifest.ts` pour labels UI cités.

## 10.4 Formation

- Intégration **obligatoire** pour tout nouveau staff accueil / triage ED.  
- Quiz oral : UC vs urgence, doublons, mauvais patient.  
- Révision **annuelle** minimum.

## 10.5 Révision annuelle

Vérifier : routes, rôles RBAC, workflow UC→ED (statut produit), terminologie, runbooks downtime.

---

## Annexes

### A. Routes et libellés UI (référence formation)

| Route | Libellé menu / page |
|-------|---------------------|
| `/app/registration` | Accueil / Inscription |
| `/app/emergency/triage` | Accueil urgences |
| `/app/emergency/trackboard` | Urgences |
| `/app/trackboard` | Tableau de bord |

### B. Références internes

- [Canon terminologique](./french-terminology-canon.md)  
- [Inventaire workflows](./french-workflow-inventory.md)  
- [Risques terminologiques](./french-terminology-risks.md)  
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`  
- `docs/OBSERVATION_POSITIONING.md`  
- `docs/ui/mobile-tablet-responsiveness-audit-19M1.md`

### C. Placeholders visuels (production future)

- [CAPTURE D’ÉCRAN — Tableau des urgences]  
- [CAPTURE D’ÉCRAN — Accueil urgences — ouverture consultation]  
- [CAPTURE D’ÉCRAN — Espace d'inscription — assurances]  
- [CAPTURE D’ÉCRAN — Alerte patients similaires]  
- [DIAGRAMME — Conversion consultation UC → urgence]  
- [DIAGRAMME — Walk-in : inscription → triage → tableau]  
- [CAPTURE D’ÉCRAN — Menu navigation mobile]  
- [CAPTURE D’ÉCRAN — Exemple accusé de réception UC→ED]

---

*Fin du Volume 1 — M-BOOK.FR.2*


\newpage



<!-- SECTION: Volume 2 — Triage -->

# Volume 2 — Triage et intake clinique

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.3  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Infirmier(ère) de triage, infirmier(ère) aux urgences, personnel d’accueil, médecins, superviseurs  
**Prérequis:** [Volume 1 — Accueil, inscription et arrivée](./handbook-fr-registration-intake.md)  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 2 — Triage et intake clinique |
| Routes principales | `/app/emergency/triage`, `/app/emergency/active/{id}`, `/app/emergency/chart/{id}`, `/app/emergency/trackboard` |
| Rôles cibles | `RN`, `PROVIDER`, `FRONT_DESK` (accueil urgences), `ADMIN` |
| Architecture liée | Carry-forward 19T.1–19T.3 · Responsive 19M |
| Révision recommandée | Annuelle ou après changement triage / carry-forward |

---

# 1. Introduction au triage

## 1.1 Objectif du triage

Le **triage** est l’évaluation initiale structurée qui permet de :

- **Prioriser** les patients selon l’acuité perçue ;
- **Identifier rapidement** les signaux d’alerte (détresse, AVC, sepsis, etc.) ;
- **Documenter** signes vitaux, allergies, médicaments domicile et antécédents pertinents ;
- **Orienter** le patient vers la salle d’attente, le box ou une prise en charge immédiate selon protocole local.

## 1.2 Objectifs opérationnels

| Objectif | Description |
|----------|-------------|
| Sécurité | Réduire le risque de sous-triage en salle d’attente |
| Flux | Alimenter le **tableau des urgences** avec motif, ESI, affectations |
| Continuité | Reprendre et **revoir** les antécédents connus (carry-forward) |
| Traçabilité | Créer une base documentaire pour le médecin et les réévaluations infirmières |

## 1.3 Triage vs évaluation médicale

> **Le triage soutient la priorisation et la sécurité. Il ne remplace pas l’évaluation et la décision du prestataire clinique.**

| Triage (infirmier) | Évaluation prestataire |
|--------------------|-------------------------|
| ESI, signes vitaux, dépistages structurés | HPI, examen, MDM, orientation |
| Allergies / médicaments documentés | Prescription, ordres, diagnostic |
| Signaux d’alerte opérationnels | Plan thérapeutique |

## 1.4 Intake clinique : urgences vs soins urgents

| Parcours | Route / produit | Triage Medora |
|----------|-----------------|---------------|
| **Consultation d’urgence** | Accueil urgences → dossier actif urgences | **Complet** — panneau triage ED (`EmergencyTriagePanel`) |
| **Soins urgents (UC)** | Consultation via dossier patient | **Pas** le même parcours ED dédié ; triage selon protocole local sur consultation générique |
| **Clinique** | Consultation ambulatoire | Onglet signes vitaux simplifié possible — **pas** le panneau triage ED complet |

**Volume 1** couvre l’ouverture de consultation ; ce volume couvre la **documentation triage ED** après accueil urgences.

## 1.5 Importance de la réévaluation

L’état du patient **évolue**. Medora prévoit :

- **Modification de l’ESI** en rouvrant le triage (pas d’écran « réévaluation ESI » séparé) ;
- **Réévaluation infirmière** sur le dossier actif (document append-only) ;
- **Signes vitaux rapides** sur l’espace de travail actif.

La réévaluation est une **surveillance clinique continue**, pas un formulaire unique à la fin.

## 1.6 Responsabilité du personnel

Medora-S propose des rappels (allergies manquantes, signes vitaux incomplets, carry-forward en attente). Le personnel **vérifie, corrige et confirme** — les données reprises ne sont **pas** une vérité automatique.

---

# 2. Définitions des rôles

## 2.1 Infirmier(ère) de triage

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Accueil urgences (si délégué), triage complet, ESI, dépistages AVC/sepsis, allergies/médicaments, revue carry-forward |
| **Autorité d’escalade** | ESI 1–2, détresse, suspicion AVC/sepsis → équipe + superviseur selon protocole |
| **Réévaluation** | Initie réévaluation infirmière si détérioration ; met à jour triage/ESI si protocole le permet |
| **Documentation** | Enregistrer triage avant de considérer le patient « trié » opérationnellement |

## 2.2 Personnel d’accueil

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Identité, orientation vers accueil urgences, pas de saisie triage clinique complète |
| **Escalade** | Patient instable → infirmier / médecin **avant** file d’attente prolongée |
| **Documentation** | Motif initial si saisi à l’accueil — le triage infirmier complète |

## 2.3 Personnel urgences (ED)

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Suivi tableau, assignation, coordination salle d’attente |
| **Réévaluation** | Soutenir réévaluations ; alerter si patient non revu selon délai local |

## 2.4 Prestataire clinique (médecin / IPS)

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Évaluation médicale, ordres, orientation ; peut consulter triage et carry-forward |
| **Documentation** | Ne pas supposer que le triage = diagnostic |

## 2.5 Superviseur clinique

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Effectifs, saturation salle d’attente, exceptions protocole |
| **Escalade** | Boarding, conflit identité, incident sécurité, refus de soins |

---

# 3. Vue d’ensemble du workflow triage

## 3.1 Séquence opérationnelle Medora (consultation d’urgence)

```
Volume 1 : Inscription / identité
        ↓
Accueil urgences (/app/emergency/triage)
  → Ouverture consultation d'urgence
        ↓
Dossier actif urgences (/app/emergency/active/{id})
  → Panneau Triage urgences (documentation complète)
        ↓
Enregistrement triage (PUT triage)
  → Visible tableau des urgences + carry-forward / profil patient (19T.3)
        ↓
Réévaluation infirmière + signes vitaux rapides (continu)
        ↓
Évaluation prestataire + orientation
```

[DIAGRAMME — Workflow triage]

## 3.2 Étapes détaillées

| # | Étape | Bonnes pratiques | Erreurs fréquentes |
|---|-------|------------------|-------------------|
| 1 | **Arrivée patient** | Confirmer identité (Volume 1) | Mauvais dossier ouvert |
| 2 | **Confirmation identité** | Nom + DOB + NIR/MRN | Supposer que la fiche est à jour |
| 3 | **Motif de consultation** | Phrase opérationnelle, pas de diagnostic | « Appendicite » au lieu de « douleur abdo » |
| 4 | **Signes vitaux** | Complets selon protocole ; unités cohérentes | Oublier TA ou SpO₂ en dyspnée |
| 5 | **ESI** | Cohérent avec présentation ; réviser si évolution | ESI bas par défaut sans évaluation |
| 6 | **Allergies** | NKDA explicite ou allergies détaillées | Laisser vide sans « inconnu » documenté |
| 7 | **Médicaments domicile** | Recherche catalogue + lignes structurées | Copier carry-forward sans revue |
| 8 | **Antécédents PMH/PSH/sociaux** | Revue carry-forward section par section | Confirmer tout d’un clic sans lire |
| 9 | **Dépistages** | AVC, sepsis si indiqué ; sécurité domicile si protocole | Ignorer champs structurés |
| 10 | **Réévaluation** | Planifier selon ESI et protocole salle d’attente | Aucun suivi après triage initial |
| 11 | **Assignation / attente** | Médecin/infirmier sur tableau si protocole | Patient ESI 1–2 en attente non surveillée |
| 12 | **Escalade** | Si changement → ESI, équipe, superviseur | Attendre le médecin sans alerter |

### Avertissements opérationnels

- **Une consultation ouverte** par patient — vérifier avant d’en créer une nouvelle.  
- **Triage incomplet** peut déclencher rappels advisory — ne pas les ignorer systématiquement.  
- **Deux interfaces triage** : panneau ED complet vs onglet signes vitaux consultation générique — former le staff sur la bonne voie.

### Déclencheurs d’escalade (indicatifs)

- ESI 1–2 ou équivalent détresse  
- Signes vitaux alarmants (selon protocole local)  
- Dépistage AVC ou sepsis positif / alerte cochée  
- Détérioration en salle d’attente  
- Allergie médicamenteuse sévère non documentée auparavant  

---

# 4. Workflow motif de consultation

## 4.1 Philosophie de saisie

Le **motif de consultation** décrit **pourquoi** le patient est là **dans ses mots ou les vôtres de manière neutre** — ce n’est **pas** le diagnostic final.

> **Motif de consultation ≠ diagnostic final.**

## 4.2 Concis vs détaillé

| Approche | Exemple acceptable | À éviter |
|----------|-------------------|----------|
| Concis | « Douleur thoracique depuis 2 h » | « Infarctus » |
| Détaillé | « Dyspnée progressive, fièvre 38,5 °C, toux » | « Pneumonie confirmée » |

Medora propose des **modèles de motifs** (clic pour préremplir) — le staff **adapte** et **vérifie** ; pas de diagnostic automatique.

## 4.3 Exemples opérationnels

| Présentation | Motif recommandé | Signal d’alerte formation |
|--------------|------------------|---------------------------|
| Douleur thoracique | « Douleur rétrosternale soudaine » | ESI urgent, ECG selon protocole |
| Douleur abdominale | « Douleur abdo basse droite, nausées » | Réévaluation si aggravation |
| Dyspnée | « Essoufflement au repos » | SpO₂, ESI, surveillance |
| Faiblesse | « Faiblesse membre gauche depuis 1 h » | Dépistage AVC, LKW |
| Fièvre | « Fièvre + frissons, toux » | Dépistage sepsis si indiqué |
| Traumatisme | « Chute, douleur hanche, anticoagulant » | Critères traumatiques selon triage V1 |

## 4.4 Reconnaissance des motifs à haut risque

Former le staff à repérer les mots-clés et présentations nécessitant **ESI élevé**, **dépistage structuré** ou **prise en charge immédiate** — sans que Medora ne classe automatiquement le patient.

---

# 5. Workflow ESI

## 5.1 Rôle opérationnel de l’ESI

L’**Indice ESI** (1–5) est un outil de **priorisation opérationnelle** en salle d’urgence. Dans Medora :

- Saisie **manuelle** par l’infirmier(ère) (liste 1–5) ;
- Affichage sur le **tableau des urgences** avec pastilles **Critique / Surveillance / Stable** (dérivées de l’ESI) ;
- **Rappels** assistifs pour ESI 1–2 (CDS) — pas de décision automatique.

**Ce manuel n’enseigne pas** la propriété intellectuelle ni la certification ESI complète — seulement l’**usage opérationnel dans Medora** et les attentes de l’établissement pilote.

## 5.2 Libellés produit (référence formation)

| Niveau | Libellé UI (FR) |
|--------|-----------------|
| 1 | Réanimation |
| 2 | Urgent |
| 3 | Urgent modéré |
| 4 | Moins urgent |
| 5 | Non urgent |

## 5.3 Priorisation et salle d’attente

- ESI **1–2** : protocole local = **soins immédiats** ou surveillance rapprochée — ne pas laisser en attente non surveillée.  
- ESI **3–5** : attente possible selon capacité — **réévaluation** selon délais locaux.

## 5.4 Réévaluation et modification de l’ESI

**Comportement actuel Medora :**

- Pour **changer l’ESI** : rouvrir le panneau triage et modifier la valeur, puis enregistrer.  
- La **réévaluation infirmière** affiche l’ESI de triage en **lecture seule** — documenter l’évolution clinique même si l’ESI n’est pas ressaisi immédiatement.

### Exemples de déclencheurs de réévaluation

- Douleur qui augmente en salle d’attente  
- Nouvelle fièvre ou hypotension  
- Vomissements, syncope, agitation  
- Résultats en attente avec détérioration clinique  

### Exemples d’escalade d’acuité

| Situation | Action opérationnelle |
|-----------|----------------------|
| Patient ESI 4 → détresse respiratoire | Soins + ESI révisé + alerte équipe |
| Patient ESI 3 → déficit neurologique new | Dépistage AVC + médecin |
| Patient stable → syncope en attente | Signes vitaux répétés + réévaluation documentée |

---

# 6. Allergies et conciliation médicamenteuse

## 6.1 Vérification des allergies

### Workflow Medora (triage ED)

1. Lire la section **allergies** (texte libre + puces NKDA, aliment, latex, etc.).  
2. Si **reprise d’antécédents** présente → **revoir** chaque ligne (voir §7).  
3. Utiliser la **recherche médicament** pour allergies médicamenteuses structurées (réaction documentée).  
4. Si aucune allergie connue → documenter **« Aucune allergie médicamenteuse connue » (NKDA)** explicitement si vérifié.  
5. Si patient incertain → documenter **inconnu / non vérifié** selon protocole — ne pas laisser vide sans commentaire.

> **Le staff doit vérifier — ne pas supposer que les données antérieures sont à jour.**

### Médicaments à haut risque (exemples formation)

Anticoagulants, antiépileptiques, insuline, opioïdes, antibiotiques bêta-lactamines — confirmer allergies avant toute administration ultérieure.

## 6.2 Conciliation des médicaments domicile

### Workflow

1. Demander au patient / aidant la **liste des médicaments actuels** (noms, doses si connues).  
2. Saisir via **résumé médicaments domicile** + puces (aucun, inconnu, polymédication).  
3. **Recherche catalogue** → modal médicament domicile → ligne formatée ajoutée.  
4. Revue **carry-forward** si lignes reprises automatiquement.  
5. Enregistrer triage → promotion vers **profil patient longitudinal** (19T.3) si réconciliation confirmée.

### Limites produit (honnêteté formation)

Medora capture et synchronise la documentation — **ce n’est pas** un moteur enterprise de conciliation médicamenteuse (MedRec) avec validation pharmacien obligatoire intégrée. Appliquer les exigences locales au-delà du produit.

### Scénarios d’incertitude patient

| Situation | Action |
|-----------|--------|
| « Je prends des pilules blanches » | Documenter incertitude ; ne pas inventer de molécule |
| Aidant absent | Noter source ; réévaluer quand aidant disponible |
| Conflit avec carry-forward | **Modifier** ou **retirer** la ligne reprise ; statut « modifié » |

---

# 7. Reprise d’antécédents (carry-forward) — 19T.1–19T.3

> **Section prioritaire formation — comportement Medora documenté honnêtement.**

## 7.1 Principe

Lors d’une **nouvelle consultation d’urgence** sans triage existant, Medora peut **proposer** des antécédents issus de :

1. **Profil longitudinal patient** (`clinicalHistoryProfile`) — priorité ; ou  
2. **Triage d’une consultation d’urgence antérieure**.

Ces données apparaissent comme **reprise d’antécédents — en attente de revue**. Elles **ne sont pas** auto-confirmées comme vérité clinique.

## 7.2 Sections concernées

| Section | Contenu typique |
|---------|-----------------|
| Allergies | Texte allergies reprises |
| Médicaments domicile | Lignes médicaments |
| Antécédents (history) | PMH, PSH |
| Antécédents sociaux | Tabac, alcool, substances |

**Ne sont pas repris** via ce mécanisme : ESI, signes vitaux, dépistages AVC/sepsis de la visite courante, motif — à saisir à chaque visite.

## 7.3 Statuts de revue

| Statut (code) | Signification opérationnelle | Action staff |
|---------------|------------------------------|--------------|
| **En attente de revue** (`pending_review`) | Donnée reprise, non validée | Lire, confirmer, modifier ou retirer |
| **Revu / confirmé** (`reviewed`) | Staff a validé l’exactitude | Peut enregistrer triage |
| **Modifié** (`modified`) | Reprise corrigée | Documenter source si besoin |
| **Retiré** (`removed`) | Information reprise jugée non applicable | Ne pas réintroduire sans nouvelle source |

## 7.4 Ancienneté (staleness)

Medora signale si la source est **ancienne** (> 6 mois) ou **très ancienne** (> 12 mois). Traiter comme **indice de prudence** — revérifier avec le patient.

## 7.5 Actions interface

- **Confirmer tout** / **Confirmer la section** — après lecture réelle.  
- **Effacer la section** — si reprise non fiable.  
- Édition manuelle → statut mis à jour automatiquement selon règles produit.

## 7.6 Réconciliation des écarts

| Écart | Conduite |
|-------|----------|
| Patient nie une allergie reprise | **Retirer** ou **modifier** ; documenter dans le triage |
| Médicament arrêté depuis la dernière visite | **Modifier** la liste |
| Antécédent nouveau non dans le profil | **Ajouter** manuellement ; sauvegarde promeut le profil (19T.3) |
| Profil vs triage divergent après save | Lire bannière **historique longitudinal** ; réconcilier selon protocole |

## 7.7 Pourquoi la revue est critique

- Erreur d’allergie → risque médicamenteux majeur.  
- Médicament fantôme → ordonnance inappropriée.  
- Antécédent manquant → sous-évaluation du risque.

**Ne jamais** cliquer « Confirmer tout » sans lecture par section.

[CAPTURE D’ÉCRAN — Reprise d'antécédents]

---

# 8. Workflows de dépistage

## 8.1 Objectif opérationnel

Les dépistages structurés **aident** à documenter des préoccupations et à **déclencher l’escalade humaine** — Medora **ne** lance **pas** d’ordres automatiques ni de diagnostic.

## 8.2 Dépistages disponibles dans le triage ED

| Dépistage | Disponibilité Medora | Attentes |
|-----------|---------------------|----------|
| **AVC (stroke screen)** | **Oui** — formulaire structuré (face, bras, parole, LKW, alerte) | Alerte équipe si positif selon protocole |
| **Sepsis** | **Oui** — critères structurés + commentaires | Escalade si suspicion selon protocole |
| **Sécurité domicile** | **Partiel** — « Se sent en sécurité chez soi » O/N/Inconnu | Escalade sociale selon protocole établissement |
| **Voyage / exposition** | **Oui** — voyage hors pays 14 j | Contexte infectieux |
| **Critère chute majeure (trauma)** | **Partiel** — puce traumatologie | Compléter avec évaluation clinique |

## 8.3 Non disponibles comme écran triage dédié (ne pas documenter comme existants)

| Sujet | Statut produit |
|-------|----------------|
| Dépistage suicide structuré au triage | **Non** — documentation provider / sortie ailleurs |
| Dépistage grossesse structuré au triage | **Non** — motif / procédures séparées |
| Échelle risque de chute complète au triage | **Non** — **réévaluation infirmière** (faible/modéré/élevé) |
| Instrument complet violence / IPV | **Non** — au-delà du champ sécurité domicile |

Former le staff sur les **protocoles papier ou locaux** pour ces sujets si requis légalement.

## 8.4 Attentes documentation

- Cocher **alerte** ou commentaire quand le protocole l’exige.  
- Ne pas interpréter un dépistage négatif comme « pathologie exclue ».  
- Escalade **humaine** documentée (qui a été avisé, quand).

---

# 9. Workflow de réévaluation

## 9.1 Philosophie

La **réévaluation** est la **surveillance clinique continue** : l’état en salle d’attente ou en box peut changer. Medora fournit :

- **Réévaluation infirmière (urgences)** — événements append-only sur dossier actif ;
- **Signes vitaux rapides** — bandeau sur espace actif / chart ;
- **Modification triage / ESI** — via re-saisie triage.

## 9.2 Réévaluation salle d’attente

| ESI | Attente opérationnelle (indicatif — protocole local prime) |
|-----|-----------------------------------------------------------|
| 1–2 | Pas d’attente non surveillée ; réévaluation immédiate si en attente |
| 3 | Réévaluation selon délai établissement |
| 4–5 | Surveillance périodique ; réévaluation si symptôme change |

## 9.3 Détérioration

1. Soins immédiats selon protocole.  
2. Signes vitaux répétés → enregistrer dans Medora.  
3. Document **réévaluation infirmière** (symptômes, intervention, notification médecin).  
4. Réviser **ESI** dans triage si applicable.  
5. Superviseur si ressources insuffisantes.

## 9.4 Réévaluation douleur

Documenter score / description selon protocole local ; répéter après analgésie si applicable — dans réévaluation infirmière ou notes triage selon workflow local.

## 9.5 Attentes documentation

Chaque réévaluation significative devrait laisser une trace : **qui**, **quand**, **changement observé**, **actions**, **qui a été notify**.

[DIAGRAMME — Réévaluation]

---

# 10. Mobile et tablette — triage

## 10.1 Alignement initiative 19M

Le panneau triage ED utilise une mise en page **responsive** (seuil ~960 px : colonne unique vs large). Documenté dans l’audit 19M comme **utilisable** sur tablette ; **priorité moindre** que le tableau des urgences pour optimisation layout.

## 10.2 Recommandations

| Contexte | Appareil |
|----------|----------|
| Triage actif prolongé | **Tablette** paysage ≥ 10" |
| Accueil urgences (recherche patient) | Tablette ou PC |
| Téléphone | Possible pour tâches courtes — **limité** pour saisie triage complète |

## 10.3 Workflow chevet / salle

- Signes vitaux rapides adaptés au chevet.  
- Carry-forward : bannière utilisable sur viewport étroit (QA 19T.4).  
- Éviter saisie longue antécédents sur petit écran si PC disponible.

## 10.4 Haïti — connectivité

- Bandeau **Hors ligne** : file d’attente possible — **reprise d’antécédents** et recherche catalogue peuvent être limitées.  
- Synchroniser dès retour réseau ; revérifier allergies/médicaments après sync.  
- Voir runbook downtime (Volume 1 §8.3).

[CAPTURE D’ÉCRAN — Triage Medora]

---

# 11. Sécurité opérationnelle

## 11.1 Mauvais patient

- Confirmer identité **avant** enregistrement triage.  
- Vérifier nom sur bandeau dossier actif vs patient devant vous.

## 11.2 Doublons

- Volume 1 : alertes à la création patient.  
- Au triage : si dossier incohérent → **stop** → superviseur.

## 11.3 Allergies

- Jamais administrer sans vérification ; NKDA = vérification active, pas supposition.

## 11.4 Échecs de réévaluation

- Si patient ESI élevé non revu dans le délai local → escalade superviseur.  
- Utiliser indicateurs tableau (réévaluation due, durée élevée).

## 11.5 Détérioration salle d’attente

- Protocole local prioritaire ; Medora documente après/so pendant prise en charge.

## 11.6 Patient agressif / perturbateur

- Sécurité physique d’abord ; documentation quand sûr.

## 11.7 Barrière linguistique

- Interprète ; documenter langue et source de traduction.

## 11.8 Panne système

- Triage papier selon runbook ; ressaisie sans antidater les champs système.

---

# 12. Résumé opérationnel rapide — checklists

## 12.1 Checklist intake triage

- [ ] Identité confirmée (nom, DOB, MRN/NIR)  
- [ ] Motif neutre saisi  
- [ ] Signes vitaux complets selon protocole  
- [ ] ESI assigné et cohérent  
- [ ] Dépistages pertinents complétés  
- [ ] Triage enregistré  

## 12.2 Checklist conciliation allergies

- [ ] Patient interrogé  
- [ ] NKDA ou allergies détaillées  
- [ ] Recherche médicament si allergie médicamenteuse  
- [ ] Carry-forward allergies revu  
- [ ] Statut revue mis à jour  

## 12.3 Checklist revue carry-forward

- [ ] Chaque section lue  
- [ ] Confirmé / modifié / retiré par section  
- [ ] Ancienneté (> 6 / 12 mois) prise en compte  
- [ ] Pas de « confirmer tout » sans lecture  

## 12.4 Checklist réévaluation

- [ ] Délai local respecté pour ESI  
- [ ] Signes vitaux répétés si changement  
- [ ] Réévaluation infirmière documentée  
- [ ] ESI triage mis à jour si protocole  
- [ ] Médecin notify si indicatif  

## 12.5 Checklist escalade

- [ ] Détresse → soins + équipe  
- [ ] ESI 1–2 → pas d’attente non surveillée  
- [ ] Dépistage positif → protocole activé  
- [ ] Superviseur si ressources / conflit  

## 12.6 Checklist sécurité salle d’attente

- [ ] Patients ESI 1–3 identifiés visuellement (protocole salle)  
- [ ] Réévaluation planifiée  
- [ ] Staff sait comment alerter  
- [ ] Résultats critiques suivis (tableau)  

---

# 13. Gouvernance du chapitre

## 13.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction infirmière urgences** | Contenu triage, ESI, réévaluation |
| **Référent terminologie** | Alignement [canon](./french-terminology-canon.md) |
| **Admin Medora / IT** | Exactitude routes et RBAC |

## 13.2 Mises à jour

- Toute évolution carry-forward (19T.x) ou panneau triage → révision chapitre.  
- Lier aux tests `frenchHandbookTriageClinicalIntake19MBookFr3.test.ts`.

## 13.3 Révision annuelle

Recommandée avec **leadership triage** : protocoles locaux ESI, dépistages ajoutés, retour terrain Haïti.

## 13.4 Formation

- Obligatoire pour infirmiers triage ED avant autonomie.  
- Exercice carry-forward : « confirmer vs modifier vs retirer ».  
- Quiz : motif vs diagnostic ; triage vs évaluation médecin.

---

## Annexes

### A. Routes et libellés UI

| Route | Libellé |
|-------|---------|
| `/app/emergency/triage` | Accueil urgences |
| Panneau triage | Triage urgences |
| `/app/emergency/active/{id}` | Dossier actif urgences |
| Réévaluation | Réévaluation infirmière (urgences) |

### B. Références

- [Volume 1 — Accueil](./handbook-fr-registration-intake.md)  
- [Canon terminologique](./french-terminology-canon.md)  
- `docs/clinical/longitudinal-history-production-validation-19T4.md`  
- `docs/ui/mobile-tablet-responsiveness-audit-19M1.md`  
- `docs/ui/cross-device-qa-checklist-19M8.md`

### C. Placeholders visuels

- [CAPTURE D’ÉCRAN — Triage Medora]  
- [CAPTURE D’ÉCRAN — Reprise d'antécédents]  
- [DIAGRAMME — Workflow triage]  
- [DIAGRAMME — Réévaluation]  
- [CAPTURE D’ÉCRAN — Tableau des urgences]  
- [CAPTURE D’ÉCRAN — Dépistage AVC / sepsis]  
- [CAPTURE D’ÉCRAN — Réévaluation infirmière]

---

*Fin du Volume 2 — M-BOOK.FR.3*


\newpage



<!-- SECTION: Volume 3 — Prestataire -->

# Volume 3 — Workflow prestataire et documentation clinique

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.4  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Médecins, IPS, résidents, superviseurs cliniques, formateurs  
**Prérequis:** [Volume 1 — Accueil](./handbook-fr-registration-intake.md) · [Volume 2 — Triage](./handbook-fr-triage-clinical-intake.md)  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 3 — Workflow prestataire et documentation clinique |
| Routes principales | `/app/provider`, `/app/emergency/active/{id}`, `/app/emergency/chart/{id}`, `/app/encounters/{id}` |
| Composant documentation | Espace documentation prestataire (`ProviderDocumentationWorkspace`) |
| Architecture liée | Intelligence motif 19MDM · Responsive documentation 19M.5 |
| Révision recommandée | Annuelle ou après évolution MDM / intelligence motif |

---

# 1. Introduction au workflow prestataire

## 1.1 Rôle du prestataire dans Medora

Le **prestataire clinique** (médecin, IPS selon cadre local) est responsable de :

- L’**évaluation** clinique du patient ;
- La **synthèse** (HPI, ROS, examen, aide à la décision médicale — MDM) ;
- Les **ordres** et la revue des résultats (hors scope détaillé de ce volume — voir modules ordres/résultats) ;
- La **décision d’orientation** (sortie, observation, admission, transfert) ;
- La **communication** avec le patient / aidant et l’équipe.

## 1.2 Relation avec le triage

| Triage (Volume 2) | Prestataire (ce volume) |
|-------------------|-------------------------|
| ESI, signes vitaux, allergies, dépistages | HPI approfondi, examen, MDM |
| Reprise d’antécédents infirmière | Revue critique + diagnostic différentiel |
| Priorisation initiale | Plan thérapeutique et orientation |

Le prestataire **s’appuie** sur le triage — il ne **remplace** pas la réévaluation infirmière ni ne suppose que le triage est complet ou exact.

## 1.3 Philosophie de documentation

La documentation Medora doit refléter :

- Le **raisonnement** du prestataire ;
- L’**évolution** clinique et les **réévaluations** ;
- Le **risque spécifique** au patient ;
- Les **échanges** avec patient, famille et consultants ;
- L’**incertitude** lorsqu’elle existe — sans langage de certitude artificielle.

> **La documentation sert la continuité des soins et la clarté opérationnelle — pas uniquement la facturation.**

Medora propose des **modèles**, **pastilles** et **intelligence motif** pour accélérer la saisie. Le prestataire **édite, complète ou supprime** tout contenu inséré.

## 1.4 Objectifs opérationnels et sécurité patient

| Objectif | Moyen Medora |
|----------|--------------|
| Continuité | Dossier partagé, brouillon local, enregistrement serveur |
| Clarté équipe | Tableau des urgences, assignation, orientation enregistrée |
| Sécurité | Revue identité, carry-forward, pas de diagnostic auto |
| Traçabilité | Signature documentation prestataire (attestation) selon workflow |

## 1.5 Responsabilité clinique

> **Medora-S assiste le workflow et la documentation. Il ne remplace pas le jugement clinique du prestataire.**

Aucun modèle, pastille MDM ou bundle intelligence motif ne constitue un diagnostic, un ordre ou une orientation obligatoire.

---

# 2. Vue d’ensemble du workflow prestataire

## 2.1 Séquence opérationnelle (urgences)

```
Tableau des urgences — consultation assignée
        ↓
Ouverture dossier actif (/app/emergency/active/{id})
        ↓
Revue triage + antécédents + résultats en attente
        ↓
Évaluation initiale + documentation (HPI, ROS, examen, MDM)
        ↓
Ordres / revue données (module ordres)
        ↓
Réévaluations + mise à jour documentation
        ↓
Décision d'orientation (onglet Disposition) + texte dossier
        ↓
Signature / clôture selon protocole établissement
```

[DIAGRAMME — Workflow prestataire]

## 2.2 File prestataire vs documentation

| Surface | Route | Usage |
|---------|-------|-------|
| **File médecin** | `/app/provider` | Liste consultations ouvertes — **pas** la saisie documentation complète |
| **Dossier actif urgences** | `/app/emergency/active/{id}` | Documentation prestataire (onglet évaluation / MSE) |
| **Chart urgences** | `/app/emergency/chart/{id}` | Même espace documentation |
| **Consultation observation** | `/app/encounters/{id}` | Documentation mode observation |

## 2.3 Détail par étape

| # | Étape | Objectif | Bonnes pratiques | Erreurs fréquentes |
|---|-------|----------|------------------|-------------------|
| 1 | **Assignation** | Responsabilité claire | S’assigner sur tableau si protocole | Évaluer patient non assigné sans coordination |
| 2 | **Revue triage** | Contexte acuité | Lire ESI, vitaux, allergies, dépistages | Ignorer carry-forward non revu par infirmier |
| 3 | **Motif** | Comprendre plainte | Motif ≠ diagnostic | Copier motif comme diagnostic |
| 4 | **Historique longitudinal** | Antécédents fiables | Revérifier allergies/médicaments | Supposer profil patient à jour |
| 5 | **Évaluation initiale** | Examen + synthèse | Documenter évolution depuis triage | Documentation générique non patient-spécifique |
| 6 | **Ordres / résultats** | Plan diagnostique/thérapeutique | Revue résultats dans MDM | Orientation avant résultats critiques revus |
| 7 | **Réévaluation** | Surveillance risque | Mettre à jour note si changement | Note initiale jamais actualisée |
| 8 | **Complétude documentation** | Dossier défendable | Checklist interne qualité | Pastilles insérées sans relecture |
| 9 | **Orientation** | Décision enregistrée | Onglet Disposition + cohérence texte | Texte sortie contradictoire avec orientation |
| 10 | **Signature / clôture** | Attestation | Signer après relecture | Signer dossier incomplet |

### Escalade

- Détérioration clinique → soins + réévaluation infirmière + superviseur  
- Résultat critique → protocole local + documentation  
- Conflit identité → stop documentation → superviseur  

---

# 3. Workflow documentation clinique

## 3.1 HPI (histoire de la maladie)

- Décrire **chronologie**, **symptômes associés**, **facteurs aggravants/soulageants**, **traitements déjà reçus**.  
- Utiliser modèles de motif actif si pertinent — **personnaliser**.  
- Intelligence motif : pastilles HPI **optionnelles** (clic pour insérer).

## 3.2 ROS (revue des systèmes)

- Ciblée selon plainte — positifs **et** négatifs pertinents.  
- Pastilles ROS importantes / signaux d’alerte via intelligence motif si utile.

## 3.3 Examen physique

- Sections par aire (général, cardio, abdomen, neuro, etc.).  
- Pastilles examen du **modèle actif** + intelligence motif (ex. neuro, MSK).  
- Réévaluation : section **examen de réévaluation** si évolution documentée.

## 3.4 MDM (aide à la décision médicale)

- Champs : évaluation de travail, données revues, raisonnement clinique, synthèse différentielle, plan, admission/observation/sortie.  
- Voir **§4** pour workflow détaillé.

## 3.5 Réévaluation (documentation prestataire)

- Documenter **intervalle**, **changement**, **réponse au traitement**, **résultats revus**.  
- Distinct de la **réévaluation infirmière** (Volume 2) — les deux sont complémentaires.

## 3.6 Consultations évoquées

- Champ **Consultations évoquées** (`mdmConsultsDiscussed`) — texte libre.  
- Pastilles intelligence motif peuvent suggérer « revoir si consultant indiqué » — **pas** de module bon de consulte intégré.

## 3.7 Justifications orientation / observation / admission

- **Texte dossier** : champs MDM admission/observation/sortie + pastilles.  
- **Décision opérationnelle** : onglet **Disposition (urgences)** — enregistrer l’**orientation** (sortie, admission/observation, transfert, etc.).  
- Les deux couches doivent être **cohérentes** ; Medora **ne les fusionne pas** automatiquement.

## 3.8 Communication patient / famille

Documenter ce qui a été expliqué : plan, risques, consignes de retour, suivi — dans instructions de sortie et MDM, pas seulement dans pastilles génériques.

---

# 4. Workflow MDM

> **Section prioritaire formation prestataire.**

## 4.1 Philosophie MDM dans Medora

L’**aide à la décision médicale (MDM)** documente la **complexité** et le **raisonnement** de la visite. Medora fournit :

- **Modèle actif** (ex. douleur thoracique, dyspnée) avec pastilles MDM suggérées ;
- **Menu MDM** multi-sélection avec prompts à **valeur élevée** et fragments du modèle ;
- **Intelligence motif** (bundles par plainte) — insertion par section.

Tout est **optionnel**, **modifiable** et **supprimable** (puces retirables).

## 4.2 Menu MDM multi-sélection

### Comportement opérationnel

1. Ouvrir le **menu modèles MDM** sur le champ cible (ex. raisonnement clinique).  
2. **Cocher** une ou plusieurs pastilles (multi-sélection).  
3. **Appliquer** — fragments ajoutés au texte (séparés par `;` si plusieurs).  
4. **Éditer** le texte librement après insertion.  
5. **Retirer** une puce pour enlever le fragment associé.

Le menu **reste ouvert** pour sélections multiples successives (comportement multi-select).

### Prompts à valeur élevée (fixes)

Exemples de catégories : MDM standard, préoccupation patient, revue études diagnostiques, sevrage tabagique, PMP revu — insérés dans champs MDM appropriés. **Relire** — ne pas insérer si non pertinent.

## 4.3 Modèle actif vs intelligence motif

| Source | Quand visible | Auto-insertion |
|--------|---------------|----------------|
| **Modèle actif** (template picker) | Après choix modèle visite | Pastilles **champs modèle** au changement de modèle — **pas** intelligence motif |
| **Intelligence motif** | Pastilles par section HPI/ROS/MDM/etc. | **Jamais** — **clic uniquement** |

## 4.4 Champs MDM typiques

| Champ | Contenu attendu |
|-------|-----------------|
| Évaluation de travail | Impression clinique de travail |
| Données revues | Labs, imagerie, ECG, consultants — **ce qui a été revu** |
| Raisonnement clinique | Pourquoi ce plan |
| Synthèse différentielle | Diagnostics considérés — **sans** certitude inappropriée |
| Plan / actions | Traitement, réévaluation, consultation |
| Admission / observation / sortie | Justification orientation textuelle |

## 4.5 Responsabilité finale

> **Le prestataire reste responsable de tout le contenu final enregistré et signé.**

Medora n’attribue pas automatiquement un niveau de facturation E/M ; la documentation doit soutenir le raisonnement clinique réel.

---

# 5. Workflow intelligence motif (19MDM)

## 5.1 Principes

L’**intelligence motif** fournit des **bundles de prompts** par type de plainte :

- **Insertion au clic uniquement** — jamais d’application automatique selon diagnostic ou motif saisi.  
- **Aucun ordre**, **aucune ordonnance**, **aucune orientation** automatique.  
- **Aucun diagnostic** imposé.

Chaque bundle peut inclure : HPI, ROS (+/-), signaux d’alerte, examen ciblé, différentiel/MDM, revue données, réévaluation, suivi/sortie.

## 5.2 Organisation en sous-groupes (picker)

| Sous-groupe (FR) | Clé | Exemples de templates |
|------------------|-----|------------------------|
| **Gastro-intestinal / abdominal** | `gi_abdominal` | Douleur abdominale, nausées/vomissements, saignement GI… |
| **Respiratoire / ORL** | `respiratory_ent` | Toux, dyspnée, asthme, pneumonie… |
| **Cardiaque / vasculaire** | `cardiac_vascular` | Douleur thoracique, palpitations, OAP… |
| **GU / rénal** | `gu_renal` | Dysurie, douleur flank, rétention… |
| **MSK / traumatique** | `msk_trauma` | Entorse, douleur dos, traumatisme… |
| **Infectieux / ORL** | `infectious_ent` | Fièvre, cellulite, mal de gorge infectieux… |
| **Endocrinien / métabolique** | `endocrine_metabolic` | Hyperglycémie, hypoglycémie, thyroïde… |
| **Neurologie avancée** | `neurology_expansion` | Crise, vertige, faiblesse focale… |

Des templates **legacy** (ex. `stroke_symptoms`, `headache`, `chest_pain`) existent en dehors des sous-groupes `*_complaint_v1` — même règles d’insertion manuelle.

## 5.3 Utilisation opérationnelle

1. Choisir le **modèle de visite** correspondant à la plainte (picker avec sous-groupes).  
2. Dans chaque section (HPI, ROS, MDM…), cliquer les pastilles **intelligence motif** utiles.  
3. **Personnaliser** le texte — prompts formulés « à documenter si pertinent », « évaluer », « revoir si… ».  
4. **Retirer** les puces non applicables.

[CAPTURE D’ÉCRAN — Intelligence motif]

## 5.4 Limitations et gouvernance (sécurité)

### Ce que l’intelligence motif ne fait pas

- Ne **exclut** pas une pathologie (« exclu », « éliminé »).  
- Ne déclare pas d’examens **normaux** ou **négatifs** (CT, MRI, labs, ECG « normal »).  
- Ne certifie pas **sortie sûre**, **aptitude à conduire**, **patient stable**.  
- N’**oblige** pas admission ou sortie.

### Gouvernance produit (19MDM)

Règles de phrases interdites dans le **contenu des bundles** — contrôlées en **tests** de non-régression (CI). Le prestataire doit **éviter** d’ajouter manuellement ce langage après insertion.

Exemples de formulations **interdites** dans la documentation clinique (liste indicative formation) :

- « AVC exclu », « IDM exclu », « pneumonie exclue »  
- « Scanner négatif », « bilan normal »  
- « Sortie sans risque », « médicalement autorisé à conduire »  
- « Doit être admis », « doit sortir »

### Revue prestataire obligatoire

Traiter chaque pastille comme **aide-mémoire**, pas comme texte final. **Relire** avant enregistrement et **signature**.

[CAPTURE D’ÉCRAN — Templates MDM]

---

# 6. Réévaluation et évolution clinique

## 6.1 Philosophie

La **réévaluation** est une **évaluation continue du risque** — pas un unique paragraphe en fin de visite.

## 6.2 Workflow répété

| Déclencheur | Action documentation |
|-------------|---------------------|
| Nouveaux symptômes | MAJ HPI + examen réévaluation |
| Résultat disponible | MDM « données revues » + plan |
| Réponse traitement | Réévaluation douleur / symptômes |
| Séjour ED prolongé | Documenter intervalle et décision retard |

## 6.3 Détérioration

1. Soins immédiats (protocole).  
2. Coordination infirmière (réévaluation infirmière).  
3. MAJ ESI via triage si délégué.  
4. Documentation prestataire : évolution + plan + orientation si changée.

## 6.4 Séjour prolongé aux urgences

Documenter : raison attente, résultats en attente, réévaluations intervalle, discussion patient — pastilles **observation / réévaluation** ou modèle `observation_reassessment` si pertinent.

## 6.5 Mode observation

Sur `/app/encounters/{id}` en **observation et court séjour** : documentation prestataire avec titres/chips observation ; compléter orientation via disposition et protocole observation local (Volume 1 §11).

---

# 7. Consultations, observation et admission

## 7.1 Documentation consult

- **Consultations évoquées** : qui, quand, recommandations — texte libre.  
- Pastilles : « revoir si consultation neurologie/cardio indiquée » — insérer puis **préciser** si consult réellement obtenu.

**Limite produit :** pas de suivi statut consult intégré (accepté/en attente) dans l’espace documentation.

## 7.2 Justification observation

Documenter : pourquoi surveillance prolongée, résultats en attente, réponse traitement incertaine, risque de décompensation.

## 7.3 Justification admission

Documenter : incapacité sortie sûre selon évaluation, besoin IV/oxygène/monitoring, social si pertinent au plan.  
**Décision** : onglet Disposition → **Admission / observation (court séjour)** + dossier d’admission structuré.

## 7.4 Transfert

Motif transfert, acceptation, stabilité pour transport — disposition **Transfert** + texte MDM.

## 7.5 Incertitude clinique

Il est **acceptable** de documenter l’incertitude : « diagnostic en évolution », « réévaluation après résultats » — **éviter** fausse certitude.

---

# 8. Orientation et documentation de sortie

## 8.1 Deux niveaux (rappel)

| Niveau | Où | Rôle |
|--------|-----|------|
| **Narratif** | Champs MDM + suivi/sortie + intelligence motif | Raisonnement, consignes textuelles |
| **Opérationnel** | Onglet **Disposition (urgences)** | **Orientation** enregistrée (domicile, observation, transfert, LAMA, etc.) |

Libellé bouton : **Enregistrer la décision d'orientation**.

## 8.2 Workflow sortie

1. Réévaluation finale documentée.  
2. Instructions compréhensibles (langue, littératie).  
3. **Consignes de retour** / signes d’alarme.  
4. Suivi planifié.  
5. Enregistrer orientation **sortie à domicile** (ou autre) dans Disposition.  
6. Exécution infirmière sortie (Volume 2 / équipe) — distinct de la décision médicale.

## 8.3 Planification partagée

Documenter ce que patient/aidant **a compris** — questions répondues. Pastilles « planification partagée » si modèle le prévoit.

## 8.4 Philosophie (sans détail gouvernance interne)

Les **modèles de sortie** et garde-fous produit existent pour encourager consignes sécuritaires — le prestataire **adapte** au cas. Ne pas exposer ici les règles d’implémentation internes ; suivre formation établissement sur modèles sortie approuvés.

### La documentation de sortie doit refléter

- Réévaluation finale  
- Compréhension patient  
- Attentes de suivi  
- Consignes de retour  
- **Incertitude non résolue** si applicable  

---

# 9. Historique longitudinal et carry-forward

## 9.1 Revue prestataire

Avant de prescrire ou d’orienter :

- **Allergies** — confirmer avec patient ; ne pas se fier au profil seul.  
- **Médicaments domicile** — conciliation si changement depuis triage.  
- **Antécédents** — compléter si nouvelle information.

## 9.2 Reprise d’antécédents (Volume 2)

Si infirmier n’a pas finalisé revue carry-forward, le prestataire doit **traiter** les sections en attente ou **documenter** la discordance.

## 9.3 Profil longitudinal (19T.3)

Après triage sauvegardé, le profil patient peut être **promu**. Écarts profil vs récit → **réconcilier** dans la note ou mettre à jour via workflow patient.

## 9.4 Risque données anciennes

Signaler mentalment l’**ancienneté** (> 6 / 12 mois) — revérifier allergies et médications actifs.

---

# 10. Mobile et tablette — prestataire

## 10.1 Initiative 19M.5 (documentation)

| Largeur | Comportement |
|---------|--------------|
| &lt; 1024 px | Colonne unique, résumé repliable |
| 1024–1279 px | Tablette 2 colonnes (aside étroit) |
| ≥ 1280 px | Bureau 2 colonnes (aside sticky) |

Cibles tactiles ≥ 44 px en mode empilé.

## 10.2 Recommandations

| Usage | Appareil |
|-------|----------|
| Documentation prolongée complexe | **Bureau** ou tablette grande paysage |
| Chevet, réévaluation rapide, insertion pastilles | **Tablette** acceptable |
| Téléphone | Consultation courte — **limité** pour MDM long |

## 10.3 Haïti — connectivité

- Brouillon **local** si réseau instable — resynchroniser et **relire** avant signature.  
- Ne pas signer si statut « en attente synchronisation » sans confirmer enregistrement serveur.

[CAPTURE D’ÉCRAN — Documentation prestataire]

---

# 11. Sécurité opérationnelle prestataire

| Risque | Mesure |
|--------|--------|
| **Mauvais patient** | Vérifier bandeau identité à l’ouverture dossier |
| **Abus carry-forward** | Confirmer allergies/médicaments indépendamment |
| **Surconfiance modèles** | Personnaliser tout texte inséré |
| **Copier-coller** | Interdit entre patients ; pastilles ≠ autre dossier |
| **Résultats en attente** | Documenter attente ; ne pas orienter avant revue si protocole l’exige |
| **Réévaluation omise** | MAJ note si changement clinique |
| **Orientation prématurée** | Cohérence texte ↔ onglet Disposition |
| **Barrière linguistique** | Interprète ; documenter |
| **Panne** | Reporter signature ; saisie reprise selon runbook |
| **Mobile** | Relecture obligatoire sur petit écran |

---

# 12. Résumé opérationnel rapide — checklists

## 12.1 Checklist intake prestataire

- [ ] Bon patient / bonne consultation  
- [ ] Triage et vitaux revus  
- [ ] Allergies / médicaments vérifiés  
- [ ] Motif et HPI initiaux  
- [ ] Résultats en attente identifiés  

## 12.2 Checklist MDM

- [ ] Données revues documentées (ce qui a été **vu**, pas « tout normal »)  
- [ ] Différentiel raisonnable  
- [ ] Plan et réévaluation  
- [ ] Pastilles relues et personnalisées  
- [ ] Cohérence avec orientation  

## 12.3 Checklist réévaluation

- [ ] Changement clinique documenté  
- [ ] Nouveaux résultats intégrés  
- [ ] Plan mis à jour si besoin  

## 12.4 Checklist sortie

- [ ] Réévaluation finale  
- [ ] Instructions + consignes retour  
- [ ] Suivi  
- [ ] Orientation enregistrée (Disposition)  
- [ ] Compréhension patient documentée  

## 12.5 Checklist observation / admission

- [ ] Justification clinique texte  
- [ ] Dossier d’admission / niveau de soins si applicable  
- [ ] Orientation **Admission / observation** enregistrée  

## 12.6 Checklist sécurité intelligence motif

- [ ] Insertion **manuelle** uniquement  
- [ ] Pas de langage « exclu / normal / sortie sûre »  
- [ ] Texte édité pour le patient  
- [ ] Puces non pertinentes retirées  

## 12.7 Checklist anti mauvais patient

- [ ] Identité bandeau = patient présent  
- [ ] MRN/NIR cohérent  
- [ ] Re-vérification avant signature  

---

# 13. Gouvernance du chapitre

## 13.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction médicale urgences** | Contenu clinique, MDM, orientation |
| **Référent terminologie** | [Canon](./french-terminology-canon.md) |
| **Équipe produit Medora** | Exactitude comportement UI (sans exposer implémentation interne aux cliniciens) |

## 13.2 Revue leadership prestataire

Recommandée **annuellement** avec : lead MD ED, nursing lead, admin documentation, référent 19MDM.

## 13.3 Formation déploiement Haïti

- Atelier pratique : modèle + MDM multi-select + 1 bundle intelligence motif.  
- Exercice : repérer langage interdit dans un brouillon.  
- Lien Volume 1–2 pour continuité accueil → triage → médecin.

## 13.4 Mises à jour

Nouveau sous-groupe intelligence motif ou changement Disposition → révision chapitre + tests `frenchHandbookProviderWorkflow19MBookFr4.test.ts`.

---

## Annexes

### A. Enregistrement et brouillon (aperçu)

- **Enregistrement** : sauvegarde serveur (PATCH encounter metadata).  
- **Autosauvegarde** : délai ~2 s après modification si contenu et droits OK.  
- **Brouillon local** : restauration si plus récent — **relire** avant signature.  
- **Signature** : attestation prestataire — protocole établissement.

### B. Références

- [Volume 1](./handbook-fr-registration-intake.md) · [Volume 2](./handbook-fr-triage-clinical-intake.md)  
- [Canon terminologique](./french-terminology-canon.md)  
- `docs/ui/mobile-tablet-responsiveness-audit-19M1.md`  
- Architecture intelligence motif : batches 19MDM.2–19MDM.9 (documentation interne)

### C. Placeholders visuels

- [CAPTURE D’ÉCRAN — Documentation prestataire]  
- [CAPTURE D’ÉCRAN — Templates MDM]  
- [CAPTURE D’ÉCRAN — Intelligence motif]  
- [CAPTURE D’ÉCRAN — Réévaluation]  
- [DIAGRAMME — Workflow prestataire]  
- [DIAGRAMME — Admission / observation / congé]  
- [CAPTURE D’ÉCRAN — Onglet Disposition (urgences)]

---

*Fin du Volume 3 — M-BOOK.FR.4*


\newpage



<!-- SECTION: Volume 4 — Infirmier -->

# Volume 4 — Workflow infirmier et exécution de sortie

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.5  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Infirmier(ère) aux urgences, infirmier(ère) de triage, IDE, superviseurs infirmiers, formateurs  
**Prérequis:** [Volume 1 — Accueil](./handbook-fr-registration-intake.md) · [Volume 2 — Triage](./handbook-fr-triage-clinical-intake.md) · [Volume 3 — Prestataire](./handbook-fr-provider-workflow-documentation.md)  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 4 — Workflow infirmier et exécution de sortie |
| Routes principales | `/app/nursing`, `/app/emergency/active/{id}`, `/app/emergency/chart/{id}`, `/app/emergency/trackboard`, `/app/encounters/{id}` |
| Composants clés | Réévaluation infirmière (`EmergencyNursingReassessmentPanel`), MAR (`MedicationAdministrationTab`), exécution sortie (`NursingDischargeExecutionSection`) |
| Architecture liée | Carry-forward 19T.1–19T.3 · Responsive disposition / sortie 19M.6 |
| Révision recommandée | Annuelle ou après évolution sortie / MAR / réévaluation |

---

# 1. Introduction au workflow infirmier

## 1.1 Rôle infirmier dans Medora

L’**infirmier(ère) clinique** aux urgences est responsable de :

- La **surveillance continue** et la **réévaluation** du patient ;
- La **documentation infirmière** structurée (soins, ABC, réponse au traitement, sécurité au chevet) ;
- La **coordination** avec le prestataire, le laboratoire, l’imagerie et la pharmacie selon protocole ;
- Le **suivi des ordres** actifs et la **documentation des administrations** de médicament (MAR) ;
- L’**exécution de sortie** lorsque le prestataire a enregistré l’orientation — distincte de la décision médicale ;
- L’**éducation patient** et la vérification de la compréhension avant départ.

## 1.2 Relation avec triage et documentation prestataire

| Volume / rôle | Contribution |
|---------------|--------------|
| **Volume 2 — Triage** | ESI, signes vitaux initiaux, allergies, dépistages, carry-forward infirmier |
| **Volume 3 — Prestataire** | HPI, examen, MDM, ordres, **décision d’orientation** (onglet Disposition) |
| **Volume 4 — Infirmier (ce volume)** | Réévaluation, MAR, suivi ordres/résultats, **exécution sortie**, enseignement |

L’infirmier **s’appuie** sur le triage et la documentation prestataire — il ne **remplace** pas l’évaluation médicale ni ne modifie la décision d’orientation du prestataire.

## 1.3 Responsabilité documentaire infirmière

La documentation infirmière Medora doit refléter :

- L’**état actuel** du patient et son **évolution** ;
- Les **interventions** réalisées et la **réponse au traitement** ;
- Les **signaux d’alerte** identifiés et les **escalades** effectuées ;
- La **continuité** entre réévaluations (append-only, horodatées).

## 1.4 Réévaluation continue

La réévaluation infirmière est une **surveillance clinique continue du risque patient** — pas un formulaire unique en fin de séjour. Medora permet plusieurs séances de réévaluation sur le même dossier.

## 1.5 Suivi médicament et ordres

L’infirmier est responsable de **connaître les ordres actifs**, d’**administrer et documenter** selon protocole établissement, et de **signaler au prestataire selon le protocole de l’établissement** tout changement clinique ou résultat critique — sans interpréter les résultats au-delà de son champ de pratique et des politiques locales.

## 1.6 Exécution de sortie

L’infirmier **n’établit pas** la décision clinique de sortie du prestataire. Il **vérifie, enseigne, documente et exécute** le processus opérationnel de sortie une fois l’orientation enregistrée.

## 1.7 Responsabilité clinique et politique institutionnelle

> **Medora-S soutient le workflow infirmier et la documentation. Il ne remplace pas le jugement clinique infirmier ni les politiques institutionnelles (MAR, protocoles médicament, protocoles de sortie).**

Medora n’est **pas** un registre légal de médicament (MAR papier ou système institutionnel) ; il **documente** les administrations dans le dossier consultation selon les droits et workflows produit.

---

# 2. Vue d’ensemble du workflow infirmier

## 2.1 Séquence opérationnelle (urgences)

```
Volume 2 : Triage enregistré → visible tableau des urgences
        ↓
Patient reçu / assigné (box, salle d'attente, voie rapide)
        ↓
Évaluation infirmière initiale + documentation soins
        ↓
Suivi ordres actifs + administrations médicament (MAR)
        ↓
Réévaluations continues + signes vitaux
        ↓
Éducation patient + préparation sortie / admission / transfert
        ↓
Vérification orientation prestataire (Disposition)
        ↓
Exécution sortie infirmière OU handoff admission/transfert
        ↓
Documentation infirmière finale
```

[DIAGRAMME — Workflow infirmier]

## 2.2 Surfaces Medora

| Surface | Route | Usage infirmier |
|---------|-------|-----------------|
| **File soins infirmiers** | `/app/nursing` | Liste consultations ouvertes — médicaments en attente, accès rapide dossier |
| **Tableau des urgences** | `/app/emergency/trackboard` | Vue opérationnelle, assignation, priorités |
| **Dossier actif urgences** | `/app/emergency/active/{id}` | Onglets : soins infirmiers, MAR, ordres, résultats, disposition |
| **Chart urgences** | `/app/emergency/chart/{id}` | Même contenu — navigation chart |
| **Consultation observation** | `/app/encounters/{id}` | Soins infirmiers, MAR, sortie observation |

[CAPTURE D’ÉCRAN — Workflow infirmier]

## 2.3 Détail par étape

| # | Étape | Objectif | Bonnes pratiques | Erreurs fréquentes | Escalade | Documentation |
|---|-------|----------|------------------|-------------------|----------|---------------|
| 1 | **Réception depuis triage / tableau** | Continuité sécuritaire | Lire ESI, vitaux, allergies, motif | Ignorer carry-forward non revu | ESI 1–2 non pris en charge → superviseur | Reprendre contexte triage |
| 2 | **Affectation / rooming** | Localisation claire | Box ou zone cohérente avec acuité | Patient haute acuité en attente non surveillée | Saturation salle d’attente → charge infirmière | Mettre à jour si protocole local |
| 3 | **Évaluation infirmière initiale** | Baseline soins | ABC, douleur, sécurité chevet | Documentation générique | Détresse → équipe + prestataire | Grille documentation infirmière |
| 4 | **Conscience ordres actifs** | Plan thérapeutique connu | Revue onglet Ordres / MAR | Ordre oublié en attente | Résultat critique → prestataire selon protocole | Noter interventions prévues |
| 5 | **Administration médicament** | Acte sécuritaire documenté | Vérifier patient, allergie, ordre | Mauvais patient / mauvais médicament | Réaction → protocole urgence + documentation | MAR — heure, voie, refus si applicable |
| 6 | **Réévaluation** | Surveillance continue | Vitaux, douleur, réponse traitement | Aucune réévaluation après changement | Détérioration → prestataire immédiat | Nouvelle séance réévaluation horodatée |
| 7 | **Éducation patient** | Compréhension sécuritaire | Enseignement ciblé, langage adapté | Sortie sans revue consignes | Non-compréhension → prestataire / interprète | Cases enseignement exécution sortie |
| 8 | **Vérification pré-sortie** | Prêt opérationnel | Orientation prestataire enregistrée | Sortie sans Disposition | Orientation absente → prestataire | Lire décision en lecture seule |
| 9 | **Exécution sortie** | Départ tracé | Identité, destination, heure, état | Sortie avant décision médicale | Refus soins / LAMA → protocole | Exécution sortie infirmière (section dédiée) |
| 10 | **Documentation finale** | Continuité dossier | Note de clôture infirmière si protocole | Dossier incomplet avant clôture | — | Handoff si admission/transfert |

---

# 3. Documentation infirmière aux urgences

## 3.1 Panneau réévaluation infirmière

Sur le dossier actif urgences, l’onglet **Soins infirmiers** héberge le panneau de **réévaluation infirmière** structurée :

- Grille multi-domaines (ABC, soins/surveillance, réponse au traitement, tendance, interventions, sécurité chevet) ;
- **Nouvelle séance** horodatée — documentation append-only ;
- Signes vitaux rapides liés au triage / dossier ;
- Champs sécurité triage ED (`ErTriageV1NursingCareSafetyFieldsBlock`) si applicable.

## 3.2 Brouillon local (aperçu)

Medora peut conserver un **brouillon local** de réévaluation infirmière (session navigateur) en cas de rafraîchissement accidentel. **Relire et enregistrer** sur le serveur avant de considérer la documentation définitive — surtout si connectivité instable (Haïti).

## 3.3 Distinction triage vs soins infirmiers

| Triage (Volume 2) | Soins infirmiers (ce volume) |
|-------------------|------------------------------|
| Évaluation initiale structurée, ESI | Réévaluations ultérieures, évolution |
| Allergies / médicaments domicile documentés | Vérification continue, administrations |
| Dépistages structurés initiaux | Surveillance continue, réponse traitement |

Ne pas confondre **triage enregistré une fois** avec **suivi infirmier continu**.

[CAPTURE D’ÉCRAN — Réévaluation infirmière]

---

# 4. Workflow réévaluation

## 4.1 Philosophie

> **La réévaluation infirmière est une évaluation continue du risque patient.**

Elle vise à détecter précocement la détérioration, documenter la réponse au traitement et alimenter le prestataire avec des observations factuelles.

## 4.2 Réévaluation douleur

- Revérifier l’échelle de douleur selon protocole local ;
- Documenter avant/après analgésie si administrée ;
- Escalade si douleur non contrôlée malgré protocole — **signaler au prestataire selon le protocole de l’établissement**.

## 4.3 Signes vitaux répétés

- Utiliser saisie rapide vitaux sur dossier actif ;
- Comparer avec triage et réévaluations antérieures ;
- Documenter tendance (amélioration, stable, détérioration) dans la grille infirmière.

## 4.4 Détérioration clinique

| Signal | Action opérationnelle |
|--------|----------------------|
| ABC compromis | Équipe + prestataire immédiat ; documentation contemporaine |
| Vitaux hors cible protocole | Réévaluation ; notification selon seuils locaux |
| Changement neurologique | Escalade urgente ; ne pas retarder pour documentation |

## 4.5 Réévaluation salle d’attente

Patients en attente restent sous **responsabilité infirmière** selon protocole :

- Délais de réévaluation selon ESI et politique salle d’attente ;
- Mise à jour ESI via **réouverture triage** (Volume 2) si protocole le permet ;
- Documentation réévaluation si changement d’état.

## 4.6 Réponse au traitement

Documenter objectivement : douleur, symptômes, tolérance IV/oxygène, effets indésirables observés — faits, pas diagnostic médical.

## 4.7 Séjour prolongé aux urgences

Pour séjour > seuil local :

- Réévaluations planifiées ;
- Revue ordres en attente et résultats non lus ;
- Communication avec prestataire si stagnation ou boarding.

## 4.8 Notification prestataire

Medora **ne remplace pas** l’appel verbal ou le protocole d’alerte local. Documenter ce qui a été **signalé au prestataire selon le protocole de l’établissement** lorsque pertinent.

## 4.9 Mode observation

Sur `/app/encounters/{id}` (observation / court séjour), les mêmes principes de réévaluation s’appliquent avec documentation adaptée au contexte hospitalier de courte durée.

---

# 5. Suivi des ordres et résultats

## 5.1 Conscience des ordres actifs

- Consulter l’onglet **Ordres** sur le dossier actif ;
- Identifier : en attente, en cours, complétés, résultats disponibles ;
- La **file infirmière** (`/app/nursing`) peut afficher le volume de médicaments en attente par consultation.

## 5.2 Coordination labo / imagerie / pharmacie

| Type | Rôle infirmier (opérationnel) |
|------|-------------------------------|
| Laboratoire | Prélèvement si protocole ; suivi statut ; pas d’interprétation médicale |
| Imagerie | Accompagnement patient ; suivi statut |
| Pharmacie | Coordination délivrance si workflow local ; administration documentée au MAR |

## 5.3 Ordres en attente

- Vérifier régulièrement les ordres non exécutés ;
- Documenter retard si impact clinique (ex. analgésie en attente) ;
- Escalade selon protocole — **signaler au prestataire selon le protocole de l’établissement**.

## 5.4 Ordres complétés et résultats

- Résultats disponibles : s’assurer que le prestataire en a **connaissance** selon protocole ;
- Accusé de réception résultat (si droits RN) : action produit — ne remplace pas notification clinique locale ;
- **Ne pas interpréter** les résultats au-delà du scope infirmier et des politiques de l’établissement.

## 5.5 Changements critiques

Tout résultat ou changement clinique critique → **signaler au prestataire selon le protocole de l’établissement** (appel, alerte, page) **en plus** de toute documentation Medora.

## 5.6 Attentes documentaires

Documenter : prélèvements effectués, administrations, réévaluations post-traitement, escalades — faits observables et actions infirmières.

---

# 6. Administration de médicament

## 6.1 Conscience des ordres médicament

- Onglet **MAR** (administration de médicament) sur dossier actif urgences, chart ou consultation observation ;
- Liste des lignes médicament en attente d’administration ;
- Alertes sécurité (allergies, médicaments à haut risque) — **lire et accuser** selon workflow produit ; ne remplace pas vérification infirmière indépendante.

## 6.2 Documentation d’administration

Pour chaque administration :

- Confirmer **bon patient**, **bon médicament**, **bonne dose**, **bonne voie**, **bon moment** (protocole local + Medora) ;
- Enregistrer heure effective ; ajuster avec justification si protocole et produit le permettent ;
- Documenter site injection IM si requis par le produit.

## 6.3 Refus patient

- Documenter le refus sans forcer l’administration ;
- **Signaler au prestataire selon le protocole de l’établissement** si impact sur le plan thérapeutique.

## 6.4 Médicament retenu (held)

- Documenter la raison (NPO, procédure, indisponibilité, ordre prestataire) ;
- Revérifier avant administration ultérieure.

## 6.5 Réaction / événement indésirable

- Protocole urgence institutionnel en premier ;
- Documentation contemporaine dans le dossier ;
- Notification prestataire / pharmacie selon protocole.

## 6.6 Réévaluation après médicament

- Surtout analgésie, sédation, vasopresseurs, insuline : réévaluer douleur, vitaux, niveau de conscience selon protocole ;
- Documenter réponse dans réévaluation infirmière.

## 6.7 Analgésie et réévaluation douleur

Après opioïde ou analgésie majeure : réévaluation douleur et surveillance respiratoire selon protocole — documenter.

## 6.8 Médicaments à haut risque

Medora peut afficher des avertissements pour médicaments à haut risque. L’infirmier **reste responsable** de la vérification indépendante selon politique MAR institutionnelle.

> **Medora documente les administrations ; il ne remplace pas le MAR légal ni les politiques médicament de l’établissement.**

[CAPTURE D’ÉCRAN — Administration médicament]

---

# 7. Exécution de sortie infirmière

## 7.1 Distinction fondamentale

| Niveau | Responsable | Contenu Medora |
|--------|-------------|----------------|
| **Documentation de sortie prestataire** | Prestataire clinique | MDM, instructions, consignes, onglet **Disposition (urgences)** — **décision d’orientation** |
| **Exécution de sortie infirmière** | Infirmier(ère) | Vérification, enseignement, destination, heure, état — **sans créer la décision médicale** |

> **L’infirmier ne crée pas la décision clinique de sortie du prestataire ; il confirme et exécute le processus opérationnel de sortie.**

Le prestataire enregistre l’**orientation** (sortie à domicile, observation, admission, transfert, LAMA, etc.) dans l’onglet Disposition. L’infirmier **lit** cette décision et **exécute** la sortie infirmière.

## 7.2 Workflow exécution sortie (sortie à domicile)

1. **Vérifier** que le prestataire a enregistré l’orientation de sortie (Disposition) ;
2. **Vérifier l’identité** du patient (bandeau, nom, DOB) ;
3. **Revoir** les instructions de sortie prestataire (dossier partagé) ;
4. **Revoir** médicaments / ordonnances si applicables ;
5. **Revoir** suivi et **consignes de retour** ;
6. **Enseigner** et documenter les points revus (cases enseignement) ;
7. **Documenter** la compréhension patient / famille (ou interprète) ;
8. **Documenter** l’état du patient à la sortie ;
9. **Documenter** destination / transport ;
10. **Enregistrer** heure de sortie ;
11. **Compléter** l’exécution sortie infirmière (enregistrement unique — relecture après sauvegarde).

Section produit : **Exécution sortie infirmière** (`NursingDischargeExecutionSection`) — persistée dans l’évaluation infirmière du dossier.

## 7.3 Champs typiques exécution sortie

| Champ | Objectif |
|-------|----------|
| Destination | Domicile, famille, transfert, etc. |
| Heure de sortie | Traçabilité opérationnelle |
| Enseignement revu | Cases : médicaments, suivi, consignes retour, plaie, etc. |
| État à la sortie | Stable, amélioré, ambulatoire, fauteuil, etc. |
| Note infirmière | Contexte, barrière linguistique, transport |

## 7.4 Handoff infirmier (panneau complémentaire)

Le panneau **handoff infirmier urgences** (`EmergencyErNursingHandoffPanel`) soutient la suite opérationnelle : lecture dossier partagé, synthèse, impression sortie — **après** décision médicale.

## 7.5 Erreurs critiques à éviter

| Erreur | Risque |
|--------|--------|
| Exécution sortie **sans** orientation prestataire | Sortie non médicalement autorisée dans le dossier |
| Mauvais patient | Événement sentinelle |
| Enseignement non documenté | Responsabilité continuité soins |
| Instructions non comprises | Retour précoce, non-observance |

[CAPTURE D’ÉCRAN — Exécution de sortie]
[DIAGRAMME — Workflow sortie infirmière]

---

# 8. Éducation patient et enseignement

## 8.1 Médicaments

- Expliquer nom, dose, fréquence, effets secondaires à surveiller ;
- Vérifier compréhension (répétition, teach-back si protocole) ;
- Cocher **Instructions médicaments** / **Ordonnance** dans exécution sortie.

## 8.2 Suivi

- Date, lieu, raison du prochain rendez-vous ;
- Cocher **Suivi revu** ; documenter si incertitude.

## 8.3 Consignes de retour

- Reprendre les consignes prestataire ; **ne pas inventer** de critères de retour ;
- Cocher **Consignes de retour** ; adapter langage au patient.

## 8.4 Soins de plaie / appareils

Si applicable : cocher **Soins de plaie**, **Utilisation équipement**, **Restrictions d’activité**.

## 8.5 Communication famille / aidant

- Impliquer aidant si autorisation ;
- Cocher **Famille a verbalisé la compréhension** si pertinent.

## 8.6 Barrière linguistique

- Interprète qualifié si disponible ;
- Cocher **Interprète utilisé** ;
- Documenter dans note infirmière.

## 8.7 Refus ou non-compréhension

- Ne pas autoriser le départ silencieux si enseignement critique incompris ;
- **Signaler au prestataire selon le protocole de l’établissement** ;
- Documenter refus ou limitation de l’enseignement.

---

# 9. Admission, transfert et observation — workflow infirmier

## 9.1 Préparation admission

- Vérifier décision prestataire : Disposition **Admission / observation** + dossier admission si applicable ;
- Belongings, identité, allergies, médicaments ;
- Handoff verbal à unité receveuse selon protocole.

## 9.2 Préparation transfert

- Stabilisation selon protocole transport ;
- Documentation résumé infirmier ;
- Ordres et résultats en attente communiqués.

## 9.3 Responsabilités infirmières en observation

Sur consultation observation (`/app/encounters/{id}`) :

- Réévaluation selon protocole unité ;
- MAR et ordres ;
- Notes sortie observation infirmières (puces rapides si disponibles) ;
- Coordination avec prestataire pour clôture.

## 9.4 Handoff

Documenter : état actuel, interventions, résultats en attente, préoccupations sécurité, éducation déjà faite.

## 9.5 Effets personnels et documentation

- Vérifier effets personnels restitués ou accompagnés ;
- Copies instructions / ordonnances remises si protocole.

## 9.6 Transport

- Documenter mode de transport (ambulatoire, fauteuil, brancard, ambulance) ;
- Attente transport prolongée → réévaluation continue.

[DIAGRAMME — Admission / transfert / observation infirmière]

---

# 10. Historique longitudinal et carry-forward

## 10.1 Revue infirmière du carry-forward

Aligné **19T.1–19T.3** (Volume 2) :

- Allergies et médicaments repris du profil patient : **revérifier** avec le patient ;
- Statuts carry-forward : en attente de revue, revu, modifié, retiré — ne pas supposer « revu » sans lecture.

## 10.2 Médicaments domicile

- Confirmer liste actuelle ; signaler discordance au prestataire ;
- Risque : médicament arrêté ou nouveau non documenté.

## 10.3 Données anciennes (stale)

- Antécédents datés ou contradictoires → mise à jour ou note de discordance ;
- **Ne pas se fier au profil seul** — confirmation au chevet.

## 10.4 Profil longitudinal (19T.3)

Le profil patient aide le workflow ; l’infirmier **revérifie** au contact patient, surtout allergies et médicaments à risque.

## 10.5 Discordances infirmier / prestataire

Documenter et communiquer (verbal + note) : allergie oubliée, médicament non déclaré, antécédent corrigé.

---

# 11. Mobile et tablette — infirmier

## 11.1 Initiative responsive (19M)

Medora améliore progressivement l’usage tablette / mobile. Surfaces **relativement adaptées** au chevet :

- Réévaluation infirmière (empilement &lt; 960 px) ;
- Exécution sortie infirmière (19M.6 — champs empilés, cibles tactiles) ;
- Disposition / sortie (lecture décision prestataire).

Surfaces **limitées** sur téléphone :

- Tableau des urgences dense ;
- MAR complexe (multiples colonnes) ;
- Documentation prolongée multi-sections.

## 11.2 Recommandations

| Usage | Appareil |
|-------|----------|
| Chevet, réévaluation, vitaux rapides, exécution sortie | **Tablette** acceptable |
| Revue rapide file infirmière | **Téléphone** — consultation courte |
| Documentation longue, MAR multiples, handoff complexe | **Poste fixe / bureau** préféré |

## 11.3 Haïti — connectivité

- Enregistrer réévaluation et exécution sortie **sur serveur** dès connexion stable ;
- Brouillon local réévaluation : **relire** après reconnexion ;
- Ne pas considérer sortie complète si enregistrement serveur échoué — retry ou protocole papier de secours institutionnel.

---

# 12. Sécurité opérationnelle infirmière

| Risque | Mesure |
|--------|--------|
| **Mauvais patient — documentation** | Bandeau identité à chaque ouverture dossier ; re-vérification avant MAR et sortie |
| **Risque administration médicament** | Cinq bonnes vérifications ; allergies ; haut risque |
| **Ordres en attente cachés** | Revue régulière onglet Ordres / file infirmière |
| **Réévaluation manquée** | Planifier selon ESI ; documenter changements |
| **Enseignement sortie omis** | Checklist exécution sortie obligatoire opérationnellement |
| **Sortie sans disposition prestataire** | **Interdit** — obtenir orientation enregistrée d’abord |
| **Barrière linguistique** | Interprète ; ne pas deviner le consentement |
| **Panne / downtime** | Protocole papier institutionnel ; resaisie quand système disponible |
| **Patient agressif / perturbateur** | Sécurité équipe ; documentation factuelle ; escalade |
| **Risque chute / mobilité** | Aide au transfert ; chaises ; documentation sécurité chevet |
| **Surconfiance carry-forward** | Revérifier allergies et médicaments au chevet |
| **Interprétation résultats hors scope** | Signaler au prestataire selon protocole — ne pas diagnostiquer |

---

# 13. Résumé opérationnel rapide — checklists

## 13.1 Checklist intake infirmier

- [ ] Bon patient / bonne consultation  
- [ ] Triage et ESI revus  
- [ ] Allergies / médicaments vérifiés (carry-forward revu)  
- [ ] ABC initial documenté  
- [ ] Ordres actifs identifiés  

## 13.2 Checklist réévaluation

- [ ] Vitaux / douleur selon protocole  
- [ ] Tendance documentée  
- [ ] Réponse au traitement  
- [ ] Escalade si détérioration  
- [ ] Nouvelle séance enregistrée  

## 13.3 Checklist administration médicament

- [ ] Bon patient  
- [ ] Ordre actif vérifié  
- [ ] Allergies revues  
- [ ] Administration documentée (heure, voie)  
- [ ] Réévaluation post-médicament si requis  

## 13.4 Checklist suivi ordres

- [ ] Ordres en attente revus  
- [ ] Prélèvements / imagerie coordonnés  
- [ ] Résultats : prestataire informé selon protocole  
- [ ] Pas d’interprétation hors scope  

## 13.5 Checklist exécution sortie

- [ ] Orientation prestataire enregistrée (Disposition)  
- [ ] Identité patient confirmée  
- [ ] Instructions prestataire revues  
- [ ] Médicaments / ordonnances revus  
- [ ] Suivi et consignes de retour enseignés  
- [ ] Compréhension documentée  
- [ ] État et destination à la sortie  
- [ ] Heure sortie enregistrée  
- [ ] Exécution sortie infirmière complétée  

## 13.6 Checklist enseignement patient

- [ ] Médicaments expliqués  
- [ ] Suivi expliqué  
- [ ] Consignes de retour repassées  
- [ ] Aidant impliqué si applicable  
- [ ] Interprète si barrière linguistique  
- [ ] Instructions écrites remises si protocole  

## 13.7 Checklist handoff admission / transfert

- [ ] Décision prestataire confirmée  
- [ ] État actuel résumé  
- [ ] Résultats en attente communiqués  
- [ ] Effets personnels  
- [ ] Transport organisé  

## 13.8 Checklist anti mauvais patient

- [ ] Bandeau = patient présent  
- [ ] MRN / NIR cohérent  
- [ ] Re-vérification avant MAR  
- [ ] Re-vérification avant exécution sortie  

---

# 14. Gouvernance du chapitre

## 14.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction infirmière urgences** | Contenu workflow infirmier, exécution sortie, enseignement |
| **Référent terminologie** | [Canon](./french-terminology-canon.md) |
| **Équipe produit Medora** | Exactitude surfaces UI (sans exposer implémentation interne aux cliniciens) |

## 14.2 Revue leadership infirmier

Recommandée **annuellement** avec : lead infirmier ED, direction médicale, admin documentation, référent sortie.

## 14.3 Lien gouvernance terminologique

Termes officiels : **Exécution sortie**, **Administration de médicament**, **Réévaluation**, **Signaler au prestataire selon le protocole de l’établissement** — voir canon.

## 14.4 Formation déploiement Haïti

- Atelier : réévaluation → MAR → exécution sortie sur dossier test ;  
- Exercice : distinguer décision prestataire vs exécution infirmière ;  
- Lien Volumes 1–3 pour continuité accueil → triage → prestataire → infirmier.

## 14.5 Mises à jour

Changement MAR, exécution sortie ou carry-forward → révision chapitre + tests `frenchHandbookNursingDischargeExecution19MBookFr5.test.ts`.

## 14.6 Révision annuelle

Vérifier alignement routes, checklists, et initiative 19M responsive.

---

## Annexes

### A. Enregistrement (aperçu)

- **Réévaluation infirmière** : PATCH consultation (`nursingAssessment`) — séances append-only ;  
- **MAR** : enregistrement administration par ligne ordre ;  
- **Exécution sortie** : enregistrement unique dans évaluation infirmière — relecture après sauvegarde ;  
- **Brouillon local réévaluation** : session navigateur — ne remplace pas enregistrement serveur.

### B. Références

- [Volume 1](./handbook-fr-registration-intake.md) · [Volume 2](./handbook-fr-triage-clinical-intake.md) · [Volume 3](./handbook-fr-provider-workflow-documentation.md)  
- [Canon terminologique](./french-terminology-canon.md)  
- `docs/ui/mobile-tablet-responsiveness-audit-19M1.md`  
- Carry-forward : architecture 19T.1–19T.3

### C. Placeholders visuels

- [CAPTURE D’ÉCRAN — Workflow infirmier]  
- [CAPTURE D’ÉCRAN — Réévaluation infirmière]  
- [CAPTURE D’ÉCRAN — Administration médicament]  
- [CAPTURE D’ÉCRAN — Exécution de sortie]  
- [DIAGRAMME — Workflow sortie infirmière]  
- [DIAGRAMME — Admission / transfert / observation infirmière]

---

*Fin du Volume 4 — M-BOOK.FR.5*


\newpage



<!-- SECTION: Volume 5 — Auxiliaires -->

# Volume 5 — Pharmacie, laboratoire et imagerie

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.6  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Pharmacien, technicien de laboratoire, technicien en imagerie, superviseurs auxiliaires, formateurs  
**Prérequis:** [Volume 1](./handbook-fr-registration-intake.md) · [Volume 2](./handbook-fr-triage-clinical-intake.md) · [Volume 3](./handbook-fr-provider-workflow-documentation.md) · [Volume 4](./handbook-fr-nursing-discharge-execution.md)  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 5 — Pharmacie, laboratoire et imagerie |
| Routes principales | `/app/pharmacy-worklist`, `/app/lab-worklist`, `/app/rad-worklist`, `/app/pharmacy` (hub inventaire) |
| Détail commande | `/app/pharmacy-worklist/commande/{orderId}`, `/app/lab-worklist/commande/{orderId}`, `/app/rad-worklist/commande/{orderId}` |
| Rôles cibles | `PHARMACY`, `LAB`, `RADIOLOGY`, `ADMIN` |
| Architecture liée | Files auxiliaires MedoraCard · Responsive 19M.7 · Synchronisation en attente (connectivité) |
| Révision recommandée | Annuelle ou après évolution files / résultats |

---

# 1. Introduction aux workflows auxiliaires

## 1.1 Rôle des services auxiliaires dans Medora

Les **services auxiliaires** (pharmacie, laboratoire, imagerie) assurent dans Medora :

- La **visibilité opérationnelle** des ordres prescrits par le prestataire ;
- Le **suivi de statut** (accusé de réception, en cours, complété, résultat disponible) ;
- La **coordination** avec infirmier(ère) et prestataire pour exécution et résultats ;
- La **documentation** des actes auxiliaires dans le périmètre produit (dispensation enregistrée, saisie résultat).

## 1.2 Relation avec prestataire et infirmier

| Rôle | Contribution |
|------|--------------|
| **Prestataire (Volume 3)** | Prescription / demande, interprétation clinique, décision thérapeutique |
| **Infirmier (Volume 4)** | Prélèvement, transport, administration, signalement résultats selon protocole |
| **Auxiliaire (ce volume)** | File de travail, exécution départementale, saisie résultat, dispensation documentée |

## 1.3 Coordination opérationnelle

Medora relie ordres et résultats au **dossier consultation** — les auxiliaires voient les identifiants patient **limités** sur les files (nom, MRN/NIR, date de naissance, sexe selon rôle) pour protéger la confidentialité tout en permettant l’identification sécuritaire.

## 1.4 Cycle ordre / résultat (aperçu)

```
Prestataire signe l'ordre
        ↓
Visible sur file département (pharmacie / labo / imagerie)
        ↓
Accusé de réception → En cours → Complété
        ↓
(Labo / imagerie) Résultat saisi → Accusé de lecture clinique (RN / prestataire selon droits)
        ↓
(Pharmacie) Dispensation enregistrée → Administration infirmière (MAR, Volume 4)
```

## 1.5 Objectifs sécurité patient

| Objectif | Moyen Medora |
|----------|--------------|
| Traçabilité | Statuts ordre, horodatages, audit des actions file |
| Identification | Identifiants limités + confirmation au détail commande |
| Visibilité | Files avec priorité, parcours (ED vs soins urgents), badges opérationnels |
| Escalade | Communication selon politique établissement — pas de décision clinique auto |

## 1.6 Attentes de communication

Les auxiliaires **communiquent** avec infirmier et prestataire selon protocole local (verbal, téléphone, page) — Medora **documente** le statut ; il ne remplace pas les canaux d’urgence institutionnels.

## 1.7 Responsabilité et politiques institutionnelles

> **Medora-S soutient la coordination opérationnelle. Il ne remplace pas les politiques institutionnelles, la pharmacie clinique, les normes de laboratoire ni la gouvernance radiologique de l’établissement.**

Medora n’est **pas** un système pharmacie hospitalier complet (ERP stock national, robot dispense, contrôle substances, etc.). Le périmètre actuel couvre : **files de travail**, **workflow statut ordre**, **enregistrement dispensation**, **saisie résultats**, **inventaire pharmacie de base** — selon modules déployés.

---

# 2. Workflow pharmacie — vue d’ensemble

## 2.1 Périmètre opérationnel honnête

| Inclus (MVP Medora) | Hors périmètre / limité |
|---------------------|-------------------------|
| File pharmacie (`/app/pharmacy-worklist`) | ERP pharmacie entreprise |
| Accusé / démarrage / complétion ligne ordre | Robotisation dispense |
| Enregistrement dispensation par ligne | Politique pharmacie institutionnelle complète |
| Hub inventaire (`/app/pharmacy`) — stock, alertes | Intégration grossiste / NDC national |
| Impression ordonnance (Rx) si workflow local | Substitution automatique médicament |

**File canonique :** préférer **`/app/pharmacy-worklist`** (cartes MedoraCard, responsive 19M.7) plutôt que le hub legacy pour la gestion de file.

## 2.2 Séquence opérationnelle

```
Ordre médicament signé (prestataire)
        ↓
Apparition file pharmacie (+ lignes synchronisation en attente si réseau instable)
        ↓
Revue file : priorité, parcours ED/UC, médicament à haut risque
        ↓
Accusé de réception → Démarrage → Complétion (workflow statut)
        ↓
Détail commande → Enregistrer dispensation
        ↓
Infirmier administre (MAR, Volume 4) — distinct de la dispensation pharmacie
```

[DIAGRAMME — Workflow pharmacie]

## 2.3 File pharmacie — concepts

| Concept | Description |
|---------|-------------|
| **File de travail** | Liste ordonnée des lignes médicament en attente d’action pharmacie |
| **Priorité** | Urgent / routine — badge visuel sur carte |
| **Parcours** | Urgences vs soins urgents vs ambulatoire (pathway) |
| **Statut ligne** | Accusé, en cours, complété, annulé |
| **Dispensé** | Ligne avec enregistrement dispensation — relecture avant doublon |
| **Synchronisation en attente** | Ordre créé localement, pas encore confirmé serveur — traiter avec prudence |

## 2.4 Priorisation file

1. Priorité **urgente** et patients haute acuité (ESI bas si visible) ;  
2. Médicaments à **haut risque** (alerte produit) ;  
3. Ordres anciens non traités (retard) ;  
4. Routine.

## 2.5 ED vs soins urgents (UC)

| Contexte | Considération opérationnelle |
|----------|------------------------------|
| **Urgences** | Délais courts ; coordination infirmier box ; disponibilité stock ED |
| **Soins urgents** | Parcours ambulatoire ; patient peut attendre en salle ; ordonnance sortie possible |

## 2.6 Disponibilité médicament

- Vérifier inventaire hub si module actif ;  
- Documenter indisponibilité et **communiquer** avec prestataire / infirmier selon protocole ;  
- Ne pas marquer complété sans dispensation réelle ou décision documentée.

## 2.7 Workflow synchronisation en attente

Lorsque la connectivité est faible (Haïti) :

- Les cartes **synchronisation en attente** signalent des ordres non encore confirmés serveur ;  
- **Attendre confirmation** ou vérifier avec prescripteur avant dispensation définitive ;  
- Ne pas supposer qu’un ordre pending sync est valide cliniquement.

## 2.8 Communication pharmacie ↔ équipe soignante

| Situation | Action |
|-----------|--------|
| Médicament indisponible | Informer prestataire / infirmier |
| Dose / voie ambiguë | Clarification avant dispense |
| Allergie signalée produit | Ne pas dispenser ; escalade |
| Doublon suspect | Revue ordres actifs |

## 2.9 Escalade

- Médicament contrôlé / haut risque sans protocole local clair ;  
- Discordance identité patient ;  
- Ordre annulé encore visible — vérifier statut avant action.

[CAPTURE D’ÉCRAN — File pharmacie]

---

# 3. Workflow laboratoire — vue d’ensemble

## 3.1 Séquence opérationnelle

```
Ordre labo signé
        ↓
Visible file laboratoire (/app/lab-worklist)
        ↓
Coordination prélèvement (infirmier / labo selon protocole)
        ↓
Accusé de réception → En cours → Complété
        ↓
Saisie résultat (détail commande)
        ↓
Marquage critique si applicable (labo) + notification selon politique établissement
        ↓
Accusé de lecture clinique (prestataire / infirmier selon droits)
```

[DIAGRAMME — Workflow laboratoire]

## 3.2 File laboratoire — concepts

| Concept | Description |
|---------|-------------|
| **File de travail** | Lignes analyses en attente |
| **Barre résumé** | Compteurs opérationnels (en attente, en cours, résultats non lus) |
| **Filtres / tri** | Priorité, retard, statut — outils barre opérationnelle |
| **Badges opérationnels** | Retard, résultat disponible non accusé, etc. |
| **Synchronisation en attente** | Résultat ou ordre local non synchronisé |

## 3.3 Coordination prélèvement

- L’infirmier ou le technicien prélève selon protocole ;  
- **Étiquetage échantillon** : identité patient — risque sentinelle si erreur ;  
- Medora documente l’ordre — l’étiquette physique reste responsabilité terrain.

## 3.4 États opérationnels

Voir section 5 (cycle de vie). Sur la file : statut lisible en français via libellés produit.

## 3.5 Workflow résultat

1. Ouvrir **Voir le détail** → page commande ;  
2. Saisir résultat (texte / données structurées selon type) ;  
3. Indiquer valeur **critique** si protocole labo et produit le permettent ;  
4. Enregistrer — résultat visible dossier consultation ;  
5. **Notification clinique** selon politique établissement (verbal / protocole critique).

## 3.6 Délais (turnaround)

- Surveiller badges **retard** sur file ;  
- Escalade opérationnelle si délai impacte soins urgents — communication infirmier / prestataire.

## 3.7 Analyses répétées / additionnelles

- Nouvel ordre prestataire = nouvelle ligne file ;  
- Ne pas modifier un résultat finalisé sans protocole correction institutionnelle.

## 3.8 Attentes documentaires

- Statuts ordre à jour ;  
- Résultat saisi complet ;  
- Critique signalé + trace communication si protocole l’exige.

[CAPTURE D’ÉCRAN — File laboratoire]

---

# 4. Workflow imagerie — vue d’ensemble

## 4.1 Séquence opérationnelle

```
Ordre imagerie signé
        ↓
Visible file imagerie (/app/rad-worklist)
        ↓
Coordination examen (transport patient, priorité ED)
        ↓
Accusé de réception → En cours → Complété
        ↓
Saisie compte-rendu / résultat
        ↓
Disponibilité résultat dossier → accusé lecture clinique
```

[DIAGRAMME — Workflow imagerie]

## 4.2 File imagerie — concepts

Même architecture que laboratoire : cartes MedoraCard, filtres, badges opérationnels, résumé file, responsive 19M.7.

## 4.3 Priorisation et débit urgences

| Facteur | Priorité |
|---------|----------|
| Statut urgent / ESI bas | Examen rapide |
| Suspicion pathologie aiguë (clinique) | Coordination verbal prestataire |
| Patient instable | Stabilisation avant transport si protocole |

## 4.4 Coordination transport

- Infirmier / brancardiers selon site ;  
- Documenter retards prolongés — communication prestataire si impact plan thérapeutique.

## 4.5 Imagerie en attente vs complétée

- **En attente** : patient pas encore examiné ou examen non démarré ;  
- **En cours** : examen réalisé partiellement ou en lecture ;  
- **Complété / résultat** : compte-rendu disponible ou saisi.

## 4.6 Escalade imagerie haute acuité

- Retard prolongé sur CT / US urgent ;  
- Résultat préliminaire oral si protocole radiologie ;  
- Toujours **selon la politique de l’établissement** — Medora ne page pas automatiquement le prestataire.

[CAPTURE D’ÉCRAN — File imagerie]

---

# 5. Cycle de vie ordre / résultat

## 5.1 Concepts opérationnels Medora

| Statut (concept) | Signification opérationnelle |
|------------------|------------------------------|
| **Brouillon** | Ordre créé, non signé — invisible auxiliaires |
| **Signé** | Prescription active — apparaît sur files |
| **Accusé de réception** | Département a pris connaissance |
| **En cours** | Travail démarré (prélèvement, examen, préparation) |
| **Complété** | Acte auxiliaire terminé côté département |
| **Résultat disponible** | Labo / imagerie : résultat saisi |
| **Accusé de lecture** | Clinicien a accusé réception du résultat |
| **Annulé** | Ordre annulé — ne pas exécuter |
| **Synchronisation en attente** | Donnée locale non confirmée serveur |
| **Ordre répété** | Nouvelle ligne — traiter indépendamment |

## 5.2 Rôle des auxiliaires

Les auxiliaires **coordonnent la visibilité et l’exécution** :

- Mettre à jour statuts honnêtement ;  
- Saisir résultats complets ;  
- Enregistrer dispensation ;  
- Signaler retards et discordances.

## 5.3 Interprétation clinique — limitation explicite

> **L’interprétation clinique et la décision thérapeutique finale restent des responsabilités du prestataire clinique, selon la politique de l’établissement.**

Les techniciens et pharmaciens **ne substituent pas** le jugement médical dans Medora — ils exécutent et documentent dans leur scope professionnel et institutionnel.

## 5.4 Coordination inter-départements

| Lien | Coordination |
|------|--------------|
| Pharmacie → Infirmier | Médicament prêt / indisponible |
| Labo → Infirmier | Prélèvement, résultat disponible |
| Imagerie → Infirmier | Transport, examen terminé |
| Tous → Prestataire | Résultat critique, retard majeur, question ordre |

[CAPTURE D’ÉCRAN — Ordres en attente]

---

# 6. Résultats critiques et sensibilisation à l’escalade

## 6.1 Sensibilisation (pas de politique institutionnelle)

Ce chapitre **ne définit pas** la politique de résultats critiques de l’établissement. Il rappelle les attentes opérationnelles Medora :

- Le labo peut marquer une valeur **critique** (produit) ;  
- L’imagerie documente résultats significatifs via saisie standard ;  
- **Notification urgente** au prestataire : **selon la politique de l’établissement** (appel, double lecture, protocole oral).

## 6.2 Communication urgente

| Étape | Attente |
|-------|---------|
| Identification | Confirmer bon patient, bon résultat |
| Notification | Contact prestataire / infirmier selon protocole — ne pas se limiter à la saisie Medora |
| Documentation | Trace dans dossier + note communication si protocole |
| Suivi | Vérifier accusé de lecture clinique |

## 6.3 Résultat retardé

- Badge retard sur file labo / imagerie ;  
- Escalade si impact soins — communication prestataire et infirmier ;  
- Documenter cause opérationnelle (volume, panne analyseur, transport).

## 6.4 Panne / downtime

- Protocole papier ou téléphone institutionnel ;  
- Resaisie Medora quand système disponible ;  
- Vérifier doublons à la reconnexion.

## 6.5 Attentes documentaires

- Résultat saisi ;  
- Flag critique si applicable ;  
- Communication critique tracée **selon protocole local** (hors détail implémentation Medora).

---

# 7. Sécurité dispensation et résultats

## 7.1 Pharmacie

| Risque | Mesure |
|--------|--------|
| **Dispensation mauvais patient** | Vérifier nom, MRN/NIR, DOB au détail commande |
| **Discordance médicament** | Comparer ordre, étiquette, dispense enregistrée |
| **Allergie** | Alertes produit — vérification indépendante |
| **Médicament haut risque** | Double vérification selon protocole pharmacie |
| **Ordres en attente cachés** | Revue file complète ; pending sync |
| **Doublon ordre** | Rechercher lignes similaires actives avant dispense |

## 7.2 Laboratoire

| Risque | Mesure |
|--------|--------|
| **Échantillon mauvais patient** | Deux identifiants minimum à l’étiquetage |
| **Résultat retardé** | Badges retard ; communication clinique |
| **Doublon analyse** | Revue ordres actifs |
| **Étiquetage** | Protocole local — Medora ne remplace pas l’étiquette tube |

## 7.3 Imagerie

| Risque | Mesure |
|--------|--------|
| **Examen mauvais patient** | Confirmation identité avant examen |
| **Doublon imaging** | Revue ordres récents |
| **Retard transport** | Suivi patient ED ; réévaluation infirmière |
| **Imagerie en attente** | File + communication si boarding prolongé |

---

# 8. Mobile et tablette — workflows auxiliaires

## 8.1 Initiative 19M.7 (files auxiliaires)

| Largeur | Comportement files |
|---------|-------------------|
| &lt; 768 px | Cartes empilées, cibles tactiles ≥ 44 px |
| 768–1023 px | Grille 2 colonnes labo / imagerie ; pharmacie cartes |
| ≥ 1024 px | Disposition dense bureau |

Files labo et imagerie : barre filtres empilée mobile ; actions **Voir le détail** accessibles au toucher.

## 8.2 Recommandations appareil

| Usage | Appareil |
|-------|----------|
| Revue file, accusé, démarrage rapide | **Tablette** acceptable |
| Revue file urgente au téléphone | **Téléphone** — consultation courte |
| Saisie résultat longue, dispense détaillée, inventaire | **Bureau** préféré |
| Coordination prolongée multi-commandes | **Poste fixe** |

> **Tablette acceptable pour revue de file ; bureau préféré pour coordination opérationnelle prolongée.**

## 8.3 Haïti — connectivité

- Files auto-rafraîchies (~10 s) — vérifier statut après reconnexion ;  
- Lignes **synchronisation en attente** : ne pas clôturer sans confirmation ;  
- En panne : protocole auxiliaire papier puis resaisie.

---

# 9. Communication opérationnelle

## 9.1 Avec le prestataire

- Question ordre ambigu, médicament indisponible, résultat critique, retard majeur ;  
- Medora montre statut — **l’appel verbal reste souvent requis** pour l’urgence.

## 9.2 Avec l’infirmier

- Médicament prêt à administrer ;  
- Prélèvement nécessaire ;  
- Transport imagerie ;  
- Résultat disponible impactant soins immédiats.

## 9.3 Handoff et relève

- Relève de quart : revue file, pending sync, résultats non accusés ;  
- Brief oral : patients ED haute priorité, retards critiques.

## 9.4 Résultats en attente côté clinique

- Auxiliaire saisit résultat → infirmier / prestataire **accusent lecture** selon droits ;  
- Badge résultat non accusé sur tableau urgences (visibilité clinique) — auxiliaire peut rappeler selon protocole.

## 9.5 Observation / admission

- Ordres actifs suivent le patient en observation ;  
- Coordination avec Volume 4 pour continuité MAR et prélèvements.

Focus : **communication workflow**, pas architecture messagerie interne cachée.

---

# 10. Résumé opérationnel rapide — checklists

## 10.1 Checklist file pharmacie

- [ ] File canonique `/app/pharmacy-worklist` ouverte  
- [ ] Priorité et parcours revus  
- [ ] Pending sync identifié  
- [ ] Haut risque / allergie vérifiés  
- [ ] Statuts mis à jour  
- [ ] Dispensation enregistrée avant « complété » si protocole  

## 10.2 Checklist workflow laboratoire

- [ ] Bon patient / bon ordre  
- [ ] Accusé de réception  
- [ ] Prélèvement étiqueté selon protocole  
- [ ] Statut en cours honnête  
- [ ] Résultat saisi complet  
- [ ] Critique signalé + notification selon politique établissement  

## 10.3 Checklist workflow imagerie

- [ ] Priorité ED revue  
- [ ] Transport coordonné  
- [ ] Identité confirmée avant examen  
- [ ] Statuts à jour  
- [ ] Compte-rendu saisi  
- [ ] Retard escaladé si nécessaire  

## 10.4 Checklist résultats en attente

- [ ] Résultats saisis non laissés en brouillon  
- [ ] Accusé lecture clinique suivi  
- [ ] Pending sync résolu  
- [ ] Doublons vérifiés  

## 10.5 Checklist escalade résultat critique

- [ ] Bon patient / bon résultat  
- [ ] Flag critique si produit labo  
- [ ] Prestataire / infirmier contacté **selon la politique de l’établissement**  
- [ ] Communication documentée si protocole  
- [ ] Accusé de lecture obtenu  

## 10.6 Checklist anti mauvais patient

- [ ] Nom + identifiant cohérents  
- [ ] DOB vérifiée au détail  
- [ ] Re-vérification avant dispense / prélèvement / examen  

## 10.7 Checklist auxiliaire — downtime

- [ ] Protocole papier activé  
- [ ] Communication verbale trace  
- [ ] Resaisie sans doublon à reconnexion  
- [ ] Pending sync revu  

---

# 11. Gouvernance du chapitre

## 11.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction pharmacie** | Contenu dispensation, sécurité médicament |
| **Direction laboratoire / imagerie** | Workflow résultats, escalade |
| **Référent terminologie** | [Canon](./french-terminology-canon.md) — File pharmacie, Liste laboratoire / imagerie |
| **Équipe produit Medora** | Exactitude routes et statuts UI |

## 11.2 Revue leadership auxiliaire

Recommandée **annuellement** : pharmacien chef, chef labo, chef imagerie, direction médicale, admin exploitation.

## 11.3 Lien terminologie

Harmonisation progressive : **File** pour queues opérationnelles (cf. M-BOOK.FR.1). Clés : `nav.pharmacyQueue`, `nav.labWorklist`, `nav.radWorklist`.

## 11.4 Formation déploiement Haïti

- Atelier : parcourir les 3 files sur dossier test ;  
- Exercice pending sync + reconnexion ;  
- Rappel : Medora ≠ ERP pharmacie complet ; protocoles locaux prime.

## 11.5 Adaptation Haïti

- Connectivité intermittente : pending sync, rafraîchissement file, protocole papier ;  
- Effectifs réduits : priorisation file, communication verbal explicite ;  
- Stock limité : hub inventaire + communication indisponibilité.

## 11.6 Révision annuelle

Mettre à jour si changement statuts ordre, 19M.7, ou périmètre dispensation.

---

## Annexes

### A. Actions file (aperçu)

- `POST /orders/items/:id/acknowledge` — Accusé de réception  
- `POST /orders/items/:id/start` — Démarrage  
- `POST /orders/items/:id/complete` — Complétion  
- Pharmacie dispense : enregistrement via détail commande  
- Labo / imagerie résultat : saisie via détail commande  

### B. RBAC (aperçu)

| Rôle | Accès typique |
|------|---------------|
| PHARMACY | File pharmacie, hub pharmacie |
| LAB | File laboratoire |
| RADIOLOGY | File imagerie |
| ADMIN | Toutes files |

Identifiants patient **limités** sur files pour rôles auxiliaires.

### C. Références

- [Volumes 1–4](./handbook-fr-registration-intake.md)  
- `docs/ui/cross-device-qa-checklist-19M8.md` (19M.7)  
- `docs/ui/mobile-tablet-responsiveness-audit-19M1.md`  
- [Inventaire workflows](./french-workflow-inventory.md)

### D. Placeholders visuels

- [CAPTURE D’ÉCRAN — File pharmacie]  
- [CAPTURE D’ÉCRAN — File laboratoire]  
- [CAPTURE D’ÉCRAN — File imagerie]  
- [CAPTURE D’ÉCRAN — Ordres en attente]  
- [DIAGRAMME — Workflow pharmacie]  
- [DIAGRAMME — Workflow laboratoire]  
- [DIAGRAMME — Workflow imagerie]

---

*Fin du Volume 5 — M-BOOK.FR.6*


\newpage



<!-- SECTION: Volume 6 — Orientation / ROI -->

# Volume 6 — Orientation, admission, transfert et dévoilement de dossier

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.7  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Prestataires, infirmiers, administrateurs, dossiers médicaux, formateurs  
**Prérequis:** [Volumes 1–5](./handbook-fr-registration-intake.md) (accueil → auxiliaires)  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 6 — Orientation, admission, transfert et dévoilement de dossier |
| Routes principales | Dossier actif urgences (onglet Disposition), `/app/encounters/{id}`, `/app/hospitalisation`, `/app/admin/roi` |
| Composants clés | Panneau Disposition (`EmergencyDispositionPanel`), exécution sortie infirmière, dossier admission, ROI admin |
| Architecture liée | Responsive disposition 19M.6 · Export dossier (Phase 5F) · ROI (Phase 5G) |
| Révision recommandée | Annuelle ou après évolution disposition / ROI / observation |

---

## Distinction terminologique canonique

| Terme | Signification Medora |
|-------|---------------------|
| **Orientation** | **Décision clinique d’issue** — domicile, observation, admission, transfert, LAMA, LWBS, etc. |
| **Disposition** | **Workflow opérationnel / panneau dossier** — zone où l’orientation est enregistrée, instructions, planification partagée, clôture |

> **Orientation = décision clinique. Disposition = panneau et workflow opérationnel associés.**

Ne pas utiliser « disposition » seul lorsque l’on parle de la **décision médicale** — préférer **orientation**.

---

# 1. Introduction au workflow disposition

## 1.1 Objectif opérationnel

Les workflows **orientation / disposition** Medora permettent de :

- Documenter la **décision d’issue** du patient (orientation) ;
- Coordonner **sortie**, **observation**, **admission** ou **transfert** ;
- Assurer **continuité des soins**, communication et traçabilité ;
- Lier documentation prestataire, exécution infirmière et clôture consultation.

## 1.2 Rôles

| Rôle | Responsabilité |
|------|----------------|
| **Prestataire** | Réévaluation, orientation clinique, documentation MDM / instructions, enregistrement panneau Disposition |
| **Infirmier(ère)** | Réévaluation, exécution sortie, handoff admission/transfert, enseignement patient |
| **Administration / dossiers** | ROI (dévoilement dossier), export figé, surveillance conformité |
| **Accueil** | Départ patient, rendez-vous, orientation logistique selon protocole local |

## 1.3 Réévaluation avant orientation

Aucune orientation ne devrait être enregistrée sans **réévaluation clinique** proportionnée à l’acuité — documentée par prestataire et/ou infirmier (Volumes 3–4).

## 1.4 Continuité des soins

L’orientation doit être **cohérente** avec :

- Le texte du dossier (MDM, consignes) ;
- Les résultats disponibles ou explicitement en attente ;
- La compréhension patient / aidant ;
- Le handoff vers observation, admission ou établissement receveur.

## 1.5 Attentes documentation / communication

Documenter : raisonnement, incertitude résiduelle, suivi, consignes de retour, planification partagée. Communiquer verbalement selon protocole pour cas critiques, refus, transfert instable.

## 1.6 Responsabilité et politiques institutionnelles

> **Medora-S soutient le workflow et la documentation. Il ne remplace pas le jugement du prestataire, la politique d’admission institutionnelle ni la politique de transfert de l’établissement.**

---

# 2. Workflow congé et sortie

## 2.1 Philosophie de sortie

La sortie doit refléter :

- **Réévaluation finale** ;
- **Compréhension patient** (ou aidant / interprète) ;
- **Suivi planifié** et **consignes de retour** ;
- **Incertitude non résolue** lorsque applicable — sans fausse certitude.

## 2.2 Séquence opérationnelle

```
Réévaluation clinique (prestataire + infirmier)
        ↓
Décision d'orientation clinique (sortie à domicile ou autre)
        ↓
Planification partagée + suivi + consignes de retour (texte dossier)
        ↓
Documentation de sortie prestataire (MDM, instructions)
        ↓
Enregistrement orientation dans panneau Disposition (urgences)
        ↓
Exécution sortie infirmière (Volume 4) — distincte de la décision médicale
        ↓
Départ patient + clôture consultation selon protocole
        ↓
Documentation complète
```

[DIAGRAMME — Workflow congé]

## 2.3 Distinction fondamentale

| Niveau | Responsable | Medora |
|--------|-------------|--------|
| **Orientation / documentation sortie prestataire** | Prestataire | MDM, instructions, **Enregistrer la décision d'orientation** (Disposition) |
| **Exécution sortie infirmière** | Infirmier(ère) | Vérification, enseignement, destination, heure — **sans créer la décision médicale** |

> **L'infirmier ne crée pas la décision clinique de sortie du prestataire ; il confirme et exécute le processus opérationnel de sortie.**

## 2.4 Planification partagée et famille

Documenter ce qui a été **explié** et **compris** — pas seulement ce qui a été dicté. Impliquer aidant si autorisation et protocole.

## 2.5 Résultats en attente

Si résultats critiques ou décisionnels manquent :

- Documenter l’**attente** et le plan ;
- Ne pas présenter une sortie comme « tout résolu » si incertitude persiste ;
- Communication **selon la politique de l’établissement**.

## 2.6 Refus, LAMA, LWBS

| Situation | Orientation opérationnelle |
|-----------|-------------------------|
| **LAMA / contre avis médical** | Orientation enregistrée ; documentation risques expliqués |
| **LWBS / parti sans être vu** | Protocole local ; traçabilité tableau / dossier |
| **Refus soins partiel** | Documenter portée du refus ; réévaluation si changement |

## 2.7 Deux niveaux dans Medora (rappel)

| Niveau | Où |
|--------|-----|
| **Narratif** | Champs MDM, instructions, intelligence motif (Volume 3) |
| **Opérationnel** | Onglet **Disposition (urgences)** — orientation enregistrée |

[CAPTURE D’ÉCRAN — Workflow disposition]
[CAPTURE D’ÉCRAN — Exécution de sortie]

---

# 3. Workflow observation

## 3.1 Objectif opérationnel

**Observation et court séjour** (type consultation `INPATIENT` en UI : « Observation et court séjour ») permet une **surveillance prolongée** sans équivaloir automatiquement à une admission hospitalière complète.

> **Observation ≠ admission automatique.**

## 3.2 Décision et documentation

- Prestataire documente **justification d’observation** (texte MDM) ;
- Orientation **Admission / observation (court séjour)** dans panneau Disposition ;
- Dossier admission structuré sur consultation si workflow admission activé (prestataire).

## 3.3 Réévaluation en observation

- Réévaluations prestataire et infirmière selon protocole unité ;
- Signes vitaux, douleur, réponse traitement ;
- Badges séjour prolongé / vitaux anciens sur chrome observation si applicable.

## 3.4 Séjour prolongé aux urgences vs observation

| Contexte | Attention |
|----------|-----------|
| **Boarding ED** | Patient orienté observation mais lit non disponible — documenter délai, réévaluer |
| **Unité observation** | Suivi MAR, ordres, sortie observation |

## 3.5 Résultats en attente

Coordonner avec Volume 5 (labo/imagerie) — ne pas clôturer observation sans plan pour résultats décisionnels si protocole l’exige.

## 3.6 Transition

Depuis observation : **sortie**, **admission** (si escalade), ou **transfert** — nouvelle orientation documentée.

Routes : `/app/encounters/{id}`, tableau **`/app/hospitalisation`**.

[CAPTURE D’ÉCRAN — Observation]

---

# 4. Workflow admission

## 4.1 Séquence opérationnelle

```
Décision d'admission (orientation clinique)
        ↓
Documentation justification + dossier admission (prestataire)
        ↓
Enregistrement orientation Admission / observation (Disposition)
        ↓
Communication service receveur / lit
        ↓
Coordination placement (box → unité)
        ↓
Handoff infirmier + résultats en attente
        ↓
Transition de soins
```

[DIAGRAMME — Workflow admission/transfert]

## 4.2 Philosophie justification admission

Documenter **pourquoi** le patient ne peut être sorti en sécurité : incapacité sortie sûre, besoin monitoring/IV, social si pertinent au plan clinique — **incertitude acceptable**.

## 4.3 Coordination lit / placement

Medora documente la décision — **l’attribution lit** reste opération hospitalière locale. Documenter **boarding** et délais si impact soins.

## 4.4 Handoff infirmier

- État actuel, interventions, allergies, médicaments ;
- Résultats en attente ;
- Enseignement déjà réalisé ;
- Effets personnels.

## 4.5 Escalade

- Détérioration avant placement ;
- Refus lit / saturation unité ;
- Discordance identité ou dossier incomplet.

## 4.6 Résultats en attente

Communiquer au service receveur les analyses/imagerie en cours — **selon protocole handoff**.

[CAPTURE D’ÉCRAN — Admission]

---

# 5. Workflow transfert

## 5.1 Objectif opérationnel

Transférer le patient vers **un autre établissement** ou niveau de soins avec documentation, stabilité et acceptation selon protocole local.

## 5.2 Séquence

```
Décision transfert + justification (prestataire)
        ↓
Communication établissement / prestataire receveur
        ↓
Documentation transfert (texte + orientation Transfert)
        ↓
Coordination transport + équipe
        ↓
Handoff + dossier / synthèse disponible
        ↓
Départ documenté
```

## 5.3 Sensibilisation EMTALA (sans conseil juridique)

Dans certains contextes réglementaires (ex. États-Unis), des règles **EMTALA** encadrent transfert et stabilisation. **Ce manuel ne fournit pas de conseil juridique.** Suivre **politique institutionnelle** et counsel local. Medora peut héberger champs complémentaires EMTALA selon déploiement — formation locale requise.

## 5.4 Dossier / paquet transfert

- Synthèse consultation, résultats, imagerie pertinente ;
- Export ou impression selon protocole — voir section export (consultation **clôturée** pour instantané figé).

## 5.5 Patient instable

**Escalade immédiate** — ne pas transférer sans stabilisation si protocole l’interdit. Documentation contemporaine.

## 5.6 Retards transport

Réévaluation infirmière continue ; communication prestataire si délai prolongé.

## 5.7 Résultats en attente

Documenter ce qui est **connu** vs **en attente** pour l’établissement receveur.

---

# 6. Dévoilement de dossier (ROI)

## 6.1 Définition et objectif

**ROI** = **Dévoilement de dossier (ROI)** — workflow **administratif** pour demander, examiner, approuver et **exécuter** la communication contrôlée de dossier patient à un destinataire autorisé.

Route principale : **`/app/admin/roi`** (réservé **ADMIN** établissement).

## 6.2 Périmètre Medora (honnête)

| Inclus | Limité / absent |
|--------|-----------------|
| Création demande (patient, consultation liée, type, objet) | Envoi automatique courriel / fax externe |
| Approbation, refus, annulation | Portail patient self-service complet |
| Exécution liée à **instantané export** consultation clôturée | Remplacement counsel juridique |
| Audit des actions (métadonnées sans PHI inutile) | Politique ROI locale — **établissement responsable** |

> **Les workflows ROI suivent la politique institutionnelle et juridique de l'établissement. Medora fournit traçabilité et outils — pas l'interprétation légale.**

## 6.3 Types de demande (produit)

- Demande patient ;
- Assurance ;
- Juridique / tribunal ;
- Régulateur / MSPP ;
- Audit interne.

## 6.4 Cycle de vie demande ROI

```
Création demande (ADMIN)
        ↓
Examen / approbation ou refus
        ↓
( Si approuvée ) Exécution — liaison instantané export consultation clôturée
        ↓
Statut Exécutée — aperçu HTML parcours ROI
        ↓
Remise au destinataire selon protocole hors produit (courrier, remise sécurisée, etc.)
```

Statuts visibles : Approuvée, Exécutée, Refusée, Annulée (selon workflow).

## 6.5 Rôles

| Acteur | Action |
|--------|--------|
| **Admin établissement** | Créer, approuver, refuser, annuler, exécuter |
| **Personnel clinique** | Ne gère pas ROI — orienter vers admin / dossiers médicaux |
| **Opérateur plateforme** | Surveillance agrégée (`/app/admin/roi-monitoring`) — compteurs sans PHI |

## 6.6 Gouvernance et audit (aperçu)

- Actions ROI journalisées ;
- Métadonnées audit **sans** noms/MRN/texte clinique dans logs ROI ;
- En panne audit / intégrité : **ne pas exécuter** ROI jusqu’à résolution (runbook exploitation).

## 6.7 Demandes externes

Vérifier **identité demandeur**, **autorisation**, **périmètre minimum nécessaire** — **selon politique institutionnelle**. Medora enregistre l’objet interne ; la validation légale reste humaine.

[CAPTURE D’ÉCRAN — ROI]
[DIAGRAMME — Workflow ROI]

---

# 7. Export dossier et instantané — sensibilisation

## 7.1 Objectif opérationnel (Phase 5F)

L’**export dossier** Medora produit un **instantané figé** d’une consultation **clôturée** — support pour continuité, transfert, conformité et exécution ROI.

## 7.2 Philosophie instantané immuable

- L’instantané **ne change pas** après création ;
- Reflète l’état du dossier **au moment de la clôture / export** ;
- Les modifications ultérieures du dossier live **ne mettent pas à jour** l’instantané existant.

## 7.3 Formats opérationnels

- **JSON** — échange structuré ;
- **HTML** — lecture humaine, aperçu ROI ;
- Impression / PDF selon navigateur et protocole local.

## 7.4 Vérification opérationnelle

Avant remise ou exécution ROI :

- Confirmer **bon patient**, **bonne consultation** ;
- Consultation **clôturée** ;
- Relire aperçu HTML — sections attendues présentes ;
- Résultats encore en attente au moment clôture : **visibles comme tels** dans l’instantané ou documentés en amont.

## 7.5 Ce que ce chapitre n’expose pas

Pas de détail sur : empreintes cryptographiques, schémas internes, métadonnées audit techniques, clés de signature — réservés exploitation / conformité IT.

## 7.6 Panne durée / intégrité

Si création instantané ou exécution ROI échoue : **stop**, protocole papier institutionnel, incident IT — ne pas contourner les garde-fous.

---

# 8. Sécurité opérationnelle disposition et ROI

## 8.1 Disposition / sortie / admission / transfert

| Risque | Mesure |
|--------|--------|
| **Sortie avant réévaluation** | Checklist réévaluation ; cohérence texte ↔ orientation |
| **Résultats en attente ignorés** | Documenter attente ; plan suivi |
| **Suivi flou** | Date, lieu, raison du RDV dans instructions |
| **Barrière linguistique** | Interprète ; exécution sortie infirmière |
| **Sortie patient instable** | Escalade ; ne pas enregistrer domicile si protocole interdit |
| **Handoff incomplet** | Checklist admission/transfert |
| **Retard transfert** | Réévaluation ; communication |
| **Boarding prolongé** | Documentation ; escalade charge infirmière |

## 8.2 ROI / confidentialité

| Risque | Mesure |
|--------|--------|
| **Dévoilement mauvais patient** | Vérifier UUID patient + consultation |
| **Dévoilement non autorisé** | Approbation ADMIN ; refus documenté |
| **Revue demande incomplète** | Objet / type / destinataire renseignés |
| **Attentes audit** | Actions tracées ; pas de contournement |
| **Divulgation excessive** | Principe **minimum nécessaire** — politique locale |
| **Panne système** | Pas d’exécution ROI « informelle » sans trace |

---

# 9. Mobile et tablette — disposition

## 9.1 Initiative 19M.6

Le panneau **Disposition (urgences)** et l’**exécution sortie infirmière** s’empilent en **colonne unique** sur mobile/tablette :

- Décision prestataire, planification partagée, aperçu repliable ;
- Champs exécution sortie pleine largeur ;
- Cibles tactiles ≥ 44 px.

## 9.2 Recommandations

| Usage | Appareil |
|-------|----------|
| Orientation active, exécution sortie au chevet | **Tablette** acceptable |
| Documentation MDM / sortie prolongée | **Bureau** ou tablette paysage |
| Revue ROI, approbation, exécution instantané | **Bureau** préféré |
| Téléphone | Consultation statut orientation — **limité** pour saisie longue |

> **Tablette acceptable pour workflow sortie actif ; bureau préféré pour documentation prolongée et revue ROI.**

## 9.3 Haïti — connectivité

- Enregistrer orientation sur serveur avant départ patient ;
- Brouillon local prestataire : relire avant signature (Volume 3) ;
- ROI / instantané : **ne pas exécuter** si synchronisation ou audit en échec — protocole admin local.

---

# 10. Communication opérationnelle et handoffs

## 10.1 Prestataire ↔ infirmier

- Orientation enregistrée avant exécution sortie ;
- Changement plan après réévaluation — mettre à jour texte **et** Disposition ;
- Résultats critiques : verbal + documentation.

## 10.2 Handoff admission

Verbal + note structurée ; résultats pending ; allergies ; plan thérapeutique.

## 10.3 Handoff transfert

Acceptation receveur ; stabilité ; mode transport ; dossier disponible.

## 10.4 Observation

Communication équipe observation ; passage consignes ; MAR et ordres actifs.

## 10.5 Aidants

Impliquer si autorisation ; documenter dans exécution sortie ou note.

## 10.6 Relève de quart

Revue orientations en attente, patients boarding, ROI approuvées non exécutées (admin).

Focus : **communication workflow** — pas messagerie interne cachée.

---

# 11. Résumé opérationnel rapide — checklists

## 11.1 Checklist sortie

- [ ] Réévaluation documentée  
- [ ] Orientation clinique cohérente avec dossier  
- [ ] Consignes de retour + suivi  
- [ ] Compréhension patient  
- [ ] Orientation enregistrée (Disposition)  
- [ ] Exécution sortie infirmière complétée  
- [ ] Résultats en attente gérés  

## 11.2 Checklist observation

- [ ] Justification observation texte  
- [ ] Orientation observation enregistrée  
- [ ] Plan réévaluation  
- [ ] Résultats pending identifiés  
- [ ] Transition sortie/admission/transfert planifiée  

## 11.3 Checklist admission

- [ ] Décision prestataire + dossier admission  
- [ ] Communication service receveur  
- [ ] Handoff infirmier  
- [ ] Résultats en attente communiqués  
- [ ] Boarding documenté si délai lit  

## 11.4 Checklist transfert

- [ ] Acceptation receveur (selon protocole)  
- [ ] Stabilité patient  
- [ ] Documentation + orientation Transfert  
- [ ] Transport coordonné  
- [ ] Paquet / synthèse disponible  

## 11.5 Checklist demande ROI

- [ ] Bon patient / bonne consultation  
- [ ] Type et objet renseignés  
- [ ] Autorisation vérifiée (politique locale)  
- [ ] Approbation ADMIN  
- [ ] Consultation clôturée avant instantané  
- [ ] Exécution + remise selon protocole hors produit  

## 11.6 Checklist résultats en attente

- [ ] Liste résultats manquants documentée  
- [ ] Plan suivi / rappel  
- [ ] Patient informé si applicable  
- [ ] Handoff mentionne pending  

## 11.7 Checklist anti mauvais patient

- [ ] Bandeau identité  
- [ ] Orientation ↔ patient présent  
- [ ] ROI : UUID patient vérifié  
- [ ] Export : consultation clôturée correcte  

## 11.8 Checklist communication sortie

- [ ] Consignes de retour verbalisées  
- [ ] Médicaments / suivi expliqués  
- [ ] Questions répondues  
- [ ] Interprète si besoin  
- [ ] Refus / LAMA documentés  

---

# 12. Gouvernance du chapitre

## 12.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction médicale urgences** | Orientation, admission, transfert |
| **Direction infirmière** | Exécution sortie, handoffs |
| **Administration / conformité** | ROI, export, audit |
| **Référent terminologie** | [Canon](./french-terminology-canon.md) — Orientation vs Disposition |

## 12.2 Revue leadership

Recommandée **annuellement** : lead MD, lead infirmier, admin dossiers, référent ROI, exploitation IT.

## 12.3 Lien gouvernance ROI (Phase 5G)

Formation admin sur cycle demande → approbation → exécution instantané. Surveillance plateforme sans PHI.

## 12.4 Lien export dossier (Phase 5F)

Formation : instantané = figé, consultation clôturée, vérification avant remise.

## 12.5 Déploiement Haïti

- Atelier orientation vs Disposition + exécution sortie ;  
- Protocole papier si panne ROI/export ;  
- Effectifs réduits : checklists courtes affichées au poste.

## 12.6 Formation

- Prestataires : panneau Disposition 19M.6 ;  
- Infirmiers : Volume 4 exécution sortie ;  
- Admins : ROI + export une fois par trimestre (exercice table).

## 12.7 Révision annuelle

Mettre à jour si nouvelles orientations UI, observation, ou règles ROI export.

---

## Annexes

### A. Orientations produit (urgences — aperçu)

Domicile, Admission / observation (court séjour), Transfert, LAMA, LWBS, Décès, Autre — libellés UI français ; enregistrement via panneau Disposition.

### B. Références

- [Volume 3 — Prestataire](./handbook-fr-provider-workflow-documentation.md)  
- [Volume 4 — Infirmier](./handbook-fr-nursing-discharge-execution.md)  
- [Observation — positionnement](../OBSERVATION_POSITIONING.md)  
- `docs/ui/cross-device-qa-checklist-19M8.md` (19M.6)  
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md` (ROI / export en panne)

### C. Placeholders visuels

- [CAPTURE D’ÉCRAN — Workflow disposition]  
- [CAPTURE D’ÉCRAN — Exécution de sortie]  
- [CAPTURE D’ÉCRAN — Observation]  
- [CAPTURE D’ÉCRAN — Admission]  
- [CAPTURE D’ÉCRAN — ROI]  
- [DIAGRAMME — Workflow congé]  
- [DIAGRAMME — Workflow admission/transfert]  
- [DIAGRAMME — Workflow ROI]

---

*Fin du Volume 6 — M-BOOK.FR.7*


\newpage



<!-- SECTION: Volume 7 — Administration -->

# Volume 7 — Administration, gouvernance et opérations plateforme

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.8  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Administrateurs établissement, responsables conformité, support opérationnel, direction, formateurs  
**Prérequis:** [Volumes 1–6](./handbook-fr-registration-intake.md) (parcours clinique complet)  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 7 — Administration, gouvernance et opérations plateforme |
| Routes principales | `/app/admin`, `/app/admin/users`, `/app/admin/audit`, `/app/admin/roi`, `/app/admin/system-health` |
| Architecture liée | ROI Phase 5G · Export dossier Phase 5F · Responsive 19M · Journal d’audit |
| Révision recommandée | Annuelle ou après changement RBAC / ROI / déploiement |

---

# 1. Introduction à la gouvernance plateforme

## 1.1 Rôle opérationnel de l’administration

L’**administration Medora** assure :

- La **gestion des accès** (comptes, rôles, établissements) ;
- La **traçabilité** (journal d’audit) ;
- La **conformité opérationnelle** (ROI, exports, sauvegardes) ;
- La **surveillance plateforme** (santé système, continuité) ;
- Le **soutien au déploiement** et à la formation.

## 1.2 Philosophie de gouvernance

| Principe | Application |
|----------|-------------|
| **Moindre privilège** | Chaque utilisateur n’accède qu’au nécessaire pour son poste |
| **Traçabilité** | Actions sensibles journalisées |
| **Responsabilité humaine** | Medora assiste — la direction reste responsable des politiques |
| **Séparation clinique / admin** | Accès administratif ≠ accès clinique automatique |
| **Continuité honnête** | Medora est **dépendant du cloud** — protocoles papier en panne |

## 1.3 Responsabilités sécurité

- Comptes **personnels** — pas de comptes partagés ;
- Postes **verrouillés** en absence ;
- **Confidentialité patient** sur tous les écrans ;
- Escalade incidents sécurité / confidentialité.

## 1.4 Continuité des opérations

Planifier : formation, relève admin, runbook panne, vérification post-reconnexion (synchronisation en attente, réconciliation papier).

## 1.5 Attentes audit

Le **journal d’audit** soutient la relecture opérationnelle et la responsabilité — pas le remplacement d’une politique de conformité locale.

## 1.6 Comptes utilisateurs

Chaque membre du personnel reçoit un **compte nominatif**. L’administrateur provisionne, assigne rôles par **établissement**, désactive à la sortie.

## 1.7 Intendance des données

Les données patient appartiennent à l’**établissement** — Medora fournit l’infrastructure et les garde-fous ; la gouvernance locale prime.

## 1.8 Responsabilité institutionnelle

> **Medora-S soutient les workflows de gouvernance. La direction institutionnelle reste responsable de la politique opérationnelle, de la conformité et de la formation du personnel.**

---

# 2. Définitions des rôles administratifs

## 2.1 Administrateur plateforme / établissement

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Utilisateurs, rôles, établissement, ROI, audit, exports, santé système |
| **Escalade** | Incident plateforme → support opérationnel / opérateur Medora |
| **Workflow** | `/app/admin/*` selon droits ADMIN établissement |
| **Gouvernance** | Revue trimestrielle accès ; pas d’auto-promotion abusive |

## 2.2 Superviseur clinique

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Qualité workflow clinique, escalade sécurité patient — **hors** admin système par défaut |
| **Escalade** | Détresse opérationnelle, saturation, exceptions protocole |
| **Gouvernance** | Signale erreurs workflow ; ne contourne pas RBAC |

## 2.3 Responsable ROI

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Examen demandes dévoilement dossier, approbation, exécution (Volume 6) |
| **Escalade** | Demande juridique complexe → counsel / direction |
| **Gouvernance** | Minimum nécessaire ; audit des actions ROI |

## 2.4 Responsable conformité

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Politique confidentialité, formation, revue incidents audit/ROI |
| **Escalade** | Fuite présumée, accès non autorisé |
| **Gouvernance** | Lien avec journal d’audit et surveillance ROI agrégée |

## 2.5 Support opérationnel

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Premier niveau : accès, formation, panne, confusion workflow |
| **Escalade** | Bug produit, panne infrastructure → opérateur technique |
| **Gouvernance** | Pas de partage identifiants ; documentation incidents |

## 2.6 Gestionnaire établissement

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Effectifs, horaires, coordination déploiement pilote |
| **Escalade** | Ressources insuffisantes, connectivité Haïti |
| **Gouvernance** | Alignement formation ↔ modules actifs |

## 2.7 Responsable formation

| Aspect | Détail |
|--------|--------|
| **Responsabilités** | Onboarding Volumes 1–7, recyclage, nouveaux rôles |
| **Escalade** | Échec adoption workflow → révision procédure |
| **Gouvernance** | Checklists par rôle ; pas de contournement « informel » |

[CAPTURE D’ÉCRAN — Administration Medora]

---

# 3. Établissement et gestion utilisateurs

## 3.1 Concept établissement (facility)

Medora isole les données par **établissement** :

- Sélecteur d’établissement dans l’en-tête application ;
- Rôles assignés **par établissement** ;
- Données cliniques limitées à l’établissement actif.

Un utilisateur peut appartenir à plusieurs établissements — vérifier le **bon contexte** avant toute action admin ou clinique.

## 3.2 Provisionnement utilisateur

Route : **`/app/admin/users`**

Séquence typique :

```
Création compte (identité, courriel)
        ↓
Assignation rôle(s) pour l'établissement
        ↓
Activation accès établissement
        ↓
Mot de passe initial / réinitialisation selon protocole
        ↓
Formation onboarding (Volume adapté au rôle)
        ↓
Vérification page d'accueil (landing) correcte
```

## 3.3 Activation / désactivation

- **Désactiver** le compte ou l’accès établissement à la **sortie** du personnel — immédiat ;
- Ne pas laisser comptes orphelins actifs ;
- Revue périodique liste utilisateurs.

## 3.4 Mot de passe et sécurité

- Mots de passe **forts** ; pas de partage ;
- MFA si activé par déploiement — suivre procédure locale ;
- Réinitialisation via admin selon politique établissement.

## 3.5 Assignation rôles — sensibilisation

Rôles produit courants (Haïti pilote) :

| Rôle | Usage opérationnel |
|------|-------------------|
| **ADMIN** | Administration établissement |
| **PROVIDER** | Prestataire clinique |
| **RN** | Infirmier(ère) |
| **FRONT_DESK** | Accueil |
| **LAB** | Laboratoire |
| **RADIOLOGY** | Imagerie |
| **PHARMACY** | Pharmacie |
| **BILLING** | Facturation |

Assigner le **minimum** de rôles nécessaires.

## 3.6 Onboarding / offboarding

| Phase | Actions admin |
|-------|---------------|
| **Entrée** | Compte + rôles + formation + checklist rôle |
| **Changement poste** | Ajuster rôles ; retirer accès obsolètes |
| **Sortie** | Désactivation ; revue actions récentes si incident |

## 3.7 Escalade superviseur

Confusion d’accès → admin ; besoin clinique urgent → superviseur clinique — **pas** partage de compte ADMIN.

[CAPTURE D’ÉCRAN — Gestion utilisateurs]

---

# 4. RBAC et gouvernance des accès

## 4.1 Contrôle d’accès par rôle (RBAC)

Medora filtre :

- **Navigation** (menus visibles) ;
- **API** (actions autorisées côté serveur).

L’interface et le serveur doivent **concorder** — ne pas supposer qu’un menu caché suffit à protéger une action (le serveur refuse aussi).

## 4.2 Philosophie du moindre privilège

> **Le personnel ne doit accéder qu’aux informations requises pour ses fonctions opérationnelles.**

Exemples :

- Technicien labo : file laboratoire — **pas** dossier clinique complet ;
- Pharmacien : file pharmacie + hub pharmacie — identifiants patient **limités** sur file ;
- Accueil : inscription — **pas** documentation prestataire complète.

## 4.3 Accès clinique vs administratif

| Type | Exemples |
|------|----------|
| **Clinique** | Triage, documentation, MAR, disposition |
| **Administratif** | Utilisateurs, audit, ROI, exports, santé système |

ADMIN établissement a accès admin — **formation distincte** de la pratique clinique.

## 4.4 Auditabilité

Les accès sensibles laissent une trace dans le **journal d’audit** — relecture périodique recommandée.

## 4.5 Interdiction des comptes partagés

> **Les comptes partagés sont interdits.** Chaque action doit être attribuable à une personne.

Pas de « compte infirmière », « compte médecin du jour », « compte accueil » partagé.

## 4.6 Poste de travail

- Verrouiller session en quittant le poste ;
- Écran orienté pour **confidentialité** (pas visible salle d’attente) ;
- Déconnexion fin de quart si poste partagé — **compte personnel** tout de même.

## 4.7 Accès mobile

- Téléphone / tablette : même RBAC ;
- **Limitations ergonomiques** (19M) — pas une exemption confidentialité ;
- Appareil perdu → désactivation compte + incident.

## 4.8 Ce que ce chapitre n’expose pas

Pas de détail sur : schémas permissions internes, matrices JWT, architecture admin cachée — réservé documentation technique exploitation.

[DIAGRAMME — Gouvernance accès]

---

# 5. Audit et workflows de gouvernance

## 5.1 Philosophie audit

Le **journal d’audit** (`/app/admin/audit`) enregistre des **actions sensibles** pour :

- Relecture opérationnelle ;
- Responsabilité en cas d’incident ;
- Soutien conformité locale.

## 5.2 Traçabilité opérationnelle

Exemples d’événements (aperçu, sans métadonnées internes) :

- Ouverture dossier ;
- Enregistrement triage ;
- Accusé / complétion ordre ;
- Export dossier ;
- Actions ROI ;
- Échecs intégrité export (surveillance).

## 5.3 Responsabilité

Les utilisateurs sont responsables des actions sous **leur compte**. Admin ne doit pas utiliser compte personnel d’un clinicien.

## 5.4 Surveillance workflow

Revue périodique :

- ROI approuvées non exécutées ;
- Exports échoués (surveillance exports admin) ;
- Comptes inactifs encore actifs.

## 5.5 Gouvernance disposition (aperçu)

Volume 6 — orientation enregistrée, cohérence documentation. **Pas** de règles d’implémentation gouvernance sortie exposées ici.

## 5.6 Gouvernance carry-forward (aperçu)

Volume 2 — reprise antécédents **revue**, pas auto-confirmée. Admin forme le personnel sur statuts revue.

## 5.7 Gouvernance export dossier (Phase 5F)

Instantané **figé**, consultation **clôturée** — admin vérifie processus remise. Pas de détail schéma / empreintes.

## 5.8 Métadonnées audit

Les logs ROI/export évitent PHI inutile dans métadonnées — exploitation IT pour détail technique.

---

# 6. Administration ROI et surveillance

## 6.1 Workflow admin ROI (Phase 5G)

Route : **`/app/admin/roi`** (ADMIN établissement)

Rappel Volume 6 :

```
Demande → Approbation / Refus / Annulation → Exécution (instantané export)
```

**Politique ROI = institution** — Medora trace, n’impose pas le cadre juridique haïtien ou autre.

## 6.2 Revue demande

Vérifier : bon patient, type demande, objet, autorisation externe selon **politique locale**.

## 6.3 Surveillance ROI agrégée

Route : **`/app/admin/roi-monitoring`** (opérateur plateforme / super-admin selon déploiement)

- Compteurs par statut / établissement ;
- **Sans** PHI affichée ;
- Repérer files APPROVED non exécutées.

[CAPTURE D’ÉCRAN — Surveillance ROI]

## 6.4 Confidentialité et minimum nécessaire

Ne divulguer via ROI que le **strict nécessaire** au destinataire autorisé.

## 6.5 Escalade

Demande juridique ambiguë → counsel ; panne exécution → stop + runbook panne.

[DIAGRAMME — Workflow ROI]

---

# 7. Opérations plateforme et déploiement

## 7.1 Philosophie déploiement

Medora-S pilote Haïti : déploiement **progressif**, formation par module, **vérification** avant promotion production.

## 7.2 Environnements (aperçu opérationnel)

| Environnement | Usage |
|---------------|--------|
| **Formation / staging** | Exercices, nouveaux admins, tests workflow |
| **Production** | Soins patients réels — **seul** environnement clinique officiel |

Ne pas mélanger données réelles et exercices. Former d’abord sur staging si disponible.

## 7.3 Planification mise à jour

- Fenêtre hors pointe si possible ;
- Annoncer personnel (French notice) ;
- Vérifier post-déploiement : connexion, file, export, ROI si touché ;
- Référence : `docs/DEPLOYMENT_RUNBOOK.md` (exploitation).

## 7.4 Coordination formation

Toute mise à jour UI workflow → brief superviseurs + fiche delta manuel.

## 7.5 Pilote Haïti

- Modules P1 d’abord (accueil, triage, tableau, documentation, soins, disposition) ;
- P2 ensuite (pharmacie, labo, imagerie, ROI, admin) ;
- Effectifs réduits : prioriser checklists courtes.

## 7.6 Connectivité

- Connexion internet **requise** pour usage normal ;
- Lignes **synchronisation en attente** possibles — protocole reconnexion ;
- **Medora est dépendant du cloud** — pas de mode hors-ligne complet aujourd’hui.

## 7.7 Escalade opérationnelle

| Niveau | Contact |
|--------|---------|
| 1 | Support opérationnel local / super-utilisateur |
| 2 | Administrateur établissement |
| 3 | Opérateur Medora / exploitation |
| Clinique urgent | Superviseur clinique + papier si panne |

[CAPTURE D’ÉCRAN — Tableau de bord plateforme]

---

# 8. Panne et continuité d’activité

## 8.1 Position honnête

> **Medora-S est un système en ligne, dépendant du cloud et de la connectivité. Il n’offre pas aujourd’hui de mode hors-ligne complet ni de synchronisation offline-first.**

Ne pas promettre continuité numérique sans internet.

## 8.2 Interruption internet

1. Superviseur déclare **protocole papier** ;
2. Accueil : registre papier ;
3. Clinique : triage / MAR / notes papier selon runbook ;
4. Noter heures début / fin panne ;
5. **Reconciliation** après retour — ne pas backdater abusivement.

## 8.3 Connectivité dégradée

- Saisie locale possible sur certains brouillons — **relire** après sync ;
- Cartes **synchronisation en attente** sur files ordres ;
- Éviter signatures / ROI / export instantané tant que serveur incertain.

## 8.4 Panne plateforme (API / hébergement)

- Basculer papier immédiatement si login impossible site entier ;
- Admin informe opérateur ;
- **Ne pas** exécuter ROI ni export légalement significatif pendant panne audit/intégrité.

## 8.5 Vérification reprise

Après reconnexion :

- Connexion fraîche par poste ;
- Smoke test : ouverture dossier, enregistrement test, file ;
- Revue pending sync ;
- Réconciliation papier → saisie avec horodatage honnête en note.

## 8.6 Communication panne

- Message staff **en français** ;
- Qui décide papier ; qui contacte support ;
- Horaire reprise estimée si connu.

Référence exploitation : `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`.

[DIAGRAMME — Continuité activité]

---

# 9. Mobile et tablette — gouvernance

## 9.1 Initiative 19M (rappel)

Medora supporte progressivement téléphone / tablette :

- Navigation tiroir mobile ;
- Tableau des urgences empilé ;
- Documentation / disposition empilées ;
- Files auxiliaires cartes tactiles.

## 9.2 Recommandations appareils

| Usage | Appareil |
|-------|----------|
| Production clinique dense | **Poste fixe** 1280px+ |
| Chevet, files, revue rapide | **Tablette** |
| Consultation courte | **Téléphone** — limité |

## 9.3 Appareil partagé

- Compte **personnel** même sur tablette partagée ;
- Déconnexion obligatoire ;
- Pas de mémorisation mot de passe sur appareil commun non supervisé.

## 9.4 Confidentialité écran

- Filtre confidentialité si possible ;
- Ne pas photographier écran patient ;
- Volume sonore notifications.

## 9.5 Limitations téléphone

Documentation longue, ROI admin, gestion utilisateurs : **bureau préféré**.

## 9.6 Haïti

Connectivité intermittente : privilégier postes filaires pour admin ; tablettes cliniques avec plan papier de secours.

---

# 10. Sécurité et confidentialité

| Risque | Mesure |
|--------|--------|
| **Identifiants partagés** | Interdiction ; compte nominatif |
| **Poste non verrouillé** | Verrouillage ; timeout session |
| **Mauvais utilisateur** | Déconnexion ; bon compte |
| **ROI non autorisé** | Workflow approbation ; audit |
| **Capture écran / photo** | Interdit sans autorisation |
| **Wi-Fi public** | Éviter accès dossier ; VPN si politique |
| **Hygiène mot de passe** | Fort ; unique ; pas sur post-it |
| **Confidentialité patient** | Minimum nécessaire à l’écran |
| **Perte vol appareil** | Désactivation compte ; incident |
| **Hameçonnage** | Ne pas cliquer liens ; vérifier URL login |

---

# 11. Support opérationnel

## 11.1 Escalade incident

```
Utilisateur → super-utilisateur / support local
        ↓
Administrateur établissement
        ↓
Opérateur plateforme (panne, bug)
        ↓
Direction + conformité (confidentialité)
```

[DIAGRAMME — Escalade opérationnelle]

## 11.2 Dépannage opérationnel (premier niveau)

| Symptôme | Action |
|----------|--------|
| Menu manquant | Vérifier rôle + établissement sélectionné |
| Erreur enregistrement | Réessayer ; noter heure ; pending sync ? |
| Mauvais patient | Stop ; superviser |
| Confusion workflow | Renvoyer Volume manuel ; formation |

## 11.3 Communication panne

Modèle affichage : « Medora indisponible — protocole papier actif — heure début ».

## 11.4 Escalade formation

Workflow non compris → responsable formation ; **pas** contournement RBAC.

## 11.5 Urgence opérationnelle clinique

La **sécurité patient** prime sur l’enregistrement numérique — papier puis reconciliation.

Focus : **workflow opérationnel** — pas outillage engineering interne.

---

# 12. Résumé opérationnel rapide — checklists

## 12.1 Checklist onboarding administrateur

- [ ] Accès ADMIN établissement confirmé  
- [ ] Runbook panne lu  
- [ ] `/app/admin/users` maîtrisé  
- [ ] ROI + audit visités  
- [ ] Santé système / sauvegarde consultés  
- [ ] Contact opérateur noté  

## 12.2 Checklist provisionnement utilisateur

- [ ] Identité vérifiée  
- [ ] Rôles minimum nécessaires  
- [ ] Bon établissement  
- [ ] Formation Volume assigné  
- [ ] Compte actif testé  
- [ ] Offboarding planifié si temporaire  

## 12.3 Checklist revue RBAC

- [ ] Comptes inactifs désactivés  
- [ ] Rôles alignés postes actuels  
- [ ] Pas de comptes partagés  
- [ ] ADMIN limité aux personnes de confiance  
- [ ] Revue trimestrielle datée  

## 12.4 Checklist gouvernance ROI

- [ ] Demande complète  
- [ ] Autorisation locale vérifiée  
- [ ] Approbation tracée  
- [ ] Consultation clôturée avant instantané  
- [ ] Remise hors produit selon protocole  

## 12.5 Checklist panne

- [ ] Papier activé  
- [ ] Heure début notée  
- [ ] Staff informé (FR)  
- [ ] ROI/export légaux suspendus si requis  
- [ ] Reconciliation planifiée  

## 12.6 Checklist sécurité / confidentialité

- [ ] Postes verrouillés  
- [ ] Comptes personnels  
- [ ] Écrans orientés  
- [ ] Pas de photos dossier  
- [ ] Incident confidentialité escaladé  

## 12.7 Checklist déploiement Haïti

- [ ] Modules P1 formés  
- [ ] Connectivité testée  
- [ ] Papier secours imprimé  
- [ ] Admin + support identifiés  
- [ ] Staging exercice si disponible  
- [ ] Fenêtre mise à jour communiquée  

## 12.8 Checklist escalade opérationnelle

- [ ] Symptôme documenté (heure, écran, action)  
- [ ] Niveau 1 contacté  
- [ ] Sécurité patient assurée  
- [ ] Direction informée si SEV critique  

---

# 13. Gouvernance du chapitre

## 13.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction établissement** | Politique gouvernance, conformité |
| **Administrateur principal** | Exactitude procédures admin |
| **Référent terminologie** | [Canon](./french-terminology-canon.md) |
| **Opérateur Medora** | Runbooks exploitation (hors manuel clinique) |

## 13.2 Revue leadership

**Annuelle** : RBAC, ROI, panne, formation, 19M device policy.

## 13.3 Lien gouvernance ROI / export

Volumes 6–7 + Phase 5F/5G — formation admin obligatoire avant autonomie ROI.

## 13.4 Revue déploiement Haïti

Semestrielle : connectivité, effectifs, modules actifs, checklists papier.

## 13.5 Gouvernance formation

Matrice rôle → Volume manuel ; attestation lecture pour ADMIN et ROI.

## 13.6 Mises à jour

Changement RBAC UI, nouvelle route admin, runbook panne → révision chapitre + tests `frenchHandbookAdministrationGovernanceOperations19MBookFr8.test.ts`.

---

## Annexes

### A. Routes admin (aperçu)

| Route | Usage |
|-------|--------|
| `/app/admin` | Hub administration |
| `/app/admin/users` | Utilisateurs et rôles |
| `/app/admin/audit` | Journal d’audit |
| `/app/admin/roi` | Dévoilement dossier |
| `/app/admin/roi-monitoring` | Surveillance ROI agrégée |
| `/app/admin/system-health` | Santé système |
| `/app/admin/backup-readiness` | Préparation sauvegarde |
| `/app/admin/exports` | Surveillance exports |
| `/app/admin/compliance` | Conformité (selon déploiement) |
| `/app/admin/go-live` | Checklist go-live |

### B. Références exploitation

- [Volume 6 — ROI](./handbook-fr-disposition-admission-transfer-roi.md)  
- `docs/DEPLOYMENT_RUNBOOK.md`  
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`  
- `docs/HAITI_MVP_PILOT.md`  
- `docs/ui/cross-device-qa-checklist-19M8.md`

### C. Placeholders visuels

- [CAPTURE D’ÉCRAN — Administration Medora]  
- [CAPTURE D’ÉCRAN — Surveillance ROI]  
- [CAPTURE D’ÉCRAN — Gestion utilisateurs]  
- [CAPTURE D’ÉCRAN — Tableau de bord plateforme]  
- [DIAGRAMME — Gouvernance accès]  
- [DIAGRAMME — Workflow ROI]  
- [DIAGRAMME — Escalade opérationnelle]  
- [DIAGRAMME — Continuité activité]

---

*Fin du Volume 7 — M-BOOK.FR.8*


\newpage



<!-- SECTION: Volume 8 — Mobile / Haïti -->

# Volume 8 — Mobile, tablette et opérations de déploiement Haïti

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.9  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Cliniciens, infirmiers, auxiliaires, administrateurs, formateurs, direction pilote Haïti  
**Prérequis:** [Volumes 1–7](./handbook-fr-registration-intake.md) · [Volume 7 — Admin](./handbook-fr-administration-governance-operations.md)  
**Terminologie:** [Canon terminologique](./french-terminology-canon.md) · [Guide de style](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 8 — Mobile, tablette et opérations de déploiement Haïti |
| Initiative liée | Responsive 19M.1–19M.9 |
| Références techniques | `docs/ui/mobile-tablet-responsiveness-audit-19M1.md` · `docs/ui/cross-device-qa-checklist-19M8.md` |
| Pilote | Haïti — connectivité variable, tablettes, protocole papier |
| Révision recommandée | Annuelle ou après phase 19M / changement déploiement |

---

# 1. Introduction aux opérations mobile et tablette

## 1.1 Pourquoi Medora supporte mobile / tablette

Les urgences et soins urgents exigent de la **mobilité** :

- Triage au poste d’accueil ou au box ;
- Documentation au **chevet** ;
- Revue file / tableau en déplacement ;
- Exécution sortie au lit du patient.

Medora a été rendu **responsive** (initiative **19M**) pour que les workflows fréquents restent utilisables sur tablette et, dans une mesure limitée, sur téléphone.

## 1.2 Mobilité opérationnelle aux urgences

| Objectif | Moyen |
|----------|--------|
| Réactivité | Ouvrir dossier depuis tableau sans retour bureau fixe |
| Sécurité | Identité patient visible sur cartes / bandeau avant action |
| Continuité | Même dossier cloud sur tous les appareils autorisés |

## 1.3 Philosophie chevet

La **tablette au chevet** convient aux workflows **actifs** : triage, réévaluation, vitaux, exécution sortie, revue rapide. La documentation **longue et complexe** reste plus sûre sur **poste fixe ou portable**.

## 1.4 Concepts tablette-first (sans exagération)

- **Triage** et **réévaluation infirmière** : empilement &lt; 960 px — champs atteignables ;
- **Disposition / sortie** : colonne unique mobile (19M.6) ;
- **Files auxiliaires** : cartes MedoraCard tactiles (19M.7).

## 1.5 Limitations téléphone

Le **téléphone** convient à : navigation, coup d’œil tableau, accusé file, revue courte. **Non recommandé** pour : documentation prestataire prolongée, MDM dense, gestion admin, ROI.

## 1.6 Objectifs responsive Medora

- Pas de barre latérale permanente &lt; 1024 px (menu tiroir) ;
- Cibles tactiles ≥ 44 px sur contrôles mobile refactorés ;
- Disposition bureau dense préservée ≥ 1024 px ;
- Honnêteté sur **lacunes résiduelles** (section 3.4).

## 1.7 Position produit

> **Medora est responsive et utilisable sur tablette et téléphone pour de nombreux workflows. Le poste fixe ou portable reste préféré pour la documentation clinique prolongée et complexe.**

> **Medora est dépendant du cloud** — pas de mode hors-ligne complet aujourd’hui (Volume 7).

[CAPTURE D’ÉCRAN — Navigation mobile]

---

# 2. Vue d’ensemble des workflows responsive

## 2.1 Initiative 19M.1–19M.9 — résultats

| Phase | Focus | Résultat opérationnel |
|-------|--------|------------------------|
| **19M.1** | Audit | Cartographie écarts mobile (shell, tableau, documentation, pharmacie) |
| **19M.2** | Shell application | Menu tiroir mobile ; barre latérale bureau ≥ 1024 px |
| **19M.3** | Tableau urgences | Cartes empilées téléphone ; grille 2 col. tablette |
| **19M.4** | Dossier actif / chart | Rail puces horizontal ; grille 10 tuiles bureau seulement |
| **19M.5** | Documentation prestataire | Colonne unique + résumé repliable ; MDM tactile |
| **19M.6** | Disposition / sortie | Empilement mobile ; exécution sortie pleine largeur |
| **19M.7** | Files auxiliaires | Pharmacie / labo / imagerie en cartes MedoraCard |
| **19M.8** | QA / régression | Checklist cross-device ; tests source-level |
| **19M.9** | Diagnostics / ordres | Cartes diagnostic mobile ; durcissement tableaux ordres ED |

[DIAGRAMME — Architecture responsive Medora]

## 2.2 Classes d’appareils supportées

| Classe | Largeur typique | Usage prévu |
|--------|-----------------|-------------|
| Téléphone portrait | 360–430 px | Revue rapide, navigation, files |
| Téléphone paysage | 667–932 px | Formulaires améliorés — tablette préférée si long |
| Tablette portrait | 768–834 px | Documentation active, disposition, files 2 col. |
| Tablette paysage | 1024–1194 px | Proche bureau ; barre latérale visible |
| Portable | 1024–1280 px | Workflow clinique complet |
| Poste hospitalier | 1280–1920 px | **Cible production principale** |
| Grand écran | 1920 px+ | Densité tableau, revue multi-panneaux |

## 2.3 Attentes tablette

Appareil **par défaut recommandé** pour médecins et infirmiers en encounter complet au pilote Haïti.

## 2.4 Limitations téléphone

Éditions légères, revue, accusés — pas remplacement poste fixe pour charting prolongé.

## 2.5 Attentes poste de travail

Densité, lisibilité, ordres/diagnostics en mode dense (19M.9 desktop ≥ 1024 px).

## 2.6 Lacunes connues (honnêteté 19M)

| Lacune | Impact | Atténuation opérationnelle |
|--------|--------|---------------------------|
| Hub pharmacie legacy (`/app/pharmacy`) | Tableaux larges | Utiliser **`/app/pharmacy-worklist`** |
| Filtres labo/imagerie denses | Hauteur téléphone | Tablette ou bureau pour revue prolongée |
| Charting multi-heures | Fatigue petit écran | Poste fixe |
| Pas de E2E navigateur automatisé | QA manuelle | Checklist 19M.8 avant déploiement |

---

# 3. Guide par classe d’appareil

## 3.1 Poste de travail hospitalier (desktop)

| Aspect | Détail |
|--------|--------|
| **Meilleurs workflows** | Tableau dense, documentation longue, ordres, diagnostics, admin |
| **Limitations** | Mobilité chevet |
| **Recommandation** | Au moins **un poste fixe** par zone clinique |
| **Sécurité** | Écran orienté ; verrouillage session |

## 3.2 Portable (laptop)

| Aspect | Détail |
|--------|--------|
| **Meilleurs workflows** | Équivalent bureau si ≥ 1280 px ; déplacement salle de staff |
| **Limitations** | Clavier/souris requis pour productivité |
| **Recommandation** | Acceptable prestataire si pas de poste fixe |
| **Sécurité** | Ne pas laisser ouvert en salle d’attente |

## 3.3 Tablette portrait

| Aspect | Détail |
|--------|--------|
| **Meilleurs workflows** | Triage, réévaluation, disposition, exécution sortie, files |
| **Limitations** | Documentation MDM très longue |
| **Recommandation** | **Appareil par défaut chevet** pilote Haïti |
| **Sécurité** | Compte personnel ; déconnexion ; filtre confidentialité |

## 3.4 Tablette paysage

| Aspect | Détail |
|--------|--------|
| **Meilleurs workflows** | Proche bureau ; barre latérale ; 2 col. files |
| **Limitations** | Clavier virtuel lent pour texte long |
| **Recommandation** | Support médecin en box |
| **Sécurité** | Idem portrait |

## 3.5 Téléphone

| Aspect | Détail |
|--------|--------|
| **Meilleurs workflows** | Menu tiroir, tableau cartes, accusé file, revue statut |
| **Limitations** | MDM, admin, ROI, charting prolongé |
| **Recommandation** | **Superviseur / charge infirmière** — pas seul outil médecin |
| **Sécurité** | Risque mauvais patient si bandeau non lu ; zoom fatigue |

---

# 4. Triage et workflows tablette au chevet

## 4.1 Triage sur tablette

- Panneau triage ED empile sous **960 px** ;
- Signes vitaux, ESI, allergies atteignables ;
- Volume 2 — carry-forward : revue section par section.

[CAPTURE D’ÉCRAN — Triage tablette]

## 4.2 Soins infirmiers chevet

- Réévaluation infirmière : grille documentation empilée ;
- Vitaux rapides sur dossier actif ;
- Nouvelle séance horodatée.

## 4.3 Réévaluation rapide

Workflow **room-to-room** :

1. Ouvrir dossier depuis tableau (carte patient) ;
2. Vérifier bandeau identité ;
3. Vitaux / douleur / note réévaluation ;
4. Enregistrer serveur si connectivité OK.

## 4.4 Exécution sortie chevet

- Exécution sortie infirmière empilée (19M.6) ;
- Enseignement cases cochables au lit ;
- Vérifier orientation prestataire enregistrée avant départ.

## 4.5 Revue carry-forward tablette

- Reprise antécédents : lire avant confirmer — pas de clic global sans revue ;
- Allergies / médicaments : confirmation patient au chevet.

## 4.6 Prestataire box à box

- Revue chart, insertion pastilles MDM **courtes** acceptable ;
- Orientation + disposition : tablette OK ;
- Note complexe multi-sections : reporter au poste fixe si possible.

> **La tablette est l’appareil préféré pour les workflows actifs au chevet** (triage, réévaluation, sortie).

---

# 5. Workflow mobile prestataire

## 5.1 Revue dossier

- Chart view : navigation par saut de section mobile ;
- Bandeau patient toujours visible avant prescription.

## 5.2 Réévaluation prestataire

- Mises à jour ciblées MDM / HPI sur tablette ;
- Réévaluation après résultats : privilégier clarté vs volume.

## 5.3 MDM sur tablette

- Menu multi-sélection scrollable ; pastilles tactiles ;
- Insertion intelligence motif **au clic** — relire sur petit écran.

[CAPTURE D’ÉCRAN — Documentation prestataire tablette]

## 5.4 Intelligence motif sur tablette

- Bundles par sous-groupe ; édition pastilles obligatoire ;
- Éviter sessions longues MDM sur téléphone.

## 5.5 Disposition sur tablette

- Panneau Disposition empilé ; aperçu repliable ;
- **Enregistrer la décision d'orientation** reachable sans scroll horizontal.

[CAPTURE D’ÉCRAN — Workflow disposition mobile]

## 5.6 Documentation prolongée — limitation

> **La documentation clinique prolongée et complexe reste plus sûre et plus efficace sur poste fixe ou portable (≥ 1280 px).**

Téléphone : **éditions légères uniquement**.

---

# 6. Tableau des urgences et flux ED mobile

## 6.1 Comportement responsive tableau

| Largeur | Affichage |
|---------|-----------|
| Téléphone | Cartes patient empilées — ESI, chambre, statut, action ouvrir |
| Tablette | Grille 2 colonnes |
| Bureau | Lignes denses MedoraCard |

## 6.2 Navigation sections dossier actif

- **&lt; bureau** : rail **puces** horizontal (triage, ordres, MAR, soins, disposition…) ;
- **Bureau** : grille 10 tuiles — ne pas former le staff à chercher tuiles sur téléphone.

## 6.3 Assignation et visibilité

- Assignation médecin / infirmier visible sur cartes ;
- Revue salle d’attente : cartes triées — pas remplacement surveillance clinique.

## 6.4 Revue file rapide

Le tableau mobile soutient la **conscience situationnelle** — pas toujours la documentation complète.

## 6.5 Limitation

> **Le tableau mobile soutient la prise de conscience opérationnelle ; il ne remplace pas toujours une revue complète au poste de travail** (ordres larges, diagnostics denses).

---

# 7. Workflows mobile auxiliaires

## 7.1 Alignement 19M.7

Files pharmacie, laboratoire, imagerie :

- Cartes MedoraCard ;
- Cibles tactiles ≥ 44 px ;
- Tablette : grille 2 colonnes labo/imagerie ;
- Téléphone : cartes empilées.

[CAPTURE D’ÉCRAN — File pharmacie mobile]

## 7.2 Pharmacie

- Route **`/app/pharmacy-worklist`** — pas hub legacy sur mobile ;
- Voir le détail → dispense empilée.

## 7.3 Laboratoire / imagerie

- Filtres opérationnels empilés — hauteur téléphone ;
- Accusé / démarrage / complétion accessibles au toucher.

## 7.4 Revue file en déplacement

Accusé rapide et statut — saisie résultat longue : tablette ou bureau.

---

# 8. Opérations de déploiement Haïti

## 8.1 Réalités opérationnelles

| Facteur | Implication |
|---------|-------------|
| **Connectivité variable** | Latence, coupures, synchronisation en attente |
| **Appareils partagés** | Comptes nominatifs + déconnexion |
| **Peu de postes fixes** | Tablettes chevet par défaut |
| **Coupures courant** | Chargeurs ; UPS postes critiques si possible |
| **Effectifs limités** | Déploiement **phasé** ; super-utilisateurs |
| **Protocole papier** | Obligatoire en panne — Volume 7 |

## 8.2 Dépendance cloud — position honnête

> **Medora est dépendant du cloud et de l’internet. Il n’offre pas aujourd’hui de fonctionnalité hors-ligne complète ni d’architecture de synchronisation locale autonome.**

Ne pas promettre continuité numérique sans réseau.

## 8.3 Stratégie déploiement phasé

| Phase | Modules | Public |
|-------|---------|--------|
| **1** | Accueil, triage, tableau, documentation base, soins | Cœur ED |
| **2** | Disposition, observation, files labo/rad/pharmacie | Semaine 2–4 |
| **3** | Admin, ROI, facturation, santé publique | Selon maturité |

Référence : `docs/HAITI_MVP_PILOT.md`.

## 8.4 Supervision opérationnelle

- Revue **quotidienne** 15 min : connectivité, pending sync, incidents ;
- Super-utilisateur par discipline ;
- Escalade admin (Volume 7).

## 8.5 Formation

- Un Volume manuel par rôle ;
- Exercice tablette chevet + exercice panne papier ;
- Checklist 19M.8 sur 1 téléphone + 1 tablette + 1 bureau avant go-live.

## 8.6 Inventaire matériel recommandé

| Élément | Quantité indicative (petite clinique ED) |
|---------|------------------------------------------|
| Tablettes chevet | 1–2 par zone + 1 triage |
| Poste fixe / portable | 1 médecin + 1 admin |
| Routeur / Wi-Fi stable | Couverture box + triage |
| Chargeurs / câbles | 100 % tablettes en service |
| Copies runbook papier | Accueil + charge infirmière |

[DIAGRAMME — Déploiement Haïti]

---

# 9. Connectivité dégradée

## 9.1 Synchronisation en attente

- Ordres / résultats / MAR peuvent afficher **synchronisation en attente** ;
- **Ne pas considérer** action définitive tant que serveur non confirmé ;
- Cartes file surlignées pending sync (Volume 5).

## 9.2 Mises à jour retardées

- Files auto-rafraîchies (~10 s) — peut sembler « figé » si réseau lent ;
- Actualiser manuellement ; vérifier heure dernière action.

## 9.3 Après reconnexion

Checklist :

1. Connexion fraîche ;
2. Ouvrir dossier touché pendant panne ;
3. Vérifier enregistrements vs papier ;
4. Résoudre pending sync ;
5. **Confirmer** orientation, sortie, MAR critiques enregistrés serveur.

## 9.4 Escalade connectivité dégradée

- Charge infirmière → admin → opérateur ;
- Message staff français : « Réseau instable — vérifier enregistrements avant sortie patient ».

## 9.5 Protocole papier temporaire

Volume 7 — activer si login impossible ou enregistrement critique échoue répétitivement.

## 9.6 Communication

Afficher heure début / fin dégradation ; plan reconciliation.

> **Le personnel doit vérifier la complétion des workflows critiques après reconnexion** (orientation, sortie, MAR, résultats saisis).

[DIAGRAMME — Workflow connectivité dégradée]

---

# 10. Appareils partagés et confidentialité

| Risque | Mesure |
|--------|--------|
| **Tablette partagée** | Compte **personnel** ; déconnexion fin de quart |
| **Confidentialité écran** | Filtre ; angle ; pas en salle d’attente |
| **Appareil sans surveillance** | Verrouillage auto ; ne pas laisser dossier ouvert |
| **Visibilité patient** | Ne pas montrer écran à tiers non autorisés |
| **Mauvais utilisateur** | Login nominatif — pas de compte « tablette salle 3 » |
| **Vol / perte** | Signaler admin ; désactivation compte |
| **Wi-Fi public** | Éviter dossier patient ; réseau clinique privé |
| **Charge / coupure courant** | UPS ; ne pas perdre saisie — attendre sync avant sortie |

---

# 11. Sécurité opérationnelle mobile

| Risque | Mesure |
|--------|--------|
| **Petit écran** | Relire identité ; ne pas sur-taper texte générique |
| **Documentation prolongée fatigue** | Pauses ; passer au bureau si note longue |
| **Overflow / scroll caché** | Vérifier boutons Enregistrer visibles ; scroll complet disposition |
| **Résultats pending** | Ne pas orienter sans revue si protocole l’exige |
| **Revues ordres** | Tableau ordres ED : scroll horizontal possible téléphone — tablette préférée |
| **Mauvais patient mobile** | Bandeau + NIR avant toute action |
| **Distraction workflow** | Pas de documentation mobile en marchant sans vérification |

Aligné lacunes 19M restantes — formation sur **limites**, pas sur promesse desktop identique.

---

# 12. Déploiement et formation — recommandations

## 12.1 Go-live phasé

- Semaine 1 : accueil + triage + tableau ;
- Semaine 2 : documentation + soins ;
- Semaine 3+ : disposition, files, admin.

## 12.2 Super-utilisateurs

- 1 infirmier, 1 médecin, 1 admin, 1 accueil — formés Volumes 1–8.

## 12.3 Revue opérationnelle quotidienne (15 min)

- Incidents connectivité ;
- Pending sync non résolus ;
- Confusion workflow → rappel formation.

## 12.4 Inventaire appareils

- Numéro série, affectation zone, responsable charge ;
- Test Wi-Fi à chaque poste.

## 12.5 Évaluation réseau

- Débit minimal stable aux box et triage ;
- Plan B papier si coupure &gt; 30 min (seuil local ajustable).

## 12.6 Onboarding

- Nouveau staff : Volume rôle + 30 min tablette supervisée ;
- Signature checklist sécurité mobile.

---

# 13. Résumé opérationnel rapide — checklists

## 13.1 Checklist déploiement tablette

- [ ] Wi-Fi testé zone box + triage  
- [ ] Comptes nominatifs créés  
- [ ] Menu tiroir démontré  
- [ ] Triage + réévaluation testés  
- [ ] Enregistrement serveur confirmé  
- [ ] Chargeurs étiquetés  

## 13.2 Checklist workflow chevet

- [ ] Identité bandeau vérifiée  
- [ ] Bon dossier ouvert  
- [ ] Action enregistrée serveur  
- [ ] Pending sync absent ou résolu  
- [ ] Écran orienté confidentialité  

## 13.3 Checklist déploiement Haïti

- [ ] Phase 1 modules formés  
- [ ] Runbook papier imprimé  
- [ ] Super-utilisateurs identifiés  
- [ ] Admin + support contactés  
- [ ] 19M.8 exécuté (1 phone + 1 tablet + 1 desktop)  
- [ ] Dépendance cloud expliquée au staff  

## 13.4 Checklist connectivité dégradée

- [ ] Staff informé (FR)  
- [ ] Pas de sortie sans vérif enregistrement  
- [ ] Pending sync revu  
- [ ] Papier si panne totale  
- [ ] Reconciliation planifiée  

## 13.5 Checklist appareil partagé

- [ ] Login personnel  
- [ ] Déconnexion fin quart  
- [ ] Pas mot de passe mémorisé public  
- [ ] Vol/perte : procédure connue  

## 13.6 Checklist sécurité mobile

- [ ] Pas photo écran dossier  
- [ ] Boutons save visibles  
- [ ] Documentation longue → bureau si possible  
- [ ] Résultats pending revus  

## 13.7 Checklist préparation opérationnelle quotidienne

- [ ] Tablettes chargées  
- [ ] Wi-Fi OK  
- [ ] Tableau urgences accessible  
- [ ] Papier secours disponible  
- [ ] Super-utilisateur de garde nommé  

---

# 14. Gouvernance du chapitre

## 14.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction clinique** | Politique appareil par rôle |
| **Admin établissement** | Inventaire, comptes, déploiement |
| **Référent 19M / produit** | Exactitude comportement responsive |
| **Référent terminologie** | [Canon](./french-terminology-canon.md) |

## 14.2 Lien initiative responsive

Toute phase 19M future → mise à jour chapitre + tests `frenchHandbookMobileTabletHaiti19MBookFr9.test.ts`.

## 14.3 Revue annuelle

Appareils, lacunes 19M, politique téléphone vs tablette.

## 14.4 Revue déploiement Haïti

**Semestrielle** : connectivité, papier, adoption tablette, incidents mauvais patient.

## 14.5 Gouvernance formation

Matrice appareil recommandé par rôle affichée au poste.

## 14.6 Politique appareils

Document local : qui peut utiliser téléphone seul ; exigence tablette chevet ; interdiction comptes partagés.

---

## Annexes

### A. Seuils responsive (aperçu staff)

| Seuil | Comportement |
|-------|--------------|
| &lt; 768 px | Mobile cartes |
| 768–1023 px | Tablette |
| ≥ 1024 px | Bureau dense + sidebar |

### B. Références

- [Volume 7 — Panne / cloud](./handbook-fr-administration-governance-operations.md)  
- `docs/ui/mobile-tablet-responsiveness-audit-19M1.md`  
- `docs/ui/cross-device-qa-checklist-19M8.md`  
- `docs/HAITI_MVP_PILOT.md`  
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`

### C. Placeholders visuels

- [CAPTURE D’ÉCRAN — Navigation mobile]  
- [CAPTURE D’ÉCRAN — Triage tablette]  
- [CAPTURE D’ÉCRAN — Documentation prestataire tablette]  
- [CAPTURE D’ÉCRAN — File pharmacie mobile]  
- [CAPTURE D’ÉCRAN — Workflow disposition mobile]  
- [DIAGRAMME — Déploiement Haïti]  
- [DIAGRAMME — Workflow connectivité dégradée]  
- [DIAGRAMME — Architecture responsive Medora]

---

*Fin du Volume 8 — M-BOOK.FR.9*


\newpage



<!-- SECTION: Volume 9 — Formation -->

# Volume 9 — Formation, intégration et certification opérationnelle

**Manuel d’orientation opérationnel Medora-S (français)**  
**Phase:** M-BOOK.FR.10  
**Version:** 1.0.0-draft  
**Statut:** Contenu formation / exploitation — ne modifie pas le comportement produit  
**Public:** Formateurs, responsables formation, superviseurs, administrateurs, direction pilote Haïti  
**Prérequis:** [Volumes 1–8](./handbook-fr-registration-intake.md) · [Canon terminologique](./french-terminology-canon.md)  
**Guide rédaction:** [Guide de style manuel](./french-handbook-style-guide.md)

---

## Métadonnées du volume

| Champ | Valeur |
|-------|--------|
| Volume | 9 — Formation, intégration et certification opérationnelle |
| Rôle | **Capstone** — orchestration formation sur la collection M-BOOK.FR |
| Volumes liés | 1 Accueil · 2 Triage · 3 Prestataire · 4 Infirmier · 5 Auxiliaires · 6 Orientation/ROI · 7 Admin · 8 Mobile/Haïti |
| Révision recommandée | Annuelle ou après changement majeur produit / déploiement |

---

# 1. Introduction à la formation Medora-S

## 1.1 Objectif de ce volume

Ce volume **ne remplace pas** les chapitres métier (Volumes 1–8). Il définit :

- **Qui** forme **qui**, **quand**, et **sur quels chapitres** ;
- Le parcours **d’intégration** (onboarding) par rôle ;
- La **certification opérationnelle interne** (attestation de compétence Medora à l’établissement) ;
- La gouvernance formation pour le **pilote Haïti**.

## 1.2 Philosophie formation

| Principe | Application |
|----------|-------------|
| **Sécurité patient d’abord** | Formation sur identité patient, escalade, panne |
| **Par rôle** | Moindre privilège — ne former que les modules nécessaires |
| **Pratique** | Exercices sur dossier test avant autonomie réelle |
| **Honnêteté produit** | Cloud-dépendant ; limites mobile ; pas de diagnostic auto |
| **Français UI** | Tout le personnel voit l’interface en français |

## 1.3 Certification opérationnelle — définition

> **La certification opérationnelle Medora** = attestation interne que le personnel a suivi la formation requise, réussi les vérifications pratiques définies par l’établissement, et peut utiliser Medora **en autonomie supervisée puis en autonomie** pour son rôle.

**Ce n’est pas :**

- Une licence professionnelle (médecine, infirmier, pharmacie) ;
- Une certification ESI internationale complète ;
- Une accréditation juridique ROI ou conformité nationale.

La direction de l’établissement **définit** le niveau d’autonomie après attestation.

## 1.4 Responsabilité institutionnelle

> **Medora-S fournit la documentation et les workflows. La direction et les responsables formation restent responsables du programme de formation, de la conformité locale et de la supervision clinique.**

---

# 2. Cartographie des volumes par rôle

## 2.1 Matrice curriculum (référence)

| Rôle | Volumes obligatoires | Volumes recommandés | Durée indicative |
|------|---------------------|---------------------|------------------|
| **Accueil / FRONT_DESK** | 1 | 8 (mobile), 7 (aperçu) | 0,5–1 j |
| **Infirmier(ère) triage / ED** | 1, 2, 4, 8 | 6 (aperçu sortie), 5 (aperçu) | 2–3 j |
| **Prestataire (médecin / IPS)** | 1, 2, 3, 6, 8 | 4 (coordination), 5 | 2–4 j |
| **Infirmier(ère) soins (sans triage)** | 1, 4, 8 | 2 (aperçu), 6 | 1,5–2 j |
| **Pharmacie** | 5, 8 | 1 (identité), 7 (aperçu) | 1 j |
| **Laboratoire** | 5, 8 | 1 (identité) | 0,5–1 j |
| **Imagerie** | 5, 8 | 1 (identité) | 0,5–1 j |
| **Administration** | 7, 6 (ROI), 8 | 1–3 (aperçu flux) | 2–3 j |
| **Super-utilisateur** | 1–8 | — | 5 j + mentorer |
| **Direction / formateur** | 1–8 + **ce Volume 9** | — | Continu |

## 2.2 Priorité P1 vs P2 (formation go-live)

| Priorité | Contenu | Quand |
|----------|---------|-------|
| **P1** | Accueil, triage, tableau, doc prestataire, soins, disposition, mobile base | Semaine 1–2 pilote |
| **P2** | Auxiliaires, ROI, admin avancé, carry-forward approfondi | Semaine 3+ |

Référence : [Inventaire workflows](./french-workflow-inventory.md).

## 2.3 Parcours patient type (fil conducteur formation)

```
Volume 1 Accueil → Volume 2 Triage → Tableau urgences
        → Volume 3 Prestataire → Volume 5 Ordres/résultats
        → Volume 4 Soins / réévaluation
        → Volume 6 Orientation + exécution sortie
```

Tous les rôles doivent **comprendre** ce fil, même s’ils ne maîtrisent qu’une étape.

[DIAGRAMME — Parcours formation par rôle]

---

# 3. Intégration (onboarding) — workflow standard

## 3.1 Avant le premier jour

| Étape | Responsable |
|-------|-------------|
| Compte créé + rôles assignés (Volume 7) | Admin |
| Appareil assigné (tablette / poste) | Admin + IT local |
| Accès dossier **formation** ou environnement test | Admin |
| Liste volumes à lire / parcours assigné | Formateur |

## 3.2 Jour 1 — Fondations

1. Connexion, sélecteur établissement, menu navigation (Volume 8) ;
2. **Identité patient** — ne jamais documenter sans vérifier (Volume 1) ;
3. Parcours rôle : chapitres obligatoires Volume(s) métier ;
4. Exercice guidé 1 : ouvrir dossier test, **sans** données réelles si possible.

## 3.3 Semaine 1 — Supervision

- Binôme avec super-utilisateur ou formateur ;
- Checklist quotidienne (section 12) ;
- Questions escaladées en debrief 15 min (Volume 8).

## 3.4 Semaine 2–4 — Montée autonomie

- Exercices scénarisés (section 8) ;
- Certification niveau 1 (section 6) ;
- Réduction supervision progressive selon politique locale.

## 3.5 Offboarding

- Désactivation compte jour de départ (Volume 7) ;
- Pas de transfert identifiants.

[CAPTURE D’ÉCRAN — Parcours intégration]

---

# 4. Niveaux de certification opérationnelle

## 4.1 Niveau 0 — Observation

- Assisté uniquement ; pas d’enregistrement autonome sur patient réel.

## 4.2 Niveau 1 — Autonomie supervisée

- Enregistrements sur patient réel **avec** super-utilisateur disponible ;
- Erreurs corrigées en debrief ;
- Attestation formateur après checklist niveau 1.

## 4.3 Niveau 2 — Autonomie routine

- Workflow complet du rôle sans supervision constante ;
- Escalade si cas complexe / panne / ROI ;
- Recertification annuelle (section 9).

## 4.4 Niveau 3 — Super-utilisateur / formateur

- Certifié niveau 2 + formation Volumes transverses ;
- Peut former et attester niveau 1 ;
- Point de contact escalade niveau 1.

## 4.5 Registre d’attestation (recommandé)

| Champ | Exemple |
|-------|---------|
| Nom | … |
| Rôle | RN, PROVIDER, … |
| Volumes complétés | 1, 2, 4, 8 |
| Niveau certifié | 1 ou 2 |
| Date | … |
| Formateur | … |
| Prochaine recertification | +12 mois |

Registre **papier ou outil local** — hors produit Medora MVP.

## 4.6 Limites explicites

La certification Medora **n’accorde pas** de droits cliniques au-delà du permis / cadre professionnel local.

---

# 5. Guide du formateur / facilitateur

## 5.1 Rôle formateur

- Adapter volumes 1–8 au contexte local ;
- Animer exercices pratiques ;
- Attester niveaux 1–2 ;
- Remonter ambiguïtés produit / documentation.

## 5.2 Préparation session

- [ ] Objectifs écrits (3 max) ;
- [ ] Dossier test prêt ;
- [ ] Appareils chargés + Wi-Fi testé ;
- [ ] Checklist sécurité rappelée (identité, déconnexion) ;
- [ ] Volume(s) PDF ou imprimés disponibles.

## 5.3 Méthodes pédagogiques

| Méthode | Usage |
|---------|--------|
| **Démonstration** | Navigation, enregistrement triage |
| **Pratique guidée** | Apprenant clique, formateur observe |
| **Scénario** | Cas standard + cas piège (mauvais patient) |
| **Debrief** | Erreurs sans blame — focus processus |

## 5.4 Pièges formation fréquents

- Former tout le monde sur tout (surcharge) ;
- Ignorer protocole papier (Volume 7–8) ;
- Promettre hors-ligne complet ;
- Oublier distinction orientation vs disposition (Volume 6) ;
- Oublier distinction décision prestataire vs exécution infirmière sortie (Volumes 3–4).

## 5.5 Évaluation formateur

Auto-évaluation après chaque session : objectifs atteints ? temps ? questions non résolues ?

---

# 6. Programme pilote Haïti

## 6.1 Contexte

- Effectifs réduits ;
- Connectivité variable ;
- Tablettes chevet ;
- Protocole papier obligatoire en parallèle.

## 6.2 Calendrier type (4 semaines)

| Semaine | Focus | Public |
|---------|-------|--------|
| **1** | Accueil, triage, tableau, mobile, panne papier | Accueil + triage + super-users |
| **2** | Prestataire + infirmier soins + disposition base | Médecins + IDE |
| **3** | Auxiliaires + observation + files | Pharma, labo, rad |
| **4** | Admin, ROI, recertification, debrief direction | Admin + leads |

## 6.3 Super-utilisateurs Haïti (minimum)

| Discipline | Nombre min. |
|------------|-------------|
| Infirmier | 2 |
| Médecin | 1 |
| Accueil | 1 |
| Admin | 1 |

## 6.4 Matériel formation

- 1 tablette formation + 1 poste fixe ;
- Runbook panne imprimé (français) ;
- Registre attestations ;
- Liste contacts support.

## 6.5 Critères go-live formation

- [ ] 80 % personnel P1 niveau 1 minimum ;
- [ ] 100 % super-utilisateurs niveau 3 ;
- [ ] Exercice panne papier réalisé ;
- [ ] Checklist 19M.8 exécutée (Volume 8).

Référence : `docs/HAITI_MVP_PILOT.md`.

[DIAGRAMME — Déploiement formation Haïti]

---

# 7. Programme super-utilisateur

## 7.1 Mission

- Premier niveau support ;
- Formation niveau 1 ;
- Escalade admin / opérateur ;
- Gardien des checklists.

## 7.2 Curriculum super-utilisateur

Volumes **1–8** complets + ce Volume 9 + runbooks panne/déploiement.

## 7.3 Compétences attendues

- Résoudre confusion navigation / rôle ;
- Identifier pending sync ;
- Activer protocole papier ;
- **Ne pas** modifier RBAC sans admin.

## 7.4 Relève

Documenter backup super-user par discipline — pas de point unique de défaillance.

---

# 8. Exercices pratiques et scénarios

## 8.1 Scénarios transverses (tous rôles)

| # | Scénario | Compétence |
|---|----------|------------|
| T1 | Mauvais patient — stop avant enregistrement | Identité |
| T2 | Réseau coupé — protocole papier | Continuité |
| T3 | Pending sync après reconnexion | Vérification |

## 8.2 Accueil

| # | Scénario | Volume |
|---|----------|--------|
| A1 | Nouveau patient + ouverture consultation urgence | 1 |
| A2 | Doublon suspect — escalade | 1 |

## 8.3 Triage

| # | Scénario | Volume |
|---|----------|--------|
| TR1 | Triage complet + ESI + allergies | 2 |
| TR2 | Carry-forward revu section par section | 2 |
| TR3 | Réévaluation ESI — patient qui empire | 2 |

## 8.4 Prestataire

| # | Scénario | Volume |
|---|----------|--------|
| P1 | HPI + MDM + pastille (édition obligatoire) | 3 |
| P2 | Orientation enregistrée + cohérence texte | 3, 6 |
| P3 | Intelligence motif — insertion manuelle seulement | 3 |

## 8.5 Infirmier

| # | Scénario | Volume |
|---|----------|--------|
| N1 | Réévaluation + MAR | 4 |
| N2 | Exécution sortie après orientation prestataire | 4, 6 |

## 8.6 Auxiliaires

| # | Scénario | Volume |
|---|----------|--------|
| X1 | File pharmacie — dispense + haut risque | 5 |
| X2 | Résultat labo + escalade selon protocole | 5 |

## 8.7 Admin

| # | Scénario | Volume |
|---|----------|--------|
| AD1 | Création compte + rôles minimum | 7 |
| AD2 | ROI demande → approbation → exercice sans exécution prod si test | 6, 7 |

---

# 9. Recertification et revue annuelle

## 9.1 Fréquence

- **Annuelle** niveau 2 ;
- **Immédiate** après changement majeur UI (19M, disposition, ROI) ;
- **À l’embauche** pour nouveaux — parcours complet onboarding.

## 9.2 Contenu recertification (light)

- 30 min rappel sécurité (identité, mobile, panne) ;
- 1 scénario pratique rôle ;
- Signature registre attestation.

## 9.3 Changements produit

Formateur communique delta ; session micro-formation 15 min avant prise de poste.

## 9.4 Échec recertification

Retour niveau 1 supervisé — pas de sanction automatique dans ce manuel ; politique RH locale.

---

# 10. Formation transversale obligatoire

## 10.1 Sécurité patient (tous)

- Identité patient ;
- Moindre privilège ;
- Comptes nominatifs interdits partagés ;
- Confidentialité écran (Volume 8).

## 10.2 Connectivité (tous)

- Medora **dépendant du cloud** ;
- Pending sync ;
- Vérification post-reconnexion ;
- Papier si panne.

## 10.3 Mobile (clinique)

- Tablette chevet vs bureau documentation longue (Volume 8).

## 10.4 Gouvernance sortie / ROI (cibles)

- Prestataire + infirmier : orientation vs exécution (Volumes 3–4–6) ;
- Admin : ROI Phase 5G (Volumes 6–7).

---

# 11. Évaluation des compétences

## 11.1 Modalités

| Modalité | Quand |
|----------|-------|
| **Observation directe** | Certification niveau 1 |
| **Scénario simulé** | Certification niveau 2 |
| **Checklist cochée** | Tous niveaux |
| **Debrief oral** | Complément |

Pas d’examen écrit long — **compétence opérationnelle** prime.

## 11.2 Critères minimum niveau 1 (exemple infirmier triage)

- [ ] Ouvre bon dossier ;
- [ ] Triage enregistré sans champ critique vide ;
- [ ] Carry-forward revu ;
- [ ] Identité vérifiée verbalement ;
- [ ] Sait escalader détresse.

## 11.3 Critères minimum niveau 2 (exemple prestataire)

- [ ] Documentation cohérente patient ;
- [ ] MDM personnalisé (pas texte brut template) ;
- [ ] Orientation enregistrée alignée texte ;
- [ ] Gère pending sync / panne selon protocole.

## 11.4 Traçabilité

Registre papier ou feuille locale — **attestation** signée formateur + apprenant.

---

# 12. Résumé opérationnel rapide — checklists

## 12.1 Checklist onboarding administrateur formation

- [ ] Registre attestations créé  
- [ ] Super-utilisateurs nommés  
- [ ] Dossier test disponible  
- [ ] Volumes 1–8 accessibles  
- [ ] Calendrier Haïti publié  

## 12.2 Checklist onboarding nouvel utilisateur

- [ ] Compte actif + bon établissement  
- [ ] Volumes assignés lus  
- [ ] Jour 1 exercice guidé  
- [ ] Checklist sécurité signée  
- [ ] Niveau 1 planifié  

## 12.3 Checklist session formateur

- [ ] Objectifs + scénario  
- [ ] Wi-Fi / appareils  
- [ ] Debrief prévu  
- [ ] Attestations mises à jour  

## 12.4 Checklist certification niveau 1

- [ ] Scénarios rôle réussis  
- [ ] Identité patient maîtrisée  
- [ ] Panne / papier expliqué  
- [ ] Registre signé  

## 12.5 Checklist certification niveau 2

- [ ] Autonomie semaine complète sans incident majeur  
- [ ] Recertification date notée  
- [ ] Super-user backup identifié  

## 12.6 Checklist recertification annuelle

- [ ] Rappel sécurité 30 min  
- [ ] 1 scénario  
- [ ] Delta produit communiqué  
- [ ] Registre à jour  

## 12.7 Checklist formation Haïti go-live

- [ ] Semaine 1–4 exécutée ou adaptée  
- [ ] Papier testé  
- [ ] 19M.8 passé  
- [ ] Direction debrief  

## 12.8 Checklist escalade formation

- [ ] Question documentée  
- [ ] Volume concerné identifié  
- [ ] Super-user ou admin contacté  
- [ ] Réponse partagée équipe si générique  

---

# 13. Gouvernance du chapitre

## 13.1 Propriété

| Rôle | Responsabilité |
|------|----------------|
| **Direction établissement** | Programme certification, autonomie |
| **Responsable formation** | Calendrier, registre, formateurs |
| **Super-utilisateurs** | Niveau 1, escalade |
| **Référent terminologie** | Cohérence Volumes 1–9 |

## 13.2 Revue annuelle collection M-BOOK

Mettre à jour matrices rôle ↔ volume si nouveaux modules.

## 13.3 Revue Haïti

Semestrielle : adoption, durées formation, ajustement calendrier.

## 13.4 Lien phases produit

19M, 19MDM, 5F/5G → module micro-formation + recertification ciblée.

## 13.5 Index des volumes

| Vol. | Phase | Titre | Fichier |
|------|-------|-------|---------|
| 1 | M-BOOK.FR.2 | Accueil et inscription | [handbook-fr-registration-intake.md](./handbook-fr-registration-intake.md) |
| 2 | M-BOOK.FR.3 | Triage et intake clinique | [handbook-fr-triage-clinical-intake.md](./handbook-fr-triage-clinical-intake.md) |
| 3 | M-BOOK.FR.4 | Workflow prestataire et documentation | [handbook-fr-provider-workflow-documentation.md](./handbook-fr-provider-workflow-documentation.md) |
| 4 | M-BOOK.FR.5 | Workflow infirmier et exécution sortie | [handbook-fr-nursing-discharge-execution.md](./handbook-fr-nursing-discharge-execution.md) |
| 5 | M-BOOK.FR.6 | Pharmacie, laboratoire et imagerie | [handbook-fr-pharmacy-lab-radiology.md](./handbook-fr-pharmacy-lab-radiology.md) |
| 6 | M-BOOK.FR.7 | Orientation, admission, transfert et ROI | [handbook-fr-disposition-admission-transfer-roi.md](./handbook-fr-disposition-admission-transfer-roi.md) |
| 7 | M-BOOK.FR.8 | Administration et gouvernance plateforme | [handbook-fr-administration-governance-operations.md](./handbook-fr-administration-governance-operations.md) |
| 8 | M-BOOK.FR.9 | Mobile, tablette et déploiement Haïti | [handbook-fr-mobile-tablette-haiti.md](./handbook-fr-mobile-tablette-haiti.md) |
| 9 | M-BOOK.FR.10 | Formation, intégration et certification | [handbook-fr-training-onboarding-certification.md](./handbook-fr-training-onboarding-certification.md) |

---

## Annexes

### A. Sigles formation

| Sigle | Signification |
|-------|---------------|
| **Onboarding** | Intégration initial |
| **SU** | Super-utilisateur |
| **P1 / P2** | Priorité manuel / go-live |

### B. Références

- [Canon terminologique](./french-terminology-canon.md)  
- [Inventaire workflows](./french-workflow-inventory.md)  
- `docs/HAITI_MVP_PILOT.md`  
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`  
- `docs/DEPLOYMENT_RUNBOOK.md`

### C. Placeholders visuels

- [CAPTURE D’ÉCRAN — Tableau de bord formation]  
- [CAPTURE D’ÉCRAN — Registre attestation]  
- [CAPTURE D’ÉCRAN — Session super-utilisateur]  
- [CAPTURE D’ÉCRAN — Exercice scénario triage]  
- [DIAGRAMME — Parcours formation par rôle]  
- [DIAGRAMME — Niveaux certification]  
- [DIAGRAMME — Calendrier Haïti 4 semaines]  
- [DIAGRAMME — Escalade formation]

---

*Fin du Volume 9 — M-BOOK.FR.10*


\newpage



<!-- SECTION: Annexe A — Haïti -->

# Annexe A — Déploiement Haïti

**Phase:** M-BOOK.FR.11  
**Statut:** Scaffold — contenu détaillé dans Volume 8 et Volume 9

---

## Objectif

Consolider les références déploiement pilote Haïti pour l'export enterprise.

---

## Contenu planifié (TODO)

### A.1 Contexte pilote

- [ ] Effectifs, connectivité, matériel  
- [ ] Référence `docs/HAITI_MVP_PILOT.md`

### A.2 Prérequis go-live

- [ ] Formation semaines 1–4 (Volume 9)  
- [ ] Super-utilisateurs nommés  
- [ ] Protocole papier testé  

### A.3 Checklist 19M.8

- [ ] Cross-device regression  
- [ ] Volume 8 § checklists

### A.4 Contacts et escalade

- [ ] Support local  
- [ ] Runbooks panne / déploiement  

---

## Références volumes

| Sujet | Volume |
|-------|--------|
| Mobile, tablette, connectivité | [Volume 8](../../handbook-fr-mobile-tablette-haiti.md) |
| Programme formation 4 semaines | [Volume 9](../../handbook-fr-training-onboarding-certification.md) |
| Accueil / triage terrain | Volumes 1–2 |

---

## Références externes

- `docs/HAITI_MVP_PILOT.md`  
- `docs/DEPLOYMENT_RUNBOOK.md`  
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`

---

*Annexe A — M-BOOK.FR.11*


\newpage



<!-- SECTION: Annexe B — Mobile -->

# Annexe B — Sécurité mobile et tablette

**Phase:** M-BOOK.FR.11  
**Statut:** Scaffold

---

## Objectif

Rappels sécurité pour usage tablette chevet et mobile en environnement clinique Haïti.

---

## Contenu planifié (TODO)

### B.1 Confidentialité écran

- [ ] Verrouillage appareil  
- [ ] Pas de partage session  
- [ ] Déconnexion fin de poste  

### B.2 Comptes nominatifs

- [ ] Interdiction comptes partagés  
- [ ] Volume 9 § formation transversale  

### B.3 Appareils perdus / volés

- [ ] Procédure escalade admin  
- [ ] Désactivation compte  

### B.4 Connectivité

- [ ] Pending sync — vérification post-reconnexion  
- [ ] Medora **dépendant du cloud**  

---

## Références

- [Volume 8 — Mobile et Haïti](../../handbook-fr-mobile-tablette-haiti.md)  
- [07-index-captures-ecran.md](../07-index-captures-ecran.md) — viewports tablette/mobile

---

*Annexe B — M-BOOK.FR.11*


\newpage



<!-- SECTION: Annexe C — Référence rapide -->

# Annexe C — Référence rapide

**Phase:** M-BOOK.FR.11  
**Statut:** Scaffold

---

## Objectif

Fiches une page par rôle pour impression / laminage poste.

---

## Contenu planifié (TODO)

### C.1 Accueil (FRONT_DESK)

- [ ] Routes : `/app/registration`, `/app/patients`  
- [ ] Règle identité patient  
- [ ] Volume 1 checklist  

### C.2 Triage (RN)

- [ ] Routes : `/app/emergency/triage`, `/app/emergency/trackboard`  
- [ ] ESI — escalade détresse  
- [ ] Volume 2 checklist  

### C.3 Médecin (PROVIDER)

- [ ] Routes : `/app/provider`, `/app/emergency/active/{id}`  
- [ ] Orientation vs disposition  
- [ ] Volume 3 checklist  

### C.4 Infirmier soins (RN)

- [ ] Routes : `/app/nursing`  
- [ ] Exécution sortie ≠ décision prestataire  
- [ ] Volume 4 checklist  

### C.5 Admin

- [ ] Routes : `/app/admin`  
- [ ] ROI — ne pas improviser  
- [ ] Volume 7 checklist  

---

## Références

- [Index routes](../05-index-routes.md)  
- [Index workflows](../04-index-workflows.md)  
- Volume 9 — checklists §12

---

*Annexe C — M-BOOK.FR.11*


\newpage



<!-- SECTION: Annexe D — Scénarios -->

# Annexe D — Scénarios de formation

**Phase:** M-BOOK.FR.11  
**Statut:** Scaffold — scénarios détaillés dans Volume 9 §8

---

## Objectif

Index centralisé des exercices pratiques pour formateurs.

---

## Scénarios transverses (tous rôles)

| ID | Scénario | Volume source |
|----|----------|---------------|
| T1 | Mauvais patient — stop avant enregistrement | Vol. 9 §8.1 |
| T2 | Réseau coupé — protocole papier | Vol. 9 §8.1 |
| T3 | Pending sync après reconnexion | Vol. 9 §8.1 |

---

## Par rôle (TODO expansion)

- [ ] Accueil A1–A2 → Volume 9 §8.2  
- [ ] Triage TR1–TR3 → Volume 9 §8.3  
- [ ] Prestataire P1–P3 → Volume 9 §8.4  
- [ ] Infirmier N1–N2 → Volume 9 §8.5  
- [ ] Auxiliaires X1–X2 → Volume 9 §8.6  
- [ ] Admin AD1–AD2 → Volume 9 §8.7  

---

## Références

- [Volume 9 — Formation](../../handbook-fr-training-onboarding-certification.md)  
- [08-index-diagrammes.md](../08-index-diagrammes.md) — diagrammes formation

---

*Annexe D — M-BOOK.FR.11*


\newpage



<!-- SECTION: Annexe E — Panne papier -->

# Annexe E — Workflow papier / panne (downtime)

**Phase:** M-BOOK.FR.11  
**Statut:** Scaffold

---

## Objectif

Documenter la continuité de soins lorsque Medora est indisponible — **sans prétendre à un mode offline produit**.

---

## Principes

| Principe | Détail |
|----------|--------|
| **Cloud-dépendant** | Medora MVP nécessite connectivité pour synchronisation |
| **Papier parallèle** | Protocole institutionnel obligatoire en pilote Haïti |
| **Reconciliation** | Saisie différée après reconnexion — vérifier pending sync |
| **Pas de contournement RBAC** | Papier ne remplace pas contrôles admin |

---

## Contenu planifié (TODO)

### E.1 Déclencheurs activation papier

- [ ] Perte réseau prolongée  
- [ ] Indisponibilité service cloud  
- [ ] Volume 8 + runbook panne  

### E.2 Formulaires papier recommandés

- [ ] Triage  
- [ ] Ordres médicaments  
- [ ] Sortie / orientation  

### E.3 Reconnexion

- [ ] Vérification pending sync  
- [ ] Débrief équipe  

---

## Références externes

- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`  
- [Volume 8](../../handbook-fr-mobile-tablette-haiti.md)  
- [08-index-diagrammes.md](../08-index-diagrammes.md) — D-14 connectivité dégradée

---

*Annexe E — M-BOOK.FR.11*


\newpage



<!-- SECTION: Gouvernance documentaire -->

# Gouvernance documentaire — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11  
**Section:** VI.1  

---

## 1. Objectif

Définir comment la collection **M-BOOK.FR** est versionnée, revue, traduite et préparée pour export — sans modifier le comportement produit Medora-S.

---

## 2. Périmètre de la collection

| Composant | Emplacement | Phase origine |
|-----------|-------------|---------------|
| Canon terminologique | `docs/operations/french-terminology-canon.md` | M-BOOK.FR.1 |
| Inventaire workflows | `docs/operations/french-workflow-inventory.md` | M-BOOK.FR.1 |
| Registre risques | `docs/operations/french-terminology-risks.md` | M-BOOK.FR.1 |
| Volumes 1–9 | `docs/operations/handbook-fr-*.md` | M-BOOK.FR.2–10 |
| Assemblage enterprise | `docs/operations/medora-enterprise-handbook-fr/` | M-BOOK.FR.11 |
| Manifeste machine | `handbook-manifest-fr.ts` | M-BOOK.FR.11 |

---

## 3. Stratégie de versionnement

| Niveau | Format | Exemple |
|--------|--------|---------|
| **Collection** | `M-BOOK.FR.{n}` | M-BOOK.FR.11 |
| **Volume** | `1.0.0-draft` → `1.0.0` | Approbation direction |
| **Assemblage** | Aligné sur dernier volume majeur | 1.0.0-draft |
| **Canon** | `MBOOK_FR1_CANON_VERSION` | Trace machine |

**Règles :**

1. Toute modification substantielle d'un volume incrémente sa version mineure.  
2. L'assemblage enterprise (FR.11) est mis à jour lors de l'ajout de volumes ou index.  
3. Le manifeste TypeScript doit refléter les chemins source à jour.  
4. Tests source-level (`frenchHandbook*19MBookFr*.test.ts`) bloquent les régressions documentation.

---

## 4. Revue annuelle

| Document | Fréquence | Responsable |
|----------|-----------|-------------|
| Volumes opérationnels 1–9 | Annuelle | Responsable formation + référent clinique |
| Canon terminologique | Annuelle ou post-changement UI majeur | Référent terminologie |
| Index routes / workflows | Semestrielle | Admin + formateur |
| Inventaires visuels | À chaque campagne capture | Direction + IT |
| Registre risques | Trimestrielle (revue légère) | Référent terminologie |

**Déclencheurs revue immédiate :**

- Initiative **19M** (responsive) — layout change  
- **19T** carry-forward — workflow change  
- **19MDM** — intelligence motif change  
- Phase **5F/5G** — export / ROI change  
- Déploiement nouvelle clinique  

---

## 5. Propriété et responsabilités

| Rôle | Responsabilité |
|------|----------------|
| **Direction établissement** | Approbation contenu formation, autonomie certification |
| **Direction clinique pilote** | Exactitude workflows, protocoles locaux |
| **Responsable formation** | Calendrier, registre attestation, formateurs |
| **Administrateur Medora** | Exactitude routes, RBAC, captures environnement test |
| **Référent terminologie** | Canon, glossaire, cohérence FR |
| **Éditeur technique** | Assemblage, export PDF/DOCX, manifeste |

> Medora-S fournit la documentation. L'établissement reste responsable de l'adaptation aux politiques locales.

---

## 6. Gouvernance traduction (édition anglaise future)

| Principe | Application |
|----------|-------------|
| **FR = canon opérationnel** | Édition française authoritative pour Haïti |
| **EN = support dev / partenaires** | Traduction après stabilisation FR |
| **Clés i18n** | `en.ts` / `fr.ts` — pas de duplication manuel |
| **Workflow traduction** | 1) Gel volume FR · 2) Revue · 3) Traduction · 4) Validation clinique EN · 5) Publication séparée |
| **Sigles cliniques** | Conservés (ESI, HPI) avec expansion |

**Ne pas** publier d'édition EN avant revue direction du volume FR correspondant.

---

## 7. Politique refresh captures d'écran

| Événement | Action |
|-----------|--------|
| Changement UI majeur (19M) | Re-capture priorités P1 |
| Nouvelle route nav | Mise à jour index routes + capture si P1 |
| Revue annuelle | Audit inventaire §07 — complétude |
| PHI incident | Retrait immédiat + re-capture |

Voir [07-index-captures-ecran.md](./07-index-captures-ecran.md) — **patient fictif obligatoire**.

---

## 8. Cadence revue déploiement

| Cadence | Activité |
|---------|----------|
| **Pré go-live** | Checklist export + formation Haïti (Volume 9) |
| **J+30 post go-live** | Debrief formation, ajustement calendrier |
| **Semestrielle Haïti** | Volume 8 + Annexe A — connectivité, papier |
| **Annuelle** | Recertification personnel (Volume 9) |

Références : `docs/DEPLOYMENT_RUNBOOK.md` · `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`

---

## 9. Cadence revue Haïti

| Sujet | Fréquence |
|-------|-----------|
| Adoption tablettes / connectivité | Semestrielle |
| Protocole papier | Annuelle (exercice obligatoire) |
| Titres professionnels (IDE, IPS) | À l'embauche + annuelle |
| Super-utilisateurs backup | Trimestrielle |

Référence : `docs/HAITI_MVP_PILOT.md`

---

## 10. Intégrité et tests

| Mécanisme | Description |
|-----------|-------------|
| Tests source-level | Validation présence sections, routes, canon |
| Manifeste TS | Métadonnées volumes pour tooling export |
| `pnpm verify:web` | Pas de régression TypeScript web |
| Revue pair | Deux lecteurs pour volumes gouvernance (6, 7, 9) |

---

## 11. Export et distribution

| Format | Usage | Checklist |
|--------|-------|-----------|
| **PDF** | Formation imprimée, direction | [export-readiness-checklist.md](./exports/export-readiness-checklist.md) |
| **DOCX** | Édition locale, commentaires | Idem |
| **Markdown repo** | Source de vérité développement | Git |

---

## 12. Limites explicites

Ce cadre documentaire :

- **Ne remplace pas** les politiques institutionnelles ni le jugement clinique ;  
- **Ne certifie pas** légalement le personnel (certification = attestation interne Vol. 9) ;  
- **Ne garantit pas** un mode hors-ligne complet — Medora reste **dépendant du cloud** en MVP.

---

## Références

- [Table des matières](./01-table-des-matieres.md)  
- [Manifeste](./handbook-manifest-fr.ts)  
- Volume 9 — formation et certification

---

*Fin gouvernance documentaire — M-BOOK.FR.11*


\newpage

