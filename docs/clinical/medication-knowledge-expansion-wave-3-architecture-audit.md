# Medication Knowledge Expansion Wave 3 — Architecture Audit

**Program:** Import-Driven Medication Platform + Comprehensive Formulary Expansion
**Date:** 2026-07-18
**Distinct from:** Enterprise Formulary Wave 3 (`enterpriseWave3FormularyManifest`)

## Verdict

Canonical write path is known (Wave 2 CatalogMedication-first).
**Migration required: NO** for Wave 3 content expansion + file-based import platform.

Do **not** create Medication Intelligence Phase 19.
Do **not** create a second medication master.

## Live baseline (measured)

| Metric | Count |
|--------|------:|
| CatalogMedication | 2875 |
| Catalog active | 2802 |
| Distinct normalized generics | 958 |
| MedicationAlias | 6931 |
| MedicationConcept | 2376 |
| MedicationProduct / Package | 3262 / 3261 |
| RxNorm-mapped concepts | 1 |
| RxNorm staging concepts | 33 |

Wave 3 target: ~**2,000** total distinct generics → ~**1,042** net-new after audit/dedupe.
Counts are never padded.

## Systems of record

| Concern | SoR |
|---------|-----|
| Provider search / order / MAR | `CatalogMedication` + `MedicationAlias` |
| Canonical identity | `MedicationConcept` (stable codes `EM_W3C_*`) |
| Variants | `MedicationProduct` / `MedicationPackage` |
| Terminology staging | `RxNorm*` tables (map only; **never** CREATE catalog) |
| Clinical/safety provenance | Evidence source registrations (separate from catalog CREATE) |

## Existing import frameworks (reuse)

| Framework | Use for Wave 3 |
|-----------|----------------|
| Wave 2 catalog importer | **CREATE path pattern** (AUDIT→DRY_RUN→APPLY→VERIFY) |
| RxNorm import jobs | Optional mapping lane only |
| Formulary staging workbook | Facility-specific — not global CREATE |
| Unified SourceRegistry table | **Absent** — Wave 3 uses shared registry + job JSON artifacts |

## Migration justification (none)

Existing schema already represents concepts, products, packages, aliases, RxNorm staging, and dual-layer links.
Wave 3 import platform uses:

- TypeScript source registry (approval states)
- File-based staging / job artifacts under `audit-summaries/`
- CatalogMedication-first APPLY (Wave 2 pattern)

A unified DB staging schema is **deferred** unless a future release requires multi-source concurrent APPLY with transactional staging rows.

## Approved sources (Wave 3)

| Source key | Status |
|------------|--------|
| `MEDORA_CURATED` | Approved for local deterministic ingest |
| `MEDORA_WAVE2` | Registered (prior content; match-only) |
| `RXNORM` | Registered; adapter read-only against staging / approved extracts — **no fabricated RxCUI** |
| `DAILYMED` | Registered; adapter stub — no bulk label copy |
| `LICENSED_COMMERCIAL` / FDB | **Rejected** without license |

## Recommended write path

1. REGISTER_SOURCE → VALIDATE_INPUT → PARSE → NORMALIZE → STAGE
2. CLASSIFY → MATCH → DEDUPLICATE → RECONCILE
3. DRY_RUN → APPLY (CatalogMedication-first + inactive dual-layer) → VERIFY → REPORT
4. Certify with measured distinct-generic totals
