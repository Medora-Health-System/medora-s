# Root-Cause Report — Provider Medication Availability

**Program:** Medication Formulation & Strength Completion (remediation)
**Certification ID:** `MEDUI.MEDICATION_FORMULATION_STRENGTH_COMPLETION`

## Why the previous certification was insufficient

1. Evidence was mostly internal catalog counts and a 15-family probe, not the production prescription search UI (`limit` 20, CatalogMedication search + activation gate).
2. Brand names lived only in aliases/`searchText`; primary display remained generic (`Empagliflozin`), so clinicians did not see “Jardiance”.
3. Short query `jar` used mid-string `contains`, so **Mounjaro** matched and could appear beside/above Jardiance.
4. Biktarvy existed as a Wave3 CatalogMedication row with alias, but provider-facing brand/prefix expansion and display promotion were incomplete for real UI behavior.
5. Sibling strengths could be obscured by ranking/limits before family expansion.

## Root causes (measured)

| Symptom | Cause |
|---------|--------|
| Jardiance shows Empagliflozin only | Mapper used generic `displayName*`; brand not promoted on alias match |
| Only one strength visible | UI limit 20 + no exact-family sibling expansion before truncation |
| `jar` → tirzepatide | Mid-string match on `mounjaro`; no `jar`→jardiance expansion |
| Biktarvy “No results” (observed) | Alias/prefix/display gaps on provider path; insufficient brand/ingredient query expansion |
| Tiny certification sample | 15-family checks ≠ thousands of clinical families |

## Remediation applied

- Deterministic provider ranking with token-prefix brand preference; short-query mid-string suppression
- Query expansions: `jar`, `bikt`, HIV brand/ingredient families
- Exact-family sibling expansion before result truncation
- Brand display promotion: `Jardiance (Empagliflozin)`, `Biktarvy (…)`)
- UI medication search limit raised to 40
- Broad clinical corpus (285 families) validated on `MedicationCatalogService.search`
- Alias/`searchText` enrichment for hard-acceptance families (no fabricated strengths)

## Source data

- Approved MEDORA_CURATED enterprise/Wave2/Wave3 formulary candidates for formulation CREATE
- Existing CatalogMedication + MedicationAlias layers
- RxNorm/DailyMed adapters remain registered-only (no fabricated RxCUI/NDC CREATE)
