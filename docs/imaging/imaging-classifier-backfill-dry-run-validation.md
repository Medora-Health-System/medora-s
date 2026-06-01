# Imaging Classifier Backfill Dry-Run Validation (3C-B1E)

**Phase:** 3C-B1E (validation only)  
**Mode:** Dry-run — no `CatalogImagingStudy` FK writes, no `CatalogClassifierBackfillAudit` writes  
**Authority:** `imaging-classifier-backfill-mapping-44.md` (44 × 7 = 308 slots)

---

## 1. Execution method

| Method | Result |
|--------|--------|
| **In-memory simulation** (`catalog-classifier-backfill-b1e-dry-run.spec.ts`) | **PASS** — mapping-44 parity |
| **DB script** (`prisma/scripts/dry-run-catalog-classifiers.ts --haiti-44-only`) | **Blocked** on env without 3C-M1 columns (`lateralityClassifierId` missing) |

Simulation uses `HAITI_IMAGING_CATALOG` (44 rows), null classifier FKs, and a synthetic `TermClassifier` index covering all mapped codes — equivalent to first production apply after seeds.

---

## 2. Slot counts (run 1, null FKs)

| Status | Expected | Actual | Match |
|--------|----------|--------|:-----:|
| **APPLIED** | 199 | **199** | ✓ |
| **MANUAL_REVIEW** | 4 | **4** | ✓ |
| **SKIPPED** | 105 | **105** | ✓ |
| **TOTAL** | 308 | **308** | ✓ |
| UNCHANGED | 0 | 0 | ✓ |

---

## 3. Manual review rows (contrast)

| Code | Field | Status | classifierId |
|------|-------|--------|--------------|
| `CT_HEAD` | `contrastTypeClassifierId` | MANUAL_REVIEW | null |
| `CT_ABD` | `contrastTypeClassifierId` | MANUAL_REVIEW | null |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | `contrastTypeClassifierId` | MANUAL_REVIEW | null |
| `MRI_SPINE` | `contrastTypeClassifierId` | MANUAL_REVIEW | null |

---

## 4. Intentional NULL (B1B)

| Code | Contrast assignment |
|------|---------------------|
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | None — MANUAL_REVIEW only |
| `MRI_SPINE` | None — MANUAL_REVIEW only |

---

## 5. Inactive / predecessor contrast

| Code | Contrast auto-apply |
|------|---------------------|
| `CT_HEAD` (inactive) | **No** — MANUAL_REVIEW |
| `CT_ABD` (predecessor) | **No** — MANUAL_REVIEW |

---

## 6. CTA modality

| Code | Legacy `modality` | Planned classifier | Audit status |
|------|-------------------|--------------------|--------------|
| `CTA_CHEST` | CT | `MODALITY_CTA` | APPLIED |
| `CTA_HEAD_NECK` | CT | `MODALITY_CTA` | APPLIED |
| `CTA_ABDOMEN_PELVIS` | CT | `MODALITY_CTA` | APPLIED |

Legacy modality string on catalog row is **not modified** by backfill (FK only).

---

## 7. Idempotency (run 2)

After applying planned FK targets in memory:

| Status | Run 1 | Run 2 |
|--------|------:|------:|
| APPLIED | 199 | **0** |
| UNCHANGED | 0 | **199** |
| MANUAL_REVIEW | 4 | **4** |
| SKIPPED | 105 | **105** |

**Idempotent:** ✓

---

## 8. Safety (no side effects)

Dry-run path verified in tests and service:

- No `catalogImagingStudy.update`
- No `catalogClassifierBackfillAudit.create`
- No `OrderItem`, `BillingCatalog`, `BillingEvent`, search, alias, or retirement module imports

---

## 9. Dry-run entry points

```bash
# Read-only DB dry-run (requires 3C-M1 columns + seeded TermClassifier)
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/dry-run-catalog-classifiers.ts -- --haiti-44-only

# Apply path dry-run (flag still required for non-dry apply)
TERMINOLOGY_BACKFILL_ENABLED=true pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/backfill-catalog-classifiers.ts -- --dry-run
```

---

## 10. SAFE / NOT SAFE

| Decision | Verdict |
|----------|---------|
| **3C-B1E dry-run validation (simulation)** | **SAFE** |
| **3C-B1F Gate W1 closure** | **NOT SAFE** — clinical sign-off + workbook CSV still open per `imaging-backfill-gate-w1-closure.md` |
| **3C-B1 production apply** | **NOT SAFE** |

---

*Validation only. No production execution. No commit.*
