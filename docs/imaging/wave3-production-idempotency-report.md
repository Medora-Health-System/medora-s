# Wave 3 Production Idempotency Report (Phase 2E.7D)

**Phase:** 2E.7D — seed run 2  
**Date:** 2026-06-01  
**Environment:** Railway production

---

## 1. Summary

| Field | Value |
|-------|--------|
| **Idempotency** | **PENDING** |
| **Second run executed** | **NO** |
| **Second run required new Wave 3 data** | — |
| **Production safety** | **PENDING** |

**Status:** Idempotency run **not executed** — production seed run 1 did not complete in agent session.

---

## 2. Execution (run 2)

### Command

Same as run 1:

```bash
export DATABASE_URL="<production-connection-string>"
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Expected output (run 2)

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Wave 3 imaging catalog (41 studies, 0 aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

### Actual output (run 2)

```text
(not executed)
```

| Metric | Expected | Actual |
|--------|----------|--------|
| Exit code | **0** | — |
| New Wave 3 aliases | **0** | — |

---

## 3. Delta counts (expected run 2 vs post–run 1)

| Metric | After run 1 | After run 2 (expected) | Delta |
|--------|------------:|-------------------------:|------:|
| Active imaging | **182** | **182** | **0** |
| Wave 1 active | **37** | **37** | **0** |
| Wave 2 active | **61** | **61** | **0** |
| Wave 3 active | **41** | **41** | **0** |
| Wave 3 aliases | **~86** | same | **0** |

---

## 4. Expected vs actual

| Expectation | Actual | Result |
|-------------|--------|--------|
| `0` new Wave 3 aliases | — | **PENDING** |
| `182` active imaging unchanged | — | **PENDING** |
| No duplicate catalog rows | — | **PENDING** |
| `CT_HEAD` inactive | — | **PENDING** |
| `MRI_SPINE` contrast NULL | — | **PENDING** |

**Staging reference (2E.7B):** Run 2 — `41 studies, 0 aliases` — **PASS** on local DB.

---

## 5. Idempotency verdict

| Field | Value |
|-------|--------|
| **Idempotency validation** | **PENDING** |
| **Phase 2E.7D complete** | **NO** |

---

*Completes 2E.7D only after run 2 confirms zero delta on production.*
