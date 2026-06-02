# Canonical Stabilization Remediation — Readiness (M1.5R)

**Date:** 2026-06-02  
**Status:** M1.5R **IMPLEMENTATION COMPLETE** — apply on staging before M1.5E

---

## Deliverables

| Item | Status |
|------|--------|
| Root-cause link audit API | Done |
| Acet/clone unlink helper | Done |
| Search pollution catalog deactivation | Done |
| Quarantine enforcement validator | Done |
| M1.5E readiness scorer | Done |
| Staging plan + rollback docs | Done |
| Unit tests (10) | Done |
| Billing/governance preservation | **PASS** (design) |

---

## Environment readiness

| Environment | M1.5R apply | M1.5E | M1.5G | M1.6A |
|-------------|-------------|-------|-------|-------|
| **Local dev** | Ready (dry-run verified) | After apply | After M1.5E | No |
| **Staging** | **Recommended next step** | After M1.5R PASS | After M1.5E | No |
| **Production Haiti pilot** | After staging PASS | After staging M1.5E | One facility | No |

---

## Gate matrix

| Gate | Status |
|------|--------|
| **READY FOR M1.5E STAGING EXECUTION** | **READY** (after M1.5R apply on that DB) |
| **READY FOR M1.5G PILOT** | **NOT READY** (needs M1.5E + M1.5H re-pass) |
| **READY FOR M1.6A** | **NOT READY** |
| **HAITI MEDICATION ARCHITECTURE STABILIZED** | **NOT YET** — requires apply + M1.5E + M1.5H re-audit |

---

## SAFE / NOT SAFE

| Action | Verdict |
|--------|---------|
| Run M1.5R dry-run on any dev DB | **SAFE** |
| Run M1.5R apply on **staging** | **SAFE (conditional)** — backup DB; review audit output first |
| Run M1.5R apply on production without staging proof | **NOT SAFE** |
| Skip M1.5R and run M1.5E backfill | **NOT SAFE** |
| Start M1.6A | **NOT SAFE** |

---

## Post-M1.5R expected state (local model)

| Metric | Target |
|--------|--------|
| Invalid legacy links | **0** |
| Active `19G*` catalog rows | **0** |
| Active Haiti catalog rows | **~247** |
| M1.5E clean links (after backfill) | **192** |
| Provider search acetaminophen clones | **0** |

---

## CI status

| Check | Result |
|-------|--------|
| `prisma validate` | PASS |
| `@medora/api` build | PASS |
| `@medora/shared` test (1062) | PASS |
| M1.5R tests (10) | PASS |
| `medication-safety` / `orders` | PASS |
| `verify:web` | PASS |

---

## Sign-off checklist (staging)

- [ ] `auditHaitiCanonicalStabilization` — incorrect links = 0
- [ ] `activePollutionCatalogs` = 0
- [ ] Search scenarios all PASS
- [ ] M1.5E dry-run — 192 creates/links, 55 skipped
- [ ] Pharmacy informatics review of deactivated `19G` catalog list
- [ ] Re-run M1.5H audit doc checklist → **STABILIZED**
