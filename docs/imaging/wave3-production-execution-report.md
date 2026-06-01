# Wave 3 Production Execution Report (Phase 2E.7D)

**Phase:** 2E.7D — production execution  
**Date:** 2026-06-01  
**Environment:** Railway **production** (Postgres via production `DATABASE_URL`)  
**Authorization:** [`wave3-production-authorization.md`](wave3-production-authorization.md) — **AUTHORIZED** (2E.7C / 2E.7C.1)  
**Minimum seed commit:** `d080595d` · auth docs `e20d94ef`

---

## 1. Execution status

| Field | Value |
|-------|--------|
| **Production seed executed** | **NO** (agent session — no production `DATABASE_URL`; Railway CLI unauthorized) |
| **Execution status** | **BLOCKED** |
| **Exit code** | — |
| **Production verdict (2E.7D)** | **NOT COMPLETE** |
| **Production safety** | **NOT SAFE** (pending successful execution) |

**Blocker:** Agent environment cannot reach production database (`railway login` → `invalid_grant`; local `.env` points to `localhost:5432/medora` only).

**Operator action:** Run §3 commands from an authorized workstation with production `DATABASE_URL`, capture output, then update this report (or request 2E.7D.1 documentation pass).

---

## 2. Pre-execution baseline (authorized — 2E.7C.1)

Verified on production **before** Wave 3 seed:

| Metric | Expected | Actual (2E.7C.1) | Result |
|--------|----------|------------------|--------|
| Active imaging | **141** | **141** | **PASS** |
| Wave 1 active | **37** | **37** | **PASS** |
| Wave 2 active | **61** | **61** | **PASS** |
| Wave 3 active | **0** | **0** | **PASS** |
| Wave 3 aliases | **0** | **0** | **PASS** |
| `CT_HEAD` active | **false** | **false** | **PASS** |
| `MRI_SPINE` contrast | **NULL** | **NULL** | **PASS** |

See [`wave3-production-preflight.md`](wave3-production-preflight.md) §2.

---

## 3. Execution (run 1) — operator commands

### Command

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Production wrapper

```bash
cd /path/to/medora-s
export DATABASE_URL="<production-connection-string>"
pnpm --filter @medora/api run prisma:seed-catalogs
```

Or:

```bash
railway run --service Postgres --environment production -- sh -c \
  'export DATABASE_URL="$DATABASE_PUBLIC_URL" && pnpm --filter @medora/api run prisma:seed-catalogs'
```

### Expected output (run 1)

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 0 aliases, 15 US tuple mappings, 0 tuple aliases, 0 tuple protocol updates)
✅ Wave 3 imaging catalog (41 studies, 86 aliases)
✅ Catalogs seeded (lab, imaging, medications)
```

### Actual output (run 1)

```text
(not executed in agent session — awaiting operator)
```

| Metric | Expected | Actual |
|--------|----------|--------|
| Exit code | **0** | — |
| Wave 3 studies upserted | **41** | — |
| Wave 3 aliases created | **~86** | — |
| Active imaging after run 1 | **182** | — |

### Batch scope (on success)

| Batch | Rows |
|-------|-----:|
| MRI-2 | **14** |
| MRA-1 | **5** |
| US-2 | **10** |
| US-3 | **3** |
| FL-1 | **4** |
| NM-1 | **5** |
| **Total** | **41** |

---

## 4. Staging reference (2E.7B — not production)

Local seed after prior 2E.7B validation (idempotent re-run; **not** production evidence):

```text
✅ Wave 3 imaging catalog (41 studies, 0 aliases)
```

First-time staging run 1 produced **86** aliases; postflight **19/19 PASS**, active **182**.

---

## 5. Execution result

| Field | Value |
|-------|--------|
| **Execution status** | **BLOCKED** (pending operator) |
| **Unexpected abort** | N/A |

---

*Companion (update after success): [`wave3-production-postflight-report.md`](wave3-production-postflight-report.md) · [`wave3-production-idempotency-report.md`](wave3-production-idempotency-report.md)*
