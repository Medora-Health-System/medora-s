# Wave 2 Production Idempotency Report (Phase 2E.6D)

**Phase:** 2E.6D — seed run 2  
**Date:** 2026-06-01  
**Environment:** Railway production

---

## 1. Summary

| Field | Value |
|-------|--------|
| **Idempotency** | **PENDING** |
| **Second run executed** | **NO** |
| **Second run required new Wave 2 data** | — |

**Status:** Idempotency run **not executed** — production seed run 1 did not complete in agent session.

---

## 2. Execution (run 2)

### Command

Same as run 1:

```bash
railway run --service Postgres --environment production -- sh -c \
  'export DATABASE_URL="$DATABASE_PUBLIC_URL" && pnpm --filter @medora/api run prisma:seed-catalogs'
```

### Expected output (run 2)

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Catalogs seeded (lab, imaging, medications)
```

### Actual output (run 2)

```text
(not executed)
```

| Metric | Expected | Actual |
|--------|----------|--------|
| Exit code | **0** | — |
| New Wave 2 aliases | **0** | — |
| New tuple aliases | **0** | — |
| New tuple protocol updates | **0** | — |

---

## 3. Delta counts (expected run 2 vs post–run 1)

| Metric | After run 1 | After run 2 (expected) | Delta |
|--------|------------:|-------------------------:|------:|
| Active imaging | **141** | **141** | **0** |
| Wave 1 active | **37** | **37** | **0** |
| Wave 2 active | **61** | **61** | **0** |
| Wave 2 aliases | **≥85** | same | **0** |

---

## 4. Expected vs actual

| Expectation | Actual | Result |
|-------------|--------|--------|
| `0` new Wave 2 aliases | — | **PENDING** |
| `0` new tuple aliases | — | **PENDING** |
| `141` active imaging unchanged | — | **PENDING** |
| No duplicate catalog rows | — | **PENDING** |

**Staging reference (2E.6B):** Run 2 — `61 studies, 0 aliases, 0 tuple aliases, 0 protocol updates` — **PASS**.

---

## 5. Rollback package

| Check | Result |
|-------|--------|
| [`wave2-rollback-plan.md`](wave2-rollback-plan.md) valid | **PASS** (not executed) |

---

## 6. Idempotency verdict

| Field | Value |
|-------|--------|
| **Idempotency validation** | **PENDING** |

---

*Completes 2E.6D only after run 2 confirms zero delta.*
