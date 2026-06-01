# Wave 1 Production Readiness (Phase W2.3)

**Phase:** W2.3  
**Date:** 2026-06-01  
**Purpose:** Single checklist bridging governance approval → **2E.5A production execution**  
**Authority:** [`wave1-governance-approval-record.md`](wave1-governance-approval-record.md)  

---

## 1. Readiness summary

| Layer | Status | Notes |
|-------|--------|-------|
| Design (W2.2) | ✓ Complete | 37-row workbook slice |
| Implementation (2E.4A) | ✓ Complete | Seed + classifier FK + aliases |
| Local validation (2E.4B) | ✓ **PASS** | 37 rows, 41+2 aliases, idempotent |
| Production audit (2E.4C) | ✓ Complete | Operational gates identified |
| Medora governance (W2.3) | ✓ **AUTHORIZED WITH CONDITIONS** | This document |
| **2E.5A execution** | ☐ **Not started** | Blocked until §2 green |

| Final | Value |
|-------|--------|
| **2E.5A readiness** | **READY after §2 conditions** |
| **AUTHORIZED / NOT AUTHORIZED** | **AUTHORIZED WITH CONDITIONS** |
| **SAFE / NOT SAFE** | **SAFE** (conditional) · **NOT SAFE** (unconditional / skip preflight) |

---

## 2. Pre-execution checklist (required before 2E.5A)

| # | Condition | Source | Status |
|---|-----------|--------|--------|
| 1 | W2.3 governance record signed (§8) | W2.3 | ☐ |
| 2 | Risk acceptance record signed | `wave1-risk-acceptance-record.md` | ☐ |
| 3 | Production change window approved | Ops | ☐ |
| 4 | `prisma migrate deploy` on production DB | 2E.4C §2 | ☐ |
| 5 | `prisma validate` | 2E.4C §2 | ☐ |
| 6 | Preflight SQL: `wave1_present = 0`, active imaging = **43**, `CT_HEAD` inactive | 2E.4C §2 | ☐ |
| 7 | Preflight: `MRI_SPINE.contrastTypeClassifierId IS NULL` | B12 / C3 | ☐ |
| 8 | Rollback SQL reviewed; drill scheduled or completed | C4 | ☐ |
| 9 | Commit `643258c9` or later containing Wave 1 seed on production branch | Eng | ☐ |

**Gate:** All ☐ must be ☑ before production seed.

---

## 3. Production execution (2E.5A scope)

### 3.1 Command (production)

```bash
# From repo root; DATABASE_URL = production
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expected first run:**

```text
✅ Wave 1 imaging catalog (37 studies, 41 aliases, 2 XR_CHEST tuple aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

### 3.2 Idempotency (mandatory second run)

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expected:**

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
```

### 3.3 In scope

| Action | Count / detail |
|--------|----------------|
| Upsert Wave 1 catalog rows | **37** |
| Wave 1 aliases | **41** |
| `XR_CHEST` tuple aliases | **2** |
| Classifier FKs on 37 rows | All required slots |

### 3.4 Out of scope

- Waves 2–4 (**133** rows)  
- Billing / CPT activation  
- Phase 2D retirement  
- Search changes  
- Classifier seed / backfill map changes  
- Workbook edits  

---

## 4. Post-execution verification (required)

| Check | Expected | SQL / method |
|-------|----------|--------------|
| Wave 1 active rows | **37** | Count by 37-code list |
| Wave 1 aliases | **41** | Join `ImagingStudyAlias` |
| `XR_CHEST` tuple aliases | **2** | `chest 1v decub`, `chest post intubation` |
| Active imaging total | **80** | `isActive = true` |
| `CT_HEAD` | inactive | `isActive = false` |
| Wave 1 `billingCodeDefault` | **0** set | SQL |
| `MRI_SPINE` contrast FK | **NULL** | SQL |
| Wave-1-internal duplicate aliases | **0** | Group by alias |
| Idempotent second seed | 0 new aliases | Seed log |

Full SQL: **2E.4C Part 4** and `wave1-staging-validation-plan.md`.

Optional:

```bash
pnpm --filter @medora/api exec ts-node --transpile-only prisma/scripts/wave1-staging-validation.ts
```

---

## 5. Rollback readiness

| Step | Action |
|------|--------|
| 1 | `UPDATE CatalogImagingStudy SET isActive=false` for 37 Wave 1 codes |
| 2 | Verify active imaging = **43** |
| 3 | Optional: delete Wave 1 alias rows; optional revert `XR_CHEST` tuple aliases |
| 4 | Do **not** reactivate `CT_HEAD`; do **not** hard-delete catalog |

Reference: [`wave1-rollback-plan.md`](wave1-rollback-plan.md).

---

## 6. Gate W2 status (Wave 1 lens)

| Gate | Status |
|------|--------|
| **W2 enterprise** | **OPEN** |
| **W2 Wave 1** | **PARTIALLY CLOSED** (governance); **closes operationally** when §4 postflight ☑ |
| **W3 billing** | **OPEN** (deferred) |

---

## 7. Blockers → owner (quick reference)

| Blocker | W2.3 | Owner | Closes when |
|---------|------|-------|-------------|
| B2 | CLOSED (Medora governance) | Product | W2.3 signed |
| B5 | Condition C1/C3 | Eng | Production preflight + postflight |
| B7 | Condition C4 | Eng + Ops | Rollback drill |
| B10 | Condition C1 | Eng | Preflight log |
| B12 | Condition C3 | Eng | Postflight `MRI_SPINE` null |

---

## 8. Evidence log (fill at execution)

| Artifact | Date | Ticket / link |
|----------|------|---------------|
| Preflight SQL output | | |
| Seed run 1 log | | |
| Postflight SQL output | | |
| Seed run 2 log | | |
| Rollback drill log | | |
| Sign-off | | |

---

*W2.3 production readiness — no implementation until 2E.5A is explicitly executed under change control.*
