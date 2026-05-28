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
