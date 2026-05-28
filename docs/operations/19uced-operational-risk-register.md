# 19UCED — Operational Risk Register

Phase **19UCED.10** — enterprise billing governance initiative (19UCED.1–19UCED.9).

Preview/governance only. No claim submission, reimbursement calculation, or auto-coding in scope.

---

## Risk summary

| ID | Risk | Impact | Likelihood | Mitigation | Owner | Rollback |
|----|------|--------|------------|------------|-------|----------|
| R01 | Wrong billing classification at registration | Incorrect export route preview; revenue coding errors downstream | Medium | Staff training; facility mode defaults; classification badge on encounter; admin workflow config | Clinic admin + billing | PATCH classification with audit trail; institutional review |
| R02 | UC→ED conversion without patient acknowledgment | Compliance / billing policy violation | Medium | `requireUcToEdPatientAcknowledgement`; validation in `billing-classification.service`; handbook §4.5 | Clinical lead | Document correction; audit review; do not duplicate encounter |
| R03 | Missing UC→ED acknowledgment capture | Governance metrics under-report; policy gap | Low | Transition JSON stores `patientAcknowledged`; governance dashboard counts ack/missing | Billing admin | Manual policy archive; future capture enhancement |
| R04 | Facility billing identity incomplete | Facility-side export preview blocked | Medium | `evaluateFacilityBillingIdentityComplete`; governance BLOCKED warning; admin billing identity UI | Facility admin | Complete identity fields; no code change |
| R05 | Hybrid facility controls disabled | Staff cannot convert when clinically needed | Low | `showEncounterBillingControls`; go-live checklist | Platform admin | Enable controls via admin facility workflow PATCH |
| R06 | Facility misconfiguration (wrong mode) | Wrong allowed classifications | Medium | Onboarding checklist; governance CONFIGURATION_INCOMPLETE warning | Platform admin | Admin PATCH billing workflow |
| R07 | Observation review overload | Billing team backlog; alert fatigue | Medium | Governance WATCH/REVIEW thresholds; sample cap documented (500) | Billing supervisor | Triage by date filter; institutional prioritization |
| R08 | Governance dashboard misuse (treated as billing truth) | Operational decisions without institutional policy | Medium | Disclaimer on all surfaces; handbook preview-only language; training | Billing + admin | Reinforce training; dashboards remain advisory |
| R09 | PHI exposure via debug/logging | Privacy breach | Low | `FORBIDDEN_*` keys; aggregate-only governance API; spec enforcement | Engineering | Disable endpoint; audit log review; hotfix if leak found |
| R10 | Queue `hasPayer: true` optimistic batch | Queue rows may show payer-ready when payer missing | Medium | Document limitation; single-encounter endpoints resolve payer accurately | Engineering | Use encounter-level review before export decisions |
| R11 | Governance readiness sample cap (500) | Totals vs readiness buckets diverge for large backlogs | Low | Document `readinessSampleSize` in API response; use date filters | Billing admin | Narrow date range; encounter-level review for outliers |
| R12 | Performance: transition JSON scan | Slow governance dashboard on large datasets | Low | Bounded encounter queries; date filters; future: audit-based aggregates | Engineering | Reduce date range; off-peak refresh |
| R13 | Billing review queue overload | Staff cannot clear review queues | Medium | Operational triage; filters by status/classification | Billing supervisor | Increase staffing; institutional backlog process |
| R14 | Staff confuses preview with claim submission | Attempt to bill from Medora preview screens | Medium | No submit buttons; French disclaimers; training | Billing admin | Clarify workflow; external billing system remains source of truth |
| R15 | Migration 19UCED.2 not deployed | Facility workflow fields missing; runtime errors | High | `prisma migrate deploy` in deployment order; migrate status gate | DevOps | Apply migration; rollback app if incompatible |
| R16 | Cross-facility data leak | Wrong facility sees another facility's metrics | Critical | All queries scoped by `facilityId`; JWT + header enforcement | Engineering | Immediate hotfix; audit access logs |
| R17 | UC↔ED conversion duplicates chart | Data integrity failure | Critical | Single encounter update only; tests assert same ID | Engineering | N/A — architecture prevents; investigate if reported |
| R18 | Auto-coding expectation | Users expect CPT/ICD from Medora | Medium | Explicit non-goals in handbook §4.6; UI disclaimers | Product + billing | Training correction |
| R19 | Extended observation false positive | Unnecessary facility review | Low | Heuristic based on LOS; manual review | Clinical + billing | Override via institutional process |
| R20 | Role escalation (BILLING sees admin-only ops) | Unauthorized config change | Low | Governance read-only; config changes require ADMIN paths | Engineering | RBAC audit; revoke role |

---

## Residual accepted limitations (19UCED.10)

1. **Queue payer optimism** — Batch queues (charge, coding, claim assembly) use `hasPayer: true` for performance; encounter detail endpoints resolve payer correctly.
2. **Governance sample cap** — Readiness status buckets computed on latest 500 encounters in filter window; classification totals use full `groupBy`.
3. **Transition scan** — UC↔ED counts scan transition JSON in date range; very large histories may need date narrowing.
4. **No claim submission** — Medora preview layers do not replace clearinghouse or external billing vendor.
5. **Handbook §4.6** — 19UCED.1/2 documented in §4.1–4.5 and admin workflow; §4.6 starts at 19UCED.3 by design.

---

## Monitoring recommendations

- Weekly: governance dashboard warnings (facility identity, open encounter ratio)
- Monthly: UC→ED conversion volume vs acknowledgment captured
- On incident: audit log for `ENCOUNTER_BILLING_CLASSIFICATION_CHANGED`, `BILLING_GOVERNANCE_SUMMARY` views
- Performance: API p95 for `/admin/billing-governance/summary` and review queue endpoints

---

## Escalation

| Severity | Example | Action |
|----------|---------|--------|
| P1 | PHI in governance response | Disable endpoint; hotfix; notify DPO |
| P1 | Cross-facility leak | Hotfix; audit; incident report |
| P2 | Migration failure on deploy | Rollback app; restore DB if needed |
| P3 | Dashboard slow | Date filter guidance; capacity review |
| P4 | Training gap (preview vs submit) | Refresher session; handbook pointer |
