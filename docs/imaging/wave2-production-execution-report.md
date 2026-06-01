# Wave 2 Production Execution Report (Phase 2E.6D)

**Phase:** 2E.6D — production execution · finalized **2E.6D.1** (2026-06-01)  
**Date:** 2026-06-01  
**Environment:** Railway **production** (Postgres via production `DATABASE_URL`)  
**Authorization:** [`wave2-production-authorization-final.md`](wave2-production-authorization-final.md) — **AUTHORIZED**  
**Seed commit:** `52564a41` · gate docs `a0d4e6a4` · **execution docs commit:** `9584c75d`

**Stabilization audit:** [`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md) (Phase 2E.6E)

---

## 1. Execution status

| Field | Value |
|-------|--------|
| **Production seed executed** | **YES** (operator workstation, 2026-06-01) |
| **Execution status** | **SUCCESS** |
| **Exit code** | **0** |
| **Production verdict (2E.6D)** | **COMPLETE** |
| **Production safety** | **SAFE** |

**Executor:** Authorized operator (not agent session). Agent environment previously blocked on Railway OAuth (`invalid_grant`); operator completed seed and validation on workstation.

---

## 2. Pre-execution baseline

**Expected (authorized pre-seed):**

| Metric | Expected |
|--------|----------|
| Active imaging | **80** |
| Wave 1 active | **37** |
| Wave 2 rows | **0** |
| Wave 2 aliases | **0** |
| `CT_HEAD` active | **false** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** |

**Recorded at authorization (2E.6C.1A):** Pre-seed production baseline **PASS** — see [`wave2-production-preflight-evidence.md`](wave2-production-preflight-evidence.md).

| Metric | Expected | Actual (2E.6C.1A) | Result |
|--------|----------|-------------------|--------|
| Active imaging | **80** | **80** | **PASS** |
| Wave 1 active | **37** | **37** | **PASS** |
| Wave 2 present | **0** | **0** | **PASS** |
| `CT_HEAD` | inactive | inactive | **PASS** |
| `MRI_SPINE` contrast | NULL | NULL | **PASS** |

---

## 3. Execution (run 1)

### Command

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

Executed on operator workstation with production `DATABASE_URL` (Railway Postgres).

### Actual output (run 1)

```text
> @medora/api@0.0.0 prisma:seed-catalogs .../apps/api
> ts-node --transpile-only prisma/seed-catalogs.ts

✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 85 aliases, 15 US tuple mappings, 31 tuple aliases, 2 tuple protocol updates)
✅ Catalogs seeded (lab, imaging, medications)
```

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Exit code | **0** | **0** | **PASS** |
| Wave 2 studies upserted | **61** | **61** | **PASS** |
| Wave 2 aliases created | **85** | **85** | **PASS** |
| US tuple mappings applied | **15** | **15** | **PASS** |
| Tuple aliases created | **31** | **31** | **PASS** |
| Tuple protocol updates | **2** | **2** | **PASS** |

### Batch scope

| Batch | Rows |
|-------|-----:|
| XR-2 | **53** |
| CT-2 | **4** |
| US-1 | **4** |
| **Total** | **61** |

### Post–run 1 catalog (confirmed by postflight)

| Metric | Value |
|--------|------:|
| Active imaging | **141** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| Wave 2 aliases | **85** |
| `CT_HEAD` active | **false** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** |

---

## 4. Execution result

| Field | Value |
|-------|--------|
| **Execution status** | **SUCCESS** |
| **Unexpected abort** | **No** |
| **Production safety** | **SAFE** |

---

*Companion: [`wave2-production-postflight-report.md`](wave2-production-postflight-report.md) · [`wave2-production-idempotency-report.md`](wave2-production-idempotency-report.md)*
