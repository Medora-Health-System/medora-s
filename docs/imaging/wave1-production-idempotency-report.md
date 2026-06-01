# Wave 1 Production Idempotency Report (Phase 2E.5B)

**Phase:** 2E.5B — seed run 2  
**Date:** 2026-06-01  
**Environment:** Railway production

---

## 1. Summary

| Field | Value |
|-------|--------|
| **Idempotency** | **PASS** |
| **Second run required new Wave 1 data** | **No** |

---

## 2. Execution (run 2)

### Command

Same as run 1:

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Complete output (run 2)

```text
> @medora/api@0.0.0 prisma:seed-catalogs /Users/matz/Desktop/medora-s-main/medora-s/apps/api
> ts-node --transpile-only prisma/seed-catalogs.ts

✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

| Metric | Value |
|--------|------:|
| Exit code | **0** |
| Duration | **~374 s** |
| New Wave 1 studies | **0** (37 upserts, no net new) |
| New Wave 1 aliases | **0** |
| New `XR_CHEST` tuple aliases | **0** |

---

## 3. Delta counts (run 2 vs post–run 1)

| Metric | After run 1 | After run 2 | Delta |
|--------|------------:|------------:|------:|
| Active imaging | **80** | **80** | **0** |
| Wave 1 active rows | **37** | **37** | **0** |
| Wave 1 alias rows | **41** | **41** | **0** |
| `XR_CHEST` tuple aliases | **2** | **2** | **0** |

*Counts after run 1 held stable; run 2 log confirms zero alias/tuple inserts.*

---

## 4. Expected vs actual

| Expectation | Actual | Result |
|-------------|--------|--------|
| `0` new aliases | **0** | **PASS** |
| `0` new XR_CHEST tuple aliases | **0** | **PASS** |
| `80` active imaging unchanged | **80** | **PASS** |
| No duplicate Wave 1 codes | Stable at 37 | **PASS** |

---

## 5. Idempotency verdict

| Field | Value |
|-------|--------|
| **Idempotency validation** | **PASS** |

---

*Completes 2E.5B production execution gate.*
