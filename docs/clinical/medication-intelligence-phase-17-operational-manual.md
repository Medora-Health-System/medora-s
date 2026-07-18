# Phase 17 — Operational Manual

## Safe operating sequence

1. Confirm Phase 16 remains certified shadow-only.
2. Run `medication:phase17:qualification`.
3. Review `medication:phase17:readiness` (`PILOT_READY_NOT_ACTIVATED` preferred before activation).
4. Create program via API (`dryRun` first) — CLI defaults do **not** activate.
5. Add providers; record training + acknowledgement.
6. Submit → approve (separation of duties: creator ≠ approver).
7. Schedule → activate only with explicit governance approval.
8. Monitor exposures, feedback, safety events.
9. Suspend immediately on any constitutional or safety breach.
10. Complete or revoke; never auto-expand.

## Roles (capability separation)

| Capability | Typical roles |
|------------|---------------|
| Create / schedule / activate / suspend | Medication admin |
| Approve pilot | Approver roles (not self-approve) |
| Evaluate qualification | Medication reviewer / admin |
| Provider advisory + feedback | Authorized pilot provider |
| Safety event review | Safety officer / admin |
| Audit read | Audit reviewer / admin |

## APIs

Base: `/medications/recommendation-pilot/*`
Facility-scoped, role-gated. State-changing routes require reason where appropriate.

## Admin / Provider UI

- Admin: `/app/admin/medication-governance/recommendation-pilot`
- Provider: `/app/provider/medication-recommendations`

## Recommended next phase (do not implement here)

Broader evaluation of controlled-pilot outcomes — **not** enterprise activation.
