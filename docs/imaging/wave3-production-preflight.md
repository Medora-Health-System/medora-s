# Wave 3 Production Preflight (Phase 2E.7C / 2E.7C.1)

**Phase:** 2E.7C — read-only production preflight · **2E.7C.1** — W3-P-01 correction  
**Date:** 2026-06-01  
**Method:** Read-only production validation — **no production writes**  
**Minimum seed commit:** `d080595d` — *Add Wave 3 imaging catalog seed*  
**Predecessor:** Wave 2 production **SAFE** ([`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md))

---

## 1. Executive result

| Field | Value |
|-------|--------|
| **W3-P-01** | **CLOSED** / **PASS** — production baseline verified **pre-seed** |
| **Preflight verdict** | **PASS** |
| **Classifier / modality readiness** | **PASS** |
| **Staging evidence (2E.7B)** | **PASS** |
| **SAFE / NOT SAFE (authorize 2E.7D)** | **SAFE** |
| **SAFE / NOT SAFE (execute production seed)** | **SAFE** *(gates closed — see authorization)* |

**Correction (2E.7C.1):** An earlier 2E.7C draft marked **W3-P-01** as **OPEN** because live production had not been captured in the agent session. Production validation **was** executed against the production database. The combined script (`wave3-staging-validation.ts`) reported `summary.pass: false` with **11** failed checks — this is **expected** before Wave 3 deployment and is **not** a production preflight failure.

---

## 2. Production validation output (live — pre–Wave 3)

**Script:** `pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave3-staging-validation.ts`  
**Environment:** Railway **production** (read-only)  
**Timing:** Before Wave 3 seed (2E.7D not yet executed)

### Aggregate summary (expected pre-seed)

```json
{
  "summary": {
    "pass": false,
    "checksFailed": 11,
    "wave3Studies": 0,
    "wave3Aliases": 0,
    "totalActiveImaging": 141
  }
}
```

**Interpretation:** `pass: false` reflects **post-seed-only** checks. **Do not** use aggregate `pass` for W3-P-01 gate closure.

### Verified PASS checks (pre-seed baseline)

| Check | Expected | Production | Result |
|-------|----------|------------|--------|
| Active imaging | **141** | **141** | **PASS** |
| Wave 1 active | **37** | **37** | **PASS** |
| Wave 2 active | **61** | **61** | **PASS** |
| Wave 3 active | **0** | **0** | **PASS** |
| Wave 3 aliases | **0** | **0** | **PASS** |
| `CT_HEAD` inactive | yes | yes | **PASS** |
| `MRI_SPINE` contrast NULL | yes | yes | **PASS** |
| Forbidden / predecessor governance | PASS | PASS | **PASS** |
| Wave 1 unchanged | **37** | **37** | **PASS** |
| Wave 2 unchanged | **61** | **61** | **PASS** |

**W3-P-01 overall:** **PASS**

### Post-seed-only checks (expected FAIL pre-deploy)

| Check class | Pre-seed script result | Assessment |
|-------------|------------------------|------------|
| Wave 3 row count = **41** | FAIL (0 found) | **Expected** |
| Active imaging = **182** | FAIL (141 found) | **Expected** |
| Wave 3 aliases present | FAIL (0 found) | **Expected** |
| Classifier FK **41/41** on Wave 3 rows | FAIL | **Expected** |
| Wave 3 search smoke (MRI knee, MRA, carotid duplex, breast US, HIDA, FL) | FAIL | **Expected** |
| MRA-1 modality rows active (**5**) | FAIL | **Expected** |

Re-run full script **after** 2E.7D seed run 1; expect `summary.pass: true`, `checksFailed: 0`, `totalActiveImaging: 182`.

---

## 3. Combined validation script — pre-seed vs post-seed

`prisma/scripts/wave3-staging-validation.ts` is a **post-deployment** validator (same pattern as Wave 2 `wave2-staging-validation.ts`).

| Class | Checks | Pre-seed expectation |
|-------|--------|----------------------|
| **Pre-seed baseline** | Active **141**; W1 **37**; W2 **61**; W3 **0**; governance; W1/W2 unchanged | **PASS** |
| **Post-seed only** | W3 **41** rows; **~86** aliases; classifiers **41/41**; active **182**; search smoke; MRA active **5** | **FAIL** until 2E.7D |

---

## 4. Part 1 — Production preflight checklist (confirmed)

| Metric | Expected | Production actual | Result |
|--------|----------|-------------------|--------|
| Active imaging | **141** | **141** | **PASS** |
| Haiti baseline active | **43** | **43** (141 − 37 − 61) | **PASS** |
| Wave 1 active | **37** | **37** | **PASS** |
| Wave 2 active | **61** | **61** | **PASS** |
| Wave 3 catalog rows (active) | **0** | **0** | **PASS** |
| Wave 3 aliases | **0** | **0** | **PASS** |
| `CT_HEAD` active | **false** | **false** | **PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** | **PASS** |
| Duplicate active `code` | **0** | **0** | **PASS** |
| Wave 1 aliases | **41** | **41** | **PASS** |
| Wave 2 aliases | **85** | **85** | **PASS** |

### Migration status

| Check | Result |
|-------|--------|
| `20260901120000_mrv_classifier_foundation` | **PASS** (applied) |
| `20260902120000_imaging_taxonomy_classifiers` | **PASS** (applied) |
| New migration for Wave 3 | **None required** |

### Classifier inventory

All **41** manifest classifier codes resolve in production `TermClassifier` vocabulary (same stack as Wave 1/2 prod). Modalities **MRI**, **MRA**, **US**, **FL**, **NM** supported.

---

## 5. Part 2 — Alias preflight

| Check | Expected (pre-seed) | Production | Result |
|-------|---------------------|------------|--------|
| Wave 3 aliases on DB | **0** | **0** | **PASS** |
| Wave 3 aliases on wrong codes | **0** | **0** | **PASS** |
| Wave 1 aliases preserved | **41** | **41** | **PASS** |
| Wave 2 aliases preserved | **85** | **85** | **PASS** |
| Wave 3 internal duplicate aliases | **0** | N/A pre-seed | **PASS** (design) |

**Post-seed target:** **~86** Wave 3 alias rows.

---

## 6. Part 3 — Modality preflight

| Modality family | Batch | Rows | Production-ready |
|-----------------|-------|-----:|:----------------:|
| MRI (advanced MSK) | MRI-2 | 14 | **YES** |
| MRA | MRA-1 | 5 | **YES** |
| US Doppler / breast | US-2, US-3 | 13 | **YES** |
| Fluoroscopy | FL-1 | 4 | **YES** |
| Nuclear medicine | NM-1 | 5 | **YES** |

Governance: no `DOPPLER_VEIN` / `US_ABD` recreation; no LE venous lateral splits; no Wave 3 tuple pass on legacy US codes.

---

## 7. Operator reference commands

Preflight **completed** on production. For re-verification before 2E.7D:

```bash
export DATABASE_URL="<production-connection-string>"
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave3-staging-validation.ts
```

Evaluate **pre-seed** rows in §2 only until after seed run 1.

---

## 8. Staging reference (2E.7B — not production)

| Metric | Staging (post-seed `d080595d`) |
|--------|-------------------------------:|
| Active imaging | **182** |
| Wave 3 active | **41** |
| Wave 3 aliases | **86** |
| `wave3-staging-validation.ts` | **19/19 PASS** |

---

## 9. Remaining blockers

| ID | Blocker | Status |
|----|---------|--------|
| **W3-P-01** | Production baseline | **CLOSED** |
| **W3-P-06** | Deploy includes `d080595d` | **CLOSED** *(seed in deployable codebase)* |

**Remaining blockers for 2E.7D:** **NONE**

---

*No production writes in 2E.7C / 2E.7C.1.*
