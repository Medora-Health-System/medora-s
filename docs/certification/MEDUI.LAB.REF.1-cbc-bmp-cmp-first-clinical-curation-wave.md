# MEDUI.LAB.REF.1 — CBC + BMP + CMP first clinical curation wave (report only)

**Status:** Prepared for clinical review — **not seeded** in foundation migration/seed.
**Baseline source (intended):** Mayo Clinic Laboratories published reference intervals, where applicable.
**Rule:** No guessed LOINCs, units, intervals, or critical thresholds. No adult→pediatric extrapolation. No sex derivation. No textbook inference.

## Scope

| Panel | Canonical analytes (enterprise shared membership) |
|-------|---------------------------------------------------|
| CBC | WBC, RBC, HEMOGLOBIN, HEMATOCRIT, PLATELET, MCV, MCH, MCHC, RDW |
| BMP | GLUCOSE, BUN, CREATININE, SODIUM, POTASSIUM, CHLORIDE, CO2_BICARBONATE, CALCIUM |
| CMP | BMP set + TOTAL_PROTEIN, ALBUMIN, TOTAL_BILIRUBIN, ALP, AST, ALT |

Shared principle: **one** `CanonicalLabAnalyte` for Sodium (etc.) across BMP and CMP.

## Foundation LOINC coverage (seeded identities only)

| Analyte | defaultLoincCode | Notes |
|---------|------------------|-------|
| WBC | 6690-2 | Established in Medora `lab-loinc-mappings` CBC component set |
| RBC | 789-8 | Established in Medora `lab-loinc-mappings` CBC component set |
| HEMOGLOBIN | 718-7 | Established in Medora `lab-loinc-mappings` CBC component set |
| All other CBC/BMP/CMP analytes | — | **Unresolved** until independently curated |

Panel LOINCs (orderable-level, not analyte intervals): CBC `57021-8`, BMP `51990-0`, CMP `24323-8` remain on CatalogLabTest mapping review — not copied as analyte intervals.

## Authoritative-source coverage (curation phase — pending)

For each analyte below, the curation package must capture **every** Mayo (or other approved) distinction that applies:

- age bands
- sex
- specimen
- methodology / analyzer (when published)
- units
- pregnancy / other population restrictions when published
- source identifier, URL/reference, version/publication date
- effective dating for Medora registry rows

| Analyte | Mayo baseline applicable? | Curated intervals in DB | Unresolved reason if none |
|---------|---------------------------|-------------------------|---------------------------|
| WBC | Pending clinical review | 0 | Foundation: no numeric seed |
| RBC | Pending clinical review | 0 | Foundation: no numeric seed |
| HEMOGLOBIN | Pending clinical review | 0 | Foundation: no numeric seed |
| HEMATOCRIT | Pending clinical review | 0 | Foundation: no numeric seed |
| PLATELET | Pending clinical review | 0 | Foundation: no numeric seed |
| MCV | Pending clinical review | 0 | Foundation: no numeric seed |
| MCH | Pending clinical review | 0 | Foundation: no numeric seed |
| MCHC | Pending clinical review | 0 | Foundation: no numeric seed |
| RDW | Pending clinical review | 0 | Foundation: no numeric seed |
| GLUCOSE | Pending clinical review | 0 | Foundation: no numeric seed |
| BUN | Pending clinical review | 0 | Foundation: no numeric seed; keep separate from UREA |
| UREA | Pending clinical review | 0 | Distinct from BUN; do not convert |
| CREATININE | Pending clinical review | 0 | Foundation: no numeric seed |
| SODIUM | Pending clinical review | 0 | Foundation: no numeric seed |
| POTASSIUM | Pending clinical review | 0 | Foundation: no numeric seed |
| CHLORIDE | Pending clinical review | 0 | Foundation: no numeric seed |
| CO2_BICARBONATE | Pending clinical review | 0 | Not blood-gas pCO2 |
| CALCIUM | Pending clinical review | 0 | Foundation: no numeric seed |
| TOTAL_PROTEIN | Pending clinical review | 0 | Foundation: no numeric seed |
| ALBUMIN | Pending clinical review | 0 | Foundation: no numeric seed |
| TOTAL_BILIRUBIN | Pending clinical review | 0 | Foundation: no numeric seed |
| ALP | Pending clinical review | 0 | Method-dependent — preserve method when Mayo distinguishes |
| AST | Pending clinical review | 0 | Method-dependent |
| ALT | Pending clinical review | 0 | Method-dependent |

## Critical values

`LabCriticalValuePolicy` is modeled and empty in foundation. Critical thresholds must be curated separately from reference intervals. **Do not manufacture criticals from H/L ranges.**

## Facility overrides

Facility validated overrides are schema-ready (`FacilityLabReferenceIntervalOverride`) with validation attribution + effective dating. None seeded in foundation.

## Next approved step (not this phase)

1. Clinical curator attaches Mayo (or other) published interval rows with full attribution.
2. Certify LOINC per analyte where mapping is established.
3. Seed `LabReferenceInterval` rows only after review sign-off.
4. Optionally seed `LabCriticalValuePolicy` after separate critical-value review.

## Non-equivalence reminders (do not collapse)

- HS vs conventional troponin
- D-dimer FEU vs DDU
- Serum vs urine
- Quant vs qual hCG
- ABG vs VBG
- BUN vs UREA without conversion
