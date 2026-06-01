# Imaging Classifier Backfill Plan (3C-B1)

**Phase:** 3C-B1 (audit + design only)  
**Execution status:** Not executed  
**Target:** Backfill classifier FK columns for current 44 `CatalogImagingStudy` rows, deterministic assignments only

---

## 1. Objective and scope

- Populate only classifier FK columns on `CatalogImagingStudy` where mapping is deterministic and governance-approved.
- Keep all non-deterministic cases in explicit `MANUAL_REVIEW` queue.
- Do not change catalog rows, aliases, search, billing, retirement logic, or order sets.

---

## 2. Backfill mechanism options

### Option A — extend existing `backfill-catalog-classifiers.ts`

**Pros**
- Reuses existing audited path: `runCatalogClassifierBackfill()` + `CatalogClassifierBackfillAudit`.
- Already feature-flag gated by `TERMINOLOGY_BACKFILL_ENABLED`.
- Already includes idempotent per-field planning (`APPLIED`, `UNCHANGED`, `SKIPPED`, `MANUAL_REVIEW`).

**Cons**
- Requires additional mapping logic for S2 fields (laterality/anatomic/protocol), plus richer S1 mapping policy.

### Option B — create imaging-specific backfill script

**Pros**
- Full isolation for imaging-only runbook.

**Cons**
- Duplicates existing audit/idempotency framework.
- Higher maintenance risk and parallel logic drift.

### Option C — manual SQL update

**Pros**
- Fast one-off execution.

**Cons**
- Weak auditability, weak repeatability, high operational risk.
- Harder rollback and no built-in field-level status model.

### Recommendation

**Recommend Option A** (extend existing backfill script/service).  
It is the safest MVP path and best aligns with existing guardrails.

---

## 3. Idempotency, audit, dry-run, rollback, flags

### 3.1 Idempotency strategy

- Keep `planFieldBackfill(current, target)` behavior:
  - `UNCHANGED` if already correct
  - `APPLIED` if update needed
  - `SKIPPED` if target absent
- Repeat runs must converge to same summary with `APPLIED=0` after first successful apply.

### 3.2 Audit row strategy

- Persist one audit row per processed field (`44 × 7 = 308` max) with:
  - `runId`
  - `catalogCode`
  - `fieldName`
  - legacy source value
  - chosen classifier id (or null)
  - status (`APPLIED`, `UNCHANGED`, `SKIPPED`, `MANUAL_REVIEW`)
  - reason message for manual-review paths

### 3.3 Dry-run mode

- Add script argument (or env switch) for dry-run path:
  - compute and audit status rows
  - do not perform update writes
  - output deterministic summary by field and status

### 3.4 Rollback strategy

- Primary rollback: replay previous run snapshot and restore prior FK values from audit table (pre/post fields).
- Operational fallback: transaction-scoped run (if applied in one batch) with immediate rollback on failure.
- Keep immutable run ids for traceability and targeted revert.

### 3.5 Feature flag behavior

- Continue requiring `TERMINOLOGY_BACKFILL_ENABLED=true`.
- If flag false: hard no-op with explicit log message.
- Production runbook should require explicit flag enable + run id capture + post-run verification query.

---

## 4. Part 4 manual-review queue

| Code | Field | Reason | Required decision | Blocks backfill? |
|---|---|---|---|---|
| `CT_HEAD` | `contrastTypeClassifierId` | Inactive predecessor row; contrast semantics not authoritative for successor mapping | Keep null vs set contrast on retired predecessor rows | NO |
| `CT_ABD` | `contrastTypeClassifierId` | Predecessor to `CT_ABDOMEN_PELVIS`; contrast not encoded | Keep null vs assign without/with policy on predecessor | NO |
| `CT_CHEST` | `contrastTypeClassifierId` | Contrast not encoded; multiple clinical patterns | Decide default contrast policy for generic chest CT | YES |
| `CT_SPINE_LUMBAR` | `contrastTypeClassifierId` | Contrast not encoded; ambiguous | Decide default contrast policy for lumbar CT | YES |
| `CT_CERVICAL_SPINE` | `contrastTypeClassifierId` | Contrast not encoded; ambiguous | Decide default contrast policy for cervical CT | YES |
| `CT_ABDOMEN_PELVIS` | `contrastTypeClassifierId` | Contrast not encoded; broad code | Decide without vs with/without policy | YES |
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | `contrastTypeClassifierId` | Pan-scan trauma contrast differs by protocol | Define trauma contrast rule | YES |
| `MRI_BRAIN` | `contrastTypeClassifierId` | MRI contrast ambiguity | Define MRI brain default contrast policy | YES |
| `MRI_SPINE` | `contrastTypeClassifierId` | MRI contrast ambiguity | Define MRI spine default contrast policy | YES |
| `XR_ABDOMEN` | `viewCountClassifierId` | XR abdomen ambiguity vs KUB/ASP style and historical mixed usage | Confirm `VIEW_COUNT_UNSPECIFIED` is final for this code | NO |
| `CTA_HEAD_NECK` | `protocolClassifierId` | Governance appendix keeps CTA_HEAD distinct and CTA_COW alias behavior | Decide protocol assignment (`CTA_HEAD` vs none) for aggregate head/neck code | NO |
| `CTA_ABDOMEN_PELVIS` | `protocolClassifierId` | Aorta/runoff protocol split not encoded in base code | Decide whether to assign protocol vs keep null | NO |
| `US_SOFT` | `bodyRegionClassifierId` context | Soft tissue vs neck specificity ambiguity in governance package | Confirm `BODY_REGION_SOFT_TISSUE` remains canonical for this row | NO |

---

## 5. Part 6 safety review (non-impact assertions)

Design verification confirms classifier FK backfill should not alter:

- `OrderItem` behavior/data contract
- `BillingCatalog` / `BillingEvent` logic
- ROI/legal chart/export payload semantics
- Search behavior (unless terminology read/search flags are independently enabled)
- Alias behavior (`ImagingStudyAlias`)
- Duplicate retirement logic and successor-map behavior
- Existing catalog display names (`displayNameEn`, `displayNameFr`)

---

## 6. Part 7 test plan (design)

### 6.1 Mapping completeness
- Assert every 44-row imaging code has deterministic mapping status for all 7 fields.
- Assert only approved classifier codes are used.

### 6.2 Manual-review exclusions
- Assert all designated manual-review codes never write FK values.
- Assert audit rows carry `MANUAL_REVIEW` with expected reason text.

### 6.3 Idempotency
- First run applies expected writes.
- Second run returns `APPLIED=0`, with only `UNCHANGED` + `MANUAL_REVIEW` + `NOT_APPLICABLE`.

### 6.4 Audit integrity
- Assert exact audit volume (`308` field rows max for imaging).
- Assert per-field status counts match plan.

### 6.5 No billing/search impact
- Re-run billing and order-catalog tests; expect no behavioral deltas.
- Keep terminology read/search flags unchanged in baseline tests.

### 6.6 Retirement compatibility + inactive handling
- Verify predecessor rows do not break successor mappings.
- Explicit test for inactive `CT_HEAD` handling path.

---

## 7. Part 8 implementation package design (future)

### Files expected to change

- `apps/api/src/terminology/catalog-classifier-backfill-map.ts`
- `apps/api/src/terminology/catalog-classifier-backfill.service.ts`
- `apps/api/prisma/scripts/backfill-catalog-classifiers.ts`
- `apps/api/src/terminology/catalog-classifier-backfill.service.spec.ts`

### Files expected to be created

- `apps/api/src/terminology/catalog-classifier-backfill.imaging-3c-b1.spec.ts` (design target)

### Script command name (recommended)

- `pnpm --filter @medora/api exec ts-node prisma/scripts/backfill-catalog-classifiers.ts --catalog imaging --phase 3c-b1 --dry-run`

### Expected dry-run output

- Run id
- Per-field status counts
- Global totals (`APPLY`, `MANUAL_REVIEW`, `NOT_APPLICABLE`, `DEFER`)
- Manual-review queue listing by code/field

### Expected apply output

- Run id
- Applied updates count by field
- Non-applied status counts
- Verification query summary (post-run FK completeness)

### Production command (future; not run)

- `TERMINOLOGY_BACKFILL_ENABLED=true pnpm --filter @medora/api exec ts-node prisma/scripts/backfill-catalog-classifiers.ts --catalog imaging --phase 3c-b1 --apply`

### Rollback command (future; design target)

- `pnpm --filter @medora/api exec ts-node prisma/scripts/backfill-catalog-classifiers.ts --rollback-run-id <runId>`

---

*Audit/design only. No implementation or execution performed.*
