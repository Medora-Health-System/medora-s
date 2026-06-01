# Wave 1 Governance Approval Record (Phase W2.3)

**Phase:** W2.3 — Medora governance decision (audit only)  
**Date:** 2026-06-01  
**Authority:** Medora Health System (sole governing authority for Haiti clinic MVP imaging expansion)  
**Predecessors:** W2.2 design auth · 2E.4A implementation · 2E.4B staging validation · 2E.4C production authorization audit  

**Not in scope:** code, seeds, migrations, commits, deployments, or production execution (2E.5A).

---

## 1. Executive summary

| Field | Decision |
|-------|----------|
| **Governance review (Part 1)** | **CONDITIONALLY APPROVED** |
| **Medora production execution (Part 6)** | **AUTHORIZED WITH CONDITIONS** |
| **2E.5A may begin** | **After conditions in §6 are satisfied** (not immediately on signature alone) |
| **SAFE / NOT SAFE** | Governance package **SAFE** · Unconditional production run **NOT SAFE** |

Medora accepts the **Wave 1 expansion package** as the authorized Haiti enterprise imaging slice. Technical implementation and local staging validation are sufficient for governance approval of **what** may be deployed. **When and where** production seed runs remains gated by explicit operational conditions (preflight, rollback drill, postflight, sign-offs recorded below).

---

## 2. Part 1 — Governance review

### 2.1 Wave 1 inventory (37 rows)

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| Workbook authority (`wave=1`) | `enterprise-imaging-workbook.csv` | **APPROVED** |
| Batch counts XR-1 / CT-1 / MRI-1 | 19 / 7 / 11 | **APPROVED** |
| Duplicate code / label audits | W2.2 + 2E.4B | **APPROVED** |
| Forbidden insert governance | No `CT_HEAD`, `CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA` in Wave 1 manifest | **APPROVED** |

### 2.2 Aliases (41 + 2 tuple)

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| REQUIRED package (`XR_SACRUM_COCCYX_2V` ≥3) | 2E.4B: 3 strings | **APPROVED** |
| Wave 1 alias total | 2E.4B: **41** | **APPROVED** |
| `XR_CHEST` tuple pass | 2E.4B: **2** aliases | **APPROVED** |
| Wave-1-internal duplicate aliases | 2E.4B: **0** | **APPROVED** |
| Baseline global alias duplicates | 6 pre-existing (predecessor pairs); not Wave 1–introduced | **APPROVED** (accepted baseline) |

### 2.3 Classifier completeness

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| Required FK slots (37/37) | 2E.4B PASS | **APPROVED** |
| Rib correction (`ANATOMIC_SUBREGION_RIBS`) | 2E.4B PASS | **APPROVED** |
| Seed-time FK assignment (no Wave-1 backfill map change) | 2E.4A design | **APPROVED** |
| ICM-1.0 dependency | Classifiers seeded before Wave 1 | **APPROVED** |

### 2.4 Rollback plan

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| Soft deactivate only (no hard delete) | `wave1-rollback-plan.md` | **APPROVED** |
| Baseline 44 + `CT_HEAD` policy preserved | Rollback plan §2 | **APPROVED** |
| Drill executed | Not yet on production-target | **CONDITIONAL** — required before or as part of 2E.5A window |

### 2.5 Staging validation & idempotency

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| Local / dev staging seed | 2E.4B PASS | **APPROVED** |
| Idempotent re-run (0 new aliases) | 2E.4B PASS | **APPROVED** |
| Test suites (terminology, order-catalog, billing, orders, web) | 2E.4B PASS | **APPROVED** |
| Production-target DB parity | 2E.4C: not evidenced | **CONDITIONAL** — preflight on production |

### 2.6 Retirement & successor safety

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| `CT_HEAD` remains inactive | 2E.4B PASS | **APPROVED** |
| Predecessors (`CT_ABD`, etc.) not duplicated by Wave 1 | 2E.4B PASS | **APPROVED** |
| Phase 2D retirement execution | Deferred (not Wave 1 scope) | **APPROVED** (defer) |

### 2.7 Billing deferral

| Criterion | Evidence | Decision |
|-----------|----------|----------|
| All 37 rows `PENDING_CPT_REVIEW` | Workbook + 2E.4B (`billingCodeDefault` unset) | **APPROVED** |
| No billing mapping changes in Wave 1 | 2E.4B billing tests PASS | **APPROVED** |
| Charge capture | Gate W3 (deferred) | **APPROVED** (defer) |

### 2.8 Overall governance review verdict

**CONDITIONALLY APPROVED** — Medora approves the Wave 1 **package and deployment design**. Unconditional production execution is not approved until §6 conditions are met and recorded.

---

## 3. Part 2 — Open blocker review

| ID | Blocker | Class | Must remain open before production? | W2.3 disposition |
|----|---------|-------|-------------------------------------|----------------|
| **B2** | Per-wave clinical / product sign-off | **GOVERNANCE** | **No** (if this record is signed) | **CLOSED by W2.3** — Medora is governing authority; no external radiology committee required. Product/clinical acceptance is captured in §8 sign-off. |
| **B5** | Staging seed evidence | **OPERATIONAL** + **TECHNICAL** | **Yes** until production preflight baseline captured | **OPEN → condition C2** — 2E.4B local PASS accepted as implementation evidence; production DB preflight still required. |
| **B7** | Staging smoke + rollback drill | **OPERATIONAL** | **Yes** for rollback drill | **OPEN → condition C4** — Smoke covered by 2E.4B; **rollback drill** must be executed once on staging or production window. |
| **B10** | Production preflight | **OPERATIONAL** | **Yes** | **OPEN → condition C1** — Mandatory immediately before 2E.5A seed. |
| **B12** | `MRI_SPINE` contrast null regression | **TECHNICAL** | **Yes** until post-seed verify | **OPEN → condition C3** — Unit tests insufficient alone; SQL postflight on target DB required. |
| **B9** (context) | CPT / W3 | **GOVERNANCE** (billing) | **No** for catalog seed | **DEFERRED** — documented in risk acceptance record. |

**Blockers that must remain open until 2E.5A start:** **B10** (preflight), **B12** (post-seed verify plan), **B7** (rollback drill), **B5** (production-target before/after counts).

**Blockers closed by W2.3 governance:** **B2** (Medora internal authority).

---

## 4. Part 3 — Medora governance decision matrix

| Item | Decision | Conditions |
|------|----------|------------|
| Wave 1 catalog rows (37) | **ACCEPT** | Execute only via authorized seed manifest; no ad hoc codes |
| Wave 1 aliases (41) | **ACCEPT** | Idempotent seed path only |
| `XR_CHEST` tuple aliases (2) | **ACCEPT** | Rollback may remove if tuple pass reverted |
| Wave 1 classifier assignments | **ACCEPT** | Requires migration `20260902120000_imaging_taxonomy_classifiers` on target DB |
| Wave 1 rollback plan | **ACCEPT WITH CONDITIONS** | Drill required (C4) |
| Wave 1 staging validation | **ACCEPT WITH CONDITIONS** | Local 2E.4B accepted; production preflight (C1–C3) |
| Wave 1 CPT deferral | **ACCEPT** | No charge capture until Gate W3 |

---

## 5. Part 5 — Gate W2 status (re-evaluation)

| Status | **PARTIALLY CLOSED — WAVE 1 ONLY** |
|--------|--------------------------------------|

**Rationale:**

| Scope | Status |
|-------|--------|
| **Enterprise-wide W2** | **OPEN** — Waves 2–4 (133+ rows), US tuple pass, pilot scope, full workbook production parity not done |
| **W2-Wave-1 slice** | **PARTIALLY CLOSED** — Design (W2.2) ✓ · Implementation (2E.4A) ✓ · Local validation (2E.4B) ✓ · Medora governance (W2.3) ✓ · Production apply pending 2E.5A conditions |
| **W2 CLOSED enterprise-wide** | **No** |

Partial closure authorizes **only** Wave 1 production seed execution under `wave1-production-readiness.md` conditions. It does not close Gate W2 for Wave 2–4.

---

## 6. Part 6 — Production authorization

### Verdict: **AUTHORIZED WITH CONDITIONS**

Medora authorizes **Phase 2E.5A — Wave 1 Production Execution** subject to **all** conditions below. No production seed until C1 is complete.

| ID | Condition | Owner | Evidence |
|----|-----------|-------|----------|
| **C1** | Production (or production-like) **preflight** per 2E.4C Part 2: `migrate deploy`, `validate`, baseline counts, `wave1_present = 0`, `CT_HEAD` inactive, `MRI_SPINE` contrast null | Engineering | Ticket log + SQL output |
| **C2** | **Approved change window** and rollback owner named | Operations / Eng | Change record |
| **C3** | **Postflight** per 2E.4C Part 4: 37 active, 41 aliases, 2 tuple, 80 active imaging, billing unset, `MRI_SPINE` null | Engineering | SQL output |
| **C4** | **Rollback drill** executed once on staging (soft-deactivate 37 codes, verify active=43, re-activate) OR dry-run sign-off with rollback SQL reviewed | Engineering + Product | Drill log |
| **C5** | **Idempotent second seed** on production: `0 aliases, 0 tuple` | Engineering | Seed log |
| **C6** | **Sign-off** §8 below (Product, Engineering, Operations) | Medora | This record |

**Explicitly not authorized in 2E.5A:** Waves 2–4 · billing/CPT activation · Phase 2D retirement execution · search redesign · production deploy of unrelated services (catalog seed only).

---

## 7. Part 7 — 2E.5A readiness

| Question | Answer |
|----------|--------|
| May 2E.5A begin **immediately** after W2.3 signature? | **No** — begin after **C1** and **C2** are satisfied |
| May 2E.5A begin after conditions C1–C6? | **Yes** |

### Exact 2E.5A execution scope (when conditions met)

1. `pnpm exec prisma migrate deploy` (apps/api) on production DB if not already applied.  
2. `pnpm --filter @medora/api run prisma:seed-catalogs` (first run).  
3. Postflight SQL (C3).  
4. Second seed (C5).  
5. Optional: `wave1-staging-validation.ts` if available in deployed commit.  
6. **Out of scope:** Wave 2–4 rows, billing changes, retirement execution.

### Exact blockers if 2E.5A attempted without W2.3 conditions

- Missing production preflight (B10 / C1)  
- No rollback drill (B7 / C4)  
- No postflight `MRI_SPINE` check (B12 / C3)  
- Unsigned §8 sign-off (B2 — closed by W2.3 only when signed)

---

## 8. Medora sign-off (governance)

| Role | Wave 1 governance (W2.3) | Production execution (2E.5A) |
|------|:--------------------------:|:------------------------------:|
| Product / clinical governance (Medora) | ☐ | ☐ (after C1–C6) |
| Engineering lead | ☐ | ☐ |
| Operations / release | ☐ | ☐ |

*Checkbox completion = formal Medora approval for that column.*

---

## 9. Return summary

| Field | Value |
|-------|--------|
| **Governance decision** | **CONDITIONALLY APPROVED** |
| **Production authorization** | **AUTHORIZED WITH CONDITIONS** |
| **Gate W2** | **PARTIALLY CLOSED (Wave 1 only)** |
| **2E.5A readiness** | **Ready after C1–C6** |
| **AUTHORIZED / NOT AUTHORIZED** | **AUTHORIZED WITH CONDITIONS** |
| **SAFE / NOT SAFE** | Package **SAFE** · Unconditional prod **NOT SAFE** |

---

*W2.3 — audit and governance only. No implementation.*
