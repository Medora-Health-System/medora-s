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
