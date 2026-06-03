# Medication locale-aware display & search (M1.7A.3)

## Problem (before)

Provider search in **English UI** returned correct matches (e.g. `Ibuprofen`) but result subtitles still showed **French** catalog fields:

- `Analgésique / antipyrétique`
- `comprimé`, `orale`
- `suspension buvable`

Clinical identity and billing remain code-based; only **display/search chrome** was mixed.

## Root cause

1. `mapMedicationToCatalogSearchItem` built `secondaryText` from raw French `dosageForm` / `route` / `therapeuticClass`.
2. Web `localizedMedicationDisplay` used a **small** FR→EN dictionary and missed common Haiti formulary strings.
3. Some UI paths joined raw `secondaryText` + `metadata.dosageForm` again (double French).
4. `commonAliases` were not filtered by language for display (search still matches all aliases).

## Solution (after)

### Shared (`@medora/shared`)

- `medicationClinicalDisplayLocale.ts` — full Haiti formulary FR→EN maps for dosage form, route, therapeutic class.
- `buildMedicationCatalogSecondaryTexts()` — produces `secondaryTextFr` and `secondaryTextEn`.
- `filterMedicationAliasesForDisplayLocale()` — display-only alias filtering.
- `medicationEnglishDisplayContainsFrenchLeak()` — regression guard for EN UI.

### API

- `mapMedicationToCatalogSearchItem` sets:
  - `secondaryTextFr` / `secondaryTextEn` (additive)
  - `secondaryText` — legacy, French-first (unchanged contract for old clients)

### Web

- `formatCatalogMedicationSubtitleForLocale` prefers API `secondaryTextEn` / `secondaryTextFr`, then shared metadata resolution.
- `formatMedicationOptionForLocale` uses locale alias filter.
- Pharmacy / order / ER search components use locale helpers only (no raw French metadata joins).

## Behavior

| UI locale | Primary label | Subtitle (form/route/class) | Aliases shown |
|-----------|---------------|-----------------------------|---------------|
| `en` | `displayNameEn` → code fallback | English mapped clinical text | Non-French aliases |
| `fr` | `displayNameFr` → EN → code | French catalog fields | All aliases |

**Search** still uses bilingual `searchText` and unfiltered alias matching (cross-locale find is OK). **Display** is locale-specific.

## Example API fragment (Ibuprofen 200 mg)

```json
{
  "code": "IBUPROFEN_200",
  "type": "MEDICATION",
  "displayNameEn": "Ibuprofen",
  "displayNameFr": "Ibuprofène",
  "secondaryText": "200 mg · comprimé · oral · Analgésique / antipyrétique",
  "secondaryTextFr": "200 mg · comprimé · orale · Analgésique / antipyrétique",
  "secondaryTextEn": "200 mg · tablet · oral · Analgesic / antipyretic",
  "metadata": {
    "strength": "200 mg",
    "dosageForm": "comprimé",
    "route": "orale",
    "therapeuticClass": "Analgésique / antipyrétique",
    "genericName": "Ibuprofen"
  }
}
```

## Out of scope (M1.7A.3)

- No Wave 3 formulary expansion
- No billing / governance / activation changes
- No DB migration (display maps live in shared code until M1.7E localization tables)
- No provider search identity cutover

## Tests

- `packages/shared/.../medicationClinicalDisplayLocale.test.ts`
- `apps/api/.../catalog-search.mapper.medication-locale.spec.ts`
- `apps/web/.../localizedMedicationDisplay.test.ts`
- `apps/web/.../catalogDisplayNormalization19U2.test.ts`

## Validation

```bash
pnpm --filter @medora/shared test
pnpm --filter @medora/api test -- medication-catalog
pnpm --filter @medora/api test -- catalog-search.mapper.medication-locale
pnpm --filter @medora/api run build
pnpm verify:web
```
