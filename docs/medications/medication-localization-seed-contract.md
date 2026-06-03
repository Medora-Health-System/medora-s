# M1.7A.2 — Medication Localization Seed Contract

**Phase:** Implementation (guardrails only)  
**Scope:** Shared validation + search token builders — **no DB migration**, **no seed execution**

---

## Purpose

Prevent localization debt before Enterprise Wave 3 (600–1000+ medications).

Clinical identity (`catalogCode`, `genericName`, NDC, HCPCS) stays **language-neutral**.  
Display and search must be **explicitly bilingual** and **language-tagged**.

---

## Contract shape (`MedicationLocalizationContract`)

| Field | Required | Notes |
|-------|----------|-------|
| `catalogCode` | Yes | Neutral identity |
| `genericName` | Yes | INN / neutral |
| `displayNameEn` | Yes | English UI + search |
| `displayNameFr` | Yes | French product UI |
| `aliases[]` | Yes | Each `{ text, language: "fr" \| "en" }` |
| `searchTerms` | Wave 3+ | Must match token builder output |
| `strength`, `dosageForm`, `route`, `therapeuticClass` | Recommended | Feed token builders |

---

## Code locations

| Module | Path |
|--------|------|
| Types | `packages/shared/src/medication/medicationLocalizationTypes.ts` |
| Validation | `packages/shared/src/medication/medicationLocalizationValidation.ts` |
| Search tokens | `packages/shared/src/medication/medicationSearchTokens.ts` |
| Wave 1 hook | `enterpriseWave1FormularyValidation.ts` |
| Wave 2 hook | `enterpriseWave2FormularyValidation.ts` |

---

## Wave 3+ authoring pattern

```typescript
import {
  buildMedicationSearchTermsArray,
  type MedicationLocalizationContract,
} from "@medora/shared";

const entry: MedicationLocalizationContract = {
  catalogCode: "EXAMPLE_5_MG_ORAL",
  genericName: "Example",
  displayNameFr: "Exemple",
  displayNameEn: "Example",
  strength: "5 mg",
  dosageForm: "tablet",
  route: "oral",
  therapeuticClass: "Example class",
  aliases: [
    { text: "ExampleBrand", language: "en", aliasType: "BRAND" },
    { text: "exemple", language: "fr", aliasType: "GENERIC" },
  ],
  searchTerms: [], // set below
};

entry.searchTerms = buildMedicationSearchTermsArray(entry);
```

**Do not** hand-concatenate `searchText` or `searchTerms` strings in new manifests.

---

## Legacy Wave 1 / 2

Existing manifests use `aliases: string[]`. Validation **infers** `fr` vs `en` for legacy checks only:

- `requireAliasesPerLocale: false`
- `strictSearchTerms: false`

Wave 1/2 must still pass **blocking** localization rules (display names, no French in `displayNameEn`, etc.).

---

## Out of scope (M1.7A.2)

- `MedicationCatalogLocalization` table  
- Provider search cutover (M1.5F)  
- Seed execution / catalog expansion  
- Billing or governance changes  
