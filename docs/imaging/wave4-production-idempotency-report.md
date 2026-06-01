# Wave 4 Production Idempotency Report (Phase 2E.8D)

**Phase:** 2E.8D — seed run 2  
**Date:** 2026-06-01  
**Environment:** Railway production

---

## 1. Summary

| Field | Value |
|-------|--------|
| **Idempotency** | **PASS** |
| **Second run executed** | **YES** |
| **Second run required new Wave 4 data** | **NO** |
| **Production safety** | **SAFE** |

---

## 2. Execution (run 2)

### Command

Same as run 1:

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Actual output (run 2)

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Wave 3 imaging catalog (41 studies, 0 aliases)
✅ Wave 4 imaging catalog (31 studies, 0 aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Exit code | **0** | **0** | **PASS** |
| Wave 4 studies upserted | **31** | **31** | **PASS** |
| **New** Wave 4 aliases | **0** | **0** | **PASS** |
| Active imaging (stable) | **213** | **213** *(postflight after run 1)* | **PASS** |

---

## 3. Idempotency verdict

| Check | Result |
|-------|--------|
| No duplicate Wave 4 catalog rows | **PASS** |
| No duplicate Wave 4 aliases on run 2 | **PASS** |
| Wave 1 / 2 / 3 alias counts unchanged on run 2 | **PASS** |
| Catalog totals stable | **PASS** |

---

## 4. Final production state (2E.8D complete)

| Metric | Value |
|--------|------:|
| **Active imaging** | **213** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| Wave 3 active | **41** |
| Wave 4 active | **31** |
| Wave 4 aliases | **72** |

| Field | Value |
|-------|--------|
| **2E.8D status** | **COMPLETE** |
| **Production safety** | **SAFE** |

**Next phase:** **2E.8E** — Wave 4 Production Stabilization & Adoption Audit (recommended before Wave 4b / enterprise parity).

---

*Companion: [`wave4-production-execution-report.md`](wave4-production-execution-report.md) · [`wave4-production-postflight-report.md`](wave4-production-postflight-report.md)*
