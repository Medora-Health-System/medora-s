# Dev / sample catalog English labels (`displayNameEn`)

**Not production-complete.** Use only in development or after clinical review in staging.

- CSV files here are **curated English labels keyed by stable `code`**.
- Run the importer with `--dry-run` before applying to any database.
- Do **not** copy French `displayNameFr` into `displayNameEn` in your spreadsheets.
- Prefer official bilingual vendor lists or US facility–approved mapping files for production loads.

Importer (from repo root), **one catalog type per run**:

`pnpm --filter @medora/api catalog:import-display-en -- --type=lab --file=prisma/data/samples/er-display-name-en.dev-sample-labs.csv --dry-run`

`pnpm --filter @medora/api catalog:import-display-en -- --type=imaging --file=prisma/data/samples/er-display-name-en.dev-sample-imaging.csv --dry-run`

`pnpm --filter @medora/api catalog:import-display-en -- --type=medication --file=prisma/data/samples/er-display-name-en.dev-sample-medications.csv --dry-run`

Requires DB schema with `displayNameEn` on catalog tables (Phase A migration applied). If Prisma reports the column is missing, run `pnpm --filter @medora/api migrate:deploy` (or your environment’s migration workflow) against that database first.

Coverage report:

`pnpm --filter @medora/api catalog:report-display-en`
