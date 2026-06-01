# Wave 1 Production Execution Audit (Phase 2E.5A)

**Phase:** 2E.5A — audit and runbook validation only (pre–2E.5B)  
**Date:** 2026-06-01  
**Authority:** W2.3 governance · 2E.4A/B evidence · Medora as sole approver  
**Constraint:** No code, seeds, migrations, commits, deployments, or **production database writes** in this phase.

---

## 1. Executive summary

| Field | Result |
|-------|--------|
| **Purpose** | Determine if W2.3 conditions C1–C6 are satisfied for **2E.5B production seed execution** |
| **2E.5B authorization** | **NOT AUTHORIZED** |
| **Remaining blockers** | **5** (C1 prod evidence, C2, C4 drill, C6 sign-off, production postflight evidence) |
| **SAFE / NOT SAFE** | Runbook + implementation **SAFE** · Production execution **NOT SAFE** until blockers close |

**Interpretation:** Technical artifacts (2E.4A implementation, 2E.4B local validation, W2.3 conditional governance) are **ready**. **Operational closure** on the **production target database** and **signed governance** are **not** evidenced in this audit.

---

## 2. Part 1 — Condition audit (C1–C6)

### Legend

| Rating | Meaning |
|--------|---------|
| **PASS** | Condition satisfied with cited evidence |
| **FAIL** | Condition not satisfied; blocks 2E.5B |
| **PASS (package)** | Runbook/SQL/implementation ready; execution evidence pending |
| **PASS (staging)** | Proven on local/dev DB in 2E.4B; must repeat on production |

### C1 — Production preflight

| Check | Repo / design | Production target DB | Result |
|-------|---------------|----------------------|--------|
| Migration `20260902120000_imaging_taxonomy_classifiers` exists | ✓ `apps/api/prisma/migrations/…` | Not verified (no prod read in 2E.5A) | **PASS (package)** / **FAIL (prod)** |
| Classifier domains (ICM-1.0 / MRV seed) | ✓ `seedMrvClassifiers` + `MRV_CLASSIFIER_DOMAIN_COUNTS` | Not verified on prod | **PASS (package)** / **FAIL (prod)** |
| Expected imaging classifier counts (141 active imaging) | ✓ per `imaging-b1-production-authorization.md` §3.1 | Not verified on prod | **PASS (package)** / **FAIL (prod)** |
| Wave 1 codes absent pre-seed (`wave1_present = 0`) | ✓ upsert-safe if re-run | Local 2E.4B may already have 37 rows | **FAIL (prod)** without prod SQL log |
| No duplicate catalog codes in manifest | ✓ W2.2 + workbook | N/A | **PASS** |
| `prisma validate` | ✓ 2E.4B | Not run on prod CI in this phase | **PASS (package)** |

**C1 overall:** **FAIL** for 2E.5B — production preflight SQL log not attached (`wave1-production-readiness.md` §8 empty).

**Required before 2E.5B:** Run §3 preflight on production `DATABASE_URL`; attach output.

---

### C2 — Change window

| Check | Evidence | Result |
|-------|----------|--------|
| Production execution window defined | No ticket/date in §8 evidence log | **FAIL** |
| Rollback owner defined | Referenced in W2.3; not named in log | **FAIL** |
| Execution owner defined | Not recorded | **FAIL** |

**C2 overall:** **FAIL**

---

### C3 — Postflight validation package

| Check | Evidence | Result |
|-------|----------|--------|
| SQL/count spec for 37 rows, 41 aliases, 80 active | `wave1-production-readiness.md` §4 | **PASS (package)** |
| Classifier FK validation queries | `wave1-staging-validation.ts` + 2E.4C | **PASS (package)** |
| `MRI_SPINE` `contrastTypeClassifierId IS NULL` | Documented; not run on prod post-seed | **PASS (package)** / **FAIL (prod)** |
| Executed postflight on production | None | **FAIL (prod)** |

**C3 overall:** **PASS (package)** — ready to execute in 2E.5B · **FAIL** as post-execution proof until 2E.5B completes.

*Does not block starting 2E.5B if C1/C2/C6 pass; blocks **closing** 2E.5B.*

---

### C4 — Rollback drill

| Check | Evidence | Result |
|-------|----------|--------|
| Soft deactivate only | `wave1-rollback-plan.md` §1–2.1 | **PASS** |
| Alias rollback defined | §2.2 optional DELETE | **PASS** |
| Classifier rollback = leave FKs / optional null on Wave 1 only | §2.3 | **PASS** |
| No hard deletes on catalog orders | §1 | **PASS** |
| Drill **executed** | Not in evidence log | **FAIL** |

**C4 overall:** **PASS (plan)** · **FAIL (drill execution)** — blocks 2E.5B per W2.3 C4.

---

### C5 — Idempotency validation

| Run | Expected | 2E.4B local evidence | Production evidence |
|-----|----------|----------------------|---------------------|
| Run 1 | 37 studies, 41 aliases, 2 tuple | **PASS** (seed log) | **Not run** |
| Run 2 | 0 new aliases, 0 tuple | **PASS** | **Not run** |

**C5 overall:** **PASS (staging)** · **FAIL (production)** until 2E.5B second seed log.

*Staging proof sufficient for **readiness**; production must repeat in 2E.5B.*

---

### C6 — Governance approval

| Check | Evidence | Result |
|-------|----------|--------|
| W2.3 governance record exists | `wave1-governance-approval-record.md` | **PASS (package)** |
| Medora governance ACCEPT decisions | W2.3 §4 | **PASS (package)** |
| Risk acceptance recorded | `wave1-risk-acceptance-record.md` | **PASS (package)** |
| §8 sign-offs (Product, Eng, Ops) | All **☐** unchecked | **FAIL** |
| 2E.5A execution column signed | **☐** | **FAIL** |

**C6 overall:** **FAIL** — documents exist; **formal sign-off not recorded**.

---

### C1–C6 matrix (summary)

| ID | Condition | Status | Blocks 2E.5B? |
|----|-----------|--------|:-------------:|
| **C1** | Production preflight | **FAIL** (prod evidence) | **Yes** |
| **C2** | Change window | **FAIL** | **Yes** |
| **C3** | Postflight package | **PASS (package)** | No (required after seed) |
| **C4** | Rollback drill | **FAIL** (not executed) | **Yes** |
| **C5** | Idempotency | **PASS (staging)** | No* |
| **C6** | Governance sign-off | **FAIL** | **Yes** |

\*C5 production re-run mandatory during 2E.5B; not a pre-start blocker if staging PASS accepted per W2.3.

---

## 3. Part 2 — Production prechecklist (exact)

See [`wave1-production-runbook-validation.md`](wave1-production-runbook-validation.md) for command-level runbook.

### Before execution

1. Complete C6 sign-offs.  
2. Complete C2 change record (window, owners).  
3. `cd apps/api && pnpm exec prisma migrate deploy`  
4. `pnpm exec prisma validate`  
5. Classifier count SQL (expect imaging **141** active).  
6. Catalog preflight: `total` imaging rows, `active = 43`, `wave1_present = 0`.  
7. `CT_HEAD` inactive; `MRI_SPINE.contrastTypeClassifierId IS NULL`.  
8. Rollback SQL reviewed; drill completed (C4).  

### During execution

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

Monitor: seed log line for Wave 1 counts; no Prisma errors; no unexpected billing env changes.

### After execution

1. Postflight SQL (37 / 41 / 80 / `MRI_SPINE` null).  
2. Second seed → expect `0 aliases, 0 tuple`.  
3. Optional: `wave1-staging-validation.ts`.  
4. Fill `wave1-production-readiness.md` §8 evidence log.

---

## 4. Part 3 — Failure analysis

| Risk | Class | Rationale |
|------|-------|-----------|
| Production preflight not run | **BLOCKING** | Unknown prod migration/classifier/catalog baseline |
| Unsigned W2.3 §8 | **BLOCKING** | Medora formal approval not recorded |
| No change window / owners | **BLOCKING** | C2 |
| Rollback drill not executed | **BLOCKING** | C4 per W2.3 |
| Prod DB already has Wave 1 from mistaken early seed | **BLOCKING** | Must verify `wave1_present`; idempotent upsert OK but counts/postflight differ |
| `MRI_SPINE` contrast set on prod | **BLOCKING** | B12 regression if preflight/postflight fail |
| PENDING_CPT_REVIEW / no CPT | **ACCEPTED RISK** | W2.3 R-W1-01 |
| Search `tdm tête contraste` nuance | **ACCEPTED RISK** | R-W1-06 |
| Baseline 6 global duplicate aliases | **ACCEPTED RISK** | R-W1-05 |
| Predecessors active until 2D | **ACCEPTED RISK** | R-W1-03 |
| Gate W2 enterprise OPEN | **NON-BLOCKING** for Wave 1 only | Waves 2–4 out of scope |
| `seed-catalogs` also runs labs/meds | **NON-BLOCKING** | Idempotent; note in change window |

---

## 5. Part 4 — Execution authorization (2E.5B)

### Verdict: **NOT AUTHORIZED**

**Exact blockers:**

1. **C1** — Production database preflight not executed and logged.  
2. **C2** — Change window, execution owner, rollback owner not recorded.  
3. **C4** — Rollback drill not executed.  
4. **C6** — W2.3 / risk acceptance sign-offs unchecked.  
5. **C3 (post)** — Production postflight will be required **after** 2E.5B seed (cannot pre-close).

**When authorized, 2E.5B scope:**

- Migration deploy (if pending) on production.  
- `pnpm --filter @medora/api run prisma:seed-catalogs` × 2.  
- Postflight SQL + optional validation script.  
- **37** Wave 1 rows only; no Waves 2–4, billing, retirement, search changes.

---

## 6. Part 6 — Final production readiness table

| Area | Status | Notes |
|------|--------|-------|
| **Migration readiness** | **PASS** (repo) | `20260902120000_imaging_taxonomy_classifiers` present; prod apply unverified |
| **Classifier readiness** | **PASS** (repo) | MRV seed + domain counts; prod counts unverified |
| **Catalog readiness** | **PASS** (implementation) | 2E.4A `seedHaitiImagingWave1`; manifest 37 codes |
| **Alias readiness** | **PASS** (implementation) | 41 + 2 tuple; idempotent path |
| **Rollback readiness** | **PASS** (plan) · **FAIL** (drill) | `wave1-rollback-plan.md` |
| **Governance readiness** | **FAIL** (execution) | Docs complete; sign-offs open |
| **Production authorization** | **FAIL** | 2E.5B blocked |

---

## 7. Prerequisites traceability

| Prerequisite | Status |
|--------------|--------|
| 3C-M1 schema | ✓ Migration in repo |
| 3C-S1 / S2 classifier seed | ✓ `seedMrvClassifiers` |
| 3C-B1 backfill | ✓ W1 closed (44-row); Wave 1 uses seed-time FKs |
| W1 closure | ✓ |
| W2.1 workbook | ✓ |
| W2.2 authorization | ✓ |
| 2E.4A implementation | ✓ commit `643258c9+` |
| 2E.4B staging validation | ✓ PASS local |
| W2.3 governance | ✓ conditional; C1–C6 not all closed |

---

*2E.5A audit only — no production execution.*
