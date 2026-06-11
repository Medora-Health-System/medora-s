# HIPAA Training Program

**Program:** GOV.3  
**Version:** 1.0 (draft)  
**Owner:** [Privacy/Security Officer — TBD]

---

## 1. Purpose

Meet 45 CFR §164.308(a)(5) workforce security awareness and ensure anyone with PHI access understands obligations.

---

## 2. Audience

| Group | Training required |
|-------|-------------------|
| Founders / executives with system access | Yes — full |
| Engineering with production access | Yes — full + secure development |
| Support / success | Yes — full |
| Contractors | Yes — before access |
| Customer clinical users | **Customer responsibility** (Medora provides customer-facing materials optional) |

---

## 3. Training modules

### Module A — HIPAA fundamentals (all workforce)

- PHI definition and examples in Medora context
- Minimum necessary
- Patient rights (access, amendment, accounting)
- Breach definition and reporting chain
- Sanctions for violations

**Duration:** 45 minutes  
**Frequency:** On hire + **annual refresher**

### Module B — Medora platform security (technical staff)

- RBAC and facility scoping
- MFA enrollment and prohibition on sharing credentials
- Break-glass appropriate use
- PHI in logs and metadata conventions
- `AUDIT_FAILURE_MODE` and critical audit events
- Secure handling of production data (no copy to local unencrypted)

**Duration:** 30 minutes  
**Frequency:** On hire + annual

### Module C — Secure development (engineers)

- Reference `docs/security/secure-development-policy.md`
- Dependency management, secrets handling, code review
- No PHI in git, screenshots, or test fixtures

**Duration:** 45 minutes  
**Frequency:** On hire + annual

### Module D — Incident response (on-call / leads)

- Reference `incident-response-plan.md`
- Escalation contacts, breach notification timeline

**Duration:** 30 minutes  
**Frequency:** Annual + after IR plan change

---

## 4. Delivery methods

| Method | Use |
|--------|-----|
| Live onboarding session | Founders / small team |
| LMS (future) | Scale — Thinkific, Vanta training, etc. |
| Written acknowledgment | All modules |

---

## 5. Attestation

Each workforce member signs:

> I completed HIPAA training on [DATE] and agree to comply with Medora policies including AUP, confidentiality, and incident reporting.

**Storage:** HR/compliance folder (not in git).

---

## 6. Customer-facing optional materials

Medora may provide Customers a PDF/video:

- "Using Medora securely" — MFA, break-glass, logout
- Does not replace Customer's own HIPAA training obligation

---

## 7. Metrics

| Metric | Target |
|--------|--------|
| Workforce completion within 30 days of hire | 100% |
| Annual refresher completion | 100% by Q1 each year |
| Contractors before prod access | 100% |

---

## 8. Review

Update training content when:

- Material platform change (break-glass, MFA policy)
- HIPAA rule changes
- Post-incident lessons learned

---

**Related:** `acceptable-use-policy-template.md`, `hipaa-gap-analysis.md`
