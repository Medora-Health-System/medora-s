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
