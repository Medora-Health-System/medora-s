# Haiti Canonical Linkage Backfill — Implementation (M1.5E)

**Phase:** M1.5E — create canonical chains + legacy FK (no provider search cutover)  
**Date:** 2026-06-02  
**Consumes:** M1.5D manifest, validation, quarantine, matching

---

## Schema support decision

**PROCEED** — linkage is supported without migration.

| Model | Linkage field |
|-------|----------------|
| `CatalogMedication` | No direct FK to canonical (legacy search row remains authoritative for provider search) |
| `MedicationProduct` | `legacyCatalogMedicationId` → `CatalogMedication.id` (unique when set) |
| `MedicationConcept` | Parent of product (`conceptId`) |
| `MedicationPackage` | Child of product (`productId`) |
| `MedicationSafetyProfile` | Optional per `conceptId` |
| `MedicationBillingProfile` | Optional per `packageId` |

No `CatalogMedication.medicationProductId` exists; **product → catalog** is the supported direction.

---

## Helper

`apps/api/prisma/helpers/seed-haiti-canonical-medication-linkage.ts`

```ts
await seedHaitiCanonicalMedicationLinkage(prisma, { dryRun: true | false });
```

Module loader: `haiti-canonical-linkage-seed-modules.ts` (dist `@medora/shared` in seeds; `src` in Jest).

---

## Behavior summary

| Manifest status | Action |
|-----------------|--------|
| `MISSING_CANONICAL_TARGET` | Create concept/product/package (inactive), set `legacyCatalogMedicationId`, mirror safety/billing when missing |
| `MANUAL_REVIEW` | Skip (`skippedManualReview`) |
| `DO_NOT_LINK` | Skip (`skippedDoNotLink`) |
| `LINK_READY` | Link only if `allowLinkReadyWithoutCreate` (default off; manifest has 0 rows today) |

---

## Provider search preservation (M1.5E)

Inactive linked products normally **exclude** legacy catalog rows from order search (`filterProviderSearchCatalogIds`).

M1.5E products are tagged in `governanceNotes` with `HAITI_M15E_CANONICAL_LINKAGE_ONLY`.  
`evaluateProviderOrderSearchGate` returns **allowed** for linkage-only inactive chains so **legacy catalog search is unchanged** until M1.5F cutover.

Constants: `apps/api/src/medication-master/haiti-canonical-linkage.constants.ts`

---

## Seed wiring

**Option B** — env-guarded in `seed-catalogs.ts`:

```bash
MEDORA_ENABLE_HAITI_CANONICAL_LINKAGE_BACKFILL=1 pnpm --filter @medora/api run prisma:seed-catalogs
```

**Default: OFF** (not run during normal catalog seed).

---

## Rollback

- Do not delete canonical rows in routine rollback.
- To undo linkage: set `MedicationProduct.legacyCatalogMedicationId` to `NULL` for affected Haiti codes (preserve concepts/packages for audit).
- Re-run is idempotent after rollback only if product codes remain unique.

---

## Next phase

**M1.5F** — provider search canonical cutover audit (may remove linkage-only gate exception and enable `orderSearchEnabled` per tranche).
