# M1.6F — Pilot Activation Readiness

**Date:** 2026-06-02  
**Environment:** Railway staging audited

---

## Dashboard (Tranche A)

| Metric | Value |
|--------|------:|
| Tranche total | 12 |
| Pilot eligible | 12 |
| **Activated** | **0** |
| Pending review | 12 |
| Blocked | 0 |
| Activation readiness % | **100** |
| Rollback readiness % | **100** |

---

## Readiness scores (staging audit)

| Score | Value |
|-------|------:|
| Canonical integrity | 100 |
| Billing readiness | 100 |
| Governance readiness | 100 |
| Search readiness | 100 |
| Activation readiness | 100 |
| Rollback readiness | 100 |

---

## Per-medication eligibility (all PASS on staging)

All 12 Tranche A catalog codes have on staging:

- Enterprise Wave 1 marker
- Full canonical chain (concept → product → package → legacy catalog)
- Billing profile + HCPCS + NDC
- Safety profile (non-controlled, non-high-alert)
- ≥1 medication alias

---

## Activation posture

| State | Verdict |
|-------|---------|
| Framework implemented; nothing activated | **SAFE (conditional)** |
| Ready for manual single-med pilot | **YES** |
| Ready for bulk / Wave 2 pilot | **NO** |
| Provider search cutover | **Out of scope** |

### Conditions for first live activation

1. Explicit pharmacy/clinical sign-off per medication.
2. Use `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` for one or few codes at a time.
3. Dry-run first (`MEDORA_ENTERPRISE_PILOT_DRY_RUN=1`).
4. Billing enable remains separate step (manual review still required on profiles).

---

## Pilot dashboard API (code)

`auditEnterpriseFormularyPilotTrancheA(prisma)` returns `{ dashboard, readinessScores }` for ops/staging checks.
