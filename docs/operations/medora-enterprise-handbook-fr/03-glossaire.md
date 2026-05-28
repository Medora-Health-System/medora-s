# Glossaire — Manuel entreprise Medora-S (FR)

**Phase:** M-BOOK.FR.11  
**Section:** I.2  
**Source canonique:** [french-terminology-canon.md](../french-terminology-canon.md)  
**Registre risques:** [french-terminology-risks.md](../french-terminology-risks.md)

Ce glossaire **consolide** les termes opérationnels pour l'assemblage enterprise. En cas de conflit, le canon terminologique prévaut.

---

## 1. Terminologie Medora de base

| Terme (EN) | Terme français officiel | Définition opérationnelle | Volume(s) |
|------------|-------------------------|---------------------------|-----------|
| Patient | Patient | Personne identifiée dans le dossier | 1 |
| Encounter | Consultation | Instance de prise en charge liée à une visite | 1, 3 |
| Visit | Visite | Épisode administratif ou clinique | 1 |
| ED encounter | Consultation d'urgence | Type EMERGENCY — parcours ED complet | 1, 2 |
| Urgent care | Consultation de soins urgents | Type URGENT_CARE | 1 |
| Clinic visit | Consultation clinique | Type OUTPATIENT | 1 |
| Triage | Triage | Évaluation initiale gravité + accueil urgences | 2 |
| Trackboard | Tableau des urgences | Vue consultations ouvertes | 1, 2, 8 |
| Reassessment | Réévaluation | Nouvelle évaluation clinique après intervalle | 2, 4 |
| Chief complaint | Motif de consultation | Raison principale de la visite | 2, 3 |
| Orders | Ordres ; Prescriptions / demandes | Médicaments, labo, imagerie | 3, 5 |
| Results | Résultats | Valeurs labo / comptes-rendus imagerie | 5 |
| Follow-up | Suivi | Continuité après la visite | 1, 6 |
| Task queue | File de travail ; File | Liste ordonnée tâches département | 5 |
| Assignment | Attribution ; Affectation | Médecin / infirmier responsable | 2, 4 |
| Escalation | Escalade | Montée en charge équipe / supervision | 2, 4, 8 |
| Boarding | Attente de lit ; Séjour prolongé | Délai long aux urgences sans orientation | 2, 6 |
| Critical patient | Patient critique | ESI 1–2 ou gravité équivalente | 2 |

---

## 2. Orientation, disposition et sortie

| Terme | Terme français | Notes | Volume(s) |
|-------|----------------|-------|-----------|
| Disposition (decision) | **Orientation** | Acte décisionnel médical | 3, 6 |
| Disposition (panel) | **Disposition** | Panneau / zone dossier / synthèse | 3, 6 |
| Discharge (decision) | Sortie (décision) | Décision prestataire | 3, 6 |
| Discharge execution | Exécution sortie | Acte infirmier distinct | 4, 6 |
| Observation | Observation ; Observation et court séjour | Prise en charge prolongée | 6 |
| Admission | Admission | Décision admission observation | 6 |
| Transfer | Transfert | Vers autre établissement | 6 |
| Return precautions | Consignes de retour ; Signes d'alarme | Instructions réévaluation si aggravation | 3, 4, 6 |
| LWBS | Départ avant fin de prise en charge | Acronyme US — expansion FR en formation | 6 |
| LAMA | Contre avis médical (LAMA) | Sortie contre avis | 6 |

**Règle canon :** ne pas confondre **orientation** (décision) et **disposition** (panneau).

---

## 3. Documentation clinique

| Sigle / terme | Terme français | Notes |
|---------------|----------------|-------|
| HPI | Histoire de la maladie (HPI) | Sigle autorisé |
| ROS | Revue des systèmes (ROS) ; Revue ciblée | ED : revue ciblée |
| Physical exam | Examen physique | — |
| MDM | Aide à la décision médicale (MDM) | Sigle entre parenthèses |
| Clinical impression | Impression clinique | — |
| Differential diagnosis | Diagnostic différentiel | — |
| Red flags | Signaux d'alerte ; Signes d'alarme | Éviter « red flags » en UI FR |
| Provider documentation | Documentation médicale | Section médecin ED |
| Shared planning | Planification partagée ; Dossier partagé | Champs communs équipe |

---

## 4. Triage et soins infirmiers

| Terme | Terme français | Notes |
|-------|----------------|-------|
| ESI | Indice ESI ; Gravité triage ESI | Sigle conservé |
| Pain scale | Échelle de douleur | Protocole local |
| MAR | Administration de médicament | Acte infirmier |
| Nursing care | Soins infirmiers | Volume 4 |
| Discharge execution | Exécution sortie ; Exécution équipe | ≠ décision médicale |
| IDE | Infirmier(ère) diplômé(e) d'État | Contexte Haïti — UI : Infirmier(ère) |

---

## 5. Carry-forward et historique (19T)

| Terme | Terme français | Définition |
|-------|----------------|------------|
| Carry-forward history | Reprise d'antécédents ; Antécédents repris | Données triage reprises en documentation |
| Longitudinal history | Historique longitudinal | Vue multi-consultations |
| Reconciliation | Réconciliation | Revue section par section obligatoire |
| Clinical history | Antécédents cliniques | Allergies, médicaments, problèmes actifs |

**Gouvernance 19T :** la reprise assiste la saisie ; le clinicien **valide** chaque section.

---

## 6. Intelligence motif (19MDM)

| Terme | Terme français | Règle |
|-------|----------------|-------|
| Complaint intelligence | Intelligence motif (inserts cliquables) | Aide saisie — **pas** diagnostic auto |
| Clickable inserts | Pastilles cliquables | Insertion **manuelle** |
| Template subgroup | Sous-groupe de motif | 8 sous-groupes canon (manifeste) |
| Discharge template | Modèle de sortie | Gabarit gouverné — distinct registre |

**Interdit en formation :** « appliquer automatiquement », « diagnostic suggéré par le système ».

---

## 7. ROI, audit et gouvernance

| Terme | Terme français | Notes |
|-------|----------------|-------|
| ROI | Dévoilement de dossier (ROI) | Workflow audité Phase 5G |
| Chart export | Export du dossier | Phase 5F |
| Audit log | Journal d'audit | Actions sensibles |
| Clinical governance | Gouvernance clinique | Modèles, garde-fous |
| Pending results | Résultats en attente | Analyses non finalisées |
| Pending sync | Synchronisation en attente | Post-reconnexion — vérifier |

---

## 8. Mobile, tablette et connectivité

| Terme | Terme français | Notes |
|-------|----------------|-------|
| Mobile nav | Navigation mobile | Drawer, menu principal |
| Touch target | Zone tactile | Initiative 19M |
| Responsive layout | Mise en page responsive | 19M.1–19M.9 |
| Cloud-dependent | Dépendant du cloud | Pas de mode offline complet MVP |
| Paper protocol | Protocole papier | Continuité panne |
| Bedside tablet | Tablette chevet | Usage clinique Haïti |

---

## 9. Rôles (libellés formation)

| Rôle (EN) | Terme français | Route landing typique |
|-----------|------------------|----------------------|
| FRONT_DESK | Personnel d'accueil | `/app/registration` |
| RN | Infirmier(ère) | `/app/nursing` |
| PROVIDER | Médecin ; Professionnel de santé | `/app/provider` |
| PHARMACY | Pharmacien | `/app/pharmacy-worklist` |
| LAB | Technicien de laboratoire | `/app/lab-worklist` |
| RADIOLOGY | Technicien en imagerie | `/app/rad-worklist` |
| ADMIN | Administrateur | `/app/admin` |
| BILLING | Facturation | `/app/billing` |

---

## 10. Abréviations approuvées (aperçu)

Liste complète : [06-index-acronymes.md](./06-index-acronymes.md)

| Sigle | Expansion FR |
|-------|--------------|
| ED | Urgences (service) |
| UC | Soins urgents |
| ESI | Échelle de gravité infirmière (Emergency Severity Index) |
| HPI | Histoire de la maladie |
| ROS | Revue des systèmes |
| MDM | Aide à la décision médicale |
| ROI | Dévoilement de dossier (Release of Information) |
| PMH | Antécédents médicaux |
| PSH | Antécédents chirurgicaux |
| EMTALA | Loi fédérale US transferts urgences — contexte pilote |

---

## Références

- [Canon terminologique complet](../french-terminology-canon.md)  
- [Manifeste machine](./handbook-manifest-fr.ts)  
- [Index acronymes](./06-index-acronymes.md)

---

*Fin glossaire — M-BOOK.FR.11*
