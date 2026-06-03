# M1.7A.2 — Medication Localization Validation Rules

---

## Entry point: `validateMedicationLocalization(contract, options?)`

Returns `MedicationLocalizationValidationResult` with `pass` and `issues[]`.

Throws via `assertMedicationLocalization()` when blocking issues exist.

---

## Blocking failures

| Kind | Condition |
|------|-----------|
| `MISSING_DISPLAY_EN` | `displayNameEn` blank |
| `MISSING_DISPLAY_FR` | `displayNameFr` blank |
| `BLANK_DISPLAY` | Empty alias text |
| `INVALID_LOCALE` | Alias `language` not `fr` or `en` |
| `DUPLICATE_ALIAS` | Same normalized alias twice **within one locale** |
| `ALIAS_LANGUAGE_MISMATCH` | French forms in `en` alias; English-only form words in `fr` alias |
| `DISPLAY_MIRROR_WITHOUT_OVERRIDE` | `displayNameEn === displayNameFr` and French markers present; or French in `displayNameEn` |
| `MISSING_TAGGED_ALIAS` | No aliases; or missing `en`/`fr` alias when `requireAliasesPerLocale` |
| `SEARCH_TERMS_DRIFT` | `strictSearchTerms` and manifest terms ≠ builder output |

---

## Heuristics

### French markers (`looksFrenchLocalizedText`)

- Diacritics: `é`, `è`, `ç`, etc.
- Form words: `comprimé`, `orale`, `gélule`, `intraveineuse`, …

### English form words (`looksEnglishFormText`)

- `tablet`, `oral`, `capsule`, `injection`, …

### Alias language inference (legacy only)

`inferLocalizationAliasesFromStrings()` — French markers → `fr`, else `en`.

---

## Batch validators

| Function | Use |
|----------|-----|
| `validateEnterpriseFormularyLocalizationBatch(entries, opts?)` | Wave 1–5 manifest rows |
| `validateEnterpriseWaveFormularyLocalizationReady(contracts)` | **Wave 3+ strict** |

### Strict mode (Wave 3+)

- `requireAliasesPerLocale: true` — at least one `en` and one `fr` alias  
- `strictSearchTerms: true` — `searchTerms` must match `buildMedicationSearchTokens()`  
- `searchTerms` required on every row  

---

## Integrated CI checks

`validateEnterpriseWave1FormularyManifest()` and `validateEnterpriseWave2FormularyManifest()` append localization blocking errors.

Existing Wave 1/2 tests must continue to pass with **zero** localization errors.

---

## Search token builders

| Function | Output |
|----------|--------|
| `buildMedicationSearchTokensEn(input)` | `string[]` EN tokens |
| `buildMedicationSearchTokensFr(input)` | `string[]` FR tokens |
| `buildMedicationSearchTokens(input)` | `{ en, fr, combined }` |
| `buildMedicationSearchTermsArray(input)` | Token array for manifest `searchTerms` |

`combined` is the interim `CatalogMedication.searchText` value until per-locale columns exist (M1.7E).
