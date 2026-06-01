# Wave 4 Production Execution Report (Phase 2E.8D)

**Phase:** 2E.8D — production execution  
**Date:** 2026-06-01  
**Environment:** Railway **production** (Postgres via production `DATABASE_URL`)  
**Authorization:** [`wave4-production-authorization.md`](wave4-production-authorization.md) — **AUTHORIZED** (2E.8C / 2E.8C.1)  
**Minimum seed commit:** `103b05ec` · auth docs `acd57ba8`

---

## 1. Execution status

| Field | Value |
|-------|--------|
| **Production seed executed** | **YES** (2026-06-01) |
| **Execution status** | **SUCCESS** |
| **Exit code** | **0** |
| **Production verdict (2E.8D)** | **COMPLETE** |
| **Production safety** | **SAFE** |

**Executor:** Authorized operator / production workstation with Railway Postgres `DATABASE_URL`.

---

## 2. Pre-execution baseline

Verified on production **before** Wave 4 seed (`wave4-staging-validation.ts` pre-seed):

| Metric | Expected | Actual | Result |
|--------|----------|------------------|--------|
| Active imaging | **182** | **182** | **PASS** |
| Wave 1 active | **37** | **37** | **PASS** |
| Wave 2 active | **61** | **61** | **PASS** |
| Wave 3 active | **41** | **41** | **PASS** |
| Wave 4 active | **0** | **0** | **PASS** |
| Wave 4 aliases | **0** | **0** | **PASS** |
| `CT_HEAD` active | **false** | **false** | **PASS** |
| `MRI_SPINE` contrast | **NULL** | **NULL** | **PASS** |

See [`wave4-production-preflight.md`](wave4-production-preflight.md). **W4-P-01** **CLOSED**.

---

## 3. Execution (run 1)

### Command

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

Executed with production `DATABASE_URL` (Railway Postgres).

### Actual output (run 1)

```text
> @medora/api@0.0.0 prisma:seed-catalogs .../apps/api
> ts-node --transpile-only prisma/seed-catalogs.ts

✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Wave 3 imaging catalog (41 studies, 0 aliases)
✅ Wave 4 imaging catalog (31 studies, 72 aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Exit code | **0** | **0** | **PASS** |
| Wave 4 studies upserted | **31** | **31** | **PASS** |
| Wave 4 aliases created | **72** | **72** | **PASS** |
| Waves 1–3 new aliases | **0** | **0** | **PASS** |

### Batch scope

| Batch | Rows |
|-------|-----:|
| XR-3 | **7** |
| CT-3 | **24** |
| **Total** | **31** |

### Post–run 1 catalog (confirmed by postflight)

| Metric | Value |
|--------|------:|
| Active imaging | **213** |
| Wave 1 active | **37** |
| Wave 2 active | **61** |
| Wave 3 active | **41** |
| Wave 4 active | **31** |
| Wave 4 aliases | **72** |
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

*Companion: [`wave4-production-postflight-report.md`](wave4-production-postflight-report.md) · [`wave4-production-idempotency-report.md`](wave4-production-idempotency-report.md)*
