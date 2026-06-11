# Security Addendum (Template)

**DRAFT FOR COUNSEL REVIEW**

**Provider:** [MEDORA HEALTH, LLC]  
**Customer:** [CUSTOMER NAME]  
**Incorporated into:** MSA / BAA  
**Version:** [DATE]

---

## 1. Security program

Provider maintains a security program aligned with HIPAA Security Rule and [SOC 2 Type II roadmap].

---

## 2. Administrative safeguards (summary)

| Control | Implementation |
|---------|----------------|
| Security officer | [DESIGNATED ROLE] |
| Workforce training | HIPAA/security onboarding (see training program) |
| Access management | RBAC, facility scoping, least privilege |
| Incident response | Documented IR plan |
| Contingency planning | Backup/DR runbooks |
| Evaluation | Periodic risk assessment |

---

## 3. Technical safeguards (Medora-S platform)

| Control | Status |
|---------|--------|
| **Access control** | Unique user IDs; `RolesGuard`; facility header |
| **Authentication** | Argon2 passwords; JWT sessions; optional TOTP MFA |
| **Session management** | Refresh rotation; revoke on password change |
| **Audit controls** | `AuditLog` append-only (application layer) |
| **Integrity** | Chart export HMAC; transactional audit option |
| **Transmission security** | TLS (HTTPS) via hosting provider |
| **Encryption at rest** | Platform DB encryption (Railway); MFA secrets AES-256-GCM |
| **Break-glass** | Time-limited emergency access, audited |
| **PHI in logs** | Redaction utilities |

**Gaps disclosed:** Application-layer field encryption for all PHI not implemented; audit log DB immutability not trigger-enforced; MFA not required by default.

---

## 4. Physical safeguards

Delegated to **Railway** (database) and **Vercel** (stateless web) — enterprise BAA / SOC reports required.

---

## 5. Vulnerability management

Dependency scanning, patch cadence, responsible disclosure [security@medora.health].

---

## 6. Penetration testing

[Annual / before major hospital go-live — schedule TBD]

---

## 7. Customer responsibilities

User provisioning/deprovisioning, MFA enforcement policy, workstation security, training, incident notification to Provider.

---

## 8. Audit rights

Customer may request SOC 2 report or security questionnaire [once annually / under NDA].

---

## 9. Incident notification

Provider notifies Customer without unreasonable delay upon confirmed breach of Customer PHI.

---

## 10. Changes

Material security downgrades require [30] days notice and Customer termination right.

---

**Reference:** `docs/security/security-program-overview.md`, `docs/compliance/hipaa-security-rule-matrix.md`
