# HIPAA Risk Management Plan

**Program:** GOV.3  
**Version:** 1.0 (draft)  
**Owner:** [HIPAA Security Officer — TBD]  
**Review cycle:** Annual + upon material system change

---

## 1. Purpose

Identify, prioritize, and treat risks to **ePHI** processed by Medora hosted platform in accordance with 45 CFR §164.308(a)(1).

---

## 2. Scope

- Medora-S application (API, web BFF, database)
- Subprocessors: Railway, Vercel, [email, billing vendors]
- Workforce with production access
- Customer environments (shared responsibility)

---

## 3. Risk assessment methodology

1. **Asset inventory** — PHI stores, systems, interfaces (see gap analysis)
2. **Threat identification** — OWASP, insider, vendor, ransomware, misconfiguration
3. **Vulnerability identification** — Code review, dependency scan, pen test, config audit
4. **Likelihood × Impact** — 1–5 scale
5. **Risk score** — L × I; treat scores ≥ 12 as high priority
6. **Treatment** — Mitigate, transfer (insurance), accept (documented), avoid

---

## 4. Initial risk register (2026 baseline)

| ID | Risk | L | I | Score | Treatment | Owner | Target |
|----|------|---|---|-------|-----------|-------|--------|
| R-01 | No executed vendor BAAs | 4 | 5 | 20 | Execute BAAs | Legal | P0 |
| R-02 | PHI in DB without app-layer encryption | 3 | 4 | 12 | Accept + Railway encryption; reassess field-level | Eng | P2 |
| R-03 | Audit log tampering (no DB immutability) | 3 | 5 | 15 | DB triggers / WORM | Eng | P1 |
| R-04 | MFA not required by default | 4 | 4 | 16 | `MFA_REQUIRED_ROLES` prod | Ops | P0 |
| R-05 | MFA disable without server enforcement | 3 | 4 | 12 | API guard fix | Eng | P0 |
| R-06 | External billing webhook PHI exposure | 3 | 5 | 15 | BAA + DPA or disable | Product | P1 |
| R-07 | Clearinghouse claim PHI breach | 2 | 5 | 10 | Vendor BAAs, encryption in transit | Billing | P1 |
| R-08 | Break-glass abuse | 2 | 5 | 10 | Audit review + alerts | Compliance | P1 |
| R-09 | Backup failure undetected | 3 | 5 | 15 | Restore drills + monitoring | Ops | P0 |
| R-10 | In-memory login lockout bypass (restart) | 3 | 3 | 9 | Redis/shared store | Eng | P2 |
| R-11 | `AUDIT_FAILURE_MODE=best_effort` | 3 | 4 | 12 | fail_closed prod | Ops | P0 |
| R-12 | Contractor IP not assigned | 4 | 5 | 20 | IP agreements | Legal | P0 |
| R-13 | No workforce HIPAA training | 4 | 4 | 16 | Training program | HR | P1 |
| R-14 | Session timeout too long (8h) | 3 | 3 | 9 | Shorten + idle timeout | Eng | P2 |
| R-15 | Password reset email not implemented | 2 | 3 | 6 | Secure reset delivery | Eng | P1 |

---

## 5. Risk treatment plan

### Mitigate (primary strategy)

- Implement controls in risk register with engineering/ops owners
- Map each control to HIPAA matrix row

### Transfer

- Cyber liability insurance
- Vendor SLAs and BAAs

### Accept

- Documented acceptance with Security Officer sign-off for residual low scores
- Annual re-review

---

## 6. Monitoring and review

| Activity | Frequency |
|----------|-----------|
| Risk register update | Quarterly |
| Full risk assessment | Annual |
| Vendor review | Annual |
| Penetration test | Annual (pre-hospital) |
| Restore drill | Semi-annual (`ER_RESTORE_DRILL_CHECKLIST.md`) |
| Audit log review sampling | Monthly |

---

## 7. Documentation

Maintain evidence in:

- `docs/compliance/` — policies, matrix, training records (outside git for attestations)
- Admin compliance dashboard — operational metrics
- Ticket system — remediation tracking

---

## 8. Approval

| Role | Name | Date |
|------|------|------|
| Security Officer | [TBD] | |
| Privacy Officer | [TBD] | |
| Executive sponsor | [TBD] | |

---

**Related:** `hipaa-gap-analysis.md`, `vendor-baa-matrix.md`, `docs/security/incident-response-plan.md`
