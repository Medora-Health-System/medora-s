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
