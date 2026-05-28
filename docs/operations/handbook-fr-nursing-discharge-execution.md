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
