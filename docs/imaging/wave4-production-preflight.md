# Wave 4 Production Preflight (Phase 2E.8C / 2E.8C.1)

**Phase:** 2E.8C — read-only production preflight · **2E.8C.1** — W4-P-01 closure (operator)  
**Date:** 2026-06-01  
**Method:** Read-only production validation — **no production writes**  
**Minimum seed commit:** `103b05ec` — *Add Wave 4 imaging catalog seed*  
**Predecessor:** Wave 3 production **STABILIZED** ([`wave3-production-stabilization-audit.md`](wave3-production-stabilization-audit.md) · active **182**)

---

## 1. Executive result

| Field | Value |
|-------|--------|
| **W4-P-01** | **OPEN** — operator must execute §7 against production and record results |
| **Preflight verdict (design + staging)** | **PASS** |
| **Classifier / modality readiness** | **PASS** |
| **Staging evidence (2E.8B)** | **PASS** (`103b05ec`) |
| **SAFE / NOT SAFE (authorize 2E.8D)** | **SAFE** *(conditional on W4-P-01)* |
| **SAFE / NOT SAFE (execute production seed)** | **NOT YET** — W4-P-01 **OPEN** |

**Agent session (2E.8C):** Live Railway production queries were **not** executed in this session (CLI `invalid_grant`). Expected production baseline is documented below from Wave 3 production execution evidence and program inventory. **Do not** treat local/dev DB (often **213** after 2E.8B) as production.

**Combined script note:** `wave4-staging-validation.ts` reports `summary.pass: false` with multiple failures **before** Wave 4 deployment — this is **expected** and is **not** a failed preflight when pre-seed baseline rows (§2) **PASS**.

---

## 2. Production validation — expected output (pre–Wave 4)

**Script:** `pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave4-staging-validation.ts`  
**Environment:** Railway **production** (read-only)  
**Timing:** Before Wave 4 seed (2E.8D not yet executed)

### Aggregate summary (expected pre-seed)

```json
{
  "summary": {
    "pass": false,
    "checksFailed": 9,
    "wave4Studies": 0,
    "wave4Aliases": 0,
    "totalActiveImaging": 182
  }
}
```

*Failed check count may vary slightly by alias threshold; `wave4Studies: 0` and `totalActiveImaging: 182` are the critical pre-seed signals.*

**Interpretation:** `pass: false` reflects **post-seed-only** checks. **Do not** use aggregate `pass` for W4-P-01 gate closure.

### Verified PASS checks (pre-seed baseline — operator must confirm)

| Check | Expected | Production (target) | Result |
|-------|----------|---------------------|--------|
| Active imaging | **182** | **182** | **PENDING** |
| Wave 1 active | **37** | **37** | **PENDING** |
| Wave 2 active | **61** | **61** | **PENDING** |
| Wave 3 active | **41** | **41** | **PENDING** |
| Wave 4 catalog rows | **0** | **0** | **PENDING** |
| Wave 4 aliases | **0** | **0** | **PENDING** |
| `CT_HEAD` inactive | yes | yes | **PENDING** |
| `MRI_SPINE` contrast NULL | yes | yes | **PENDING** |
| Forbidden / predecessor governance | PASS | PASS | **PENDING** |
| Wave 1 / 2 / 3 unchanged | **37 / 61 / 41** | same | **PENDING** |
| Duplicate active `code` | **0** | **0** | **PENDING** |

**W4-P-01 overall:** **OPEN** until operator marks all **PENDING** → **PASS** on live production.

**Reference (Wave 3 production postflight):** After Wave 3 seed, production reported `totalActiveImaging: 182`, `wave3Studies: 41`, `wave3Aliases: 86` — Wave 4 not deployed.

### Post-seed-only checks (expected FAIL pre-deploy)

| Check class | Pre-seed script result | Assessment |
|-------------|------------------------|------------|
| Wave 4 row count = **31** | FAIL (0 found) | **Expected** |
| XR-3 **7** / CT-3 **24** | FAIL | **Expected** |
| Active imaging = **213** | FAIL (182 found) | **Expected** |
| Wave 4 aliases present | FAIL (0 found) | **Expected** |
| Classifier FK **31/31** on Wave 4 rows | FAIL | **Expected** |
| Wave 4 search smoke (AC joint, clavicle, sinus CT, knee CT, perfusion) | FAIL | **Expected** |

Re-run full script **after** 2E.8D seed run 1; expect `summary.pass: true`, `checksFailed: 0`, `totalActiveImaging: 213`.

---

## 3. Combined validation script — pre-seed vs post-seed

`prisma/scripts/wave4-staging-validation.ts` is a **post-deployment** validator (same pattern as Waves 2–3).

| Class | Checks | Pre-seed expectation |
|-------|--------|----------------------|
| **Pre-seed baseline** | Active **182**; W1 **37**; W2 **61**; W3 **41**; W4 **0**; governance; prior waves unchanged | **PASS** |
| **Post-seed only** | W4 **31** rows; **~72** aliases; classifiers **31/31**; active **213**; search smoke; CTA unchanged | **FAIL** until 2E.8D |

---

## 4. Part 1 — Production preflight checklist

| Metric | Expected | Production actual | Result |
|--------|----------|-------------------|--------|
| Active imaging | **182** | *operator* | **PENDING** |
| Haiti baseline active | **43** | *operator* (182 − 37 − 61 − 41) | **PENDING** |
| Wave 1 active | **37** | *operator* | **PENDING** |
| Wave 2 active | **61** | *operator* | **PENDING** |
| Wave 3 active | **41** | *operator* | **PENDING** |
| Wave 4 catalog rows (any) | **0** | *operator* | **PENDING** |
| Wave 4 aliases | **0** | *operator* | **PENDING** |
| `CT_HEAD` active | **false** | *operator* | **PENDING** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | *operator* | **PENDING** |
| Duplicate active `code` | **0** | *operator* | **PENDING** |
| Wave 3 aliases (preserve) | **~86** | *operator* | **PENDING** |

### Migration status

| Check | Result |
|-------|--------|
| `20260901120000_mrv_classifier_foundation` | **PASS** (applied — Wave 1–3 prod) |
| `20260902120000_imaging_taxonomy_classifiers` | **PASS** (applied) |
| New migration for Wave 4 | **None required** |

### Classifier inventory

All **31** manifest classifier codes resolve in `TermClassifier` vocabulary (same stack as Waves 1–3). Includes `PROTOCOL_CT_BRAIN_PERFUSION`, shoulder subregions, XR `VIEW_COUNT_TWO`.

### Wave 4 rows absent (design verification)

| Check | Expected | Result |
|-------|----------|--------|
| `XR_AC_JOINT_LEFT_2V` present | **no** | **PENDING** (prod) |
| `CT_KNEE_LEFT_WO_CONTRAST` present | **no** | **PENDING** (prod) |
| `CT_BRAIN_PERFUSION` present | **no** | **PENDING** (prod) |

---

## 5. Part 2 — Alias preflight

| Check | Expected (pre-seed) | Result |
|-------|---------------------|--------|
| Wave 4 aliases on DB | **0** | **PENDING** |
| Wave 4 aliases on wrong codes | **0** | **PENDING** |
| Wave 1 / 2 / 3 aliases preserved | unchanged | **PENDING** |
| Wave 4 internal duplicate aliases | **0** | **PASS** (design) |

**Post-seed target:** **~72** Wave 4 alias rows (staging run 1 at `103b05ec`).

---

## 6. Part 3 — Modality preflight

| Modality family | Batch | Rows | Production-ready |
|-----------------|-------|-----:|:----------------:|
| XR shoulder girdle | XR-3 | 7 | **YES** |
| CT head/face/neck + T-spine | CT-3 | 11 | **YES** |
| CT MSK extremity | CT-3 | 13 | **YES** |

Governance: no `CT_HEAD` expansion; `CT_BRAIN_PERFUSION` distinct code; CT MSK distinct from Wave 2 `CTA_*`; no Wave 4 tuple pass on legacy codes.

---

## 7. Operator reference commands (W4-P-01 closure)

```bash
export DATABASE_URL="<production-connection-string>"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave4-staging-validation.ts
```

Evaluate **pre-seed** rows in §2 only until after seed run 1. Record JSON summary in execution report (2E.8D) or close **W4-P-01** in [`wave4-production-authorization.md`](wave4-production-authorization.md) (2E.8C.1).

**Railway alternative:**

```bash
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave4-staging-validation.ts
'
```

---

## 8. Staging reference (2E.8B — not production)

| Metric | Staging (post-seed `103b05ec`) |
|--------|-------------------------------:|
| Active imaging | **213** |
| Wave 4 active | **31** (XR-3 **7**, CT-3 **24**) |
| Wave 4 aliases | **72** |
| `wave4-staging-validation.ts` | **22/22 PASS** |
| Idempotent run 2 | **31 studies, 0 aliases** |

---

## 9. Remaining blockers

| ID | Blocker | Status |
|----|---------|--------|
| **W4-P-01** | Production baseline verified live | **OPEN** |
| **W4-P-06** | Deploy includes `103b05ec` | **CLOSED** *(seed in deployable codebase)* |

**Remaining blockers for 2E.8D execution:** **W4-P-01** only

---

*No production writes in 2E.8C.*
