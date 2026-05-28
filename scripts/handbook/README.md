# Scripts handbook — M-BOOK.FR.12

Documentation tooling only — no product/runtime impact.

| Script | Purpose |
|--------|---------|
| `render-diagrams.mjs` | SVG flowcharts from `diagram-definitions-fr.json` |
| `render-screenshot-placeholders.mjs` | P1 wireframe PNG placeholders |
| `assemble-handbook.mjs` | Single markdown for export |
| `export-handbook.mjs` | PDF/DOCX via pandoc |

Run from repo root via `pnpm handbook:*`.

Assets output:

- `docs/operations/medora-enterprise-handbook-fr/assets/diagrams/`
- `docs/operations/medora-enterprise-handbook-fr/assets/screenshots/`

Also mirrored to `assets-placeholders/` for backward compatibility with FR.11 paths.
