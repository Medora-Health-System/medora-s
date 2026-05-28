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
