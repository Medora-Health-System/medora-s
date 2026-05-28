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
