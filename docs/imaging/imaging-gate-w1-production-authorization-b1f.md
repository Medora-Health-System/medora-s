# Gate W1 Production Authorization Audit (3C-B1F)

**Phase:** 3C-B1F (audit-only)  
**Question:** Can Gate W1 be formally closed after 3C-B1E? Is production apply authorized?  
**Prior audits:** `imaging-backfill-gate-w1-closure.md` (3C-B1C), `imaging-classifier-backfill-dry-run-validation.md` (3C-B1E)

---

## Final verdict

# GATE W1 REMAINS OPEN — NOT SAFE TO APPLY

Formal Gate W1 (Phase 3D definition) is **not closable** on documentation and simulation evidence alone. Two criteria remain **NOT SATISFIED**: workbook CSV artifact and recorded clinical sign-off.

**Technical readiness** for a scoped FK-only apply is **high** (3C-M1/S1/S2 stated deployed, 7-field implementation, B1E counts match mapping-44). That does **not** override the open governance gate without an explicit **W1 narrowing amendment** (not enacted in this audit).

---

## Part 1 — Gate W1 requirements (formal)

**Source:** `imaging-taxonomy-workbook-readiness.md` §6 Gate W1

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| W1-1 | `imaging-taxonomy-workbook.csv` exists (44 active + 1 retired) | **NOT SATISFIED** | No CSV in repo; Phase 3D §9 marked export out of scope |
| W1-2 | All classifier columns filled with valid proposed codes | **SATISFIED** | `imaging-classifier-backfill-mapping-44.md` — 308 slots; ICM-1.0 codes |
| W1-3 | `Manual Review Required = NO` on all **active** rows (or documented exceptions) | **NOT SATISFIED** | `imaging-taxonomy-workbook-population.md` §2.2: **41/43** active rows `MR=YES`; field-level backfill MR = **4 slots only** (contrast) |
| W1-4 | Clinical sign-off recorded | **NOT SATISFIED** | `imaging-classifier-signoff.md`: “Clinical radiology sign-off — **NOT RECEIVED**” |
| W1-5 | No duplicate active `Canonical Code` | **SATISFIED** | 44 unique codes in `haiti-imaging-studies.ts` |

### Program prerequisites (implicit, not W1 checklist lines)

| Prerequisite | Status | Notes |
|--------------|--------|-------|
| 3C-M1 schema (7 imaging FK columns) | **SATISFIED** *(stated)* | Required for apply; B1E DB script failed only on env missing columns |
| 3C-S1 + 3C-S2 seeds (141 imaging classifiers) | **SATISFIED** *(stated)* | Apply SKIPPED if classifiers missing |
| 3C-B1D 7-field implementation | **SATISFIED** | `catalog-classifier-backfill.service.ts` |
| 3C-B1E dry-run vs mapping-44 | **SATISFIED** | 199 / 4 / 105 / 308; idempotent run 2 |
| Contrast governance (B1A/B1B) | **SATISFIED** | Closed; 4 intentional null contrast slots |

### Optional / waived interpretations (not adopted without amendment)

| Item | If treated as… | Rationale |
|------|----------------|-----------|
| W1-1 CSV | **WAIVED** for 3C-B1 only | Mapping-44 + B1E simulation = deterministic surrogate **only if** governance ratifies surrogate |
| W1-3 row-level `MR=YES` | **WAIVED** for 3C-B1 | Row `MR=YES` ≠ field-level block; only **4** contrast slots are MANUAL_REVIEW |
| W1-4 blanket clinical sign-off | **NOT REQUIRED** for technical safety | Contrast/protocol/laterality adjudicated in docs — **still REQUIRED** under literal W1 text |

**This audit does not waive W1-1, W1-3, or W1-4.** Status remains **NOT SATISFIED** until artifacts exist or gate text is amended.

---

## Part 2 — Workbook CSV decision

| Decision | **CAN BE DEFERRED** for 3C-B1 apply *only with* a governance amendment |
|----------|-----------------------------------------------------------------------------|

**Under literal Gate W1:** CSV is **REQUIRED BEFORE APPLY**.

**Rationale to defer (narrow 3C-B1 scope):**

- `imaging-classifier-backfill-mapping-44.md` is the authoritative **44 × 7** matrix for Haiti catalog rows.
- 3C-B1E simulation proved **199 / 4 / 105** slot parity with zero DB writes.
- CSV adds no new classifier codes beyond mapping-44 for this apply.
- Full workbook (267 legacy rows) is **Gate W2**, not 3C-B1.

**Rationale to keep required (formal W1):**

- Phase 3D defined W1 as signed workbook artifact for operational traceability.
- Population doc §2.2 still shows **41** row-level `MR=YES` — CSV export forces reconciliation.
- Without CSV, clinical sign-off lacks a single attachable row register.

**Recommendation:** Export a **minimal 45-row CSV** (44 + `CT_HEAD` retired) derived from mapping-44 before production apply, **or** ratify mapping-44 + B1E report as W1 surrogate in sign-off.

---

## Part 3 — Clinical sign-off decision

| Decision | **REQUIRED BEFORE APPLY** under current Gate W1 |
|----------|--------------------------------------------------|

**Field-level re-review:** **NOT REQUIRED** for apply safety (per 3C-B1C):

| Domain | Needed before apply? |
|--------|---------------------|
| Contrast | **NOT REQUIRED** — B1A/B1B ratified; 4 intentional nulls |
| Protocol | **NOT REQUIRED** — 8 APPLY + 2 null by design |
| Anatomic subregion | **NOT REQUIRED** — 2 APPLY only |
| Laterality | **NOT REQUIRED** — all `LATERALITY_UNSPECIFIED` |
| Retirement | **NOT REQUIRED** — backfill does not run 2D retirement |

**Blanket radiology sign-off:** **REQUIRED** under W1-4 because:

- `imaging-classifier-signoff.md` still records **NOT RECEIVED**.
- Gate W1 is an operational/clinical attestation gate, not a technical completeness gate.
- FK-only scope reduces risk but does not replace accountable approval to run production migration.

**Minimum acceptable sign-off (if pursuing closure without full 267-row workbook):**

- Scope: Haiti **44** catalog codes only; classifier FK backfill only.
- References: ICM-1.0, mapping-44, B1A/B1B ratification IDs, B1E dry-run summary.
- Acknowledges: 4 contrast slots remain null; no billing/search/order behavior change.

---

## Part 4 — Production apply authorization (impact)

| System | Impact if 3C-B1 apply runs |
|--------|----------------------------|
| **`CatalogImagingStudy` (7 classifier FKs)** | **YES** — writes up to **199** FK assignments per Haiti-44 scope; **4** contrast slots stay null; **105** slots skipped (N/A) |
| **`CatalogClassifierBackfillAudit`** | **YES** — audit rows per field processed |
| **`OrderItem`** | **None** |
| **`BillingCatalog` / `BillingEvent`** | **None** |
| **Search** (`searchText`, aliases, display names) | **None** |
| **`ImagingStudyAlias`** | **None** |
| **ROI / legal chart / chart export** | **None** |
| **Retirement governance** | **None** — successor maps unchanged |

### Critical scope caveat

`runCatalogClassifierBackfill()` processes **all** `CatalogImagingStudy` rows in the database, not only the Haiti 44. If production has additional imaging catalog rows beyond `HAITI_IMAGING_CATALOG`, slot totals will **exceed 308** and mappings may **SKIPPED** where no catalog-code rule exists.

**Preflight must confirm:** row count and codes before apply, or add a Haiti-only filter in a future implementation (out of scope for this audit).

### Technical apply safety (if Gate W1 were closed)

| Check | Assessment |
|-------|------------|
| Idempotency | **SAFE** — B1E run 2: 0 APPLIED, 199 UNCHANGED |
| Data integrity | **SAFE** — FK to seeded `TermClassifier`; RESTRICT/SET NULL on classifier delete |
| Clinical workflow | **LOW RISK** — terminology read flags default off; legacy strings unchanged |
| Wrong-environment apply | **HIGH RISK** if M1/S1/S2 not on target DB — verify preflight |

**Governance authorization:** **NOT SAFE** until W1 closed.  
**Technical design:** **SAFE** for FK-only apply on a correctly seeded DB.

---

## Part 5 — Commands (conditional — execute only after Gate W1 closure)

### 5.1 Preflight

```bash
# Classifier domain counts (expect ICM-1.0 imaging totals)
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT domain, COUNT(*)::int AS n
FROM "TermClassifier"
WHERE "isActive" = true
GROUP BY domain
ORDER BY domain;
SQL

# Confirm 7 FK columns exist
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'CatalogImagingStudy'
  AND column_name LIKE '%ClassifierId'
ORDER BY 1;
SQL

# Catalog row count + FK null/non-null (Haiti 44)
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT
  COUNT(*)::int AS total_imaging_rows,
  COUNT(*) FILTER (WHERE code IN (
    'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
    'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
    'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
    'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
    'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
    'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
    'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
    'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
  ))::int AS haiti_44_rows,
  COUNT(*) FILTER (WHERE "modalityClassifierId" IS NULL)::int AS modality_null,
  COUNT(*) FILTER (WHERE "bodyRegionClassifierId" IS NULL)::int AS body_region_null,
  COUNT(*) FILTER (WHERE "contrastTypeClassifierId" IS NULL)::int AS contrast_null,
  COUNT(*) FILTER (WHERE "viewCountClassifierId" IS NULL)::int AS view_count_null,
  COUNT(*) FILTER (WHERE "lateralityClassifierId" IS NULL)::int AS laterality_null,
  COUNT(*) FILTER (WHERE "anatomicSubregionClassifierId" IS NULL)::int AS subregion_null,
  COUNT(*) FILTER (WHERE "protocolClassifierId" IS NULL)::int AS protocol_null
FROM "CatalogImagingStudy";
SQL

# Dry-run (read-only; no FK or audit writes)
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/dry-run-catalog-classifiers.ts -- --haiti-44-only
```

### 5.2 Apply (only after W1 closure + operational approval)

```bash
TERMINOLOGY_BACKFILL_ENABLED=true \
  pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/backfill-catalog-classifiers.ts
```

Capture `runId` from log output / audit table.

### 5.3 Postflight

```bash
# Audit summary for latest run
pnpm --filter @medora/api exec prisma db execute --stdin <<'SQL'
SELECT status, COUNT(*)::int
FROM "CatalogClassifierBackfillAudit"
WHERE "catalogTable" = 'CatalogImagingStudy'
  AND "runId" = '<RUN_ID_FROM_APPLY>'
GROUP BY status
ORDER BY status;
SQL

# Expect (Haiti 44 scope, first apply from null FKs): APPLIED≈199, MANUAL_REVIEW=4, SKIPPED≈105

# Second apply — idempotency
TERMINOLOGY_BACKFILL_ENABLED=true \
  pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/backfill-catalog-classifiers.ts
# Expect: applied=0, unchanged≈199 (imaging portion), manualReview=4, skipped≈105
```

### 5.4 Rollback (Haiti 44 imaging rows only — classifier FKs to NULL)

```sql
-- Emergency rollback: clear 7 classifier FKs for Haiti seed codes only.
-- Does NOT remove audit history. Re-run backfill after fix if needed.
UPDATE "CatalogImagingStudy"
SET
  "modalityClassifierId" = NULL,
  "bodyRegionClassifierId" = NULL,
  "contrastTypeClassifierId" = NULL,
  "viewCountClassifierId" = NULL,
  "lateralityClassifierId" = NULL,
  "anatomicSubregionClassifierId" = NULL,
  "protocolClassifierId" = NULL,
  "updatedAt" = NOW()
WHERE code IN (
  'XR_CHEST','XR_KNEE','XR_FOOT','US_ABD','US_OB','US_RENAL','CT_HEAD','CT_ABD',
  'DOPPLER_VEIN','XR_CHEST_2V','XR_ABD_AP','XR_WRIST','XR_ANKLE','XR_SHOULDER',
  'XR_PELVIS','US_OB_FIRST','US_OB_GROWTH','US_SOFT','CT_CHEST','CT_CHEST_CTA',
  'CT_SPINE_LUMBAR','US_FAST','XR_ABDOMEN','CT_CERVICAL_SPINE','CT_ABDOMEN_PELVIS',
  'CT_CHEST_ABDOMEN_PELVIS_TRAUMA','CT_HEAD_WO_CONTRAST','CTA_CHEST','CTA_HEAD_NECK',
  'CTA_ABDOMEN_PELVIS','US_ABDOMEN','US_RUQ_GALLBLADDER','US_PELVIS',
  'US_SCROTUM_TESTICULAR','US_VENOUS_DOPPLER_LE','XR_HUMERUS','XR_ELBOW','XR_FOREARM',
  'XR_HAND','XR_HIP','XR_FEMUR','XR_TIB_FIB','MRI_BRAIN','MRI_SPINE'
);
```

Prefer audit-table–guided rollback if pre/post FK snapshots were stored per run (see `imaging-classifier-backfill-plan-3c-b1.md`).

---

## Part 6 — Path to “GATE W1 CLOSED — SAFE TO APPLY”

Minimum governance package (no code):

1. Export **45-row** `imaging-taxonomy-workbook.csv` from mapping-44 (or sign surrogate amendment).
2. Set row `MR=NO` with **documented exceptions** for contrast-null rows (`CT_HEAD`, `CT_ABD`, `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_SPINE`).
3. Record **clinical/operational sign-off** (scoped 44-row FK backfill).
4. Run **DB dry-run** on target environment (`--haiti-44-only`); attach JSON to W1 packet.
5. Update `imaging-classifier-signoff.md` with Gate W1 closure date and approver.

Until steps 1–3: **GATE W1 REMAINS OPEN — NOT SAFE TO APPLY**.

---

*Audit only. No backfill apply, DB writes, seeds, migrations, commits, or deployments.*
