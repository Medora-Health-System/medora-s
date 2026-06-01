# Wave 2 Production Preflight (Phase 2E.6C)

**Phase:** 2E.6C — read-only production validation  
**Date:** 2026-06-01  
**Target:** Railway **production** Postgres (service `Postgres`, `DATABASE_PUBLIC_URL`)  
**Method:** Read-only SQL / `wave2-staging-validation.ts` — **no writes**  
**Seed commit (minimum):** `52564a41` — *Add Wave 2 imaging catalog seed*

---

## 1. Executive result

| Domain | Expected (pre–Wave 2) | Live 2E.6C run |
|--------|----------------------|----------------|
| **Schema / migration** | **PASS** | **PENDING** — operator must re-run §7 before seed |
| **Classifiers** | **PASS** (141 imaging domains) | **PENDING** |
| **Catalog (80 active, W2 absent)** | **PASS** | **PENDING** |
| **Alias inventory (W1 intact)** | **PASS** | **PENDING** |
| **US tuple targets** | **PASS** (design) | **PENDING** |
| **Preflight overall** | **EXPECTED PASS** | **CONDITIONAL** until §7 executed |

**Evidence for expected state:** [`wave1-production-stabilization-audit.md`](wave1-production-stabilization-audit.md) (production read-only **2026-05-31**) — active **80**, Wave 1 **37**, `CT_HEAD` inactive, `MRI_SPINE` contrast **NULL**, classifiers **141** imaging domains. No Wave 2 production seed has been executed.

*This 2E.6C session could not execute live Railway queries (CLI auth unavailable). Treat §7 as mandatory immediately before 2E.6D production seed.*

---

## 2. Part 1 — Production catalog preflight

| Check | Expected | Source / notes | Result |
|-------|----------|----------------|--------|
| Migration `20260902120000_imaging_taxonomy_classifiers` | Applied | Wave 1 prod preflight + 2E.5B | **EXPECTED PASS** |
| Imaging `TermClassifier` (active) | **141** across 7 domains | Same as Wave 1 prod | **EXPECTED PASS** |
| Active imaging total | **80** | 43 Haiti active + 37 Wave 1 | **EXPECTED PASS** |
| Wave 1 rows present / active | **37 / 37** | 2E.5C stabilization | **EXPECTED PASS** |
| Haiti baseline active (excl. `CT_HEAD`) | **43** | 80 − 37 | **EXPECTED PASS** |
| Wave 2 codes present | **0** | Upsert-safe insert | **EXPECTED PASS** |
| Wave 2 active | **0** | Pre-seed | **EXPECTED PASS** |
| `CT_HEAD` inactive | `isActive = false` | 2E.5C | **EXPECTED PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | B1B governance | **EXPECTED PASS** |
| Duplicate active `code` | **0** | 2E.5C | **EXPECTED PASS** |
| Post–Wave 2 active (forecast) | **141** | 80 + 61 | *Post-seed target* |

### Classifier domain expectations

| Domain | Expected count |
|--------|---------------:|
| MODALITY | 8 |
| BODY_REGION | 42 |
| VIEW_COUNT | 6 |
| CONTRAST_TYPE | 5 |
| LATERALITY | 4 |
| ANATOMIC_SUBREGION | 36 |
| PROTOCOL | 40 |
| **Imaging subtotal** | **141** |

---

## 3. Part 2 — Alias preflight

| Check | Expected (pre–Wave 2) | Result |
|-------|----------------------|--------|
| Wave 2 alias rows on W2 codes | **0** | **EXPECTED PASS** |
| Wave 1 alias count | **41** | **EXPECTED PASS** (must remain **41** post-preflight) |
| `XR_CHEST` — `chest 1v decub` | present | **EXPECTED PASS** |
| `XR_CHEST` — `chest post intubation` | present | **EXPECTED PASS** |
| Wave-2-internal duplicate aliases (design) | **0** | **EXPECTED PASS** |
| Wave 2 aliases on wrong catalog codes | **0** | **EXPECTED PASS** (manifest 1:1) |

**Post-seed targets (staging reference, commit `52564a41`):**

| Metric | Expected after seed |
|--------|--------------------:|
| Wave 2 catalog aliases | **85** |
| US tuple aliases (on baseline codes) | **~31** (first run; idempotent run **0** new) |
| Wave 1 aliases | **41** (unchanged) |
| `XR_CHEST` tuple aliases | **2** (unchanged) |

*Pre-existing global duplicate alias strings (e.g. `ct head` on inactive + active rows) — accepted baseline; not Wave 2–blocking.*

---

## 4. Part 3 — US tuple preflight

**Tuple manifest:** [`wave2-us-tuple-pass.ts`](../../apps/api/prisma/data/wave2-us-tuple-pass.ts) — **15** mappings.

**Unique target codes (6)** — all exist in Haiti 44 manifest [`haiti-imaging-studies.ts`](../../apps/api/prisma/data/haiti-imaging-studies.ts):

| Code | Required state | Tuple impact |
|------|----------------|--------------|
| `US_ABDOMEN` | Active | Protocol → `PROTOCOL_US_ABDOMEN_LIMITED` + aliases |
| `US_PELVIS` | Active | Aliases only (multi-protocol variants) |
| `US_SCROTUM_TESTICULAR` | Active | Aliases only |
| `US_SOFT` | Active | Protocol → `PROTOCOL_US_NECK_THYROID` + aliases |
| `US_OB_FIRST` | Active | Aliases only |
| `US_OB_GROWTH` | Active | Aliases only |

| Safety check | Result |
|--------------|--------|
| No tuple target `US_ABD` | **PASS** (forbidden) |
| Idempotent re-run (staging) | **PASS** — run 2: **0** new tuple aliases, **0** protocol updates |
| Conflicting protocol FK on one code | **PASS** — pelvis/OB use aliases only; at most one `applyProtocol` per code |

**Staging evidence (local, not production):** First seed: **2** protocol updates (`US_ABDOMEN`, `US_SOFT`); second seed: **0** updates.

---

## 5. Wave 2 upsert safety

| Check | Result |
|-------|--------|
| 61 unique `catalogCode` values in manifest | **PASS** |
| No collision with Wave 1 (37) or Haiti 44 | **PASS** (design audit 2E.6A) |
| No forbidden codes in manifest | **PASS** |
| Seed idempotent (staging) | **PASS** — 2× `prisma:seed-catalogs`, Wave 2 line: `61 studies, 0 aliases` on run 2 |

---

## 6. Staging cross-reference (2E.6B — not production)

| Metric | Staging result |
|--------|----------------|
| `wave2-staging-validation.ts` | **PASS** (all checks) |
| Active imaging after Wave 2 | **141** |
| Search smoke | calcaneus, ankle, CTA LE, thyroid — **PASS** |
| `MRI_SPINE` / `CT_HEAD` regression | **PASS** |

---

## 7. Mandatory live verification (before production seed)

From `apps/api` with Railway CLI logged in:

```bash
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm exec ts-node --transpile-only prisma/scripts/wave2-staging-validation.ts
'
```

**Or** read-only SQL spot-check:

```sql
SELECT migration_name, finished_at FROM "_prisma_migrations"
WHERE migration_name = '20260902120000_imaging_taxonomy_classifiers';

SELECT domain, COUNT(*)::int AS n FROM "TermClassifier" WHERE "isActive" = true GROUP BY domain ORDER BY domain;

SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;

SELECT COUNT(*)::int AS wave1_active FROM "CatalogImagingStudy"
WHERE "isActive" = true AND code IN (
  SELECT unnest(ARRAY['XR_ABDOMEN_1V','XR_SACRUM_COCCYX_2V','CT_HEAD_W_CONTRAST','MRI_CSPINE_WO_CONTRAST']
  -- full list: see wave1-production-execution-package.md §3
));

SELECT COUNT(*)::int AS wave2_present FROM "CatalogImagingStudy"
WHERE code LIKE 'XR_%' AND code IN (SELECT code FROM "CatalogImagingStudy" WHERE code = 'XR_CALCANEUS_LEFT_2V');
-- Prefer: wave2-staging-validation.ts (uses full W2 code list from manifest)

SELECT code, "isActive" FROM "CatalogImagingStudy" WHERE code IN ('CT_HEAD','MRI_SPINE');
SELECT "contrastTypeClassifierId" FROM "CatalogImagingStudy" WHERE code = 'MRI_SPINE';

SELECT COUNT(*)::int AS w1_aliases FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code = 'XR_SACRUM_COCCYX_2V';

SELECT alias FROM "ImagingStudyAlias" a
JOIN "CatalogImagingStudy" c ON c.id = a."catalogImagingStudyId"
WHERE c.code = 'XR_CHEST' AND alias IN ('chest 1v decub','chest post intubation');

SELECT code, "isActive", "protocolClassifierId" IS NOT NULL AS has_protocol
FROM "CatalogImagingStudy"
WHERE code IN ('US_ABDOMEN','US_PELVIS','US_SCROTUM_TESTICULAR','US_SOFT','US_OB_FIRST','US_OB_GROWTH');
```

**Pass criteria:** Active imaging **80**; Wave 2 codes **0**; Wave 1 active **37**; `CT_HEAD` inactive; `MRI_SPINE` contrast **NULL**; W1 aliases **41**; XR_CHEST tuple **2**; US targets **6/6** active.

---

## 8. Preflight verdict

| Field | Value |
|-------|--------|
| **Expected preflight** | **PASS** |
| **Live 2E.6C preflight** | **PENDING** (execute §7) |
| **Blocks production seed until live PASS** | **Yes** |

---

*No production writes in 2E.6C.*
