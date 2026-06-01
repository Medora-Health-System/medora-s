# Wave 1 Production Authorization — Final (Phase 2E.5A)

**Phase:** 2E.5A — pre–2E.5B final audit  
**Date:** 2026-06-01  
**Supersedes for execution gate:** operational closure only (not W2.3 governance package, which remains valid)

---

## 1. Authorization decision

| Decision | Value |
|----------|--------|
| **Phase 2E.5B (production seed execution)** | **NOT AUTHORIZED** |
| **Wave 1 package (what to run)** | **AUTHORIZED** (unchanged from W2.3) |
| **SAFE / NOT SAFE** | Runbook **SAFE** · Execute prod seed **NOT SAFE** today |

---

## 2. C1–C6 matrix (final)

| ID | Condition | Audit result | Blocks 2E.5B? |
|----|-----------|--------------|:-------------:|
| **C1** | Production preflight | **FAIL** — no production DB preflight log | **Yes** |
| **C2** | Change window + owners | **FAIL** — evidence log empty | **Yes** |
| **C3** | Postflight package | **PASS (package)** — SQL/script ready | No* |
| **C4** | Rollback drill | **FAIL** — plan PASS, drill not executed | **Yes** |
| **C5** | Idempotency | **PASS (staging)** — 2E.4B; prod not run | No* |
| **C6** | Governance sign-off | **FAIL** — W2.3 §8 all ☐ | **Yes** |

\*Required during/after 2E.5B; does not substitute for C1/C2/C4/C6.

---

## 3. Remaining blockers (exact)

| # | Blocker | Owner | Close action |
|---|---------|-------|--------------|
| 1 | Production preflight (C1) | Engineering | Run `migrate deploy`, classifier + catalog SQL on prod; attach to §8 log |
| 2 | Change window + execution + rollback owner (C2) | Operations | Record in change ticket + `wave1-production-readiness.md` §8 |
| 3 | Rollback drill (C4) | Engineering + Ops | Execute soft-deactivate drill on staging or prod-like DB; log |
| 4 | Medora sign-offs (C6) | Product, Eng, Ops | Check W2.3 §8 + risk acceptance §7 |
| 5 | Production postflight (C3 post) | Engineering | After 2E.5B seed only |

**Non-blockers (accepted):** PENDING_CPT_REVIEW, search nuance, baseline alias duplicates, enterprise W2 open for Waves 2–4.

---

## 4. Production checklist (condensed)

### Before 2E.5B

- [ ] C6 sign-offs  
- [ ] C2 change record  
- [ ] `prisma migrate deploy` + `validate` on production  
- [ ] Classifier counts = expected (imaging **141**)  
- [ ] `wave1_present = 0` (or documented exception)  
- [ ] `active_imaging = 43`, `CT_HEAD` inactive, `MRI_SPINE` contrast null  
- [ ] C4 rollback drill complete  

### 2E.5B execution

```bash
pnpm --filter @medora/api run prisma:seed-catalogs   # run 1
# postflight SQL
pnpm --filter @medora/api run prisma:seed-catalogs   # run 2 — expect 0 aliases
```

### After 2E.5B

- [ ] 37 / 41 / 2 / 80 / `MRI_SPINE` null / billing unset  
- [ ] §8 evidence log complete  
- [ ] Gate W2 Wave 1 → operationally closed  

---

## 5. When 2E.5B becomes authorized

**Flip to AUTHORIZED when all true:**

1. C1 production preflight log attached — **PASS**  
2. C2 change window — **PASS**  
3. C4 rollback drill — **PASS**  
4. C6 all three sign-offs — **PASS**  
5. Production `DATABASE_URL` targets correct Haiti clinic database  
6. Deployed API commit includes Wave 1 seed (`643258c9` or later on release branch)

**Then:** Execute scope in [`wave1-production-runbook-validation.md`](wave1-production-runbook-validation.md).

---

## 6. Evidence chain (completed vs pending)

| Phase | Status |
|-------|--------|
| 2E.4A implementation | ✓ Complete |
| 2E.4B local validation | ✓ PASS |
| 2E.4C production audit | ✓ Complete (identified gates) |
| W2.3 governance | ✓ Conditional approval documented |
| **2E.5A runbook audit** | ✓ **PASS** (this phase) |
| **2E.5B production seed** | ☐ **Not authorized** |

---

## 7. Return summary

| Field | Value |
|-------|--------|
| **C1–C6** | C3/C5 staging **PASS**; C1, C2, C4, C6 **FAIL** |
| **Remaining blockers** | **4 pre-execution** + postflight after seed |
| **Production authorization (2E.5B)** | **NOT AUTHORIZED** |
| **SAFE / NOT SAFE** | **NOT SAFE** to run production seed now |

---

## 8. Sign-off (2E.5A audit only)

| Role | Runbook audit (2E.5A) | Approve 2E.5B start |
|------|:-----------------------:|:-------------------:|
| Engineering | ☐ | ☐ (after blockers) |
| Operations | ☐ | ☐ |
| Product (Medora) | ☐ | ☐ |

---

*No implementation. No production writes. Authorize 2E.5B only after blockers §3 close.*
