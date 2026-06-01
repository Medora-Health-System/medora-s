# Imaging Taxonomy 3C-M1 Implementation Package

**Phase:** 3C-M1 audit + design (full 3C program package)  
**Status:** Implementation specification — **not applied**  
**Sources:** Phase 3C/3D imaging taxonomy documents; `schema.prisma`; Phase 2B.2 MRV precedent

---

## Executive summary

| Slice | Scope | Verdict |
|-------|-------|---------|
| **3C-M1** | DDL — 3 nullable FK columns on `CatalogImagingStudy` | **SAFE TO IMPLEMENT** |
| **3C-S1** | Seed — expand MODALITY, BODY_REGION, VIEW, CONTRAST (+26 codes) | **NOT SAFE** until manifest sign-off |
| **3C-S2** | Seed — LATERALITY, ANATOMIC_SUBREGION, PROTOCOL (+80 codes) | **NOT SAFE** until manifest sign-off |
| **3C-R1** | Runtime — extend search/include/meta (flag-gated) | **SAFE** after M1; no effect until flags on |
| **3C-B1** | Backfill — 44-row workbook tuple | **NOT SAFE** until Gate W1 |

**This document is the single implementation package for the full 3C program.** Deploy **3C-M1 independently**; seeds and backfill are sequenced dependencies.

---

## Part 1 — Schema design

### 1.1 `CatalogImagingStudy` additions

| Column | Type | Nullable | FK target | Relation name |
|--------|------|:--------:|-----------|---------------|
| `lateralityClassifierId` | `String?` | Yes | `TermClassifier.id` | `ImagingLateralityClassifier` |
| `anatomicSubregionClassifierId` | `String?` | Yes | `TermClassifier.id` | `ImagingAnatomicSubregionClassifier` |
| `protocolClassifierId` | `String?` | Yes | `TermClassifier.id` | `ImagingProtocolClassifier` |

**Unchanged:** `modality`, `bodyRegion`, `displayNameEn`, `displayNameFr`, existing four classifier FKs, all other tables.

### 1.2 Indexes (required)

One B-tree index per new FK column — matches existing pattern on `bodyRegionClassifierId` etc.

| Index name |
|------------|
| `CatalogImagingStudy_lateralityClassifierId_idx` |
| `CatalogImagingStudy_anatomicSubregionClassifierId_idx` |
| `CatalogImagingStudy_protocolClassifierId_idx` |

### 1.3 Foreign key constraints (required)

| Constraint name | Column | References | ON DELETE | ON UPDATE |
|-----------------|--------|------------|-----------|-----------|
| `CatalogImagingStudy_lateralityClassifierId_fkey` | `lateralityClassifierId` | `TermClassifier(id)` | **SET NULL** | **NO ACTION** |
| `CatalogImagingStudy_anatomicSubregionClassifierId_fkey` | `anatomicSubregionClassifierId` | `TermClassifier(id)` | **SET NULL** | **NO ACTION** |
| `CatalogImagingStudy_protocolClassifierId_fkey` | `protocolClassifierId` | `TermClassifier(id)` | **SET NULL** | **NO ACTION** |

**Rationale:** Identical to Phase 2B.2 classifier FKs — deactivating or removing a classifier must not delete catalog rows or break `OrderItem` UUID references.

**Domain enforcement:** Not enforced at DB level. Application + seed manifest restrict which `TermClassifier.domain` values each FK may reference:

| FK column | Allowed domain |
|-----------|----------------|
| `lateralityClassifierId` | `LATERALITY` |
| `anatomicSubregionClassifierId` | `ANATOMIC_SUBREGION` |
| `protocolClassifierId` | `PROTOCOL` |

### 1.4 `TermClassifier` reverse relations (required)

Add to `TermClassifier` model:

```prisma
imagingLaterality        CatalogImagingStudy[] @relation("ImagingLateralityClassifier")
imagingAnatomicSubregion CatalogImagingStudy[] @relation("ImagingAnatomicSubregionClassifier")
imagingProtocol          CatalogImagingStudy[] @relation("ImagingProtocolClassifier")
```

### 1.5 Exact Prisma schema diff

**File:** `apps/api/prisma/schema.prisma`

```diff
 model TermClassifier {
   ...
   imagingViewCount    CatalogImagingStudy[] @relation("ImagingViewCountClassifier")
+  imagingLaterality        CatalogImagingStudy[] @relation("ImagingLateralityClassifier")
+  imagingAnatomicSubregion CatalogImagingStudy[] @relation("ImagingAnatomicSubregionClassifier")
+  imagingProtocol          CatalogImagingStudy[] @relation("ImagingProtocolClassifier")
   labCategory         CatalogLabTest[]      @relation("LabCategoryClassifier")
   ...
 }

 model CatalogImagingStudy {
   ...
   viewCountClassifierId    String?
+  lateralityClassifierId       String?
+  anatomicSubregionClassifierId String?
+  protocolClassifierId         String?
   createdAt                DateTime @default(now())
   updatedAt                DateTime @updatedAt

   ...
   viewCountClassifier    TermClassifier? @relation("ImagingViewCountClassifier", fields: [viewCountClassifierId], references: [id], onDelete: SetNull, onUpdate: NoAction)
+  lateralityClassifier       TermClassifier? @relation("ImagingLateralityClassifier", fields: [lateralityClassifierId], references: [id], onDelete: SetNull, onUpdate: NoAction)
+  anatomicSubregionClassifier TermClassifier? @relation("ImagingAnatomicSubregionClassifier", fields: [anatomicSubregionClassifierId], references: [id], onDelete: SetNull, onUpdate: NoAction)
+  protocolClassifier         TermClassifier? @relation("ImagingProtocolClassifier", fields: [protocolClassifierId], references: [id], onDelete: SetNull, onUpdate: NoAction)
   aliases                ImagingStudyAlias[]

   @@index([viewCountClassifierId])
+  @@index([lateralityClassifierId])
+  @@index([anatomicSubregionClassifierId])
+  @@index([protocolClassifierId])
 }
```

**No changes to:** `OrderItem`, `ImagingStudyAlias`, `BillingCatalog`, `CatalogClassifierBackfillAudit` schema (audit uses `fieldName` string — no DDL).

### 1.6 Expected row counts post-M1

| Table | Before M1 | After M1 | Delta |
|-------|----------:|---------:|------:|
| `CatalogImagingStudy` | 44 | 44 | 0 |
| `CatalogImagingStudy` rows with new FKs non-null | 0 | 0 | 0 *(until backfill)* |
| `TermClassifier` | 51 | 51 | 0 *(until seed)* |
| `OrderItem` | N | N | 0 |

---

## Part 2 — TermClassifier domain design

### 2.1 New domains (3C-M1 enables FKs; 3C-S2 seeds vocabulary)

| Domain | String length | Codes (workbook population) |
|--------|:-------------:|----------------------------:|
| **LATERALITY** | 10 | **4** |
| **ANATOMIC_SUBREGION** | 18 | **36** |
| **PROTOCOL** | 8 | **40** |

**Authoritative code lists:** `docs/imaging/imaging-taxonomy-classifier-catalog.md` §2–4.

### 2.2 Expanded existing domains (3C-S1 — not M1 DDL)

| Domain | Current | Proposed total | Additions |
|--------|--------:|---------------:|----------:|
| MODALITY | 4 | 8 | +4 |
| BODY_REGION | 28 | 42 | +14 |
| VIEW_COUNT | 1 | 6 | +5 |
| CONTRAST_TYPE | 2 | 5 | +3 |

### 2.3 Full imaging classifier inventory (post 3C-S1 + 3C-S2)

| Domain | Total codes |
|--------|------------:|
| MODALITY | 8 |
| BODY_REGION | 42 |
| VIEW_COUNT | 6 |
| CONTRAST_TYPE | 5 |
| LATERALITY | 4 |
| ANATOMIC_SUBREGION | 36 |
| PROTOCOL | 40 |
| **Imaging subtotal** | **141** |
| LAB_CATEGORY *(unchanged)* | 16 |
| **All TermClassifier rows** | **157** |

### 2.4 Seed row counts (expected after 3C-S1/S2)

| Artifact | Count |
|----------|------:|
| New `TermClassifier` rows (imaging) | +106 |
| New `TermClassifierLabel` rows | +212 *(106 × fr/en)* |
| New `TermClassifierAlias` rows | ~120–180 *(manifest-dependent)* |
| `CatalogImagingStudy` rows | 44 *(unchanged)* |

### 2.5 Updated `MRV_CLASSIFIER_DOMAIN_COUNTS` (post seed)

```typescript
export const MRV_CLASSIFIER_DOMAIN_COUNTS = {
  BODY_REGION: 42,
  MODALITY: 8,
  LAB_CATEGORY: 16,
  VIEW_COUNT: 6,
  CONTRAST_TYPE: 5,
  LATERALITY: 4,
  ANATOMIC_SUBREGION: 36,
  PROTOCOL: 40,
} as const;
```

---

## Part 3 — Migration plan

### 3.1 Migration inventory

| ID | Folder name | Type | Depends on |
|----|-------------|------|------------|
| **3C-M1** | `20260902120000_imaging_taxonomy_classifiers` | DDL | `20260901120000_mrv_classifier_foundation` |
| **3C-S1** | *(data only — no migration folder)* | Seed | 3C-M1 |
| **3C-S2** | *(data only)* | Seed | 3C-S1 |
| **3C-B1** | *(script only)* | Backfill | 3C-S2 |

**Timestamp rule:** `20260902120000` is strictly greater than latest applied migration `20260901120000`.

### 3.2 Exact migration SQL (`20260902120000_imaging_taxonomy_classifiers`)

```sql
-- Phase 3C-M1 — imaging taxonomy classifier FKs (additive only)

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

### 3.3 Pre-migration verification SQL

```sql
SELECT COUNT(*) AS term_classifier_rows FROM "TermClassifier";
SELECT COUNT(*) AS imaging_catalog_rows FROM "CatalogImagingStudy";
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'CatalogImagingStudy'
    AND column_name IN ('lateralityClassifierId','anatomicSubregionClassifierId','protocolClassifierId');
-- Expect 0 rows before M1
```

### 3.4 Post-migration verification SQL

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'CatalogImagingStudy'
  AND column_name IN (
    'lateralityClassifierId',
    'anatomicSubregionClassifierId',
    'protocolClassifierId'
  );
-- Expect 3 rows, all is_nullable = YES

SELECT COUNT(*) FILTER (WHERE "lateralityClassifierId" IS NOT NULL) AS lat,
       COUNT(*) FILTER (WHERE "anatomicSubregionClassifierId" IS NOT NULL) AS sub,
       COUNT(*) FILTER (WHERE "protocolClassifierId" IS NOT NULL) AS proto
FROM "CatalogImagingStudy";
-- Expect 0, 0, 0 immediately after M1
```

### 3.5 Seed inventory (3C-S1 / 3C-S2 — not M1)

| Seed batch | File(s) | Runner | New classifier codes |
|------------|---------|--------|----------------------:|
| **3C-S1a** | `mrv-classifier-foundation.ts` | `seedMrvClassifiers()` via `seed-catalogs.ts` | +12 *(MODALITY, VIEW, CONTRAST)* |
| **3C-S1b** | `mrv-classifier-foundation.ts` | same | +14 *(BODY_REGION)* |
| **3C-S2a** | `mrv-classifier-foundation.ts` | same | +4 *(LATERALITY)* |
| **3C-S2b** | `mrv-classifier-foundation.ts` | same | +36 *(ANATOMIC_SUBREGION)* |
| **3C-S2c** | `mrv-classifier-foundation.ts` | same | +40 *(PROTOCOL)* |

**Optional future split:** `mrv-classifier-imaging-expansion.ts` imported by foundation — design choice at implementation; single manifest acceptable for MVP.

### 3.6 Backfill inventory (3C-B1 — not M1)

| Script | Path | Flag |
|--------|------|------|
| `backfill-catalog-classifiers.ts` | `apps/api/prisma/scripts/backfill-catalog-classifiers.ts` | `TERMINOLOGY_BACKFILL_ENABLED=true` |
| Service | `apps/api/src/terminology/catalog-classifier-backfill.service.ts` | |
| Maps | `apps/api/src/terminology/catalog-classifier-backfill-map.ts` | |

**Expected backfill field writes (44-row catalog, post 3C-S2):**

| fieldName | APPLIED | UNCHANGED | SKIPPED | MANUAL_REVIEW |
|-----------|--------:|----------:|--------:|--------------:|
| `bodyRegionClassifierId` | 0–44 | varies | 0 | 0 |
| `modalityClassifierId` | 0–4 *(CTA)* | varies | 0 | 0 |
| `contrastTypeClassifierId` | 0–5 | varies | 0 | **9** |
| `viewCountClassifierId` | 0–16 | varies | varies | 0 |
| `lateralityClassifierId` | **44** | 0 | 0 | 0 |
| `anatomicSubregionClassifierId` | **3** | 0 | **41** | 0 |
| `protocolClassifierId` | **8** | 0 | **36** | 0 |

**Total audit rows per backfill run (44 imaging rows):** up to **308** field audits (44 × 7) + lab rows unchanged.

**Catalog rows with full 7-FK tuple after B1 (deterministic):** ~10 *(rows with contrast WO, view 2V, protocol, subregion — remainder blocked on MANUAL_REVIEW contrast)*.

---

## Part 4 — Backfill design

### 4.1 44-row catalog backfill maps (proposed)

**New map constants in `catalog-classifier-backfill-map.ts`:**

| Map | Entries | Source |
|-----|--------:|--------|
| `LATERALITY_CATALOG_CODE_TO_CLASSIFIER` | 44 | Workbook §2.1 — all `LATERALITY_UNSPECIFIED` |
| `ANATOMIC_SUBREGION_CATALOG_CODE_TO_CLASSIFIER` | 3 | `CT_CERVICAL_SPINE`, `CT_SPINE_LUMBAR` (+ verify cervical) |
| `PROTOCOL_CATALOG_CODE_TO_CLASSIFIER` | 8 | FAST, OB×2, Doppler×2, CTA chest×2, CAP trauma |
| `MODALITY_CTA_CATALOG_CODES` | 4 | `CT_CHEST_CTA`, `CTA_CHEST`, `CTA_HEAD_NECK`, `CTA_ABDOMEN_PELVIS` |
| `VIEW_COUNT_CATALOG_CODE_TO_CLASSIFIER` *(extend)* | +16 | Generic XR → `VIEW_COUNT_ONE` |
| `CONTRAST_CATALOG_CODE_TO_CLASSIFIER` *(extend)* | 0 new until MR cleared | |

**Workbook authority:** `imaging-taxonomy-workbook-population.md` §2.1.

### 4.2 Service extension pattern

Mirror existing loops for each new FK:

1. Load row with new FK columns in `select`.
2. Resolve target from code→classifier map.
3. `planFieldBackfill(current, target)`.
4. Update on `APPLIED`.
5. `audit()` with `fieldName` = exact column name.

**Order within imaging loop:** bodyRegion → modality → viewCount → contrast → **laterality → anatomicSubregion → protocol**.

### 4.3 Manual review handling

| Category | Codes | Backfill behavior |
|----------|-------|-------------------|
| Contrast ambiguous (CT/MRI) | 9 codes in `CONTRAST_MANUAL_REVIEW_IMAGING_CODES` | Audit `MANUAL_REVIEW`; **no FK write** |
| XR abdomen duplicate | `XR_ABDOMEN` | Laterality/view may backfill; retirement decision separate |
| Retirement predecessors | `US_ABD`, `DOPPLER_VEIN`, `CT_ABD`, `CT_CHEST_CTA`, `CT_HEAD` | Backfill allowed for audit; do not backfill after retirement cutover |
| MSK laterality policy | 16 generic XR | Assign `LATERALITY_UNSPECIFIED` unless EXPAND policy changes |

**Gate:** Do not run 3C-B1 in production until MANUAL_REVIEW queue ≤ agreed threshold (Phase 3D readiness Gate W1).

### 4.4 Rollback behavior

| Layer | Rollback action | Data impact |
|-------|-----------------|-------------|
| **Runtime flags** | Set `TERMINOLOGY_READ/SEARCH/BACKFILL` to off | Immediate; zero user-visible change |
| **Backfill data** | Leave FK values in place; flags off ignores them | Safe |
| **Backfill data (destructive)** | Set new FK columns to NULL via SQL | Safe; no OrderItem impact |
| **Seed** | Deactivate classifiers (`isActive=false`); SET NULL on FKs | Safe |
| **Schema M1** | Drop 3 columns + constraints | **Avoid in production** after backfill; forward-only |

**Production rule:** Treat 3C-M1 as **forward-only** once any environment runs 3C-B1.

### 4.5 Dual-read strategy

| Read path | Primary source | Classifier enrichment |
|-----------|----------------|----------------------|
| Order create/search label | `displayNameEn` / `displayNameFr` | None |
| Catalog search | Legacy string `contains` on code, names, modality, bodyRegion | + classifier OR when `TERMINOLOGY_SEARCH_CLASSIFIER=true` |
| Search DTO meta line | Legacy `modality · bodyRegion` | + classifier labels when `TERMINOLOGY_READ_CLASSIFIER=true` |
| Chart/order reload | `OrderItem.catalogItemId` → catalog join | Unchanged — no classifier snapshot on `OrderItem` |
| Billing enrichment | `billingCodeDefault` on catalog | **Never** classifiers |

**Dual-read invariant:** When all `TERMINOLOGY_*` flags are **false** (default), behavior is **bit-identical** to pre-3C.

**3C-R1 extensions (flag-gated only):**

- `imagingClassifierInclude` — add optional relations for laterality, subregion, protocol labels.
- `imagingClassifierSearchOr` — add 3 OR clauses + searchText matches.
- `buildImagingClassifierMetaLine` — append compact FR tokens (optional; density rule applies).

### 4.6 Verification strategy

| Step | Command / query | Pass criteria |
|------|-----------------|---------------|
| V1 Post-M1 | Post-migration SQL §3.4 | 3 nullable columns; 0 non-null FKs |
| V2 Post-seed | `SELECT domain, COUNT(*) FROM "TermClassifier" GROUP BY domain` | Matches `MRV_CLASSIFIER_DOMAIN_COUNTS` |
| V3 Post-backfill | Audit summary by fieldName/status | laterality 44 APPLIED; contrast 9 MANUAL_REVIEW |
| V4 Flags off | Imaging search integration tests | No regression |
| V5 Flags on | `terminology-classifier-search.util.spec.ts` + imaging catalog specs | New OR clauses match |
| V6 Billing guard | `imaging-successor-billing.spec.ts` | Still no classifier billing path |

---

## Part 5 — Safety review

| System | 3C-M1 impact | 3C-S/B/R impact | Verdict |
|--------|--------------|-----------------|---------|
| **Billing** | None | None — classifiers excluded from `billing-capture.enrichment` | **SAFE** |
| **OrderItem** | None — stores `catalogItemId` UUID only | None | **SAFE** |
| **ROI / reporting** | None | Future joins optional; no schema on orders | **SAFE** |
| **Chart exports** | None | Meta line optional via read flag | **SAFE** |
| **Duplicate retirement** | None | Successor tuple must include new FKs before cutover | **SAFE** if 2D follows gate order |
| **Terminology governance** | Extends MRV domains | Seed count guard prevents drift | **SAFE** with manifest discipline |
| **MRV governance** | 3 new domains | 141 imaging codes — monitor sprawl | **SAFE** at clinic MVP scale |
| **Lab catalog** | None | Unaffected | **SAFE** |
| **Offline readiness** | Stable classifier UUIDs | Seedable vocabulary | **Compatible** |

**Breaking-change risk (3C-M1):** **LOW** — additive nullable columns only.

**Breaking-change risk (full 3C):** **LOW** — flag-gated runtime; backfill non-destructive.

---

## Part 6 — Implementation package

### 6.1 Files expected to change

| File | Phase | Change |
|------|-------|--------|
| `apps/api/prisma/schema.prisma` | M1 | 3 FK columns, 3 relations, 3 indexes |
| `apps/api/prisma/migrations/20260902120000_imaging_taxonomy_classifiers/migration.sql` | M1 | **Create** |
| `apps/api/prisma/data/mrv-classifier-foundation.ts` | S1/S2 | +106 classifier entries; update domain counts |
| `apps/api/src/terminology/catalog-classifier-backfill-map.ts` | B1 | New maps for 3 FKs + extensions |
| `apps/api/src/terminology/catalog-classifier-backfill.service.ts` | B1 | 3 new backfill loops |
| `apps/api/src/terminology/terminology-classifier-search.util.ts` | R1 | 3 new OR relations |
| `apps/api/src/order-catalog/imaging-catalog.service.ts` | R1 | Extend `imagingClassifierInclude` |
| `apps/api/src/terminology/resolve-classifier-catalog-meta.util.ts` | R1 | Optional meta extension |
| `apps/api/src/terminology/catalog-classifier-backfill.service.spec.ts` | B1 | New FK tests |
| `apps/api/src/terminology/terminology-classifier-search.util.spec.ts` | R1 | New OR clause tests |
| `apps/api/src/order-catalog/catalog-search.mapper.spec.ts` | R1 | Meta line tests *(if extended)* |

### 6.2 Files explicitly unchanged

| File | Reason |
|------|--------|
| `apps/api/prisma/data/haiti-imaging-studies.ts` | No catalog expansion in 3C |
| `apps/api/prisma/data/billing-catalog-common.ts` | Billing out of scope |
| `apps/api/prisma/data/imaging-cpt-mapping-review.ts` | No CPT changes |
| `apps/api/src/terminology/imaging-catalog-successor-map.ts` | Retirement scripts separate (2D) |
| Order/billing/chart services | No OrderItem schema change |

### 6.3 Test suites required

| Suite | Phase | Purpose |
|-------|-------|---------|
| `catalog-classifier-backfill.service.spec.ts` | B1 | New FK maps + MANUAL_REVIEW |
| `terminology-classifier-search.util.spec.ts` | R1 | Search OR for 3 domains |
| `terminology-flags.util.spec.ts` | R1 | Flag gating unchanged |
| `catalog-search.mapper.spec.ts` | R1 | Read flag meta |
| `imaging-successor-billing.spec.ts` | M1+ | **Regression** — no classifier billing |
| `imaging-catalog-retirement.spec.ts` | M1+ | **Regression** — retirement scanners |
| `imaging-catalog-alias.spec.ts` | M1+ | **Regression** — alias shortcuts |
| `imaging-ct-head-dual-search.spec.ts` | M1+ | **Regression** — search parity |
| *(new)* `imaging-taxonomy-schema.spec.ts` | M1 | Prisma client shape / migration smoke *(optional)* |

---

## Part 7 — Deployment and rollback commands

### 7.1 Deployment sequence

```bash
# ── 3C-M1 (schema only) ─────────────────────────────────────
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma generate

# Verify (SQL from §3.4)

# ── 3C-S1 + 3C-S2 (after manifest sign-off) ─────────────────
pnpm run prisma:seed-catalogs
# Or full seed if policy requires:
# pnpm exec prisma db seed

# Verify TermClassifier domain counts = 157 total

# ── 3C-B1 (staging first; Gate W1) ──────────────────────────
TERMINOLOGY_BACKFILL_ENABLED=true \
  pnpm exec ts-node --transpile-only prisma/scripts/backfill-catalog-classifiers.ts

# Review CatalogClassifierBackfillAudit for runId

# ── 3C-R1 (staged per environment) ────────────────────────────
# Set in deployment env:
#   TERMINOLOGY_READ_CLASSIFIER=true
#   TERMINOLOGY_SEARCH_CLASSIFIER=true   # optional second stage
```

### 7.2 Rollback commands

```bash
# ── Immediate runtime rollback (all phases) ───────────────────
# Unset or set to false:
#   TERMINOLOGY_READ_CLASSIFIER
#   TERMINOLOGY_SEARCH_CLASSIFIER
#   TERMINOLOGY_BACKFILL_ENABLED

# ── Backfill data rollback (if needed) ────────────────────────
# psql — run:
# UPDATE "CatalogImagingStudy"
#   SET "lateralityClassifierId" = NULL,
#       "anatomicSubregionClassifierId" = NULL,
#       "protocolClassifierId" = NULL;

# ── Schema rollback (EMERGENCY ONLY — pre-production) ─────────
# pnpm exec prisma migrate resolve --rolled-back 20260902120000_imaging_taxonomy_classifiers
# Then apply reverse SQL:
# ALTER TABLE "CatalogImagingStudy"
#   DROP CONSTRAINT IF EXISTS "CatalogImagingStudy_protocolClassifierId_fkey",
#   DROP CONSTRAINT IF EXISTS "CatalogImagingStudy_anatomicSubregionClassifierId_fkey",
#   DROP CONSTRAINT IF EXISTS "CatalogImagingStudy_lateralityClassifierId_fkey";
# DROP INDEX IF EXISTS "CatalogImagingStudy_protocolClassifierId_idx";
# DROP INDEX IF EXISTS "CatalogImagingStudy_anatomicSubregionClassifierId_idx";
# DROP INDEX IF EXISTS "CatalogImagingStudy_lateralityClassifierId_idx";
# ALTER TABLE "CatalogImagingStudy"
#   DROP COLUMN IF EXISTS "protocolClassifierId",
#   DROP COLUMN IF EXISTS "anatomicSubregionClassifierId",
#   DROP COLUMN IF EXISTS "lateralityClassifierId";
```

**Do not** drop 3C-M1 columns in production after 3C-B1 without coordinated vocabulary + audit plan.

---

## Part 8 — Implementation order

```
3C-M1  migrate deploy + generate          ← SAFE standalone
   ↓
3C-S1  seed expanded domains (+26)        ← NOT SAFE until sign-off
   ↓
3C-S2  seed LATERALITY/SUBREGION/PROTOCOL   ← NOT SAFE until sign-off
   ↓
3C-B1  backfill 44-row workbook tuple       ← NOT SAFE until Gate W1
   ↓
3C-R1  enable flags staging → production
   ↓
2D     duplicate retirement (separate program)
   ↓
2E     catalog expansion (separate program)
```

---

## Part 9 — SAFE / NOT SAFE

| Action | Verdict |
|--------|---------|
| **3C-M1 schema design (this document)** | **SAFE** |
| **3C-M1 migration deploy** | **SAFE** — additive DDL; flags default off |
| **3C-S1/S2 seed** | **NOT SAFE** until radiology sign-off on 141-code manifest |
| **3C-B1 backfill** | **NOT SAFE** until Gate W1 (34/44 MR=YES in workbook) |
| **3C-R1 flag enablement** | **SAFE** in staging after B1; production staged |
| **Full 3C program as one deploy** | **NOT SAFE** — violates gate order |

---

## Appendix A — Migration / seed / backfill name registry

| Name | Type |
|------|------|
| `20260902120000_imaging_taxonomy_classifiers` | Migration folder |
| `3C-S1` | Seed batch — expanded MODALITY/BODY/VIEW/CONTRAST |
| `3C-S2` | Seed batch — LATERALITY/ANATOMIC_SUBREGION/PROTOCOL |
| `seedMrvClassifiers()` | Seed function |
| `backfill-catalog-classifiers.ts` | Backfill script |
| `runCatalogClassifierBackfill()` | Backfill service entry |

---

*Phase 3C-M1 audit + design only. No code, migrations, seeds, commits, or deployments applied.*
