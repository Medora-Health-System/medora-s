# Medora-S — Inventaire des workflows (préparation manuel FR)

**Phase:** M-BOOK.FR.1  
**Statut:** Inventaire opérationnel — pas de modification produit  
**Usage:** Priorisation rédaction manuel, formation Haïti, évaluation risque

Légende : **Complexité** (1 faible → 5 élevée) · **Mobile** (Oui = utilisable tablette/téléphone en pratique) · **Risque** (impact erreur opérationnelle/clinique)

---

## 1. Registration / Accueil

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Accueil et inscription patient |
| **Rôles** | Personnel d’accueil, administrateur |
| **Résumé** | Recherche ou création patient, assurances, feuille de face, démarrage visite |
| **Complexité** | 3 |
| **Mobile** | Partiel (recherche, consultation dossier) |
| **Risque** | Élevé (identité patient, doublons) |
| **Priorité manuel** | **P1** — premier contact |

Clés i18n : `nav.registration`, `registrationHome.*`, `registrationWorkspace.*`

---

## 2. Triage urgences

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Triage aux urgences |
| **Rôles** | Infirmier(ère) de triage |
| **Résumé** | Accueil consultation urgence, signes vitaux, ESI, allergies, motif, enregistrement |
| **Complexité** | 4 |
| **Mobile** | Oui (saisie au poste triage) |
| **Risque** | Critique (sous-triage, données vitales) |
| **Priorité manuel** | **P1** |

Clés : `nav.emergencyTriage`, `erTriage.*`, `emergencyTriageIntake.*`

---

## 3. Tableau des urgences (trackboard)

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Tableau des urgences |
| **Rôles** | Infirmier, médecin, superviseur |
| **Résumé** | Vue consultations ouvertes, affectations, LOS, badges disposition, accès dossier |
| **Complexité** | 3 |
| **Mobile** | Oui (consultation, assignation) |
| **Risque** | Élevé (visibilité effectifs, boarding) |
| **Priorité manuel** | **P1** |

Clés : `nav.emergency`, `emergencyTrackboard.*`, `clinicalTrackboardPage.*`

---

## 4. Documentation médecin (provider)

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Documentation médicale aux urgences |
| **Rôles** | Médecin, IPS |
| **Résumé** | HPI, ROS, examen, MDM, modèles, intelligence motif (insertion), dictée |
| **Complexité** | 5 |
| **Mobile** | Oui (layout responsive 19M) |
| **Risque** | Critique (dossier médico-légal) |
| **Priorité manuel** | **P1** |

Clés : `providerDocumentationWorkspace.*`, `erMseProviderPanel.*`

---

## 5. Ordres (prescriptions / demandes)

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Prescription et demandes |
| **Rôles** | Médecin, infirmier (certains ordres), pharmacien |
| **Résumé** | Médicaments, labo, imagerie, procédures ; priorités ; attribution |
| **Complexité** | 4 |
| **Mobile** | Partiel |
| **Risque** | Critique |
| **Priorité manuel** | **P1** |

---

## 6. Soins infirmiers

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Soins infirmiers et réévaluation |
| **Rôles** | Infirmier(ère) ED |
| **Résumé** | Documentation soins, réévaluation, exécution sortie, signaux d’alerte |
| **Complexité** | 4 |
| **Mobile** | Oui |
| **Risque** | Élevé |
| **Priorité manuel** | **P1** |

Clés : `nav.nursing`, `emergencyNursing*`, `emergencyChart.*`

---

## 7. Pharmacie

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | File pharmacie et délivrance |
| **Rôles** | Pharmacien, technicien |
| **Résumé** | Vérification ordres, dispense, stock, alertes |
| **Complexité** | 3 |
| **Mobile** | Faible |
| **Risque** | Critique ( médication ) |
| **Priorité manuel** | **P2** |

Clés : `nav.pharmacyQueue`, `pharmacy*`

---

## 8. Laboratoire

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | File laboratoire |
| **Rôles** | Technicien labo |
| **Résumé** | Réception demandes, statuts, résultats, réconciliation |
| **Complexité** | 3 |
| **Mobile** | Partiel |
| **Risque** | Élevé |
| **Priorité manuel** | **P2** |

Clés : `nav.labWorklist`, `lab.*`

---

## 9. Imagerie

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | File imagerie |
| **Rôles** | Technicien imagerie, radiologue (selon site) |
| **Résumé** | Demandes, réalisation, compte-rendu, résultats critiques |
| **Complexité** | 3 |
| **Mobile** | Partiel |
| **Risque** | Élevé |
| **Priorité manuel** | **P2** |

Clés : `nav.radWorklist`, `radiology.*`

---

## 10. Disposition / sortie

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Orientation et sortie |
| **Rôles** | Médecin (décision), infirmier (exécution), accueil |
| **Résumé** | Décision orientation, dossier sortie, LAMA/LWBS, clôture consultation |
| **Complexité** | 5 |
| **Mobile** | Partiel |
| **Risque** | Critique |
| **Priorité manuel** | **P1** |

Clés : `emergencyDisposition.*`, `emergencyErClosure.*`, modèles sortie (gouvernés)

---

## 11. Admission / observation

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Admission en observation et court séjour |
| **Rôles** | Médecin, infirmier, accueil |
| **Résumé** | Décision admission, dossier admission, tableau observation, handoff |
| **Complexité** | 4 |
| **Mobile** | Partiel |
| **Risque** | Élevé |
| **Priorité manuel** | **P1** |

Clés : `nav.hospitalisation`, `encounter.types.INPATIENT`, `observation*`

---

## 12. Transfert

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Transfert inter-établissement |
| **Rôles** | Médecin, infirmier, administration |
| **Résumé** | Documentation transfert, EMTALA si applicable, acceptation |
| **Complexité** | 4 |
| **Mobile** | Faible |
| **Risque** | Critique |
| **Priorité manuel** | **P2** |

---

## 13. ROI (dévoilement dossier)

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Dévoilement de dossier (ROI) |
| **Rôles** | Administration, dossiers médicaux |
| **Résumé** | Demandes accès, approbation, audit, surveillance |
| **Complexité** | 3 |
| **Mobile** | Faible |
| **Risque** | Élevé (confidentialité) |
| **Priorité manuel** | **P2** |

Clés : `roi.*`, `nav.adminRoi`, `adminHub.roiWorkflowLink`

---

## 14. Administration

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Administration système |
| **Rôles** | Administrateur |
| **Résumé** | Utilisateurs, audit, santé système, exports, gouvernance médicaments |
| **Complexité** | 4 |
| **Mobile** | Faible |
| **Risque** | Élevé (sécurité) |
| **Priorité manuel** | **P2** |

Clés : `nav.admin*`, `adminHub.*`

---

## 15. Workflow mobile / tablette

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Navigation mobile et saisie terrain |
| **Rôles** | Tous (contexte) |
| **Résumé** | Menu drawer, touch targets, layouts 19M responsive |
| **Complexité** | 2 |
| **Mobile** | Oui |
| **Risque** | Moyen (ergonomie) |
| **Priorité manuel** | **P1** (transversal) |

Clés : `appShell.mobile*`, tests `AppShellMobileNav19M2.test.ts`

---

## 16. Historique longitudinal

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Historique longitudinal patient |
| **Rôles** | Médecin, infirmier (lecture) |
| **Résumé** | Antécédents multi-visites, reprise triage |
| **Complexité** | 3 |
| **Mobile** | Partiel |
| **Risque** | Moyen |
| **Priorité manuel** | **P2** |

Doc : `docs/clinical/longitudinal-history-production-validation-19T4.md`

---

## 17. Intelligence motif (complaint intelligence)

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Inserts cliquables par motif (intelligence motif) |
| **Rôles** | Médecin |
| **Résumé** | Pastilles HPI/ROS/MDM par sous-groupe ; insertion manuelle ; 8 sous-groupes canon |
| **Complexité** | 3 |
| **Mobile** | Oui |
| **Risque** | Moyen (mal compris comme diagnostic auto) |
| **Priorité manuel** | **P2** — encadré formation |

Clés : `providerDocumentationWorkspace.complaintIntel*`, `templateSubgroup*`

---

## 18. Reprise triage / réconciliation carry-forward

| Champ | Valeur |
|-------|--------|
| **Nom workflow (FR)** | Reprise des données triage |
| **Rôles** | Médecin, infirmier |
| **Résumé** | Pré-remplissage depuis triage ; réconciliation brouillons |
| **Complexité** | 3 |
| **Mobile** | Oui |
| **Risque** | Moyen |
| **Priorité manuel** | **P2** |

---

## Matrice priorité manuel (synthèse)

| Priorité | Workflows |
|----------|-----------|
| **P1** | Accueil, triage, tableau urgences, documentation médecin, soins infirmiers, disposition/sortie, observation, mobile transversal |
| **P2** | Pharmacie, labo, imagerie, transfert, ROI, admin, historique, intelligence motif, carry-forward |

---

## Séquence recommandée rédaction (M-BOOK.FR.2)

1. Glossaire + cartographie rôles (canon)  
2. Parcours patient type ED (accueil → triage → tableau → médecin → ordres → résultats → disposition)  
3. Soins infirmiers et réévaluation  
4. Observation / court séjour  
5. Files auxiliaires (pharmacie, labo, imagerie)  
6. Administration, ROI, dépannage  
7. Annexes sigles + index

---

## Références

- [french-terminology-canon.md](./french-terminology-canon.md)  
- [french-handbook-style-guide.md](./french-handbook-style-guide.md)  
- `docs/ER_PILOT_OPERATIONS_SOP.md`  
- `docs/HAITI_MVP_PILOT.md`
