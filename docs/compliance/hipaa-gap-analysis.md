# HIPAA Gap Analysis — Medora Platform

**Program:** GOV.3  
**Version:** 1.0  
**Date:** 2026-06-10  
**Scope:** Medora-S codebase + operational documentation vs HIPAA Security Rule (45 CFR Part 164)

---

## Executive summary

Medora has **implemented several technical safeguards** suitable for a clinic EMR MVP but lacks **formal HIPAA program documentation, executed BAAs, and several administrative/physical control attestations** required for US hospital enterprise sales.

| Safeguard category | Implemented (product) | Documented (policy) | Gap severity |
|--------------------|----------------------|---------------------|--------------|
| Administrative | Partial | **Missing** | **High** |
| Physical | Delegated to vendors | Partial | **High** |
| Technical | **Strong partial** | Partial | **Medium** |

**Overall HIPAA readiness score: 2.0 / 5** (product controls exist; compliance program incomplete)

---

## 1. Administrative safeguards

### 1.1 Security management process (§164.308(a)(1))

| Requirement | Status | Evidence / Gap |
|-------------|--------|----------------|
| Risk analysis | **Gap** | No formal RA document; medication/imaging risk registers exist but not HIPAA-wide |
| Risk management | **Gap** | `hipaa-risk-management-plan.md` created by GOV program — needs execution |
| Sanction policy | **Gap** | No workforce sanction policy |
| Information system activity review | **Partial** | `AuditLog`, admin audit UI, compliance dashboard |

### 1.2 Assigned security responsibility (§164.308(a)(2))

| Requirement | Status | Gap |
|-------------|--------|-----|
| Security Officer | **Gap** | No designated HIPAA Security Officer in docs |
| Privacy Officer | **Gap** | Not designated |

**P0:** Appoint Security Officer and Privacy Officer (may be same person initially).

### 1.3 Workforce security (§164.308(a)(3))

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Authorization/supervision | **Partial** | RBAC, facility roles |
| Workforce clearance | **Gap** | No background check policy |
| Termination procedures | **Partial** | `UserRole.isActive`, session revoke — no HR offboarding checklist |

### 1.4 Information access management (§164.308(a)(4))

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Isolating healthcare clearinghouse | N/A | Not a clearinghouse |
| Access authorization | **Partial** | Admin assigns roles; no formal access request workflow |
| Access establishment/modification | **Partial** | UserRole CRUD |
| Minimum necessary | **Partial** | Role-based; not fine-grained per resource |

### 1.5 Security awareness training (§164.308(a)(5))

| Requirement | Status | Gap |
|-------------|--------|-----|
| Security reminders | **Gap** | No training program until GOV.3 doc |
| Protection from malware | **Partial** | Hosting provider; no endpoint policy |
| Log-in monitoring | **Partial** | Failed login tracker (in-memory) |
| Password management | **Implemented** | 12-char policy, Argon2 |

### 1.6 Security incident procedures (§164.308(a)(6))

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Response and reporting | **Partial** | `ER_PILOT_MONITORING_AND_INCIDENTS.md`; `incident-response-plan.md` (GOV.4) |
| Breach notification process | **Gap** | Not HIPAA-specific |

### 1.7 Contingency plan (§164.308(a)(7))

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Data backup plan | **Partial** | Railway backups; env acknowledgement flags |
| Disaster recovery | **Partial** | `ER_RESTORE_DRILL_CHECKLIST.md` |
| Emergency mode operation | **Gap** | No documented emergency mode |
| Testing/revision | **Partial** | Restore drill checklist; `MEDORA_LAST_RESTORE_DRILL_AT` env |

### 1.8 Evaluation (§164.308(a)(8))

| Requirement | Status | Gap |
|-------------|--------|-----|
| Periodic technical/non-technical evaluation | **Gap** | No annual HIPAA evaluation schedule |

### 1.9 Business associate agreements (§164.308(b))

| Requirement | Status | Gap |
|-------------|--------|-----|
| Written BAA with vendors | **Gap** | Templates created; not executed |
| BAA with customers | **Gap** | Template only |

---

## 2. Physical safeguards (§164.310)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Facility access controls | **Delegated** | Railway/Vercel data centers |
| Workstation use | **Gap** | Customer responsibility; not in product |
| Device and media controls | **Gap** | No MDM policy |

**Action:** Obtain SOC 2 / ISO reports from Railway and Vercel; execute BAAs.

---

## 3. Technical safeguards (§164.312)

| Standard | Status | Medora-S evidence |
|----------|--------|-------------------|
| **Access control** (unique user ID) | **Met** | User accounts, JWT `sub` |
| **Emergency access** | **Partial** | Break-glass sessions (20 min, audited) |
| **Automatic logoff** | **Partial** | JWT expiry (8h default); not idle timeout |
| **Encryption/decryption** | **Partial** | TLS in transit; MFA secrets encrypted; **PHI in DB not app-encrypted** |
| **Audit controls** | **Partial** | Extensive `AuditLog`; **not DB-immutable**; default `best_effort` |
| **Integrity** | **Partial** | Chart export HMAC; append-only clinical entries (app rule) |
| **Authentication** | **Met** | Password policy + optional MFA |
| **Transmission security** | **Met** | HTTPS/TLS (hosting) |

---

## 4. Organizational requirements (§164.314)

| Requirement | Status |
|-------------|--------|
| BA agreements | **Gap** — templates only |
| Requirements for group plans | N/A typically |

---

## 5. Policies and procedures documentation (§164.316)

| Requirement | Status |
|-------------|--------|
| Written policies | **Gap** — GOV program creates drafts |
| Documentation retention (6 years) | **Gap** — no retention policy enforcement |

---

## 6. Priority remediation roadmap

### P0 (before first US Covered Entity BAA)

1. Execute BAAs with Railway (Postgres) and Vercel (if PHI transits BFF)
2. Appoint Security & Privacy Officer
3. Complete HIPAA Risk Analysis
4. Set `AUDIT_FAILURE_MODE=fail_closed` in production
5. Require MFA for clinical roles (`MFA_REQUIRED_ROLES`)
6. Fix server-side MFA disable enforcement gap
7. Execute customer BAA + MSA

### P1 (90 days)

8. Workforce HIPAA training with attestation
9. Incident response tabletop + breach notification playbook
10. Restore drill with documented evidence
11. Vendor BAA matrix complete with signed status
12. DB audit log immutability (trigger or WORM storage)

### P2 (6–12 months)

13. SOC 2 Type I audit
14. Penetration test
15. Field-level encryption assessment for high-sensitivity fields
16. Fine-grained authorization (beyond coarse RBAC)

### P3

17. SOC 2 Type II
18. HITRUST (if enterprise pipeline requires)

---

## 7. Strengths to leverage in customer conversations

- Facility-scoped multi-tenancy
- Comprehensive audit action taxonomy
- Break-glass with TTL and critical audit
- Chart export signing and ROI workflow
- PHI redaction in application logs
- Password policy and MFA infrastructure
- Operator backup/restore drill documentation

---

**Disclaimer:** Gap analysis based on codebase review and standard HIPAA Security Rule mapping. Formal compliance requires qualified HIPAA counsel and organizational implementation.
