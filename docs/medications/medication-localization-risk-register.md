# M1.7A.1 — Medication Localization Risk Register

**Date:** 2026-06-03

---

## CRITICAL

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-LC01 | Wave 3–5 adds 470+ rows with mixed `searchText` | **OPEN** | M1.7B seed contract; split search blobs in M1.7E |
| R-LC02 | `displayNameEn` polluted from `displayNameFr` during bulk seed | **OPEN** | English-primary guard (exists for essential Haiti); extend to all enterprise CREATE |

---

## HIGH

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-LH01 | Search ignores `MedicationAlias.language` | **OPEN** | Locale-filtered alias OR; keep bilingual for Haiti MVP |
| R-LH02 | Ranking tie-break uses `name` with `fr` locale | **OPEN** | Use `displayNameEn`/`Fr` per request locale |
| R-LH03 | `MedicationConcept.displayName` single-language | **OPEN** | Concept localization in M1.7E before M1.5F |
| R-LH04 | 1000+ row migration cost if separation delayed | **OPEN** | Option A contract now; Option B before 600 codes |
| R-LH05 | Duplicate brand alias across catalogs | **OPEN** | Manifest review; disambiguation in UI subtitle |

---

## MEDIUM

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-LM01 | Web `normalizeMedicationDisplayForLocale` patch map incomplete | **ACCEPTED** | Move labels to DB localization |
| R-LM02 | `therapeuticClass` French in search metadata | **OPEN** | EN metadata labels in Wave 3+ |
| R-LM03 | Enterprise alias seed tags all `en` | **OPEN** | Add FR common names where clinically needed |
| R-LM04 | Haiti alias seed tags all `fr` | **ACCEPTED** | Correct for Haiti product language |
| R-LM05 | `searchText` rebuild on alias seed merges languages | **OPEN** | Explicit `searchTextEn` / `searchTextFr` builders |

---

## LOW

| ID | Risk | Status | Mitigation |
|----|------|--------|------------|
| R-LL01 | `name` field redundant with `displayNameFr` | **ACCEPTED** | Deprecate in docs; do not use in EN UI |
| R-LL02 | Canonical `MedicationSearchAlias` count low (104) | **ACCEPTED** | Grows with linkage promotion |
| R-LL03 | compareCatalogRows French sort for EN UI | **LOW** | Locale parameter on compare |

---

## Risk if localization delayed past Wave 3

| Impact | Estimate |
|--------|----------|
| Rows to remediate | 325 today → **850+** after Waves 3–5 |
| Alias rows | 750 → **~2500+** |
| `searchText` rebuild effort | **3–5×** |
| Wrong-language UI incidents | Elevated on EN pharmacy surfaces |

---

## Cross-domain safety

| Domain | Affected by localization split? |
|--------|--------------------------------|
| Billing | **NO** |
| Safety / controlled | **NO** |
| Governance / pilot | **NO** |
| Canonical linkage | **NO** |
| Search recall | **YES** |
| French product UI | **YES** |
| English dev / pharmacy UI | **YES** |
