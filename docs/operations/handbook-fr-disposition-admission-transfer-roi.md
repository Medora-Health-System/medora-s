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
