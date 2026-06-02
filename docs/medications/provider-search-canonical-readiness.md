# Provider Search Canonical Cutover — Readiness (M1.5F)

**Date:** 2026-06-02  
**Phase:** M1.5F complete (audit + design only)

---

## Final decision

| Field | Value |
|-------|-------|
| **CANONICAL SEARCH CUTOVER READY** | **NO** |
| **SAFE / NOT SAFE** | **NOT SAFE** for provider search cutover or canonical-only index |
| **Conditional SAFE** | Legacy provider search unchanged; phased activation per Strategy D after M1.5E staging validation |

---

## Answers to M1.5F objectives

| # | Question | Answer |
|---|----------|--------|
| 1 | Can canonical search replace legacy? | **No** — no provider API returns canonical hits; orders/MAR use `catalogMedicationId` |
| 2 | Can both coexist? | **Yes** — current hybrid (legacy results + canonical metadata + optional alias bridge) |
| 3 | Duplicate risks? | **HIGH** for brand/alias; **CRITICAL** for import clone activation |
| 4 | Safest activation strategy? | **Strategy D** — phased tranches T1→T5 with per-row `orderSearchEnabled` |
| 5 | Search pollution today? | **Contained** — clones not in catalog index |
| 6 | Pollution after cutover? | **HIGH** if bulk activation or dual-index without dedupe |
| 7 | Cutover sequence? | M1.5E validate → M1.5F PASS → M1.5G T1 pilot → expand tranches → M1.5H audit |

---

## Readiness scores

| Dimension | Score | Target for YES |
|-----------|-------|----------------|
| Search readiness | **38** | ≥75 |
| Linkage readiness | **48** | ≥80 (post-M1.5E staging) |
| Billing readiness | **58** | ≥70 |
| Governance readiness | **42** | ≥70 |
| Activation readiness | **28** | ≥60 |
| Enterprise readiness | **41** | ≥65 |

**Weighted cutover readiness:** **~42/100**

---

## What is ready today

- Legacy Haiti formulary search (**316** active catalog rows operational)  
- M1.5D manifest + validation + quarantine framework  
- M1.5E backfill helper (dry-run + idempotent + search preservation marker)  
- Activation gate + lifecycle harness (19G)  
- Medication master canonical explorer (admin-only)

---

## What is not ready

- Canonical-first provider autocomplete  
- Bulk `isActive` on canonical products  
- Replacing `CatalogMedication` IDs in orders  
- Enabling search on import noise rows  
- Production-verified linkage counts  
- Resolving **55** `MANUAL_REVIEW` manifest rows  

---

## Validation (M1.5F)

| Command | Result |
|---------|--------|
| `pnpm --filter @medora/api exec prisma validate` | PASS |
| `pnpm --filter @medora/api run build` | PASS |
| `pnpm verify:web` | PASS |

No code changes in M1.5F.

---

## Git

**Do not commit** until team approves audit pack.

Suggested commit (when approved):

```text
Audit provider search canonical cutover readiness (M1.5F)
```

---

## Next phase

**M1.5G — Canonical Medication Activation Pilot** (T1 tranche only) — prerequisite: M1.5F accepted + M1.5E staging backfill PASS.
