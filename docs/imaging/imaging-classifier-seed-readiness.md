# Imaging Classifier Seed Readiness

**Phase:** 3C-S0 / 3C-S0A (audit-only)  
**Manifest:** ICM-1.0 (`imaging-classifier-manifest.md`) — MR-M1 **resolved** (Option A)  
**Prerequisites:** 3C-M1 applied *(schema FK columns)*

---

## 1. Executive summary

| Phase | Ready? | Verdict |
|-------|--------|---------|
| **3C-S1** (expand MODALITY, BODY_REGION, VIEW_COUNT, CONTRAST_TYPE) | Partial | **NOT SAFE** until S4 + S5 + S6 are resolved |
| **3C-S2** (LATERALITY, ANATOMIC_SUBREGION, PROTOCOL) | Partial | **NOT SAFE** until S4 + S5 + S6 are resolved |
| **3C-B1** (44-row backfill) | No | **NOT SAFE** until S1–S7 + Gate W1 |

---

## 2. Part 5 — Seed readiness

### 2.1 Ready for 3C-S1?

| Criterion | Status |
|-----------|--------|
| 3C-M1 migration deployed | Required *(user environment)* |
| New codes enumerated | ✓ 27 codes (4 MOD + 14 BODY + 5 VIEW + 3 CONTRAST) |
| Existing codes unchanged | ✓ 35 imaging codes retained |
| `MRV_CLASSIFIER_DOMAIN_COUNTS` draft | ✓ See §2.3 |
| VIEW_COUNT count / policy (MR-M1) | ✓ **Resolved** — 6 codes; Option A (`VIEW_COUNT_UNSPECIFIED` approved) |
| Clinical sign-off | ✗ Pending |

**3C-S1 verdict:** **NOT SAFE** until sign-off S1 + S6 (MR-M1 no longer blocks domain count).

### 2.2 Ready for 3C-S2?

| Criterion | Status |
|-----------|--------|
| 3C-S1 complete | ✗ Prerequisite |
| New codes enumerated | ✓ 80 codes (4 + 36 + 40) |
| Bilingual labels drafted | ✓ In manifest |
| ANATOMIC_SUBREGION overlap rules (MR-M2) | ✗ Pending radiology |
| PROTOCOL CTA bundle (MR-M3) | ✗ Pending radiology |
| Clinical sign-off S3–S5 | ✗ Pending |

**3C-S2 verdict:** **NOT SAFE** until 3C-S1 complete + radiology sign-off.

### 2.3 Required seed counts by domain

#### 3C-S1 batch *(+27 new TermClassifier rows)*

| Domain | Before | After | New codes |
|--------|-------:|------:|----------:|
| MODALITY | 4 | 8 | +4 |
| BODY_REGION | 28 | 42 | +14 |
| VIEW_COUNT | 1 | 6 | +5 |
| CONTRAST_TYPE | 2 | 5 | +3 |
| **S1 subtotal** | | | **+27** |

**New MODALITY codes:** `MODALITY_CTA`, `MODALITY_MRA`, `MODALITY_NM`, `MODALITY_FL`

**New VIEW_COUNT codes:** `VIEW_COUNT_ONE`, `VIEW_COUNT_THREE`, `VIEW_COUNT_FOUR`, `VIEW_COUNT_COMPLETE`, `VIEW_COUNT_UNSPECIFIED`

**New CONTRAST_TYPE codes:** `CONTRAST_TYPE_WITH`, `CONTRAST_TYPE_WITH_AND_WITHOUT`, `CONTRAST_TYPE_NONE`

**New BODY_REGION codes:** 14 per manifest §3.2

#### 3C-S2 batch *(+80 new TermClassifier rows)*

| Domain | Before | After | New codes |
|--------|-------:|------:|----------:|
| LATERALITY | 0 | 4 | +4 |
| ANATOMIC_SUBREGION | 0 | 36 | +36 |
| PROTOCOL | 0 | 40 | +40 |
| **S2 subtotal** | | | **+80** |

#### Combined seed impact

| Metric | Count |
|--------|------:|
| New `TermClassifier` rows (imaging) | **106** |
| New `TermClassifierLabel` rows (fr + en) | **212** |
| Estimated new `TermClassifierAlias` rows | **~110–165** |
| Total `TermClassifier` after seed | **157** (141 imaging + 16 lab) |

#### Target `MRV_CLASSIFIER_DOMAIN_COUNTS` (ICM-1.0)

```typescript
{
  MODALITY: 8,
  BODY_REGION: 42,
  VIEW_COUNT: 6,
  CONTRAST_TYPE: 5,
  LATERALITY: 4,
  ANATOMIC_SUBREGION: 36,
  PROTOCOL: 40,
  LAB_CATEGORY: 16,
}
```

### 2.4 Seed execution path (reference — not run)

```
pnpm --filter @medora/api run prisma:seed-catalogs
  → seedMrvClassifiers()
  → MRV_CLASSIFIER_FOUNDATION upsert
  → domain count guard throws on mismatch
```

**Seed file (future):** `apps/api/prisma/data/mrv-classifier-foundation.ts` — **do not edit until sign-off complete.**

---

## 3. Part 6 — Backfill readiness (3C-B1)

### 3.1 Ready for 3C-B1?

| Criterion | Status |
|-----------|--------|
| 3C-M1 applied | Required |
| 3C-S1 + 3C-S2 seeded | Required |
| `TERMINOLOGY_BACKFILL_ENABLED` | Flag only — default off |
| 44-row workbook tuple | ✓ Documented *(VIEW_COUNT column per ICM-1.0 Option A)* |
| Gate W1 clinical sign-off | ✗ Pending |
| Contrast MR queue cleared | ✗ 9 CT/MRI rows |
| Phase 2D retirement | ✗ Not complete |

**3C-B1 verdict:** **NOT SAFE**

### 3.2 Expected classifier coverage — 44 catalog rows (ICM-1.0 VIEW_COUNT policy)

| FK field | Rows APPLIED | Rows null/SKIPPED | Rows MANUAL_REVIEW |
|----------|-------------:|------------------:|-------------------:|
| `modalityClassifierId` | 44 | 0 | 0 |
| `bodyRegionClassifierId` | 44 | 0 | 0 |
| `lateralityClassifierId` | 44 | 0 | 0 |
| `anatomicSubregionClassifierId` | 3 | 41 | 0 |
| `protocolClassifierId` | 8 | 36 | 0 |
| `viewCountClassifierId` | **18** | **26** | 0 |
| `contrastTypeClassifierId` | 5 | 30 | **9** |

**VIEW_COUNT APPLIED rows (18):**

| Classifier | Rows | Examples |
|------------|-----:|----------|
| `VIEW_COUNT_ONE` | 2 | `XR_CHEST`, `XR_ABD_AP` |
| `VIEW_COUNT_TWO` | 1 | `XR_CHEST_2V` |
| `VIEW_COUNT_UNSPECIFIED` | 15 | Generic MSK XR (`XR_KNEE`, `XR_ANKLE`, …) |

**VIEW_COUNT null (26):** Non-XR catalog rows only — view-count dimension not applicable.

### 3.3 Expected backfill audit counts (single run)

| Status | Estimated count |
|--------|----------------:|
| APPLIED | ~75–95 |
| UNCHANGED | varies (re-run) |
| SKIPPED | ~80–100 |
| MANUAL_REVIEW | **9** (contrast) |

**Total audit rows:** up to **308** (44 × 7 fields)

### 3.4 Manual review counts (backfill scope)

| Queue | Count | Blocks auto-APPLIED |
|-------|------:|---------------------|
| Contrast CT/MRI (`CONTRAST_MANUAL_REVIEW_IMAGING_CODES`) | **9** | `contrastTypeClassifierId` |
| Workbook MR=YES (broader governance) | **34** | Full Gate W1 |
| ~~Manifest MR-M1 (VIEW_COUNT policy)~~ | **0** | **Resolved** |
| Manifest MR-M2–M4 | **3 topics** | 2E only |

---

## 4. Gate matrix (Phase 3C-S0B)

| Gate | Scope | 3C-S1 | 3C-S2 | Status |
|------|-------|:-----:|:-----:|--------|
| **S1** | Classifier manifest completeness | ✓ | ✓ | **READY** |
| **S2** | MODALITY / BODY_REGION / VIEW_COUNT / CONTRAST_TYPE readiness | ✓ | n/a | **READY** |
| **S3** | LATERALITY readiness | n/a | ✓ | **READY** |
| **S4** | ANATOMIC_SUBREGION readiness | risk | block | **MANUAL_REVIEW** |
| **S5** | PROTOCOL readiness | risk | block | **MANUAL_REVIEW** |
| **S6** | Global duplicate / semantic overlap readiness | block | block | **MANUAL_REVIEW** |

### 4.1 Blockers and exact resolutions

| Gate | Exact blocker | Exact recommended resolution |
|------|---------------|------------------------------|
| **S4** | MR-M2 unresolved: 6 BODY_REGION vs ANATOMIC_SUBREGION overlap pairs lack finalized precedence for 2E tuple authoring | Approve and publish a radiology precedence matrix per pair (`primary`, `secondary_allowed`, `forbidden_combo`) and apply to workbook rules |
| **S5** | MR-M3/MR-M4 unresolved: CTA HEAD/COW/CAROTID/RECON semantics and `PROTOCOL_CT_CHEST_HR` billing identity remain undecided | Finalize protocol disposition sheet (`keep distinct` vs `alias/merge`) and explicit billing mapping table for `PROTOCOL_CT_CHEST_HR` |
| **S6** | Global semantic overlap package not ratified (12 flagged overlaps across body/subregion/protocol domains) | Ratify one governance appendix with final ALLOW/MERGE/ALIAS outcomes and require workbook conformance check before seed run |

### 4.2 Gate dependency summary

| Action | Verdict |
|--------|---------|
| 3C-S1 seed start | **NOT SAFE** until S4/S5/S6 are READY |
| 3C-S2 seed start | **NOT SAFE** until S4/S5/S6 are READY and 3C-S1 complete |

---

## 5. Recommended execution order

```
ICM-1.0 sign-off (MR-M1 ✓; S1 + S6 remaining)
        ↓
3C-S1 seed (+27 classifiers)
        ↓
3C-S2 seed (+80 classifiers)
        ↓
Verify domain counts = 157 TermClassifier rows
        ↓
3C-B1 backfill staging (18 viewCount APPLIED; 9 contrast MANUAL_REVIEW)
        ↓
Gate W1 clinical approval
        ↓
3C-B1 production + optional flag rollout (3C-R1)
```

---

## 6. SAFE / NOT SAFE

| Action | Verdict |
|--------|---------|
| **3C-S0A VIEW_COUNT policy audit** | **SAFE** |
| **ICM-1.0 manifest (141 codes)** | **SAFE** |
| **3C-S1 seed** | **NOT SAFE** until S4 + S5 + S6 sign-off |
| **3C-S2 seed** | **NOT SAFE** until S4 + S5 + S6 + 3C-S1 |
| **3C-B1 backfill** | **NOT SAFE** until Gate W1 |

---

## 7. Count rollup

| Metric | Value |
|--------|------:|
| Imaging classifier codes (ICM-1.0) | **141** |
| 3C-S1 new seed rows | **27** |
| 3C-S2 new seed rows | **80** |
| Total new seed rows | **106** |
| Backfill APPLIED (estimate) | **75–95** |
| Backfill MANUAL_REVIEW (contrast) | **9** |
| `viewCountClassifierId` APPLIED | **18** |
| Workbook MR=YES (44-row) | **34** |

---

*Phase 3C-S0A — audit only. No seed or backfill executed.*
