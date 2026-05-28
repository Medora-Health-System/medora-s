# Medora-S — Risques terminologiques français

**Phase:** M-BOOK.FR.1  
**Statut:** Audit / gouvernance — aucune modification de comportement  
**Companion:** [french-terminology-canon.md](./french-terminology-canon.md)

Ce document recense les risques opérationnels, cliniques et de formation liés à la terminologie actuelle. Il sert de backlog pour M-BOOK.FR.2+ (harmonisation UI) sans imposer de changement dans cette phase.

---

## Légende sévérité

| Niveau | Signification |
|--------|----------------|
| **Critique** | Risque de mauvaise décision clinique ou non-conformité perçue |
| **Élevé** | Confusion opérationnelle fréquente en formation / exploitation |
| **Moyen** | Incohérence UX ou charge cognitive |
| **Faible** | Cosmétique ou accepté (abréviation métier) |

---

## 1. Risques de langue mixte

| Zone | Formulation actuelle | Problème | Remplacement recommandé | Sévérité |
|------|---------------------|----------|-------------------------|----------|
| Triage intake | Badge `(EMERGENCY)` | Anglais brut visible (`EmergencyTriageIntakeView.tsx`) | « Urgences » ou libellé type consultation FR | **Élevé** |
| Résumé visite | Fallback `"Result"` | Fuite anglais si clé manquante | Clé i18n « Résultat » | **Élevé** |
| Nav mobile | « Navigation » | Identique EN/FR — acceptable mais non pédagogique | « Menu principal » (optionnel) | Faible |
| Billing | CPT, HCPCS, JSON, CSV | Anglais technique | Garder sigles + glossaire formation | Faible |
| Trackboard | LWBS, LAMA, EMTALA | Acronymes réglementaires US | Conserver avec expansion FR en formation Haïti | Moyen |
| Provider doc | GU / MSK / ORL dans sous-groupes | Sigles anglais | Acceptés (canon) ; glossaire obligatoire | Faible |

---

## 2. Ambiguïté opérationnelle

| Concept | Variantes concurrentes | Exemples (clés i18n) | Risque | Recommandation | Sévérité |
|---------|------------------------|----------------------|--------|----------------|----------|
| Disposition vs orientation | « Disposition », « Orientation », « Orientation (disposition) » | `emergencyDisposition.cardTitle`, `emergencyErClosure.dispositionOutcomeLabel`, `emergencyDisposition.saveButton` | Personnel ne distingue pas décision vs exécution | **Orientation** = bouton décision ; **Disposition** = panneau/synthèse | **Élevé** |
| Consultation vs visite | « Consultation », « Visite », « Nouvelle visite » | `nav.encounters`, `registrationHome.cardNewVisitTitle` | Accueil vs clinique flous | Accueil : visite ; dossier ouvert : consultation | **Élevé** |
| Accueil vs inscription | « Accueil » (nav), « Inscription » (titre page) | `nav.registration`, `registrationHome.title` | Double vocabulaire même parcours | Manuel : « Accueil = entrée ; Inscription = acte » | Moyen |
| Tableau de bord vs urgences | « Tableau de bord », « Urgences », « Tableau des urgences » | `nav.trackboard`, `emergencyTrackboard.title` | Utilisateur cherche mauvais écran | Cartographie par rôle dans le manuel | Moyen |
| File vs liste | « File pharmacie » vs « Liste laboratoire » | `nav.pharmacyQueue`, `nav.labWorklist` | Incohérence queues | Harmoniser vers « File » (M-BOOK.FR.2) | Moyen |
| IDE vs infirmier(ère) | « IDE », « Inf. », « Infirmier(ère) » | `clinicalTrackboardPage.nurseAbbr`, `emergencyTrackboard.nurseShort` | Formation Haïti : IDE connu ; autres lecteurs confus | Glossaire rôle ; UI compacte = IDE acceptable | Moyen |

---

## 3. Traductions littérales dangereuses ou maladroites

| Formulation | Problème | Remplacement | Sévérité |
|-------------|----------|--------------|----------|
| « Médicalement autorisé » (si introduit) | Implication légale de clearance | « Consignes de sortie documentées » | **Critique** |
| « Exclu » / « écarté » pour diagnostic | Certitude excessive | « À considérer / évalué » (prompts intelligence motif) | **Critique** |
| « Patient stable » | Certitude clinique | « État décrit au réévaluation » | **Critique** |
| « Normal » pour CT/labs (prompts) | Fausse négativité | « Résultats revus et intégrés au raisonnement » | **Critique** |
| « Safe for discharge » traduit mot à mot | Responsabilité médico-légale | « Décision d’orientation documentée » | **Critique** |
| « Plainte » pour chief complaint | Connotation négative en FR | « Motif de consultation » | Moyen |

---

## 4. ED français non standard

| Item | Observation | Sévérité |
|------|-------------|----------|
| EMTALA / LWBS / LAMA | Terminologie droit US — nécessaire pour conformité produit pilote | Moyen — adapter manuel Haïti |
| « Sortie à domicile » | Standard FR acceptable | — |
| « Contre avis médical (LAMA) » | Clair | — |
| « Départ avant fin de prise en charge (type LWBS) » | Long mais sûr | Faible |

---

## 5. Adaptation haïtienne

| Sujet | Préoccupation | Action manuel |
|-------|---------------|---------------|
| Titres professionnels | IPS, médecin, IDE — cadre légal local | Valider avec direction clinique pilote |
| NIR / identifiant patient | Terme « NIR » vs pratique locale | Documenter mapping identité national |
| MSPP | Vocabulaire épidémiologique distinct de l’ED | Section manuel dédiée santé publique |
| Connectivité | Messages erreur réseau — ton rassurant | Déjà FR ; revue terrain |
| Famille / aidant | « Aidant » vs « famille » | Préférer inclusif « patient et/ou aidant » |

---

## 6. Intelligence motif et MDM

| Risque | Mitigation actuelle | Sévérité |
|--------|---------------------|----------|
| Pastilles perçues comme diagnostic | Insertion manuelle uniquement ; libellés « à documenter » | Moyen |
| Sigles MDM/HPI non compris | Formation + canon Section 3 | Moyen |
| Sous-groupes GU/MSK en anglais | Abréviations approuvées ; traduction complète optionnelle M-BOOK.FR.2 | Faible |

---

## 7. Chaînes persistées (ne pas traduire en 19U/M-BOOK.FR.1)

| Chaîne | Raison |
|--------|--------|
| `Admission / hospitalisation` | Égalité clés disposition persistées |
| Enums Prisma (`EMERGENCY`, `INPATIENT`) | Code / API |
| Contenu modèles sortie signés | Class D — dossier légal |

Toute harmonisation future exige migration planifiée — **hors scope M-BOOK.FR.1**.

---

## Priorisation remediation (future)

1. Corriger fuites EN visibles (`EMERGENCY`, `"Result"`) — quick wins  
2. Manuel : cartographie disposition/orientation  
3. Harmoniser File vs Liste (worklists)  
4. Révision abréviations sous-groupes intelligence motif (optionnel)  
5. Audit allowlist 19U.5–19U.6 (hardcoded strings)

---

## Références CI

- `frenchTerminologyCanon19MBookFr1.test.ts`
- `i18nLanguageBoundary.test.ts`
- `localeLeakRegression19U4.test.ts`
