# Inventaire des diagrammes — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11  
**Section:** V.2  
**Statut:** Scaffolding — **aucun diagramme généré dans cette phase**

---

## Politique globale

| Règle | Exigence |
|-------|----------|
| **Langue** | Libellés **français** sur tous les diagrammes publiés |
| **Pas de PHI** | Flux génériques — pas de noms patients |
| **Style** | Simple, lisible impression N/B, compatible PDF |
| **Stockage** | `assets-placeholders/diagrams/` |
| **Format cible** | SVG (source) + PNG (export PDF) |

### Convention de nommage

```
medora-fr-diag-{domaine}-{variante}.svg
medora-fr-diag-{domaine}-{variante}.png
```

**Exemples :**

- `medora-fr-diag-triage-flux-principal.svg`
- `medora-fr-diag-roi-cycle-vie.svg`
- `medora-fr-diag-haiti-deploiement.svg`

---

## Diagrammes requis — par domaine

### 1. Accueil et inscription

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-01 | Flux inscription patient | Recherche → création → visite → routage | 1 | P1 | `medora-fr-diag-registration-flux-principal.svg` |
| D-02 | Distinction UC / ED / Clinique | Arborescence type consultation | 1 | P1 | `medora-fr-diag-registration-types-consultation.svg` |

---

### 2. Triage

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-03 | Flux triage urgences | Arrivée → vitaux → ESI → enregistrement | 2 | P1 | `medora-fr-diag-triage-flux-principal.svg` |
| D-04 | Réévaluation ESI | Déclencheurs → nouvelle saisie → tableau | 2 | P1 | `medora-fr-diag-triage-reevaluation-esi.svg` |

---

### 3. Prestataire

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-05 | Flux documentation médicale | HPI → ROS → examen → MDM → ordres | 3 | P1 | `medora-fr-diag-provider-doc-flux.svg` |
| D-06 | Intelligence motif | Motif → pastilles → insertion manuelle | 3 | P2 | `medora-fr-diag-complaint-intelligence.svg` |

---

### 4. Soins infirmiers

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-07 | Flux soins et réévaluation | Chevet → réévaluation → MAR | 4 | P1 | `medora-fr-diag-nursing-soins-flux.svg` |
| D-08 | Exécution sortie | Orientation prestataire → actes infirmiers → clôture | 4, 6 | P1 | `medora-fr-diag-nursing-sortie-execution.svg` |

---

### 5. Orientation / disposition

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-09 | Cycle orientation | Décision → panneau disposition → destinations | 6 | P1 | `medora-fr-diag-disposition-cycle.svg` |
| D-10 | Distinction orientation vs disposition vs exécution | Trois acteurs / trois moments | 6 | P1 | `medora-fr-diag-orientation-disposition-distinction.svg` |
| D-11 | Admission observation | Décision → dossier → handoff | 6 | P1 | `medora-fr-diag-admission-observation.svg` |

---

### 6. ROI

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-12 | Cycle de vie ROI | Demande → revue → approbation → audit | 6, 7 | P2 | `medora-fr-diag-roi-cycle-vie.svg` |

Phase produit : **5G**

---

### 7. Carry-forward (19T)

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-13 | Cycle carry-forward | Triage → reprise → réconciliation → validation | 2, 3 | P2 | `medora-fr-diag-carry-forward-cycle.svg` |

Gouvernance : **19T**

---

### 8. Connectivité dégradée

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-14 | Workflow connectivité dégradée | Panne → papier → reconnexion → pending sync → vérification | 8 | P1 | `medora-fr-diag-connectivite-degradee.svg` |

---

### 9. Déploiement Haïti

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-15 | Déploiement Haïti | Préparation → formation 4 sem → go-live → debrief | 8, 9 | P1 | `medora-fr-diag-haiti-deploiement.svg` |
| D-16 | Super-utilisateurs | Rôles SU → escalade → relève | 9 | P1 | `medora-fr-diag-haiti-super-users.svg` |

Référence : `docs/HAITI_MVP_PILOT.md`

---

### 10. Formation / onboarding

| ID | Titre | Description | Volume | Priorité | Fichier cible |
|----|-------|-------------|--------|----------|---------------|
| D-17 | Parcours formation par rôle | Matrice rôle → volumes | 9 | P1 | `medora-fr-diag-formation-par-role.svg` |
| D-18 | Niveaux certification | 0 → 1 → 2 → 3 | 9 | P1 | `medora-fr-diag-certification-niveaux.svg` |
| D-19 | Calendrier Haïti 4 semaines | Semaines 1–4 formation | 9 | P1 | `medora-fr-diag-formation-calendrier-haiti.svg` |

---

### 11. Parcours patient type (master)

| ID | Titre | Description | Volumes | Priorité | Fichier cible |
|----|-------|-------------|---------|----------|---------------|
| D-20 | Parcours patient ED complet | Accueil → triage → doc → ordres → sortie | 1–6 | P1 | `medora-fr-diag-parcours-patient-ed-master.svg` |

*Diagramme couverture manuel enterprise — page de garde ou introduction.*

---

## Placeholders existants dans volumes source

Les volumes 1–9 contiennent des marqueurs `[DIAGRAMME — …]` et `[CAPTURE D'ÉCRAN — …]`. Ce inventaire **mappe** ces placeholders vers fichiers cibles.

---

## Checklist création diagramme

- [ ] Libellés 100 % français  
- [ ] Légende orientation / disposition correcte (canon)  
- [ ] Pas de promesse offline complète  
- [ ] Export SVG + PNG 300dpi pour PDF  
- [ ] Revue formateur + direction clinique  
- [ ] Référence ajoutée dans volume source concerné  

---

## Références

- [assets-placeholders/diagrams/README.md](./assets-placeholders/diagrams/README.md)  
- [07-index-captures-ecran.md](./07-index-captures-ecran.md)

---

*Fin inventaire diagrammes — M-BOOK.FR.11*
