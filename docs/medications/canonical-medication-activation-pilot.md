# Canonical medication activation pilot (M1.5G)

## Purpose

Limited Haiti **T1 ER/IV** pilot to validate that M1.5E-linked canonical products can be activated for provider ordering **without** duplicate search rows, billing regressions, governance regressions, or MAR workflow changes.

This is **not** enterprise activation, bulk cutover, or provider-search replacement.

## Scope

| Dimension | Limit |
|-----------|--------|
| Formulary tranche | **T1 only** (billable ER/IV) |
| Manifest cap | **≤ 82** T1 rows classified |
| Auto-activation | **38** rows (`pilotEligible`, `MISSING_CANONICAL_TARGET`, no manual-review/safety exclusions) |
| Deferred | **44** (`MANUAL_REVIEW`, controlled, high-alert, LASA, insulin, opioid, anticoagulant, quarantine) |

## Preconditions (M1.5E + M1.5F)

- Linkage backfill applied (`MEDORA_ENABLE_HAITI_CANONICAL_LINKAGE_BACKFILL=1`) with **≥ 75%** linkage integrity on eligible pilot rows.
- Provider search cutover audit **PASS** for preservation; **no** full canonical cutover (M1.5F: legacy-authoritative search).

## Artifacts

| Artifact | Location |
|----------|----------|
| Pilot manifest | `packages/shared/src/medication/haitiCanonicalActivationPilotManifest.ts` |
| Activation validation | `packages/shared/src/medication/haitiCanonicalActivationPilotValidation.ts` |
| Duplicate prevention | `packages/shared/src/medication/haitiCanonicalActivationPilotDuplicate.ts` |
| Seed / rollback | `apps/api/prisma/helpers/seed-haiti-canonical-activation-pilot.ts` |

## Activation helper (allowed)

- Activate **clean** pilot-eligible products only.
- Set `isActive` on concept/product/package; facility formulary row; admin profile if missing.
- Runtime flags: `formularyApprovedInactive` + `orderSearchEnabled` (legacy catalog remains search identity).
- Governance marker: `HAITI_M15G_PILOT_ACTIVATED` (removes `HAITI_M15E_CANONICAL_LINKAGE_ONLY`).

## Forbidden

- Quarantine / baseline / acetaminophen clone / insulin clone / blocked-med families.
- Non-pilot or T2–T5 rows.
- Bulk or enterprise formulary activation.

## Enable locally (optional)

```bash
# After M1.5E backfill
MEDORA_ENABLE_HAITI_CANONICAL_ACTIVATION_PILOT=1 \
MEDORA_HAITI_CANONICAL_ACTIVATION_PILOT_DRY_RUN=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Dry-run default recommended first; omit `MEDORA_HAITI_CANONICAL_ACTIVATION_PILOT_DRY_RUN` only when approved for real activation.

## Rollback

`rollbackHaitiCanonicalActivationPilot` deactivates products with `HAITI_M15G_PILOT_ACTIVATED`, restores M1.5E linkage-only marker, clears runtime flags. **No** link or billing profile deletion.

## Next phase

**M1.5H** — Canonical Medication Stabilization Audit (final Haiti architecture gate before enterprise formulary expansion).
