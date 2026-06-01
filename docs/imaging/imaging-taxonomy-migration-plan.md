# Imaging Taxonomy Migration Plan

**Phase:** 3C (design-only)  
**Recommended model:** Option A — extended generic `TermClassifier`  
**Prerequisite:** Phase 2D duplicate retirements (or parallel track with frozen predecessor rows)

---

## 1. Migration overview

| Migration | Type | Scope | Downtime |
|-----------|------|-------|----------|
| **3C-M1** | Prisma additive | 3 FK columns on `CatalogImagingStudy` | None |
| **3C-S1** | Seed data | Expand existing domains (MODALITY, CONTRAST, VIEW, BODY_REGION) | None |
| **3C-S2** | Seed data | New domains (LATERALITY, ANATOMIC_SUBREGION, PROTOCOL) | None |
| **3C-B1** | Backfill script | Populate new + existing FKs from workbook | None (flag-gated) |
| **3C-R1** | Runtime (config) | Enable classifier read/search flags per environment | None |

**No destructive migrations.** No `OrderItem` changes. No billing changes.

---

## 2. Migration 3C-M1 — Schema (proposed SQL shape)

**Folder naming:** `apps/api/prisma/migrations/YYYYMMDDHHMMSS_imaging_taxonomy_classifiers/`  
*(timestamp must be strictly greater than latest existing migration when implemented)*

```sql
-- Phase 3C — imaging taxonomy classifier FKs (additive)

ALTER TABLE "CatalogImagingStudy"
  ADD COLUMN "lateralityClassifierId" TEXT,
  ADD COLUMN "anatomicSubregionClassifierId" TEXT,
  ADD COLUMN "protocolClassifierId" TEXT;

CREATE INDEX "CatalogImagingStudy_lateralityClassifierId_idx"
  ON "CatalogImagingStudy"("lateralityClassifierId");

CREATE INDEX "CatalogImagingStudy_anatomicSubregionClassifierId_idx"
  ON "CatalogImagingStudy"("anatomicSubregionClassifierId");

CREATE INDEX "CatalogImagingStudy_protocolClassifierId_idx"
  ON "CatalogImagingStudy"("protocolClassifierId");

ALTER TABLE "CatalogImagingStudy"
  ADD CONSTRAINT "CatalogImagingStudy_lateralityClassifierId_fkey"
  FOREIGN KEY ("lateralityClassifierId") REFERENCES "TermClassifier"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "CatalogImagingStudy"
  ADD CONSTRAINT "CatalogImagingStudy_anatomicSubregionClassifierId_fkey"
  FOREIGN KEY ("anatomicSubregionClassifierId") REFERENCES "TermClassifier"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "CatalogImagingStudy"
  ADD CONSTRAINT "CatalogImagingStudy_protocolClassifierId_fkey"
  FOREIGN KEY ("protocolClassifierId") REFERENCES "TermClassifier"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
```

### 2.1 Pre-migration checks

```sql
-- Confirm TermClassifier table exists (2B.2 applied)
SELECT COUNT(*) FROM "TermClassifier";

-- Baseline null rate on existing classifier FKs
SELECT
  COUNT(*) FILTER (WHERE "modalityClassifierId" IS NULL) AS modality_null,
  COUNT(*) FILTER (WHERE "bodyRegionClassifierId" IS NULL) AS body_null,
  COUNT(*) FILTER (WHERE "contrastTypeClassifierId" IS NULL) AS contrast_null,
  COUNT(*) FILTER (WHERE "viewCountClassifierId" IS NULL) AS view_null
FROM "CatalogImagingStudy";
```

### 2.2 Post-migration verification

```sql
-- New columns exist and are nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'CatalogImagingStudy'
  AND column_name IN (
    'lateralityClassifierId',
    'anatomicSubregionClassifierId',
    'protocolClassifierId'
  );

-- FK constraints present
SELECT conname FROM pg_constraint
WHERE conname LIKE 'CatalogImagingStudy_%ClassifierId_fkey';
```

### 2.3 Rollback strategy

| Step | Action |
|------|--------|
| Runtime | Disable `TERMINOLOGY_*` flags — immediate |
| Data | New FK columns nullable — leave NULL; no order impact |
| Schema rollback | **Avoid** after production deploy — if required, drop columns only when all NULL and flags off |

**Production rule:** Treat 3C-M1 as **forward-only** once any environment backfills FKs.

---

## 3. Seed migrations (data-only, no DDL)

### 3C-S1 — Expand existing domains

**File:** extend `apps/api/prisma/data/mrv-classifier-foundation.ts`  
**Runner:** existing `seedMrvClassifiers()` via `seed-catalogs.ts` or full seed

| Domain | New codes (count) |
|--------|------------------:|
| MODALITY | +4 |
| CONTRAST_TYPE | +3 |
| VIEW_COUNT | +4 |
| BODY_REGION | +20–35 |

**Update:** `MRV_CLASSIFIER_DOMAIN_COUNTS` — counts must match exactly or seed throws.

**Risk:** Low — upsert by (domain, code); existing rows updated in place.

### 3C-S2 — New domains

| Domain | Initial count |
|--------|-------------:|
| LATERALITY | 4 |
| ANATOMIC_SUBREGION | ~35 (starter) |
| PROTOCOL | ~45 (starter) |

**Total new TermClassifier rows:** ~84 + BODY_REGION expansions.

**Domain string length check:** all domains ≤ 32 chars (`ANATOMIC_SUBREGION` = 18 chars ✓).

---

## 4. Application code changes (future phases — ordered)

| Step | Module | Change |
|------|--------|--------|
| 1 | `schema.prisma` | 3 FK columns + relations |
| 2 | `mrv-classifier-foundation.ts` | Vocabulary |
| 3 | `catalog-classifier-backfill-map.ts` | Legacy → classifier maps for new fields |
| 4 | `catalog-classifier-backfill.service.ts` | Backfill loops for 3 new FKs |
| 5 | `terminology-classifier-search.util.ts` | OR clauses for new relations |
| 6 | `imaging-catalog.service.ts` | Include new relations in `imagingClassifierInclude` |
| 7 | `resolve-classifier-catalog-meta.util.ts` | Optional meta line extension |
| 8 | Tests | Backfill, search, guard specs |

**Explicitly unchanged in 3C implementation scope:**

- `haiti-imaging-studies.ts` row count
- `billing-catalog-common.ts`
- `imaging-catalog-successor-map.ts` (unless retirement tuple alignment)
- `CreateOrderModal.tsx`

---

## 5. Breaking-change risk assessment

| Area | Risk | Level |
|------|------|-------|
| **API response shape** | Search DTO unchanged unless read flag on | **Low** |
| **Prisma client** | New optional fields after generate | **Low** |
| **Existing queries** | No column renames or drops | **None** |
| **Order create/load** | No OrderItem schema change | **None** |
| **Billing capture** | Guarded — no classifier coupling | **None** |
| **Seed count guard** | `MRV_CLASSIFIER_DOMAIN_COUNTS` mismatch fails seed | **Medium** — must update counts atomically with vocabulary |
| **Classifier FK wrong domain** | App must resolve by (domain, code) — backfill map discipline | **Medium** — mitigated by typed maps + tests |
| **Display label drift** | If displayName changed during backfill | **Low** — backfill must not touch labels |

**Overall breaking-change risk: LOW** — additive-only migration.

---

## 6. Operational risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Production seed run before migration | Medium | Seed fails on missing columns | Deploy order: **migration → API → seed** |
| Backfill assigns wrong classifier | Medium | Search meta incorrect; billing unaffected | Workbook review + dry-run audit report |
| Dual-active duplicate pairs confound tuple | High | Ambiguous classifiers on predecessor/successor | Complete Phase 2D before 3C-B1 on affected codes |
| Flag enablement confuses clinicians | Low | Extra meta text in search | Keep meta compact; French-only product labels |
| Vocabulary sprawl | Medium | Maintenance burden | Govern via seed manifest + domain count tests |
| Offline sync complexity | Low (future) | Classifier UUID stability | TermClassifier IDs stable after first seed |

**Overall operational risk: MEDIUM** — dominated by governance/ordering discipline, not schema danger.

---

## 7. Deployment sequence (recommended)

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0 — Gates                                             │
│  • Phase 2D US_ABD retirement (or freeze list)             │
│  • Production OrderItem count SQL for predecessors          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1 — 3C-M1 migration (all environments)                │
│  • prisma migrate deploy                                    │
│  • prisma generate                                          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2 — 3C-S1 + 3C-S2 seed (catalog seed path)            │
│  • pnpm --filter @medora/api run prisma:seed-catalogs       │
│  • Verify MRV_CLASSIFIER_DOMAIN_COUNTS                      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3 — 3C-B1 backfill (staging first)                    │
│  • TERMINOLOGY_BACKFILL_ENABLED=true                        │
│  • catalog:backfill-classifiers script                      │
│  • Review CatalogClassifierBackfillAudit                    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 4 — Runtime flags (staging → production)              │
│  • TERMINOLOGY_READ_CLASSIFIER=true                         │
│  • TERMINOLOGY_SEARCH_CLASSIFIER=true (optional)            │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 5 — Phase 2E catalog expansion (separate program)       │
│  • New rows seeded with full classifier tuple                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Environment matrix

| Environment | 3C-M1 | 3C-S* | 3C-B1 | Flags |
|-------------|-------|-------|-------|-------|
| Local dev | Yes | Yes | Yes | Dev-only true |
| Staging | Yes | Yes | Yes | Staged rollout |
| Production | Yes | Yes | After staging audit | Staged rollout |

**Production data changes:** FK column adds (NULL); TermClassifier inserts; optional FK updates via backfill — **no OrderItem writes**.

---

## 9. Retirement compatibility (Phase 2C/2D)

| Rule | Detail |
|------|--------|
| Predecessor deactivation | `isActive: false` — classifiers may remain on row for audit |
| Successor tuple | Must receive full classifier set before predecessor retirement |
| Alias transfer | Unchanged — Phase 2C scripts |
| Search shortcut | Successor-only after cutover |
| Backfill on inactive rows | Allowed for audit; search excludes inactive catalog |

---

## 10. Future enterprise catalog compatibility

| Capability | Supported by 3C design |
|------------|------------------------|
| ~100–150 catalog rows | Yes — FK tuple per row |
| 267 legacy normalization workbook | Yes — maps to tuple + optional new codes |
| NM / FL / MRA modalities | Yes — MODALITY domain expansion |
| CPT distinct orderables | Separate catalog codes; shared classifiers where CPT matches |
| Facility-specific catalogs | **Not in 3C** — global catalog remains |
| Reporting by classifier | Future — query classifier FKs or denormalized summary |

---

*Phase 3C — design only. No migration applied.*
