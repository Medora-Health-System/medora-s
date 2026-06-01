# Wave 2 Production Execution Report (Phase 2E.6D)

**Phase:** 2E.6D — production execution  
**Date:** 2026-06-01  
**Environment:** Railway **production** (Postgres via `DATABASE_PUBLIC_URL`)  
**Authorization:** [`wave2-production-authorization-final.md`](wave2-production-authorization-final.md) — **AUTHORIZED**  
**Minimum commit:** `52564a41` (seed) · gate docs `a0d4e6a4`

---

## 1. Execution status

| Field | Value |
|-------|--------|
| **Production seed executed** | **NO** (agent session — Railway CLI unauthorized) |
| **Execution status** | **BLOCKED** |
| **Exit code** | — |
| **Production verdict (2E.6D)** | **NOT COMPLETE** |

**Blocker:** `railway login` required — OAuth `invalid_grant` in automated execution environment.

**Operator action:** Run §4 commands from an authorized workstation, then update this report with captured output or re-run 2E.6D documentation pass.

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

**Live pre-execution (2E.6D agent run):** *Not captured — Railway unauthorized.*

---

## 3. Execution (run 1)

### Command

```bash
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Production wrapper

```bash
cd /path/to/medora-s
railway run --service Postgres --environment production -- sh -c \
  'export DATABASE_URL="$DATABASE_PUBLIC_URL" && pnpm --filter @medora/api run prisma:seed-catalogs'
```

### Expected output (run 1)

```text
✅ Wave 1 imaging catalog (37 studies, 0 aliases, 0 XR_CHEST tuple aliases)
✅ Wave 2 imaging catalog (61 studies, 85 aliases, 15 US tuple mappings, 31 tuple aliases, 2 tuple protocol updates)
✅ Catalogs seeded (lab, imaging, medications)
```

### Actual output (run 1)

```text
(not executed — Railway CLI unauthorized)
```

| Metric | Expected | Actual |
|--------|----------|--------|
| Exit code | **0** | — |
| Wave 2 studies upserted | **61** | — |
| Wave 2 aliases created | **85** | — |
| US tuple mappings applied | **15** | — |
| Tuple aliases created | **~31** | — |
| Tuple protocol updates | **2** | — |
| Duration | ~6–10 min (full seed) | — |

### Batch scope (on success)

| Batch | Rows |
|-------|-----:|
| XR-2 | **53** |
| CT-2 | **4** |
| US-1 | **4** |
| **Total** | **61** |

---

## 4. Operator completion checklist

```bash
railway login

# 1. Pre-execution (read-only)
railway run --service Postgres --environment production -- sh -c '
export DATABASE_URL="$DATABASE_PUBLIC_URL"
cd apps/api && pnpm exec ts-node --transpile-only -e "
import { PrismaClient } from \"@prisma/client\";
import { HAITI_IMAGING_WAVE1_CATALOG } from \"./prisma/data/haiti-imaging-wave1\";
import { HAITI_IMAGING_WAVE2_CATALOG } from \"./prisma/data/haiti-imaging-wave2\";
const W1=HAITI_IMAGING_WAVE1_CATALOG.map(r=>r.code);
const W2=HAITI_IMAGING_WAVE2_CATALOG.map(r=>r.code);
const p=new PrismaClient();
(async()=>{
  const active=await p.catalogImagingStudy.count({where:{isActive:true}});
  const w1=await p.catalogImagingStudy.count({where:{code:{in:W1},isActive:true}});
  const w2=await p.catalogImagingStudy.count({where:{code:{in:W2}}});
  const w2a=await p.imagingStudyAlias.count({where:{catalogImagingStudy:{code:{in:W2}}}});
  const ct=await p.catalogImagingStudy.findUnique({where:{code:\"CT_HEAD\"}});
  const mri=await p.catalogImagingStudy.findUnique({where:{code:\"MRI_SPINE\"},select:{contrastTypeClassifierId:true}});
  console.log(JSON.stringify({active,w1,w2,w2a,ctHead:ct?.isActive,mriContrast:mri?.contrastTypeClassifierId},null,2));
  await p.\$disconnect();
})();"

# 2. Seed run 1
railway run --service Postgres --environment production -- sh -c \
  "export DATABASE_URL=\"\$DATABASE_PUBLIC_URL\" && pnpm --filter @medora/api run prisma:seed-catalogs"

# 3. Postflight — see postflight report
# 4. Seed run 2 — see idempotency report
```

---

## 5. Execution result

| Field | Value |
|-------|--------|
| **Execution status** | **BLOCKED** (pending operator) |
| **Unexpected abort** | N/A |

---

*Companion (update after success): [`wave2-production-postflight-report.md`](wave2-production-postflight-report.md) · [`wave2-production-idempotency-report.md`](wave2-production-idempotency-report.md)*
