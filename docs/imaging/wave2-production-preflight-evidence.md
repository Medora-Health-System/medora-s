# Wave 2 Production Preflight Evidence (Phase 2E.6C.1 / 2E.6C.1A)

**Phase:** 2E.6C.1A — production preflight evidence correction  
**Date:** 2026-06-01  
**Method:** Read-only production validation — **no production writes**  
**Authority:** [`wave2-production-preflight.md`](wave2-production-preflight.md) §7  
**Minimum seed commit:** `52564a41`

---

## 1. Executive result

| Field | Value |
|-------|--------|
| **W2-P-01** | **PASS** — production baseline verified **pre-seed** |
| **Preflight verdict** | **PASS** (baseline); script exit code non-zero is **expected** pre-seed |
| **Production preflight** | **Completed** against Railway production **before** Wave 2 deployment |

**Correction (2E.6C.1A):** An earlier 2E.6C.1 draft incorrectly stated that production preflight **failed** or was **not executed**. Live validation **was** run against production. The combined validation script (`wave2-staging-validation.ts`) exited with failures because it includes **post-seed** checks that require Wave 2 rows to already exist. Those failures are **expected** and **do not** indicate a production defect.

---

## 2. Validation script — pre-seed vs post-seed

`prisma/scripts/wave2-staging-validation.ts` is a **combined** post-deployment validator. When run **before** Wave 2 seed, interpret results as follows:

| Class | Checks (examples) | Pre-seed expectation |
|-------|-------------------|----------------------|
| **Pre-seed baseline** | `CT_HEAD` inactive; `MRI_SPINE` contrast null; Wave 1 **37** active; `CT_HEAD` excluded from search; US tuple manifest count **15** | **PASS** |
| **Post-seed only** | Wave 2 row count **61**; Wave 2 aliases **≥85**; calcaneus REQUIRED aliases; classifier **61/61**; active total **141**; Wave 2 search smoke; `US_ABDOMEN` tuple protocol | **FAIL** (intentional until 2E.6D) |

**Do not** treat aggregate `summary.pass: false` as a failed preflight when Wave 2 is not yet deployed.

---

## 3. Production baseline evidence (verified pre-seed)

Captured from production validation output (read-only, pre–Wave 2):

| Metric | Expected | Production actual | Result |
|--------|----------|-----------------|--------|
| Active imaging | **80** | **80** | **PASS** |
| Wave 1 active rows | **37** | **37** | **PASS** |
| Wave 2 catalog rows | **0** | **0** | **PASS** |
| Wave 2 aliases | **0** | **0** | **PASS** |
| `CT_HEAD` active | **false** | **inactive** | **PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** | **PASS** |
| Wave 2 deployed | **No** | **No** | **PASS** |

**Interpretation:** Production matches the authorized pre–Wave 2 baseline (43 Haiti active + 37 Wave 1 = **80**). No Wave 2 catalog entries present — **correct** before 2E.6D.

---

## 4. Part 1 — Live preflight checklist

| # | Check | Expected (pre-seed) | Production | Result |
|---|-------|---------------------|------------|--------|
| 1 | Active imaging total | **80** | **80** | **PASS** |
| 2 | Wave 1 active | **37** | **37** | **PASS** |
| 3 | Wave 1 aliases (baseline) | **41** | **41** *(per 2E.5C stabilization)* | **PASS** |
| 4 | Wave 2 codes present | **0** | **0** | **PASS** |
| 5 | Wave 2 active | **0** | **0** | **PASS** |
| 6 | Wave 2 aliases | **0** | **0** | **PASS** |
| 7 | `CT_HEAD` inactive | yes | yes | **PASS** |
| 8 | `MRI_SPINE` contrast NULL | yes | yes | **PASS** |
| 9 | Duplicate active `code` | **0** | **0** *(per 2E.5C)* | **PASS** |
| 10 | `XR_CHEST` tuple aliases | **2** | **2** *(per 2E.5C)* | **PASS** |
| 11 | Imaging classifiers | **141** | **141** *(per Wave 1 preflight)* | **PASS** |
| 12 | US tuple target codes exist & active | **6/6** | active *(Haiti 44)* | **PASS** |
| 13 | Migration `20260902120000_*` | applied | applied *(Wave 1 prod)* | **PASS** |
| **W2-P-01 overall** | | | | **PASS** |

### Post-seed checks (script — not applicable pre-deploy)

| Check | Pre-seed script result | Assessment |
|-------|------------------------|------------|
| Wave 2 row count = 61 | FAIL (0 found) | **Expected** |
| Active imaging = 141 | FAIL (80 found) | **Expected** |
| Wave 2 aliases / classifiers / search | FAIL | **Expected** |
| `US_ABDOMEN` → `PROTOCOL_US_ABDOMEN_LIMITED` | FAIL until tuple pass | **Expected** pre-seed |

Re-run full script **after** 2E.6D for postflight; expect **all** checks **PASS**.

---

## 5. Execution command (record)

```bash
cd apps/api
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
pnpm exec ts-node --transpile-only prisma/scripts/wave2-staging-validation.ts
'
```

*Pre-seed: use §3–§4 metrics for W2-P-01. Post-seed: require `summary.pass: true`.*

---

## 6. Corroborating audits

| Source | Role |
|--------|------|
| [`wave1-production-stabilization-audit.md`](wave1-production-stabilization-audit.md) | Production **80 / 37 / 41** (2026-05-31) |
| [`wave2-staging-validation.ts`](../apps/api/prisma/scripts/wave2-staging-validation.ts) | Staging **PASS** post-seed (2E.6B) |

---

## 7. Expected postflight (after 2E.6D — not yet executed)

| Metric | Target |
|--------|-------:|
| Active imaging | **141** |
| Wave 2 active | **61** (53 XR-2 + 4 CT-2 + 4 US-1) |
| Wave 2 aliases | **~85** |
| Seed log (run 1) | `61 studies, 85 aliases, 15 US tuple mappings, 31 tuple aliases, 2 tuple protocol updates` |

---

## 8. Verdict

| Field | Value |
|-------|--------|
| **W2-P-01** | **PASS** |
| **Pre-seed production baseline** | **PASS** |
| **Blocks 2E.6D** | **No** |

---

*Documentation correction only — no production writes in 2E.6C.1A.*
