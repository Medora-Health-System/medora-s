# Wave 1 Production Execution Report (Phase 2E.5B)

**Phase:** 2E.5B — production execution  
**Date:** 2026-06-01  
**Environment:** Railway **production** (Postgres via `DATABASE_PUBLIC_URL`)  
**Authorization:** W2.3 · 2E.5A · 2E.5A.1 · [`wave1-production-authorization-final-v2.md`](wave1-production-authorization-final-v2.md)

---

## 1. Pre-execution baseline

Captured read-only before seed.

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Active imaging (`isActive = true`) | **43** | **43** | **PASS** |
| Wave 1 codes present | **0** | **0** | **PASS** |
| `CT_HEAD` active | **false** | **false** | **PASS** |
| `MRI_SPINE.contrastTypeClassifierId` | **NULL** | **NULL** | **PASS** |

**Decision:** Proceed — baseline matches preflight (2E.5A.1).

---

## 2. Execution

### Command

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

Executed via:

```bash
railway run --service Postgres --environment production \
  -- sh -c 'export DATABASE_URL="$DATABASE_PUBLIC_URL" && pnpm --filter @medora/api run prisma:seed-catalogs'
```

### Complete output (run 1)

```text
> @medora/api@0.0.0 prisma:seed-catalogs /Users/matz/Desktop/medora-s-main/medora-s/apps/api
> ts-node --transpile-only prisma/seed-catalogs.ts

✅ Wave 1 imaging catalog (37 studies, 41 aliases, 2 XR_CHEST tuple aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

| Metric | Value |
|--------|------:|
| Exit code | **0** |
| Duration | **~387 s** |
| Wave 1 studies upserted | **37** |
| Wave 1 aliases created (run 1) | **41** |
| `XR_CHEST` tuple aliases created | **2** |

*Full `seed-catalogs` also refreshed Haiti lab/imaging (44), ER labs, MRV classifiers, and medications (idempotent).*

---

## 3. Rows and aliases created (Wave 1 scope)

| Batch | Expected | Created (net new on prod) |
|-------|----------|---------------------------|
| XR-1 | 19 | **19** |
| CT-1 | 7 | **7** |
| MRI-1 | 11 | **11** |
| **Total catalog rows** | **37** | **37** |
| **Aliases** | **41** | **41** |
| **XR_CHEST tuple** | **2** | **2** |

---

## 4. Execution result

| Field | Value |
|-------|--------|
| **Execution status** | **SUCCESS** |
| **Unexpected abort** | **No** |

---

*Companion: [`wave1-production-postflight-report.md`](wave1-production-postflight-report.md) · [`wave1-production-idempotency-report.md`](wave1-production-idempotency-report.md)*
