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
| Conversion **classification facturation** UC → Urgences (ED) sur **même consultation** | **Disponible** (Phase 19UCED.1) — acte explicite, motif + reconnaissance patient |
| Conversion manuelle type de consultation UC → EMERGENCY en un clic | **Non disponible** — le type clinique `Encounter.type` reste distinct ; la classification facturation peut changer |
| Déclenchement auto par motif de consultation | **Non** — jamais |

**Conséquence :** la conversion UC → ED **facturation** préserve **un seul dossier / une seule consultation** — pas de nouvelle consultation, pas de réinitialisation triage ni documentation. Pour les établissements hybrides, utiliser l’action explicite « Convertir UC → Urgences (facturation) » avec reconnaissance patient.

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
Conversion de la **classification facturation** en URGENCES (ED)
        ↓
Même consultation Medora — même chart — documentation continue
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
