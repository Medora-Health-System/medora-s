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
