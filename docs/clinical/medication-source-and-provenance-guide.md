# Medication Source and Provenance Guide

## Wave 2 policy

- Curated EM candidate registry is a **content manifest**, not a licensed drug database dump.
- **No RxNorm / NDC fabrication.** Unmapped terminology remains null.
- DailyMed / FDA labeling may be linked later through existing evidence-governance provenance — not copied indiscriminately.
- First Databank: **not integrated** (requires license).

## Provenance markers

Wave 2 products set:

- `baselineSource = EM_KNOWLEDGE_EXPANSION_WAVE2_CATALOG_V1`
- `dualLayerLinkageMethod = WAVE2_CATALOG_IMPORT`
- `governanceNotes` include pack + “no RxNorm/NDC fabricated”

## Separation of concerns

Catalog availability ≠ recommendation activation ≠ production CDS.
