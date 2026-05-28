# Gouvernance documentaire — Manuel entreprise Medora-S

**Phase:** M-BOOK.FR.11  
**Section:** VI.1  

---

## 1. Objectif

Définir comment la collection **M-BOOK.FR** est versionnée, revue, traduite et préparée pour export — sans modifier le comportement produit Medora-S.

---

## 2. Périmètre de la collection

| Composant | Emplacement | Phase origine |
|-----------|-------------|---------------|
| Canon terminologique | `docs/operations/french-terminology-canon.md` | M-BOOK.FR.1 |
| Inventaire workflows | `docs/operations/french-workflow-inventory.md` | M-BOOK.FR.1 |
| Registre risques | `docs/operations/french-terminology-risks.md` | M-BOOK.FR.1 |
| Volumes 1–9 | `docs/operations/handbook-fr-*.md` | M-BOOK.FR.2–10 |
| Assemblage enterprise | `docs/operations/medora-enterprise-handbook-fr/` | M-BOOK.FR.11 |
| Manifeste machine | `handbook-manifest-fr.ts` | M-BOOK.FR.11 |

---

## 3. Stratégie de versionnement

| Niveau | Format | Exemple |
|--------|--------|---------|
| **Collection** | `M-BOOK.FR.{n}` | M-BOOK.FR.11 |
| **Volume** | `1.0.0-draft` → `1.0.0` | Approbation direction |
| **Assemblage** | Aligné sur dernier volume majeur | 1.0.0-draft |
| **Canon** | `MBOOK_FR1_CANON_VERSION` | Trace machine |

**Règles :**

1. Toute modification substantielle d'un volume incrémente sa version mineure.  
2. L'assemblage enterprise (FR.11) est mis à jour lors de l'ajout de volumes ou index.  
3. Le manifeste TypeScript doit refléter les chemins source à jour.  
4. Tests source-level (`frenchHandbook*19MBookFr*.test.ts`) bloquent les régressions documentation.

---

## 4. Revue annuelle

| Document | Fréquence | Responsable |
|----------|-----------|-------------|
| Volumes opérationnels 1–9 | Annuelle | Responsable formation + référent clinique |
| Canon terminologique | Annuelle ou post-changement UI majeur | Référent terminologie |
| Index routes / workflows | Semestrielle | Admin + formateur |
| Inventaires visuels | À chaque campagne capture | Direction + IT |
| Registre risques | Trimestrielle (revue légère) | Référent terminologie |

**Déclencheurs revue immédiate :**

- Initiative **19M** (responsive) — layout change  
- **19T** carry-forward — workflow change  
- **19MDM** — intelligence motif change  
- Phase **5F/5G** — export / ROI change  
- Déploiement nouvelle clinique  

---

## 5. Propriété et responsabilités

| Rôle | Responsabilité |
|------|----------------|
| **Direction établissement** | Approbation contenu formation, autonomie certification |
| **Direction clinique pilote** | Exactitude workflows, protocoles locaux |
| **Responsable formation** | Calendrier, registre attestation, formateurs |
| **Administrateur Medora** | Exactitude routes, RBAC, captures environnement test |
| **Référent terminologie** | Canon, glossaire, cohérence FR |
| **Éditeur technique** | Assemblage, export PDF/DOCX, manifeste |

> Medora-S fournit la documentation. L'établissement reste responsable de l'adaptation aux politiques locales.

---

## 6. Gouvernance traduction (édition anglaise future)

| Principe | Application |
|----------|-------------|
| **FR = canon opérationnel** | Édition française authoritative pour Haïti |
| **EN = support dev / partenaires** | Traduction après stabilisation FR |
| **Clés i18n** | `en.ts` / `fr.ts` — pas de duplication manuel |
| **Workflow traduction** | 1) Gel volume FR · 2) Revue · 3) Traduction · 4) Validation clinique EN · 5) Publication séparée |
| **Sigles cliniques** | Conservés (ESI, HPI) avec expansion |

**Ne pas** publier d'édition EN avant revue direction du volume FR correspondant.

---

## 7. Politique refresh captures d'écran

| Événement | Action |
|-----------|--------|
| Changement UI majeur (19M) | Re-capture priorités P1 |
| Nouvelle route nav | Mise à jour index routes + capture si P1 |
| Revue annuelle | Audit inventaire §07 — complétude |
| PHI incident | Retrait immédiat + re-capture |

Voir [07-index-captures-ecran.md](./07-index-captures-ecran.md) — **patient fictif obligatoire**.

---

## 8. Cadence revue déploiement

| Cadence | Activité |
|---------|----------|
| **Pré go-live** | Checklist export + formation Haïti (Volume 9) |
| **J+30 post go-live** | Debrief formation, ajustement calendrier |
| **Semestrielle Haïti** | Volume 8 + Annexe A — connectivité, papier |
| **Annuelle** | Recertification personnel (Volume 9) |

Références : `docs/DEPLOYMENT_RUNBOOK.md` · `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`

---

## 9. Cadence revue Haïti

| Sujet | Fréquence |
|-------|-----------|
| Adoption tablettes / connectivité | Semestrielle |
| Protocole papier | Annuelle (exercice obligatoire) |
| Titres professionnels (IDE, IPS) | À l'embauche + annuelle |
| Super-utilisateurs backup | Trimestrielle |

Référence : `docs/HAITI_MVP_PILOT.md`

---

## 10. Intégrité et tests

| Mécanisme | Description |
|-----------|-------------|
| Tests source-level | Validation présence sections, routes, canon |
| Manifeste TS | Métadonnées volumes pour tooling export |
| `pnpm verify:web` | Pas de régression TypeScript web |
| Revue pair | Deux lecteurs pour volumes gouvernance (6, 7, 9) |

---

## 11. Export et distribution

| Format | Usage | Checklist |
|--------|-------|-----------|
| **PDF** | Formation imprimée, direction | [export-readiness-checklist.md](./exports/export-readiness-checklist.md) |
| **DOCX** | Édition locale, commentaires | Idem |
| **Markdown repo** | Source de vérité développement | Git |

---

## 12. Limites explicites

Ce cadre documentaire :

- **Ne remplace pas** les politiques institutionnelles ni le jugement clinique ;  
- **Ne certifie pas** légalement le personnel (certification = attestation interne Vol. 9) ;  
- **Ne garantit pas** un mode hors-ligne complet — Medora reste **dépendant du cloud** en MVP.

---

## Références

- [Table des matières](./01-table-des-matieres.md)  
- [Manifeste](./handbook-manifest-fr.ts)  
- Volume 9 — formation et certification

---

*Fin gouvernance documentaire — M-BOOK.FR.11*
