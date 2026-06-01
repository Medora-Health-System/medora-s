# Wave 1 Production Preflight (Phase 2E.5A.1)

**Phase:** 2E.5A.1 — read-only production validation  
**Date:** 2026-06-01  
**Target:** Railway **production** Postgres (`empathetic-unity` / service `Postgres`)  
**Method:** Read-only SQL via Railway public proxy (`DATABASE_PUBLIC_URL`) — **no writes**

---

## 1. Executive result

| Domain | Result |
|--------|--------|
| **Schema / migration** | **PASS** |
| **Classifiers** | **PASS** |
| **Catalog** | **PASS** |
| **Alias inventory** | **PASS** |
| **C1 overall** | **PASS** |

---

## 2. Schema

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Migration `20260902120000_imaging_taxonomy_classifiers` applied | Yes | Yes — `finished_at` **2026-06-01T01:19:30.423Z** | **PASS** |
| Columns `lateralityClassifierId`, `anatomicSubregionClassifierId`, `protocolClassifierId` | 3 | 3 found | **PASS** |

---

## 3. Classifiers (active `TermClassifier`)

| Domain | Expected | Actual | Match |
|--------|----------:|-------:|:-----:|
| MODALITY | 8 | **8** | ✓ |
| BODY_REGION | 42 | **42** | ✓ |
| VIEW_COUNT | 6 | **6** | ✓ |
| CONTRAST_TYPE | 5 | **5** | ✓ |
| LATERALITY | 4 | **4** | ✓ |
| ANATOMIC_SUBREGION | 36 | **36** | ✓ |
| PROTOCOL | 40 | **40** | ✓ |
| **Imaging subtotal** | **141** | **141** | ✓ |

*Also present: `LAB_CATEGORY` = **16** (full MRV seed — expected).*

**Result:** **PASS**

---

## 4. Catalog

| Check | Expected (pre–Wave 1) | Actual | Result |
|-------|----------------------|--------|--------|
| `CT_HEAD` inactive | `isActive = false` | **false** | **PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | `NULL` | **NULL** | **PASS** |
| Active imaging rows | **43** | **43** | **PASS** |
| Wave 1 codes present | **0** (upsert-safe) | **0** | **PASS** |
| Wave 1 active | **0** | **0** | **PASS** |
| Duplicate `code` rows | **0** | **0** | **PASS** |

**Catalog integrity:** Baseline Haiti imaging (43 active + inactive `CT_HEAD`) matches 2E.5B preflight expectations. Wave 1 upsert will add **37** active rows → **80** active post-seed.

**Result:** **PASS**

---

## 5. Alias inventory

| Check | Expected (pre–Wave 1) | Actual | Result |
|-------|----------------------|--------|--------|
| Wave 1 codes present | 0 aliases on Wave 1 rows | **0** rows | **PASS** |
| Wave-1-internal duplicate aliases | 0 | **0** | **PASS** |
| `XR_CHEST` tuple `chest 1v decub` | Absent pre-seed (safe to add) | **not present** | **PASS** |
| `XR_CHEST` tuple `chest post intubation` | Absent pre-seed | **not present** | **PASS** |

*Production may have baseline global duplicate alias strings (e.g. `ct head` on inactive + active rows) — pre-existing; not Wave 1–blocking.*

**Result:** **PASS**

---

## 6. Read-only verification command (repeatable)

From repo root (requires Railway CLI, production env, Postgres service):

```bash
cd apps/api
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm exec prisma db execute --stdin <<SQL
SELECT migration_name, finished_at FROM "_prisma_migrations"
WHERE migration_name = '\''20260902120000_imaging_taxonomy_classifiers'\'';
SELECT domain, COUNT(*)::int AS n FROM "TermClassifier" WHERE "isActive" = true GROUP BY domain ORDER BY domain;
SELECT COUNT(*)::int AS active_imaging FROM "CatalogImagingStudy" WHERE "isActive" = true;
SELECT code, "isActive" FROM "CatalogImagingStudy" WHERE code IN ('\''CT_HEAD'\'','\''MRI_SPINE'\'');
SQL
'
```

*2E.5A.1 audit used equivalent read-only queries; outputs captured in engineering ticket.*

---

## 7. C1 sign-off

| Role | C1 production preflight |
|------|:-----------------------:|
| Engineering | ☑ (2026-06-01, Railway prod read-only) |

---

*No writes in 2E.5A.1.*
