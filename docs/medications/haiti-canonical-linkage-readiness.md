# Haiti Canonical Linkage — Readiness (M1.5D complete)

**Date:** 2026-06-02  
**Status:** **M1.5D IMPLEMENTATION COMPLETE** — manifest + validation ready for M1.5E  
**Production:** Not verified (local/CI artifacts only)

---

## What M1.5D delivered

| Deliverable | Status |
|-------------|--------|
| 247-entry linkage manifest | Done (`HAITI_CANONICAL_LINKAGE_MANIFEST`) |
| Zod + TypeScript types | Done |
| Quarantine deny-list | Done |
| Validation engine | Done |
| Deterministic matching foundation | Done |
| Vitest suite (shared) | Done — 1049 tests pass in `@medora/shared` |
| Implementation documentation | Done (this file + siblings) |

---

## Safety posture

| Action | M1.5D |
|--------|-------|
| Create Concept/Product/Package | **No** |
| Modify existing canonical rows | **No** |
| Activate products | **No** |
| Provider search changes | **No** |
| Seed execution | **No** |
| Migrations | **No** |
| Billing engine / MAR / ordering changes | **No** |

**SAFE:** Shared manifest, validation, quarantine, tests, docs  
**NOT SAFE (deferred to M1.5E+):** Any activation, linkage FK writes, bulk canonical attach to clone noise

---

## Manifest snapshot

- **247** Haiti formulary codes (unique derived codes)
- **0** `LINK_READY` (no bulk auto-link)
- Majority `MISSING_CANONICAL_TARGET`; remainder `MANUAL_REVIEW` (controlled, high-alert, LASA, opioid, insulin, alias/governance drift)
- Proposed targets are **create-new** codes aligned to catalog codes, not existing `19G1-ACET-*` import products

---

## Roadmap

| Phase | Scope |
|-------|-------|
| **M1.5D** (this) | Manifest + validation + quarantine + matching + tests |
| **M1.5E** | Create canonical chains + legacy linkage backfill (first DB writes) |
| **M1.5F** | Phased activation by tranche |
| **M1.5G** | Provider search / ordering integration review |
| **M1.5H** | Production verification checklist |

---

## M1.5E prerequisites

1. Import `HAITI_CANONICAL_LINKAGE_MANIFEST` and filter by `tranche` + `linkageStatus`
2. Skip `DO_NOT_LINK` and quarantined match targets
3. Require human sign-off for `MANUAL_REVIEW` rows
4. Run `validateManifest()` with DB `existingTargets` after each tranche dry-run
5. Preserve billing mappings from M1.4B manifest when setting package NDC / HCPCS

---

## Verification commands (Part 11)

```bash
pnpm --filter @medora/shared test
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- medication-safety
pnpm --filter @medora/api test -- orders
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api run build
pnpm verify:web
```

Document any failures; distinguish pre-existing CI issues from M1.5D regressions.

---

## Related documents

- [haiti-canonical-linkage-manifest-implementation.md](./haiti-canonical-linkage-manifest-implementation.md)
- [haiti-canonical-linkage-validation-implementation.md](./haiti-canonical-linkage-validation-implementation.md)
- [haiti-canonical-linkage-quarantine-design.md](./haiti-canonical-linkage-quarantine-design.md)
- [haiti-canonical-linkage-roadmap.md](./haiti-canonical-linkage-roadmap.md) (M1.5C)
