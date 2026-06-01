# Imaging Backfill Gate W1 Closure Audit (3C-B1C)

**Phase:** 3C-B1C (audit-only)  
**Question:** Can Gate W1 be closed? Can 3C-B1 production execution be authorized?  
**Sources:** `imaging-taxonomy-workbook-population.md`, `imaging-classifier-backfill-mapping-44.md`, `imaging-classifier-backfill-readiness.md`, `imaging-contrast-final-ratification.md`, `imaging-taxonomy-workbook-readiness.md`, `imaging-classifier-signoff.md`, `imaging-classifier-backfill-plan-3c-b1.md`, `catalog-classifier-backfill.service.ts` (read-only scope check)

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **Can Gate W1 be closed now?** | **NO** — formal W1 criteria not met |
| **Gate W1 status** | **PARTIALLY SATISFIED** |
| **3C-B1 production execution authorized?** | **NO** |
| **3C-B1 dry-run authorized (staging)?** | **SAFE** *(with scope caveats in Part 5)* |
| **Contrast governance** | **CLOSED** (3C-B1A + 3C-B1B) — no longer blocks W1 closure *by itself* |

---

## Part 1 — Workbook review (44-row catalog scope)

### 1.1 Row totals

| Scope | Total rows | Notes |
|-------|----------:|-------|
| **44-row catalog workbook** (Gate W1) | **44** | 43 active + 1 inactive (`CT_HEAD`) |
| Legacy inventory workbook (Gate W2) | 267 | Out of 3C-B1 scope |
| Combined audit population | 311 | 267 legacy + 44 catalog-native |

### 1.2 Coverage classification (44-row §2.2)

| Coverage | Count | Definition in population doc |
|----------|------:|------------------------------|
| **NATIVE** | **16** | Medora-native; no single legacy FULL name |
| **FULL** | **16** | Legacy FULL match to this code |
| **PARTIAL** | **12** | Legacy PARTIAL cluster to this code |
| **MISSING** | **0** | No 44-row catalog code is MISSING |

*44 = 16 + 16 + 12.*

### 1.3 Manual review flag (`MR=YES`)

| Metric | Count |
|--------|------:|
| Rows `MR=YES` (row-level) | **41** |
| Rows `MR=NO` | **3** (`XR_CHEST`, `XR_CHEST_2V`, `XR_ABD_AP`) |
| Population doc bucket total | **34** *(category buckets; undercounts 8 MSK rows grouped as one line)* |

**Important distinction:** Workbook `MR=YES` is a **broad governance flag** (billing, retirement, CPT, enterprise parity). The **3C-B1 FK backfill** uses field-level `APPLY` / `MANUAL_REVIEW` from `imaging-classifier-backfill-mapping-44.md`, which is **stricter and mostly resolved**.

### 1.4 MR=YES by reason — blocks classifier FK backfill?

| Reason category | Rows (workbook MR=YES) | Blocks 3C-B1 FK backfill? | Mapping-44 resolution |
|-----------------|------------------------|:---------------------------:|------------------------|
| **Generic MSK XR / view-count policy** | 16 (`XR_KNEE` … `XR_TIB_FIB`) | **NO** | All 7 fields **APPLY** (incl. `VIEW_COUNT_UNSPECIFIED`) |
| **Contrast semantics (legacy queue)** | 9 CT/MRI codes | **NO** *(field-scoped only)* | **CLOSED** — 5 APPLY WITHOUT; 4 intentional null (B1A/B1B) |
| **Retirement / predecessor** | 5 (`CT_HEAD`, `CT_ABD`, `US_ABD`, `DOPPLER_VEIN`, `CT_CHEST_CTA`) | **NO** | Tuple APPLY; contrast null on predecessors by design |
| **Duplicate / billing / abdomen XR** | 4 (`XR_ABDOMEN`, `US_ABDOMEN`, `US_OB`, `CT_CHEST_CTA` + billing on CAP/FAST) | **NO** | FK mapping deterministic; billing = Gate W3 |
| **CPT / UNKNOWN_CPT (all rows)** | 44 (workbook flags CPT on all) | **NO** | `imaging-cpt-mapping-review.ts` is review-only, not wired to backfill |
| **Protocol ambiguity (CTA aggregate)** | 2 (`CTA_HEAD_NECK`, `CTA_ABDOMEN_PELVIS`) | **NO** *(protocol field only)* | `protocolClassifierId` **MANUAL_REVIEW** → leave null; does not block other fields |

**Rows that block any FK auto-apply in mapping-44:** **0 active rows block the backfill run.**  
**Field-level `MANUAL_REVIEW` slots (rollup):** **4** (all `contrastTypeClassifierId`). CTA protocol nulls are **NOT_APPLICABLE** in slot counts (matrix notes “MANUAL_REVIEW” for traceability only).

### 1.5 MR=YES row register (41 rows)

| Code | Coverage | MR reason (workbook) | Blocks FK backfill? |
|------|----------|----------------------|:-------------------:|
| `XR_KNEE` | NATIVE | Generic MSK view policy | NO |
| `XR_FOOT` | NATIVE | Generic MSK view policy | NO |
| `XR_WRIST` | NATIVE | Generic MSK view policy | NO |
| `XR_ANKLE` | NATIVE | Generic MSK view policy | NO |
| `XR_SHOULDER` | NATIVE | Generic MSK view policy | NO |
| `XR_PELVIS` | NATIVE | Generic MSK view policy | NO |
| `XR_HUMERUS` | NATIVE | Generic MSK view policy | NO |
| `XR_ELBOW` | NATIVE | Generic MSK view policy | NO |
| `XR_FOREARM` | NATIVE | Generic MSK view policy | NO |
| `XR_HAND` | NATIVE | Generic MSK view policy | NO |
| `XR_HIP` | NATIVE | Generic MSK view policy | NO |
| `XR_FEMUR` | NATIVE | Generic MSK view policy | NO |
| `XR_TIB_FIB` | NATIVE | Generic MSK view policy | NO |
| `XR_ABDOMEN` | PARTIAL | Abdomen XR pair / view ambiguity | NO |
| `US_ABD` | PARTIAL | Predecessor retirement | NO |
| `US_ABDOMEN` | FULL | Successor / duplicate lineage | NO |
| `US_OB` | PARTIAL | Legacy partial cluster | NO |
| `US_OB_FIRST` | FULL | UNKNOWN_CPT | NO |
| `US_OB_GROWTH` | PARTIAL | UNKNOWN_CPT | NO |
| `US_RENAL` | FULL | CPT queue (workbook flags all) | NO |
| `US_SOFT` | FULL | CPT queue | NO |
| `US_FAST` | FULL | Billing protocol review | NO |
| `US_RUQ_GALLBLADDER` | FULL | UNKNOWN_CPT | NO |
| `US_PELVIS` | FULL | UNKNOWN_CPT | NO |
| `US_SCROTUM_TESTICULAR` | FULL | UNKNOWN_CPT | NO |
| `DOPPLER_VEIN` | PARTIAL | Predecessor retirement | NO |
| `US_VENOUS_DOPPLER_LE` | FULL | Successor lineage | NO |
| `CT_HEAD` | PARTIAL | Retired + contrast | NO |
| `CT_HEAD_WO_CONTRAST` | FULL | Workbook contrast flag (stale vs B1A) | NO |
| `CT_ABD` | PARTIAL | Predecessor retirement + contrast | NO |
| `CT_ABDOMEN_PELVIS` | PARTIAL | Contrast (resolved B1A APPLY) | NO |
| `CT_CHEST` | FULL | Contrast (resolved B1A APPLY) | NO |
| `CT_CHEST_CTA` | PARTIAL | Predecessor → `CTA_CHEST` | NO |
| `CTA_CHEST` | FULL | UNKNOWN_CPT | NO |
| `CTA_HEAD_NECK` | FULL | Protocol ambiguity | NO |
| `CTA_ABDOMEN_PELVIS` | PARTIAL | Protocol ambiguity | NO |
| `CT_CERVICAL_SPINE` | FULL | Contrast (resolved B1A APPLY) | NO |
| `CT_SPINE_LUMBAR` | FULL | Contrast (resolved B1A APPLY) | NO |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | PARTIAL | Contrast + multi-CPT (resolved B1B null) | NO |
| `MRI_BRAIN` | FULL | Contrast (resolved B1A APPLY) | NO |
| `MRI_SPINE` | PARTIAL | Contrast (resolved B1B null) | NO |

**MR=NO (3):** `XR_CHEST`, `XR_CHEST_2V`, `XR_ABD_AP` — also **NO** FK block.

### 1.6 Mapping-44 vs workbook alignment gap

| Item | Workbook population | Mapping-44 (3C-B1 authoritative for backfill) |
|------|---------------------|-----------------------------------------------|
| Contrast empty on CT/MRI | Still shown as `—` in §2.1 tuple table | **Resolved** to APPLY or ratified null |
| `MR=YES` on all CT/MRI | 9 contrast rows flagged | **Closed** per B1A/B1B |
| Classifier `*` “not seeded” | Stale in population §2.1 | **Seeded** per stated 3C-S1/S2 completion |

**Recommendation:** Refresh workbook population §2.1–2.2 from mapping-44 before claiming `MR=NO` on all active rows — not done in this audit (docs-only gap).

---

## Part 2 — Clinical sign-off requirement

| Area | Required for 3C-B1 production? | Rationale |
|------|:----------------------------:|-----------|
| **Contrast assignments** | **NOT REQUIRED** | 3C-B1A/B1B ratification + ICM rules; 4 intentional nulls documented |
| **Protocol assignments** | **OPTIONAL** | 8 rows APPLY protocol in mapping-44; 2 CTA rows null by design — governance appendix sufficient for seed codes; formal clinical attestation still absent globally |
| **Anatomic subregion assignments** | **NOT REQUIRED** | 2 deterministic APPLY (`CT_CERVICAL_SPINE`, `CT_SPINE_LUMBAR`); 42 N/A |
| **Laterality assignments** | **NOT REQUIRED** | All 44 rows `LATERALITY_UNSPECIFIED` APPLY |
| **Retirement interactions** | **NOT REQUIRED** for backfill | Backfill does not execute 2D retirement; predecessor rows keep null contrast by policy |

| Area | Gate W1 formal checklist | |
|------|--------------------------|---|
| **Clinical radiology sign-off (blanket)** | **REQUIRED** | `imaging-classifier-signoff.md`: “Clinical radiology sign-off — **NOT RECEIVED**”; W1 criterion §6 workbook-readiness |

**Summary:** Field-level clinical re-review is **not required** for contrast/laterality/subregion given closed audits; **blanket clinical sign-off** for Gate W1 **is still required** under current gate definition.

---

## Part 3 — Backfill impact review

### 3.1 In scope (design + approved mapping)

**Target table:** `CatalogImagingStudy` only.

**FK columns (7-field design):**

| Column | Design backfill |
|--------|-----------------|
| `modalityClassifierId` | APPLY all 44 |
| `bodyRegionClassifierId` | APPLY all 44 |
| `lateralityClassifierId` | APPLY all 44 |
| `contrastTypeClassifierId` | APPLY 40; MANUAL_REVIEW 4 (intentional null) |
| `viewCountClassifierId` | APPLY 17; NOT_APPLICABLE 27 |
| `anatomicSubregionClassifierId` | APPLY 2; NOT_APPLICABLE 42 |
| `protocolClassifierId` | APPLY 8; NOT_APPLICABLE 36; MANUAL_REVIEW 2 |

### 3.2 Current implementation scope (read-only code audit)

`runCatalogClassifierBackfill()` **today** updates only:

- `bodyRegionClassifierId`
- `modalityClassifierId`
- `viewCountClassifierId` *(allowlist: `XR_CHEST_2V` only in map)*
- `contrastTypeClassifierId` *(allowlist + `CONTRAST_MANUAL_REVIEW_IMAGING_CODES`)*

**Not yet in service:** `lateralityClassifierId`, `anatomicSubregionClassifierId`, `protocolClassifierId` — require 3C-B1 implementation extension per approved plan.

### 3.3 Verified no effect (design + code path)

| System | Effect from 3C-B1 backfill |
|--------|----------------------------|
| `OrderItem` | **None** — no writes |
| `BillingCatalog` | **None** |
| `BillingEvent` | **None** |
| ROI / legal chart / chart export | **None** |
| Search (`searchText`, aliases) | **None** — display/alias columns untouched |
| `ImagingStudyAlias` | **None** |
| Retirement governance / successor maps | **None** |
| Catalog display names | **None** |

**Evidence:** `imaging-classifier-backfill-plan-3c-b1.md` §5; service updates only `catalogImagingStudy` classifier FK fields listed above.

---

## Part 4 — Gate W1 decision

**Formal definition:** `imaging-taxonomy-workbook-readiness.md` §6 Gate W1

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `imaging-taxonomy-workbook.csv` exists (44 + 1 retired) | **NOT MET** | Workbook readiness §9: CSV “✗ Out of scope” |
| All classifier columns filled with valid proposed codes | **MET** *(surrogate)* | `imaging-classifier-backfill-mapping-44.md` — 199 APPLY slots |
| `Manual Review Required = NO` on all **active** rows | **NOT MET** | 41/43 active rows still `MR=YES` in population §2.2 |
| Clinical sign-off recorded | **NOT MET** | `imaging-classifier-signoff.md` line 17 |
| No duplicate active canonical code | **MET** | Unique codes in `haiti-imaging-studies.ts` |

### Gate W1 status: **PARTIALLY SATISFIED**

| Satisfied partial credit | Not satisfied |
|--------------------------|---------------|
| ICM-1.0 manifest + governance appendix (MR-M2–M5) | Signed workbook CSV artifact |
| 44×7 mapping doc complete | Blanket clinical radiology sign-off |
| Contrast governance closed (B1A/B1B) | Workbook `MR=NO` on all active rows |
| 3C-B1 implementation design SAFE | Population doc stale vs mapping-44 |
| Duplicate canonical codes clear | |

**Gate W1 cannot be closed** without either:

1. Meeting all five formal criteria, **or**
2. A **new governance amendment** narrowing W1 for 3C-B1 (out of scope for this audit — not proposed here).

---

## Part 5 — Execution authorization

### 5.1 Summary table

| Action | Verdict | Conditions |
|--------|---------|------------|
| **3C-B1 dry-run** | **SAFE** | Staging/non-prod; `TERMINOLOGY_BACKFILL_ENABLED`; seeds deployed; expect counts per mapping-44 **after** implementation extends to 7 fields; current code dry-run covers **4 fields only** |
| **3C-B1 production execution** | **NOT SAFE** | Gate W1 **OPEN** on formal criteria; clinical sign-off missing; workbook CSV absent |
| **3C-B1 rollback** | **DESIGN-SAFE** | Audit-table revert per plan; not validated in production (no run executed) |
| **3C-B1 audit trail** | **DESIGN-SAFE** | `CatalogClassifierBackfillAudit` per field; 308 max rows at full 7-field implementation |

### 5.2 Remaining blockers for production

| # | Blocker | Owner |
|---|---------|-------|
| 1 | Clinical radiology sign-off (Gate W1) | Clinical governance |
| 2 | Materialize `imaging-taxonomy-workbook.csv` OR amend gate to accept mapping-44 as workbook surrogate | Data governance |
| 3 | Reconcile workbook `MR=YES` → `MR=NO` with documented exceptions (B1B nulls, predecessor rows) | Taxonomy governance |
| 4 | Complete 3C-B1 **implementation** (7-field backfill + dry-run parity) | Engineering |
| 5 | Operational runbook: flag enablement, run id, post-run verification | Operations |

### 5.3 Expected post-implementation counts (unchanged from B1A/B1B)

| Metric | Count |
|--------|------:|
| Global APPLY (308 slots) | **199** |
| Global MANUAL_REVIEW | **4** |
| `contrastTypeClassifierId` APPLY | **40** |
| `contrastTypeClassifierId` MANUAL_REVIEW | **4** |

---

## Part 6 — Can production be authorized without closing Gate W1?

**No.** Under the current gate definition, **3C-B1 production execution must remain NOT SAFE** until:

- Clinical sign-off is recorded, and
- Workbook gate artifacts align (`MR=NO` or documented exceptions in signed CSV), and
- Dry-run in target environment matches mapping-44 counts.

**Contrast closure alone is insufficient** to authorize production.

---

## Part 7 — Recommended path to Gate W1 closure (governance only)

1. **Refresh** `imaging-taxonomy-workbook-population.md` §2.1–2.2 from `imaging-classifier-backfill-mapping-44.md` + B1A/B1B ratifications.
2. **Export** `imaging-taxonomy-workbook.csv` (44 + retired row) with `MR=NO` except documented exceptions: `CT_HEAD`, `CT_ABD`, `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_SPINE` (contrast null); optional note on `CTA_*` protocol null.
3. **Obtain** radiology/clinical sign-off referencing ICM-1.0, mapping-44, and contrast ratification IDs **B1B-RAT-CAP-001**, **B1B-RAT-MRI-SPINE-001**.
4. **Run** staging dry-run; attach audit summary to W1 packet.
5. **Record** Gate W1 closure in sign-off doc (amend `imaging-classifier-signoff.md` when approved — not done in this audit).

---

*Audit only. No code, backfill, DB writes, seeds, migrations, commits, or deployments.*
