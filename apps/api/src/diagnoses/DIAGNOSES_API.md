# Medora Core – Diagnoses & Chart Summary

## Route list

| Method | Path | Roles | Description |
|--------|------|--------|-------------|
| POST | `/encounters/:encounterId/diagnoses` | RN, PROVIDER, ADMIN | Create diagnosis for encounter |
| POST | `/encounters/:encounterId/diagnoses/reorder` | RN, PROVIDER, ADMIN | Set encounter diagnosis order (`orderedIds`) |
| GET | `/patients/:patientId/diagnoses` | RN, PROVIDER, ADMIN | List diagnoses for patient |
| GET | `/diagnoses/icd10/search` | RN, PROVIDER, ADMIN, BILLING | ICD-10-CM catalog search (`q`, optional `limit`) — one row per ICD code |
| GET | `/diagnoses/icd10/by-code` | RN, PROVIDER, ADMIN, BILLING | Lookup one active catalog row (`code` query) |

### ICD-10 search pipeline

1. **UI** — `Icd10DiagnosisEntryPanel` → `searchIcd10Catalog` (`chartApi.ts`). French UI may expand to English synonym queries (`diagnosisFrenchSearchAliases`); that is query expansion only, not a second catalog.
2. **HTTP** — `GET /diagnoses/icd10/search?q=&limit=` → `DiagnosesController` → `Icd10CatalogService.search`.
3. **Match** — `icd10-catalog-search.query.ts` builds OR predicates over `code` / `normalizedCode` / short / long / `searchText`, plus clinical synonym expansion (`icd10-clinical-query-expansion.ts`).
4. **Catalog** — rows in `Icd10DiagnosisCode`. Uniqueness is `(codeSystem, releaseVersion, code)`, so the same ICD code can exist in `FY2026`, `UNSPECIFIED`, and `FY2026-MEDORA-DEV-SAMPLE`.
5. **Release collapse** — `DISTINCT ON ("code")` keeps one catalog row per ICD code (official FY release preferred over `UNSPECIFIED` / DEV-SAMPLE). Aliases and synonym matches only widen predicates; they do not add extra visible rows.
6. **Ranking** — code exact → prefix → short description → expansion → long/token; prefer billable and initial-encounter (`A`) for trauma codes.
7. **JSON** — `{ items: [...], limit }` with duplicate ICD codes = 0.
| PATCH | `/diagnoses/:id` | RN, PROVIDER, ADMIN | Update diagnosis |
| POST | `/diagnoses/:id/resolve` | RN, PROVIDER, ADMIN | Set status RESOLVED and resolvedDate |
| GET | `/patients/:id/chart-summary` | RN, PROVIDER, ADMIN | Patient chart summary (demographics + recent data) |

All require JWT and `x-facility-id`.

---

## DTOs

**Create (POST encounter diagnoses)**  
- **Catalog path:** `icd10CatalogId` (UUID). Optional `description` overrides catalog short label.  
- **Explicit manual path:** `manualNonCatalog: true` and required `code`; optional `description`, `onsetDate`, `notes`.  
- **Legacy / API compatibility:** `code` required when neither catalog nor manual flag is used.  
- Optional: `sortOrder`, `onsetDate`, `onsetPrecision` (`UNKNOWN` | `DATE` | `DATETIME`), `notes`.
  Clinical onset is distinct from documentation time (`createdAt` / audit `createdByDisplay`).

**Reorder (POST encounter diagnoses/reorder)**  
Body: `{ "orderedIds": ["uuid", ...] }` — every id must belong to the encounter.

**Update (PATCH diagnoses/:id)**  
Optional: `code`, `description`, `onsetDate`, `notes`, `sortOrder`, `icd10CatalogId` (UUID to link, or `null` to clear link and set legacy), `manualNonCatalog: true` with `code`.

**List (GET patient diagnoses)**  
Query: optional `status` (ACTIVE | RESOLVED), `limit`, `offset`.  
Returns `{ items, total }` ordered by encounter, then `sortOrder`, then `createdAt`.

---

## ICD-10 catalog import (production)

Official CDC/NCHS ICD-10-CM files are **not** bundled in the repo. Production loads use the versioned importer:

```bash
pnpm --filter @medora/api icd:dry-run -- --file=/path/to/icd10cm-Code-Descriptions-2026.zip --release=2026
pnpm --filter @medora/api icd:import -- --file=/path/to/icd10cm-Code-Descriptions-2026.zip --release=2026
pnpm --filter @medora/api icd:coverage -- --file=/path/to/icd10cm-Code-Descriptions-2026.zip --release=2026
```

See `apps/api/prisma/icd/` and `apps/api/prisma/data/icd10-releases/README.md`.

Demo seed (`MEDORA_SEED_MODE=clinical-content`) may still load the **development sample**
`apps/api/prisma/data/icd10-cm-sample-dev.csv` as release `FY2026-MEDORA-DEV-SAMPLE`. That sample is **not** production-complete.

Legacy helper (routes sample CSV into the versioned importer as DEV-SAMPLE only):

```bash
pnpm --filter @medora/api run import:icd10-catalog -- --file=./apps/api/prisma/data/icd10-cm-sample-dev.csv
```

---

## Chart summary response example

(See previous versions of this doc for full JSON shape; encounter diagnoses now include `sortOrder` and `codeSource` when present.)

- **recentEncounters[].encounterDiagnoses:** ordered by `sortOrder` then `createdAt`.

---

## Backend files (ER-1)

- **diagnoses/** — `icd10-catalog.service.ts`, extended `diagnoses.service.ts`, `dto/reorder-diagnoses.dto.ts`, extended create/update DTOs, `diagnoses.controller.ts` (ICD routes before `:id`).
- **billing/** — `claim-export.service.ts` (ordered DX from clinical rows + ledger extras), `claim-validation.util.ts` / `claim-builder.service.ts` (clinical dx count for diagnosis-linked validation).
- **patients/chart-summary.service.ts** — diagnosis ordering for embedded encounter lists.
- **prisma/** — `Icd10DiagnosisCode`, `Diagnosis.sortOrder`, `Diagnosis.icd10CatalogId`, `Diagnosis.codeSource`, migration `20260422120000_er1_icd10_catalog_diagnosis`.
- **scripts/import-icd10-catalog.ts** — CSV loader.
