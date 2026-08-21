# MEDUI.LAB.REF.2 — CBC + BMP + CMP Mayo clinical curation wave

**Status:** Curated and seedable (local). No production migration applied.
**Baseline source:** Mayo Clinic Laboratories Test Catalog.

## Migration timestamp

`20261113120000_lab_enterprise_reference_interval_authority` — retained.
Repository convention uses sequential `202610*`–`202611*` prefixes (not calendar-today stamps). Renaming would break already-applied local migrate history.

## Sources

| Panel | Mayo Test Id | URL |
|-------|--------------|-----|
| CBC | CBC / 9109 | https://www.mayocliniclabs.com/test-catalog/overview/9109 |
| BMP | BMAMA / 113630 | https://www.mayocliniclabs.com/test-catalog/Overview/113630 |
| CMP components | TP/ALB/AST/ALT/ALP/BILIT + BMAMA shared | https://www.mayocliniclabs.com/test-info/pediatric/refvalues/reference.php |

## Alias verification

| Alias | Decision | Evidence |
|-------|----------|----------|
| BILI → TOTAL_BILIRUBIN | **Kept** | Haiti `CatalogLabTest` code `BILI` displayNameEn = "Total bilirubin" |
| BILI → direct bilirubin | **Rejected** | Clinically distinct |
| UREA → BUN | **Rejected** | Separate analytes preserved |
| CO2 → ABG pCO2 | **Rejected** | Metabolic panel only |
| % differentials → absolute | **Rejected** | Clinically distinct |

## Unresolved populations (no numeric Medora row)

See `LAB_REF_MAYO_UNRESOLVED_POPULATIONS` — includes Mayo “Not established” bands (e.g. Na/K/Cl/HCO3/BUN/glucose <1y), bilirubin 0–6 days (bilitool referral), eGFR <18y, MCH/MCHC (not published on Mayo CBC 9109), UREA (not on BMAMA).

## Facility overrides

Test-only proofs in unit tests. **No facility override rows seeded** in this wave.

## Critical values

Still empty — not manufactured from reference intervals.
