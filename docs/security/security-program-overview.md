# Medora Security Program Overview

**Program:** GOV.4  
**Version:** 1.0  
**Date:** 2026-06-10

---

## 1. Mission

Protect patient PHI and platform integrity while enabling safe clinical workflows for urgent care, emergency, and hospital customers.

---

## 2. Program scope

| In scope | Out of scope (customer / shared) |
|----------|----------------------------------|
| Medora-S SaaS application | Customer workstation security |
| API + Web BFF + Postgres | Customer network perimeter |
| Medora workforce access | Clinical decision-making |
| Subprocessors under Medora BAA | Hospital physical security |

---

## 3. Governance structure

| Role | Responsibility | Status |
|------|----------------|--------|
| **Security Officer** | HIPAA Security Rule, risk program | **TBD — P0** |
| **Privacy Officer** | Privacy Policy, BAAs, individual rights | **TBD — P0** |
| **Engineering lead** | Secure SDLC, vulnerability remediation | Founders |
| **Platform operations** | Backup, restore, incident response | `MEDORA_SUPER_ADMIN` |

---

## 4. Control framework alignment

| Framework | Target |
|-----------|--------|
| **HIPAA Security Rule** | Required for US healthcare customers |
| **SOC 2 Type I** | P2 milestone (6–9 months) |
| **SOC 2 Type II** | P3 milestone (12+ months) |
| **NIST CSF** | Informative mapping (optional) |

---

## 5. Security domains

### 5.1 Identity & access

- Unique user accounts, Argon2 password hashing
- Facility-scoped RBAC (`RolesGuard`, `x-facility-id`)
- Optional TOTP MFA with encrypted secrets
- Session management via JWT + refresh rotation
- Break-glass emergency access (time-limited, audited)

**Policies:** `access-control-policy.md`

### 5.2 Data protection

- TLS in transit (hosting providers)
- Database encryption at rest (Railway — vendor-dependent)
- Application encryption for MFA secrets (AES-256-GCM)
- Chart export HMAC integrity
- PHI redaction in structured logs

**Gap:** No universal application-layer PHI encryption at rest.

### 5.3 Logging & monitoring

- `AuditLog` with extensive action taxonomy
- Admin audit and compliance dashboards
- System health and backup readiness endpoints
- Optional alert webhook (PHI-safe payloads)

**Gap:** Audit immutability not DB-enforced; login lockout in-memory.

### 5.4 Vulnerability management

- Dependency updates via pnpm
- Planned annual penetration test

**Policy:** `vulnerability-management-policy.md`

### 5.5 Secure development

- Code review, typed API, Prisma ORM
- Feature flags for high-risk clinical features
- Regression harnesses for medication governance

**Policy:** `secure-development-policy.md`

### 5.6 Incident response

**Policy:** `incident-response-plan.md`

### 5.7 Business continuity

**Policies:** `disaster-recovery-plan.md`, `business-continuity-plan.md`

### 5.8 Change management

**Policy:** `change-management-policy.md`  
**Reference:** `docs/DEPLOYMENT_RUNBOOK.md`

---

## 6. Shared responsibility model

| Layer | Medora | Customer |
|-------|--------|----------|
| Application security | ✅ | |
| User provisioning | | ✅ |
| MFA enforcement policy | Recommend | ✅ Enforce |
| Workstation security | | ✅ |
| BAA execution | ✅ | ✅ |
| Clinical use compliance | | ✅ |

---

## 7. Roadmap to SOC 2

| Phase | Milestone |
|-------|-----------|
| **Now** | Policies, risk analysis, vendor BAAs |
| **Q+1** | Control evidence collection, pen test |
| **Q+2** | SOC 2 Type I audit |
| **Q+4** | SOC 2 Type II observation period |

Consider GRC platform (Vanta, Drata, Secureframe) when team > 5 or first enterprise deal requires it.

---

## 8. Document index

See `medora-governance-readiness-report.md` for full inventory.

---

**Owner:** [Security Officer TBD]
