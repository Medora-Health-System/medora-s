# Pipeline export — Manuel entreprise FR

**Phase:** M-BOOK.FR.12

---

## Commandes

| Commande | Action |
|----------|--------|
| `pnpm handbook:diagrams` | Génère 20 diagrammes SVG (+ PNG si sharp) |
| `pnpm handbook:screenshots:placeholders` | Génère placeholders PNG P1 (wireframe) |
| `pnpm handbook:assemble` | Concatène markdown assemblé |
| `pnpm handbook:export` | PDF + DOCX via pandoc (si installé) |
| `pnpm handbook:assets` | Diagrammes + placeholders + assemble |

---

## Sorties

| Artefact | Emplacement |
|----------|-------------|
| Diagrammes SVG/PNG | `assets/diagrams/` |
| Captures placeholder P1 | `assets/screenshots/` |
| Markdown assemblé | `exports/assembled/medora-enterprise-handbook-fr-assembled.md` |
| PDF / DOCX | `exports/build/` (si pandoc) |

---

## Prérequis export final

1. Remplacer placeholders par **captures réelles** (runbook ci-dessous)  
2. Revue PHI double validateur  
3. `pnpm verify:web` + tests FR.12  
4. Checklist [export-readiness-checklist.md](./export-readiness-checklist.md)

---

## Avertissements

- Medora-S **dépendant du cloud** — documenté dans l'en-tête assemblage  
- Placeholders ≠ captures produit — libellés « PATIENT FORMATION FICTIF »  
- Pandoc optionnel — l'assemblage markdown fonctionne sans

---

*M-BOOK.FR.12*
