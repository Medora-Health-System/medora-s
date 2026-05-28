# Medora-S — Canon terminologique français opérationnel

**Phase:** M-BOOK.FR.1  
**Statut:** Gouvernance / documentation — pas de modification de comportement clinique  
**Public:** Formation, exploitation, rédaction du manuel d’orientation entreprise, déploiement Haïti  
**Source de vérité machine:** `apps/web/src/i18n/messages/frenchTerminologyCanonManifest.ts`

---

## Principe directeur

Medora-S est un produit **français d’abord** pour le personnel clinique et administratif. L’anglais reste autorisé pour :

- identifiants code, routes, champs API/Prisma ;
- abréviations cliniques ou réglementaires **explicitement approuvées** (voir annexe A) ;
- contenu libre saisi par les utilisateurs (Class C/D selon `docs/ui/language-separation-architecture.md`).

Ce canon fixe le **libellé opérationnel officiel** pour le manuel entreprise. Il ne remplace pas les chaînes persistées ni les constantes backend.

---

## Section 1 — Terminologie Medora de base

| Concept (EN) | Terme français officiel | Alternatives interdites (UI) | Définition opérationnelle | Notes d’usage |
|--------------|-------------------------|------------------------------|---------------------------|---------------|
| **Patient** | Patient | Usager (sauf contexte MSPP spécifique) | Personne identifiée dans le dossier | Conserver « Patient » ; NIR pour MRN |
| **Encounter** | Consultation | Rencontre, épisode (sauf export technique) | Instance de prise en charge liée à une visite | Féminin : « consultation ouverte / terminée » |
| **Visit** | Visite | Passage (informel) | Épisode administratif ou clinique du patient | Accueil : « démarrer une visite » ; clinique : « consultation » |
| **ED encounter** | Consultation d’urgence | Urgence seule (nom) | Consultation de type EMERGENCY | Ne pas afficher `(EMERGENCY)` brut à l’utilisateur |
| **Urgent care visit** | Consultation de soins urgents | — | Type URGENT_CARE | Libellé UI : « Soins urgents / intensifs » |
| **Clinic visit** | Consultation clinique | — | Type OUTPATIENT | Libellé UI : « Clinique » |
| **Disposition** | **Orientation** (décision) ; **Disposition** (panneau / dossier) | Sortie seule (pour la décision globale) | Décision médicale d’issue : domicile, observation, transfert, etc. | **Orientation** = acte décisionnel ; **Disposition** = zone dossier / synthèse |
| **Observation** | Observation ; Observation et court séjour | Hospitalisation (UI grand public) | Prise en charge prolongée sans unité de soins complets | Voir `docs/OBSERVATION_POSITIONING.md` |
| **Transfer** | Transfert | Évacuation (sauf protocole local documenté) | Orientation vers un autre établissement | Toujours avec contexte « autre établissement » si ambigu |
| **Admission** | Admission | Hospitalisation (UI) | Décision d’admettre en observation / court séjour | Affichage : « Admission / observation (court séjour) » |
| **Discharge** | Sortie | Libération | Fin de prise en charge aux urgences avec retour domicile ou autre destination | Distinguer « exécution sortie infirmière » |
| **Triage** | Triage | Tri (seul) | Évaluation initiale gravité + accueil urgences | « Accueil urgences » pour la page d’entrée |
| **Trackboard** | Tableau des urgences ; Tableau de bord (contexte général) | Trackboard, Dashboard (UI FR) | Vue opérationnelle des consultations ouvertes | Nav générale : « Tableau de bord » ; ED : « Urgences » |
| **Reassessment** | Réévaluation | Re-contrôle (informel) | Nouvelle évaluation clinique après intervalle | Infirmier : « réévaluation au chevet » |
| **Provider documentation** | Documentation médicale | Doc médecin | HPI, ROS, examen, MDM du médecin | Section : « Documentation médicale (ED) » |
| **MDM** | Aide à la décision médicale (MDM) | — | Complexité et justification de la décision | Garder sigle MDM entre parenthèses |
| **Shared planning** | Planification partagée ; Dossier partagé | — | Champs communs médecin / infirmier / équipe | « Décision (dossier partagé) » en disposition |
| **Return precautions** | Consignes de retour ; Signes d’alarme | — | Instructions de réévaluation si aggravation | Toujours lier à « réévaluer aux urgences si… » |
| **Follow-up** | Suivi | Follow-up (UI) | Rendez-vous ou continuité après la visite | Nav : « Suivis » |
| **Chief complaint** | Motif de consultation ; Motif | Plainte (éviter) | Raison principale de la visite | « Motif » acceptable sur tableaux compacts |
| **Clinical history** | Antécédents cliniques | Historique (seul) | Allergies, médicaments, problèmes actifs | — |
| **Carry-forward history** | Reprise d’antécédents ; Antécédents repris | — | Données triage reprises en documentation | — |
| **Longitudinal history** | Historique longitudinal | — | Vue chronologique multi-consultations | — |
| **ROI** | Dévoilement de dossier (ROI) | — | Accès audité au dossier patient | Sigle ROI conservé entre parenthèses |
| **Audit log** | Journal d’audit | Log (UI) | Trace des actions sensibles | Admin : « Journal d’audit » |
| **Clinical governance** | Gouvernance clinique | — | Règles qualité, modèles, garde-fous | — |
| **Complaint intelligence** | Intelligence motif (inserts cliquables) | — | Pastilles HPI/ROS/MDM par motif — insertion manuelle | Ne jamais « appliquer automatiquement » |
| **Discharge template** | Modèle de sortie | — | Gabarit texte sortie (gouverné) | Distinct du registre gouvernance sortie |
| **Chart export** | Export du dossier | — | Extraction légale / opérationnelle | — |
| **Pending results** | Résultats en attente | Pending (UI) | Analyses / imagerie non finalisées | — |
| **Orders** | Ordres ; Prescriptions / demandes | Orders (UI) | Medications, labo, imagerie, soins | Contextualiser : « ordre de médicament » |
| **Results** | Résultats | — | Valeurs labo / comptes-rendus imagerie | — |
| **Medication administration** | Administration de médicament | — | Acte infirmier MAR | — |
| **Workflow status** | Statut du parcours | Workflow (UI seul) | Étape opérationnelle du patient | Préférer « Parcours » ou « Statut » |
| **Task queue** | File de travail ; File | Queue (UI) | Liste ordonnée de tâches département | **File** pharmacie / **Liste** laboratoire (canon actuel mixte — harmoniser en M-BOOK.FR.2) |
| **Assignment** | Attribution ; Affectation | Assign (UI) | Médecin / infirmier responsable sur le tableau | « M’assigner — médecin » |
| **Critical patient** | Patient critique | — | ESI 1–2 ou gravité équivalente | — |
| **Boarding** | Attente de lit ; Séjour prolongé | Boarding (UI) | Délai long aux urgences sans orientation | « Durée élevée », « Séjour prolongé » |
| **Isolation** | Isolement | — | Précautions transmission | — |
| **Escalation** | Escalade | — | Montée en charge équipe / supervision | MSPP : « Alertes et escalades » |

---

## Section 2 — Terminologie par rôle

| Rôle (EN) | Terme français préféré | Adaptation Haïti / notes |
|-----------|-------------------------|---------------------------|
| Registration staff | Personnel d’accueil ; Agent d’accueil | Nav « Accueil » ; page « Inscription » — clarifier en formation |
| Triage nurse | Infirmier(ère) de triage | — |
| ED nurse | Infirmier(ère) aux urgences | Éviter mélange IDE / Inf. sans glossaire |
| Provider | Médecin ; Professionnel de santé | Nav « Médecin » ; générique « Professionnel » si rôle mixte |
| Physician | Médecin | — |
| NP/PA | IPS / professionnel avancé (selon licence locale) | Documenter titre légal haïtien au déploiement |
| Pharmacist | Pharmacien | — |
| Lab technician | Technicien de laboratoire | — |
| Radiology technician | Technicien en imagerie | — |
| Administrator | Administrateur ; Administration | Nav « Administration » |
| Supervisor | Superviseur ; Responsable de service | — |
| Medical records staff | Dossiers médicaux ; Archiviste médical | ROI : « dévoilement dossier » |

**Règle IDE :** en contexte infirmier haïtien, **IDE** (infirmier diplômé d’État) est reconnu ; en UI générale préférer **Infirmier(ère)** sauf abréviations compactes (badges).

---

## Section 3 — Documentation clinique

| Concept (EN) | Terme français officiel | Interdit / à éviter | Notes |
|--------------|-------------------------|---------------------|-------|
| HPI | Histoire de la maladie (HPI) | Anamnèse seule (trop large) | Sigle HPI autorisé |
| ROS | Revue des systèmes (ROS) ; Revue ciblée | — | « Revue ciblée » en ED |
| Physical exam | Examen physique | — | Sous-sections par aire |
| Differential diagnosis | Diagnostic différentiel ; Synthèse différentielle | — | — |
| Clinical rationale | Raisonnement clinique | — | — |
| Data review | Données revues ; Revue des données | — | — |
| Disposition rationale | Justification d’orientation | — | Non bloquant mais recommandé |
| Observation rationale | Justification d’observation | — | — |
| Admission rationale | Justification d’admission | — | — |
| Transfer rationale | Justification de transfert | — | — |
| Consult discussion | Discussion de consultation ; Avis spécialisé discuté | — | — |
| Reassessment | Réévaluation | — | — |
| Clinical impression | Impression clinique | — | — |
| Risk stratification | Stratification du risque | — | Langage conservateur |
| Red flags | Signaux d’alerte ; Signes d’alarme | Red flags (UI) | Uniformiser : **signaux d’alerte** (documentation) / **signes d’alarme** (retour patient) |

---

## Section 4 — Triage et soins infirmiers

| Domaine | Terme officiel | Notes |
|---------|----------------|-------|
| ESI | Indice ESI ; Gravité triage ESI | Conserver sigle ESI |
| Pain scales | Échelle de douleur | Numérique / EVA selon protocole local |
| Reassessment | Réévaluation | — |
| Medication administration | Administration de médicament | MAR |
| Discharge execution | Exécution sortie ; Exécution équipe | Distinct de la décision médicale |
| Nursing safety | Sécurité infirmière ; Sécurité patient | — |
| Isolation | Isolement ; Précautions | — |
| Mobility / fall risk | Risque de chute ; Mobilité | — |

---

## Section 5 — Terminologie administrative

| Concept | Terme français | Notes |
|---------|----------------|-------|
| RBAC | Contrôle d’accès par rôle | Expliquer en formation, pas seulement sigle |
| Permissions | Droits ; Permissions | « Utilisateurs et accès » |
| Audit logs | Journal d’audit | — |
| Monitoring | Surveillance | « Surveillance ROI », « Santé système » |
| Reporting | Rapports | — |
| Facility management | Gestion de l’établissement | — |
| User provisioning | Création de comptes ; Accès utilisateurs | — |
| ROI monitoring | Surveillance ROI (plateforme) | — |
| Governance | Gouvernance | — |

---

## Annexe A — Abréviations approuvées en UI française

`MDM`, `HPI`, `ROS`, `ROI`, `ESI`, `ORL`, `GU`, `MSK`, `ECG`, `LAMA`, `LWBS`, `EMTALA`, `MFA`, `NIR`, `MRN`, `CPT`, `HCPCS`, `MSPP`, `IDE` — voir manifest pour liste machine.

---

## Annexe B — Sous-groupes intelligence motif (canon actuel)

| Clé i18n | Libellé FR officiel |
|----------|---------------------|
| `templateSubgroupGiAbdominal` | Gastro-intestinal / abdominal |
| `templateSubgroupRespiratoryEnt` | Respiratoire / ORL |
| `templateSubgroupCardiacVascular` | Cardiaque / vasculaire |
| `templateSubgroupGuRenal` | GU / rénal |
| `templateSubgroupMskTrauma` | MSK / traumatique |
| `templateSubgroupInfectiousEnt` | Infectieux / ORL |
| `templateSubgroupEndocrineMetabolic` | Endocrinien / métabolique |
| `templateSubgroupNeurologyExpansion` | Neurologie avancée |

---

## Références

- `docs/ui/language-separation-architecture.md`
- `docs/OBSERVATION_POSITIONING.md`
- `docs/FRENCH-UI-TRANSLATION.md`
- `.cursor/rules/french-ui.mdc`
