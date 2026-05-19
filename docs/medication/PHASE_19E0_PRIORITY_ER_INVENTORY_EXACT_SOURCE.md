# Phase 19E.0 — Priority ER inventory exact-name import preparation

**Status:** Preparation only (no runtime cutover).  
**Scope:** Staging import, workbook traceability, UI language safety.

## Audit summary (19E.0)

| Area | Finding |
|------|---------|
| `PHARMACY INVENTORY LIST.pdf` | Not present in repository — use manual extraction template below |
| `MedicationFormularyImportStaging.sourceInventoryDescription` | **Authoritative exact line text** for inventory source |
| `rawJson` | Stores full CSV row + `__sourceTrace` object (immutable source fields) |
| Prior import | Trimmed all cells and could substitute `generic_name` when source description empty — **fixed in 19E.0** |
| Explorer/governance UI | Renders `displayName`, `genericName`, `strengthDisplay` from API — **not** from i18n |
| Prisma | No migration required — `rawJson` + `sourceInventoryDescription` sufficient |

## Exact-source preservation rules

1. **`source_inventory_description` / `exact_source_text`** — stored exactly as entered (no trim, no translation, no route expansion).
2. **`source_inventory_sku`** — exact SKU only.
3. **`rawJson`** — all CSV columns preserved; `__sourceTrace` holds structured exact fields.
4. **Normalized columns** (`generic_name`, `display_name_fr`, `route`, etc.) — may differ; never overwrite source fields.
5. **Drug names** — never translated (INN/brand/strength/route abbreviations unchanged).
6. **Billing** — missing NDC/HCPCS → `BILLING_REVIEW_REQUIRED`; no auto-guess codes.
7. **Extraction** — `source_review_status` = `OCR_REVIEW_REQUIRED` or `MANUAL_REVIEW_REQUIRED` → import gate **BLOCKED**, not auto-approved.

## PDF / image inventory workflow

Do **not** treat OCR as truth.

1. Extract to `docs/medication/templates/priority-er-inventory-extraction-staging-template.csv`
2. Mark every row `source_review_status` = `OCR_REVIEW_REQUIRED` or `MANUAL_REVIEW_REQUIRED`
3. Copy verified text into `exact_source_text` and `source_inventory_description`
4. Propose normalization only in `normalized_name_proposed` / `normalization_notes`
5. Import to staging with `dryRun=true` first — verify `sourceInventoryDescription` in API response

## Workbook columns added (optional traceability)

See template header append in `priority-er-formulary-workbook-template.csv`:

- `source_page`, `source_line_number`, `exact_source_text`
- `source_name_exact`, `source_strength_exact`, `source_route_exact`, `source_package_exact`
- `source_review_status`, `source_language`
- `normalized_name_proposed`, `normalization_notes`
- `source_image_ref`, `exact_raw_text`, `extraction_confidence`

Existing columns are unchanged.

## API behavior (staging import)

- `POST /medication-master/import-staging` dry-run returns `sourceInventoryDescription` per row (exact text).
- `rawJson` in DB uses `preservedRawJson` shape with `__sourceTrace`.

## Out of scope (explicit)

- No ordering, MAR, billing, inventory, or discharge cutover
- No automatic promotion or activation
- No medication name translation
