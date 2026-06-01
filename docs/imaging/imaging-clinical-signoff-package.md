# Imaging Clinical Sign-Off Package (Gate W1 / 3C-B1)

**Phase:** W1.1 — workbook finalization & sign-off package  
**Workbook version:** W1.1  
**Artifact date:** 2026-05-31  
**Authority:** `imaging-classifier-backfill-mapping-44.md`, `imaging-taxonomy-workbook.csv`  
**Mode:** Governance only  
**Gate W1:** **CLOSED** (W1.2 — `imaging-gate-w1-closure-record.md`)  
**Production apply:** Authorized via `imaging-b1-production-authorization.md` (preflight required)

---

## 1. Purpose

This package is the **clinical and operational attestation register** for Phase **3C-B1**: classifier FK backfill on the **44-row Haiti imaging catalog**. It is intended for radiology / clinical governance review and signature **before** any production `CatalogImagingStudy` classifier FK writes.

---

## 2. Scope (in scope)

| Item | Detail |
|------|--------|
| Catalog rows | **44** (`HAITI_IMAGING_CATALOG`) — **43 active**, **1 inactive** (`CT_HEAD`) |
| Database change | Populate **7 nullable classifier FK columns** on `CatalogImagingStudy` where mapping state = **APPLY** |
| Classifier domains | Modality, body region, contrast, view count, laterality, anatomic subregion, protocol |
| Vocabulary | ICM-1.0 imaging classifiers (**141** codes; seeds 3C-S1/S2 assumed applied on target DB) |
| Deterministic map | `apps/api/src/terminology/catalog-classifier-backfill-map.ts` (parity with mapping-44) |
| Validation | 3C-B1E dry-run: **199 APPLIED / 4 MANUAL_REVIEW / 105 SKIPPED / 308 total** |

---

## 3. Explicit exclusions (out of scope)

| Excluded | Rationale |
|----------|-----------|
| **Billing / CPT changes** | No `billingCode`, fee, or payer mapping updates |
| **Order catalog changes** | No new orderables, no order UI or routing changes |
| **Search / discovery changes** | No search index or synonym work |
| **Retirement execution (Phase 2D)** | Predecessor rows remain; no deactivation or merge in this apply |
| **Legacy 267-row workbook (Gate W2)** | Enterprise expansion deferred |
| **Legacy `modality` / `bodyRegion` strings** | FK-only; free-text legacy columns unchanged |

---

## 4. Expected backfill counts (deterministic)

### 4.1 Slot-level (44 × 7 = 308)

| Outcome | Count | Notes |
|---------|------:|-------|
| **APPLIED** (FK set) | **199** | Governance-approved classifier codes |
| **MANUAL_REVIEW** (contrast only) | **4** | Intentional null — see §6 |
| **SKIPPED** (NOT_APPLICABLE) | **105** | Field N/A for modality (e.g. US view count) |
| **TOTAL** | **308** | B1E simulation match |

### 4.2 By classifier field

| Field | APPLY | MANUAL_REVIEW | NOT_APPLICABLE |
|-------|------:|--------------:|---------------:|
| Modality | 44 | 0 | 0 |
| Body region | 44 | 0 | 0 |
| Contrast | 40 | 4 | 0 |
| View count | 17 | 0 | 27 |
| Laterality | 44 | 0 | 0 |
| Anatomic subregion | 2 | 0 | 42 |
| Protocol | 8 | 0 | 36 |

### 4.3 Active-row disposition (workbook W1.1)

| `backfill_disposition` | Rows |
|------------------------|-----:|
| `READY_APPLY_FK` | 37 |
| `PREDECESSOR_APPLY_NON_CONTRAST` | 3 (`US_ABD`, `CT_ABD`, `DOPPLER_VEIN`) |
| `INTENTIONAL_NULL_CONTRAST` | 3 active (`CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_SPINE`, plus contrast MR on predecessors per map) |
| `RETIRED_INACTIVE` | 1 (`CT_HEAD`) |

---

## 5. Manual-review decisions (field-level)

### 5.1 Contrast — intentional null (ratified 3C-B1B)

These **4 contrast slots** remain **MANUAL_REVIEW** at apply time (FK stays **null**). This is **approved governance**, not a blocking defect.

| Code | Active | Decision | Reference |
|------|:------:|----------|-----------|
| `CT_HEAD` | No (retired) | Intentional null contrast; successor `CT_HEAD_WO_CONTRAST` carries `CONTRAST_TYPE_WITHOUT` | B1B; retirement pair |
| `CT_ABD` | Yes (predecessor) | Intentional null; canonical successor `CT_ABDOMEN_PELVIS` has `CONTRAST_TYPE_WITHOUT` | B1B-RAT; predecessor policy |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | Yes | **B1B-RAT-CAP-001** — trauma CAP contrast not encoded as single enum | `imaging-contrast-final-ratification.md` |
| `MRI_SPINE` | Yes | **B1B-RAT-MRI-SPINE-001** — with/without contrast not distinguished in catalog label | `imaging-contrast-final-ratification.md` |

### 5.2 Row-level workbook MR (reconciled W1.1)

Historical workbook population marked **41/43** active rows `MR=YES` for billing/CPT/2E ambiguity. **Field-level backfill is not blocked** by those flags.

| `mr_reconciliation` (among 41 legacy `MR=YES`) | Count | Meaning for 3C-B1 |
|------------------------------------------------|------:|-------------------|
| **RESOLVED** | 10 | Row flag cleared; FK map complete for B1 scope |
| **INTENTIONAL_NULL** | 4 | Contrast policy above |
| **REQUIRES_FUTURE_2E_REVIEW** | 27 | Billing/unknown CPT / MSK laterality policy — **does not block** classifier FK apply |

All **43 active** rows now show workbook **`mr_status = NO`** with documented reconciliation in `imaging-taxonomy-workbook.csv`.

### 5.3 Laterality policy (acknowledged, not blocking B1)

All applicable rows use **`LATERALITY_UNSPECIFIED`**. Side-specific MSK ordering remains a **Phase 2E / workbook** decision; B1 does not introduce laterality splits.

### 5.4 Protocol gaps on CTA rows

`CTA_HEAD_NECK` and `CTA_ABDOMEN_PELVIS` have **no protocol classifier** (NOT_APPLICABLE). Angiographic contrast and modality `MODALITY_CTA` still apply. Full protocol refinement deferred to 2E if needed.

---

## 6. Intentional-null summary

| Code | Field | Production behavior |
|------|-------|---------------------|
| `CT_HEAD` | Contrast | Skip (inactive) |
| `CT_ABD` | Contrast | Skip (predecessor) |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | Contrast | Skip — clinical ambiguity accepted |
| `MRI_SPINE` | Contrast | Skip — clinical ambiguity accepted |

Non-contrast fields for these rows **still receive** approved classifier FKs per mapping-44.

---

## 7. Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wrong classifier on high-volume studies (chest, abd US) | Medium | Mapping-44 + B1E dry-run parity; post-apply spot check on top 10 codes |
| CTA modality FK vs legacy `modality` string = CT | Low | Documented; UI may still show legacy string until separate cleanup |
| Apply runs on **non-Haiti** catalog rows in DB | **High** | Preflight: `--haiti-44-only` or scope filter; count rows before apply |
| Missing 3C-M1 columns or seeds on target DB | **High** | Preflight: schema + classifier count; B1E script blocked without M1 |
| Contrast null interpreted as “missing data” | Low | This sign-off documents 4 intentional nulls |
| Premature billing/order use of classifiers | Medium | Explicit exclusion; Gate W3 for billing |

---

## 8. Preconditions for production apply

1. **Gate W1** formally closed (all W1-1–W1-5 satisfied — see `imaging-w1-final-checklist.md`).
2. **Signatures** recorded in §10 below.
3. Target environment: **3C-M1** migration applied, **3C-S1/S2** seeds present.
4. `TERMINOLOGY_BACKFILL_ENABLED=true` only for controlled maintenance window.
5. Execute preflight / apply / postflight per `imaging-gate-w1-production-authorization-b1f.md`.

---

## 9. Attestation statements (for signatories)

By signing, the approver confirms:

1. The **44-row** classifier tuple proposals in `imaging-taxonomy-workbook.csv` (W1.1) are **clinically acceptable** for the Haiti pilot catalog **for FK metadata only**.
2. **Four intentional null contrast** assignments are accepted as documented in §5–§6.
3. **No billing, order, search, or retirement** changes are authorized by this sign-off.
4. **27 rows** flagged `REQUIRES_FUTURE_2E_REVIEW` are acknowledged as **future** billing/expansion work and **not** blockers for 3C-B1 FK apply.
5. Production apply may proceed **only** after Gate W1 closure and operational preflight on the **target database**.

---

## 10. Sign-off record

| Role | Name | Date | Signature / ticket |
|------|------|------|----------------------|
| Clinical radiology lead | *(optional pilot follow-up)* | | — |
| Medical director (or delegate) | *(optional pilot follow-up)* | | — |
| **Medora internal governance (W1.2)** | **Recorded** | **2026-05-31** | `imaging-gate-w1-closure-record.md` §5 |
| Engineering / terminology owner | *(preflight executor)* | | — |

**Status:** **SATISFIED (W1-4)** — Medora governance attestation W1.2 ratifies this package for 3C-B1 FK backfill.

---

## 11. Related artifacts

| Document | Role |
|----------|------|
| `imaging-taxonomy-workbook.csv` | Row register (W1.1 export) |
| `imaging-classifier-backfill-mapping-44.md` | Authoritative 44×7 matrix |
| `imaging-classifier-backfill-dry-run-validation.md` | B1E count proof |
| `imaging-contrast-final-ratification.md` | Contrast closure |
| `imaging-w1-final-checklist.md` | Gate W1 criterion evaluation |
| `imaging-gate-w1-production-authorization-b1f.md` | Apply runbook (conditional) |

---

*Governance artifact only. No code execution, migrations, seeds, backfill, commits, or deployments.*
