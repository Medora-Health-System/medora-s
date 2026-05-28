# Inventaire des captures d'écran — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11 · assets FR.12  
**Section:** V.1  
**Statut:** Placeholders P1 générés (FR.12) — remplacer par captures formation avant diffusion

---

## Politique globale

| Règle | Exigence |
|-------|----------|
| **PHI interdit** | Aucune donnée patient réelle (nom, ID, photo, résultats) |
| **Patient fictif obligatoire** | Utiliser dossier formation / environnement test uniquement |
| **Langue** | Interface **française** — locale FR active |
| **Consentement** | Validation direction avant diffusion externe |
| **Stockage** | `assets-placeholders/screenshots/` jusqu'à intégration export |

### Convention de nommage

```
medora-fr-v{volume}-{workflow}-{viewport}.png
```

| Segment | Valeurs |
|---------|---------|
| `{volume}` | `v1` … `v9`, `vx` (transversal) |
| `{workflow}` | kebab-case FR/EN court (`triage`, `trackboard`, `roi`) |
| `{viewport}` | `desktop` · `tablette` · `mobile` |

**Exemples :**

- `medora-fr-v2-triage-tablette.png`
- `medora-fr-v3-mdm-desktop.png`
- `medora-fr-v5-pharmacie-file-mobile.png`
- `medora-fr-vx-nav-mobile.png`

---

## Volume 1 — Accueil (M-BOOK.FR.2)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V1-01 | Page inscription / accueil | desktop | P1 | ⚠ | `medora-fr-v1-accueil-desktop.png` |
| V1-02 | Recherche patient | desktop | P1 | ⚠ | `medora-fr-v1-recherche-desktop.png` |
| V1-03 | Fiche patient — identité | tablette | P1 | ⚠ | `medora-fr-v1-fiche-tablette.png` |
| V1-04 | Ouverture nouvelle visite | desktop | P1 | ⚠ | `medora-fr-v1-visite-desktop.png` |
| V1-05 | Distinction types consultation | desktop | P2 | — | `medora-fr-v1-types-desktop.png` |

Route : `/app/registration`, `/app/patients`

---

## Volume 2 — Triage (M-BOOK.FR.3)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V2-01 | Accueil triage | tablette | P1 | ⚠ | `medora-fr-v2-triage-tablette.png` |
| V2-02 | Triage desktop complet | desktop | P1 | ⚠ | `medora-fr-v2-triage-desktop.png` |
| V2-03 | Saisie ESI / gravité | tablette | P1 | ⚠ | `medora-fr-v2-esi-tablette.png` |
| V2-04 | Bannière carry-forward | desktop | P2 | ⚠ | `medora-fr-v2-carry-forward-desktop.png` |
| V2-05 | Réévaluation ESI | tablette | P1 | ⚠ | `medora-fr-v2-reevaluation-tablette.png` |
| V2-06 | Tableau des urgences | desktop | P1 | ⚠ | `medora-fr-v2-trackboard-desktop.png` |
| V2-07 | Tableau urgences mobile | mobile | P1 | ⚠ | `medora-fr-v2-trackboard-mobile.png` |

Routes : `/app/emergency/triage`, `/app/emergency/trackboard`

---

## Volume 3 — Prestataire (M-BOOK.FR.4)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V3-01 | Workspace documentation médicale | desktop | P1 | ⚠ | `medora-fr-v3-doc-desktop.png` |
| V3-02 | Documentation tablette chevet | tablette | P1 | ⚠ | `medora-fr-v3-doc-tablette.png` |
| V3-03 | Section HPI | desktop | P1 | ⚠ | `medora-fr-v3-hpi-desktop.png` |
| V3-04 | Intelligence motif — pastilles | tablette | P2 | ⚠ | `medora-fr-v3-intelligence-motif-tablette.png` |
| V3-05 | MDM / aide décision | desktop | P1 | ⚠ | `medora-fr-v3-mdm-desktop.png` |
| V3-06 | Panneau orientation | desktop | P1 | ⚠ | `medora-fr-v3-orientation-desktop.png` |

Routes : `/app/provider`, `/app/emergency/active/{id}`

---

## Volume 4 — Infirmier (M-BOOK.FR.5)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V4-01 | Workspace soins infirmiers | tablette | P1 | ⚠ | `medora-fr-v4-soins-tablette.png` |
| V4-02 | Réévaluation nursing | tablette | P1 | ⚠ | `medora-fr-v4-reevaluation-tablette.png` |
| V4-03 | Exécution sortie | desktop | P1 | ⚠ | `medora-fr-v4-sortie-desktop.png` |
| V4-04 | MAR / administration | tablette | P1 | ⚠ | `medora-fr-v4-mar-tablette.png` |

Routes : `/app/nursing`, `/app/emergency/chart/{id}`

---

## Volume 5 — Auxiliaires (M-BOOK.FR.6)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V5-01 | File pharmacie | mobile | P2 | ⚠ | `medora-fr-v5-pharmacie-file-mobile.png` |
| V5-02 | File pharmacie desktop | desktop | P2 | ⚠ | `medora-fr-v5-pharmacie-file-desktop.png` |
| V5-03 | File laboratoire | tablette | P2 | ⚠ | `medora-fr-v5-labo-file-tablette.png` |
| V5-04 | Détail commande labo | desktop | P2 | ⚠ | `medora-fr-v5-labo-detail-desktop.png` |
| V5-05 | File imagerie | desktop | P2 | ⚠ | `medora-fr-v5-rad-file-desktop.png` |
| V5-06 | Résultat / réconciliation | desktop | P2 | ⚠ | `medora-fr-v5-resultat-desktop.png` |

Routes : `/app/pharmacy-worklist`, `/app/lab-worklist`, `/app/rad-worklist`

---

## Volume 6 — Orientation / ROI (M-BOOK.FR.7)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V6-01 | Panneau disposition complet | desktop | P1 | ⚠ | `medora-fr-v6-disposition-desktop.png` |
| V6-02 | Workflow admission observation | desktop | P1 | ⚠ | `medora-fr-v6-admission-desktop.png` |
| V6-03 | Transfert inter-établissement | desktop | P2 | ⚠ | `medora-fr-v6-transfert-desktop.png` |
| V6-04 | ROI — demande | desktop | P2 | ⚠ | `medora-fr-v6-roi-demande-desktop.png` |
| V6-05 | ROI — approbation | desktop | P2 | ⚠ | `medora-fr-v6-roi-approbation-desktop.png` |

Routes : `/app/emergency/active/{id}`, `/app/admin/roi`

---

## Volume 7 — Administration (M-BOOK.FR.8)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V7-01 | Hub administration | desktop | P2 | — | `medora-fr-v7-admin-hub-desktop.png` |
| V7-02 | Gestion utilisateurs | desktop | P2 | ⚠ | `medora-fr-v7-users-desktop.png` |
| V7-03 | Journal d'audit | desktop | P2 | ⚠ | `medora-fr-v7-audit-desktop.png` |
| V7-04 | Santé système | desktop | P2 | — | `medora-fr-v7-system-health-desktop.png` |

Routes : `/app/admin`, `/app/admin/users`, `/app/admin/audit`

---

## Volume 8 — Mobile / Haïti (M-BOOK.FR.9)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V8-01 | Menu navigation mobile | mobile | P1 | — | `medora-fr-v8-nav-mobile.png` |
| V8-02 | Drawer navigation | mobile | P1 | — | `medora-fr-v8-drawer-mobile.png` |
| V8-03 | Tablette chevet — doc | tablette | P1 | ⚠ | `medora-fr-v8-chevet-tablette.png` |
| V8-04 | Message pending sync | mobile | P1 | — | `medora-fr-v8-pending-sync-mobile.png` |
| V8-05 | Sélecteur établissement | mobile | P1 | — | `medora-fr-v8-facility-mobile.png` |

---

## Volume 9 — Formation (M-BOOK.FR.10)

| ID | Description | Viewport | Priorité | PHI | Fichier cible |
|----|-------------|----------|----------|-----|---------------|
| V9-01 | Parcours intégration (schéma) | desktop | P2 | — | `medora-fr-v9-onboarding-desktop.png` |
| V9-02 | Registre attestation (papier photo) | desktop | P2 | — | `medora-fr-v9-registre-desktop.png` |

*Note : registre attestation = document papier local — photo sans PHI.*

---

## Transversal (vx)

| ID | Description | Viewport | Priorité | Fichier cible |
|----|-------------|----------|----------|---------------|
| VX-01 | Page de connexion FR | desktop | P1 | `medora-fr-vx-login-desktop.png` |
| VX-02 | Bandeau établissement | desktop | P1 | `medora-fr-vx-facility-banner-desktop.png` |

---

## Checklist capture (par session)

- [ ] Environnement formation / test confirmé  
- [ ] Locale française active  
- [ ] Données patient fictives uniquement  
- [ ] Viewport conforme (desktop 1440px / tablette 768px / mobile 390px)  
- [ ] Nom fichier selon convention  
- [ ] Revue PHI par second reviewer  
- [ ] Entrée ajoutée dans manifeste export  

---

## Références

- [assets-placeholders/screenshots/README.md](./assets-placeholders/screenshots/README.md)  
- [Checklist export](./exports/export-readiness-checklist.md)  
- Volume 8 — viewports 19M

---

*Fin inventaire captures — M-BOOK.FR.11*
