# M1.7A.1 — Medication Localization Separation Audit

**Date:** 2026-06-03  
**Phase:** Read-only audit  
**Compared reference:** Imaging taxonomy (`TermClassifier` + `TermClassifierLabel` fr/en)

---

## Executive summary

| Question | Answer |
|----------|--------|
| Separate localization before Wave 3? | **YES — at minimum a strict seed + alias contract; full DB separation before 600+ rows strongly recommended** |
| Clinical identity language-neutral today? | **Mostly YES** (`code`, `genericName`, NDC, HCPCS, concept `code`) |
| Display/search mixed today? | **YES** — `searchText` is bilingual blob; alias `language` inconsistent; UI locale applied only at render time |
| Block Wave 3 on full migration? | **NO** — if M1.7B enforces bilingual fields + tagged aliases + no FR→EN backfill |

---

## Part 1 — Current localization inventory

### CatalogMedication (provider-search authoritative today)

| Field | Role | Language | Notes |
|-------|------|----------|-------|
| `code` | **Clinical identity** | Neutral | Stable key; never locale-specific |
| `genericName` | **Clinical identity** | Neutral (INN) | Used in search + metadata |
| `name` | Legacy primary label | **French-first** | Staging: **364/364** active rows `name` = `displayNameFr` pattern |
| `displayNameFr` | French UI label | FR | Schema: must not be overwritten by EN backfill |
| `displayNameEn` | English UI label | EN | Schema: pharmacy/search/MAR English-primary |
| `description` | Free text | Often FR | Haiti seeds |
| `therapeuticClass` | Class string | **Mixed** | Often French in Haiti catalog |
| `dosageForm`, `route`, `strength` | Presentation | **Mixed** | French forms common |
| `searchText` | Denormalized search blob | **Mixed (EN+FR tokens)** | Single lowercase string; not per-locale |
| `billingCodeDefault`, `ndc11` | Billing identity | Neutral | — |

**Staging (active catalogs, n=364):**

| Metric | Count |
|--------|------:|
| Has `displayNameFr` | 364 |
| Has `displayNameEn` | 364 |
| Has `searchText` (>10 chars) | 344 |
| `MedicationAlias` rows | 750 (en: 406, fr: 344) |

### MedicationAlias (catalog-level search hints)

| Field | Role |
|-------|------|
| `alias` | Search token (normalized lowercase in enterprise seed) |
| `language` | Optional tag — Haiti seeds **`fr`**, enterprise M1.6C seeds **`en`** |
| `isPrimary` | Rarely used |

**Search behavior:** `MedicationCatalogService` queries aliases with **no `language` filter** — all aliases participate in every search.

**Uniqueness:** `@@unique([catalogMedicationId, alias])` — prevents duplicate alias string per catalog; does **not** prevent cross-catalog homonyms (e.g. two brands).

### MedicationConcept (canonical layer)

| Field | Role | Language |
|-------|------|----------|
| `code` | Identity | Neutral |
| `genericName` | Identity | Neutral |
| `displayName` | Single display string | **Not split FR/EN** — often mirrors generic or English enrichment |
| `rxNormConceptId` | External identity | Neutral |
| `searchAliases` → `MedicationSearchAlias` | Canonical search | Optional `language`, `aliasType` |

Staging: **320** concepts; **92** where `displayName` ≠ `genericName`.

### MedicationProduct / MedicationPackage

| Field | Role | Language |
|-------|------|----------|
| `code` | Identity | Neutral |
| `strengthDisplay`, `dosageForm` | Presentation | Mixed strings |
| `governanceNotes` | Ops markers | English markers (`ENTERPRISE_M16B_*`) |
| `legacyCatalogMedicationId` | Link to catalog | Neutral FK |
| Package `ndc11`, billing profiles | Billing | Neutral |

**No localized display columns** on product/package — correct for clinical identity layer.

### MedicationSearchAlias (canonical search)

Separate from `MedicationAlias`; attached to `conceptId` / `productId`. Used in `CatalogCanonicalReadService` for provider metadata enrichment. **104** rows on staging.

---

## Part 2 — Search audit

### APIs audited

| Path | Service | Locale-aware? |
|------|---------|---------------|
| `GET /catalog/medications/search` | `MedicationCatalogService` | **No** (search); **Yes** (web display via `getCatalogSearchItemDisplayLabel`) |
| Favorites / recent | Same + mapper | Display-only locale |
| Canonical enrichment | `CatalogCanonicalReadService` | **No** language filter on aliases |
| Provider search gate | `MedicationProductActivationGovernanceService` | Governance only, not language |
| Query expansion | `expandMedicationSearchQuery` + enterprise manifest | **English-brand biased** in code |
| Ranking | `matchTierForQuery` / `compareCatalogRows` | Matches **both** `displayNameEn` and `displayNameFr`; tie-break `localeCompare(..., "fr")` on `name` |

### English vs French aliases

| Source | `language` | Behavior |
|--------|------------|----------|
| Haiti medication seed | `fr` | French common names in alias table |
| Enterprise M1.6C alias seed | `en` | Brand/generic/typo tokens |
| Search | Ignores `language` | Bilingual clinic benefit; EN-only query may still hit FR alias |

### Language-aware ranking?

**No.** Tier 0–3 treats EN and FR display fields equally. Sort tie-break favors French `name` field.

### Duplicate search rows?

**Unlikely in API response** — dedupe by `catalogMedicationId` in direct + alias + canonical paths.  
**Risk:** duplicate **alias strings** across different catalogs (homonyms) can surface multiple meds for one query — clinical ambiguity, not duplicate rows.

### Alias collisions

| Type | Risk | Mitigation today |
|------|------|------------------|
| Same alias, same catalog | **Blocked** | DB unique constraint |
| Same alias, different catalogs | **MEDIUM** | Clinician disambiguation by subtitle |
| `searchText` token collision | **LOW** | Substring search |

### Web display layer (post-search)

- `catalogDisplayLabel.ts` — FR: `displayNameFr` → EN → `name`; EN: strict `displayNameEn` only (Phase C guard).
- `localizedMedicationDisplay.ts` — **display-only** French→English map for dosage form / route / class (not persisted).

This is **presentation localization**, not **data localization separation**.

---

## Part 3 — Governance audit

| Domain | Depends on localized display name? | Identity anchor |
|--------|-----------------------------------|-----------------|
| **Billing** | **NO** | `ndc11`, HCPCS, `catalogCode`, package profile |
| **Safety** | **NO** | `MedicationSafetyProfile`, controlled flags on catalog |
| **Governance** | **NO** | `governanceStatus`, markers in `governanceNotes` |
| **Canonical linkage** | **NO** | `legacyCatalogMedicationId`, product `code` |
| **Pilot activation** | **NO** | Catalog code list |
| **Claims / charges** | **NO** | Order + billing events use codes/NDC |

**Conclusion:** Clinical identity **must and does** remain language-neutral. Localized strings affect **UX and search recall only**.

---

## Part 4 — Imaging comparison (target pattern)

Imaging completed separation:

| Layer | Imaging pattern |
|-------|-----------------|
| Identity | Stable `CatalogImagingStudy.code` |
| Vocabulary | `TermClassifier` + bilingual `TermClassifierLabel` (`locale` fr/en) |
| Display | `displayNameFr` + `displayNameEn` on catalog row |
| Search | `searchText` + `ImagingStudyAlias` with `language: "fr"` in Haiti seeds |
| UI | Classifier labels resolved by locale in search mapper |

Medication **partially** matches (dual display fields) but **lacks**:

- Per-locale label table or `MedicationCatalogLabel` entity  
- Per-locale `searchText` (or search index by locale)  
- Consistent alias language policy in seeds  
- Single `MedicationConcept.displayName` instead of split labels  

---

## Duplicate / mixed field findings

| Finding | Severity |
|---------|----------|
| `name` duplicates `displayNameFr` for all active staging rows | **MEDIUM** — legacy compat; EN UI must not use `name` (guarded in web) |
| `searchText` mixes EN+FR tokens | **HIGH** for 1000+ scale |
| Enterprise aliases tagged `en`, Haiti `fr`, search ignores tag | **MEDIUM** |
| `MedicationConcept.displayName` not bilingual | **MEDIUM** for M1.5F cutover |
| `therapeuticClass` / `dosageForm` French in catalog metadata | **LOW** — web normalizes at display |

---

## Staging formulary context

| Metric | Value |
|--------|------:|
| Enterprise governed | 134 |
| Union unique codes | ~325 |
| Future Wave 3–5 | +470–570 planned |

**Risk of adding 120+ Wave 3 rows without localization contract:** compounds mixed `searchText` and alias language drift.
