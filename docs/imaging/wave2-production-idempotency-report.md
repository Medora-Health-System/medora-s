# Wave 2 Production Idempotency Report (Phase 2E.6D)

**Phase:** 2E.6D — seed run 2 · finalized **2E.6D.1** (2026-06-01)  
**Date:** 2026-06-01  
**Environment:** Railway production  
**Execution docs commit:** `9584c75d`

**Stabilization audit:** [`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md) (Phase 2E.6E)

---

## 1. Summary

| Field | Value |
|-------|--------|
| **Idempotency** | **PASS** |
| **Second run executed** | **YES** (operator workstation, 2026-06-01) |
| **Second run required new Wave 2 data** | **NO** |
| **Production safety** | **SAFE** |

**Status:** Idempotency run **executed** immediately after successful postflight (run 1).

---

## 2. Execution (run 2)

### Command

Same as run 1:

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Actual output (run 2)

```text
> @medora/api@0.0.0 prisma:seed-catalogs .../apps/api
> ts-node --transpile-only prisma/seed-catalogs.ts

✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Catalogs seeded (lab, imaging, medications)
```

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Exit code | **0** | **0** | **PASS** |
| New Wave 2 aliases | **0** | **0** | **PASS** |
| New tuple aliases | **0** | **0** | **PASS** |
| New tuple protocol updates | **0** | **0** | **PASS** |
| US tuple mappings (re-applied) | **15** | **15** | **PASS** |

---

## 3. Delta counts (run 2 vs post–run 1)

| Metric | After run 1 | After run 2 | Delta | Result |
|--------|------------:|------------:|------:|--------|
| Active imaging | **141** | **141** | **0** | **PASS** |
| Wave 1 active | **37** | **37** | **0** | **PASS** |
| Wave 2 active | **61** | **61** | **0** | **PASS** |
| Wave 2 aliases | **85** | **85** | **0** | **PASS** |

---

## 4. Expected vs actual

| Expectation | Actual | Result |
|-------------|--------|--------|
| `0` new Wave 2 aliases | **0** | **PASS** |
| `0` new tuple aliases | **0** | **PASS** |
| `141` active imaging unchanged | **141** | **PASS** |
| No duplicate catalog rows | **0** dup active codes | **PASS** |
| `CT_HEAD` remains inactive | **false** | **PASS** |
| `MRI_SPINE` contrast NULL | **NULL** | **PASS** |

**Staging reference (2E.6B):** Run 2 — `61 studies, 0 aliases, 0 tuple aliases, 0 protocol updates` — **PASS** (matches production).

---

## 5. Rollback package

| Check | Result |
|-------|--------|
| [`wave2-rollback-plan.md`](wave2-rollback-plan.md) valid | **PASS** (not executed) |

---

## 6. Idempotency verdict

| Field | Value |
|-------|--------|
| **Idempotency validation** | **PASS** |
| **Phase 2E.6D complete** | **YES** |
| **Production safety** | **SAFE** |

---

*Completes Wave 2 production execution (2E.6D). Stabilization audit: Phase 2E.6E.*
