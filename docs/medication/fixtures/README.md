# Priority ER pharmacy inventory fixtures

## Upload via admin UI (recommended)

1. Sign in as facility or platform admin.
2. Open **Administration → File d’attente inventaire urgences (staging)**  
   (`/app/admin/medication-inventory-staging`).
3. Choose your workbook (e.g. `PHARMACY INVENTORY LIST (1).xlsx`).
4. Leave **Simulation (dry-run)** checked for the first pass.
5. Click **Simuler l’import** and review the summary and staging table.
6. Uncheck dry-run and click **Importer en staging** when pharmacy approves.

## API (multipart)

`POST /api/backend/medication-master/import-priority-er-inventory?dryRun=true`

- Form field: `workbook` (`.xlsx` file)
- Optional query: `facilityId`, `batchId`, `dryRun=false` to persist staging rows

## Expected workbook columns

Header row must include (any sheet):

| Column     | Aliases                          |
|-----------|-----------------------------------|
| Medication | medication, drug, drug name      |
| Dose       | dose, dosage, strength           |
| Form       | form, dosage form, route/form    |

Source cell text is stored **exactly** as displayed in Excel (no translation, no trim).

## Place fixture in repo (optional)

Copy your file here for local scripts or documentation:

`docs/medication/fixtures/PHARMACY INVENTORY LIST (1).xlsx`

This path is **not** auto-imported; use the admin UI or API above.
