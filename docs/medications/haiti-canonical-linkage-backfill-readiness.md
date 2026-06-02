# Haiti Canonical Linkage Backfill — Readiness (M1.5E)

**Date:** 2026-06-02  
**Schema:** Supported — **not blocked**  
**Production:** **NOT SAFE** to run seed/backfill in production (implementation phase complete; rollout gated)

---

## SAFE / NOT SAFE

| Action | Verdict |
|--------|---------|
| Shared M1.5D manifest + validation | **SAFE** (read-only) |
| Local / test DB dry-run | **SAFE** |
| Local backfill with env flag on dev DB | **SAFE** (with backup; review summary) |
| Normal `prisma:seed-catalogs` without env | **SAFE** (backfill off by default) |
| Production seed / backfill | **NOT SAFE** |
| Provider search cutover | **NOT SAFE** (M1.5F) |
| Bulk canonical activation | **NOT SAFE** (M1.5G) |

---

## Production rollout blockers

1. M1.5F cutover audit complete  
2. Pharmacy/clinical sign-off on `MANUAL_REVIEW` rows (55)  
3. M1.4B billing remediation applied in target environment  
4. Backup + idempotent dry-run on staging clone  
5. Verification that no Haiti row links to quarantined `19G1-ACET-*` / insulin / blocked-med products  

---

## Files (M1.5E)

| Path | Role |
|------|------|
| `apps/api/prisma/helpers/seed-haiti-canonical-medication-linkage.ts` | Backfill helper |
| `apps/api/prisma/helpers/haiti-canonical-linkage-seed-modules.ts` | Shared module loader |
| `apps/api/src/medication-master/haiti-canonical-linkage.constants.ts` | M1.5E search-preservation marker |
| `apps/api/src/medication-master/haiti-canonical-linkage-backfill.spec.ts` | Tests |
| `apps/api/src/medication-master/medication-product-activation-gates.util.ts` | Linkage-only gate exception |
| `apps/api/prisma/seed-catalogs.ts` | Env-guarded optional wiring |

---

## Git

Do not commit until explicitly approved. Suggested message:

`Add Haiti canonical medication linkage backfill`

---

## Next phase

**M1.5F** — Provider Search Canonical Cutover Audit (intentional search behavior change per tranche).
