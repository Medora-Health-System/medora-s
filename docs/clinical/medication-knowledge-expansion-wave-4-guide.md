# Medication Knowledge Expansion Wave 4 — Clinical Library Guide

Wave 4 expands Medora’s usable clinical medication library using the Wave 3 import platform (no redesign, no Phase 19).

## Target

Approximately **5,000** distinct canonical generic concepts.

Measured result (local): **5206** distinct generics (**3200** net-new from baseline **2006**).

## Commands

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api medication:wave4:audit
pnpm --filter @medora/api medication:wave4:dry-run
pnpm --filter @medora/api medication:wave4:apply
pnpm --filter @medora/api medication:wave4:reconcile
pnpm --filter @medora/api medication:wave4:verify
pnpm --filter @medora/api medication:wave4:certify
```

## Write path

CatalogMedication-first CREATE + inactive `EM_W4C_*` dual-layer link (`baselineSource=EM_KNOWLEDGE_EXPANSION_WAVE4_IMPORT_V1`).

Products remain inactive / non-orderable until formulary review. No CDS or recommendation activation.

## Platform note

Wave 4 fixed per-variant `baselineSourceRowId` uniqueness and wraps variant APPLY in a transaction so multi-strength candidates do not leave orphan catalogs.
