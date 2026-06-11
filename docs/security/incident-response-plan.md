# Incident Response Plan

**Program:** GOV.4  
**Version:** 1.0 (draft)  
**Owner:** [Security Officer — TBD]

---

## 1. Purpose

Define detection, containment, eradication, recovery, and notification for security incidents affecting Medora systems or **PHI**.

---

## 2. Severity classification

| Severity | Definition | Example | Response target |
|----------|------------|---------|-----------------|
| **SEV-1** | Active PHI breach or production down | DB exposure, ransomware | 15 min acknowledge |
| **SEV-2** | Potential PHI exposure | Misconfigured ACL, lost laptop with session | 1 hour |
| **SEV-3** | Security event, no PHI confirmed | Failed pen test finding, DDoS | 4 hours |
| **SEV-4** | Low risk | Scanner noise, phishing attempt | Next business day |

---

## 3. Roles

| Role | Responsibility |
|------|----------------|
| **Incident Commander (IC)** | Security Officer or delegate |
| **Engineering lead** | Containment, patching, forensics support |
| **Communications** | Customer notification, status page |
| **Legal / Privacy** | Breach determination, regulatory timeline |
| **Executive** | External communication approval |

---

## 4. Phases (NIST-aligned)

### 4.1 Preparation

- Maintain IR contact list (PagerDuty / phone tree)
- Preserve audit logs (`AuditLog`, hosting logs)
- Run tabletop exercise annually

### 4.2 Detection & analysis

Sources:

- `GET /admin/system-health` anomalies
- Customer report
- Vendor notification (Railway/Vercel)
- Alert webhook (`MEDORA_ALERT_WEBHOOK_URL`)

Document: timeline, systems, data types, users affected.

### 4.3 Containment

- Revoke compromised credentials / sessions (`revokeAllUserSessions`)
- Disable affected feature flags
- Rotate secrets (JWT, MFA encryption key — follow runbook warnings)
- Preserve forensic snapshots before destructive changes

### 4.4 Eradication

- Patch vulnerability, remove unauthorized access, rebuild if needed

### 4.5 Recovery

- Restore from backup per `disaster-recovery-plan.md`
- Verify integrity before traffic restore

### 4.6 Post-incident

- Root cause analysis within 5 business days
- Update risk register
- Customer notification per BAA (breach vs security incident)

---

## 5. HIPAA breach notification (if PHI involved)

| Step | Timeline |
|------|----------|
| Internal escalation to Privacy Officer | Immediate |
| Preliminary assessment | 24 hours |
| Notify affected Customers (Business Associates) | Without unreasonable delay; ≤ 60 days per BAA |
| Customer notifies individuals / HHS | Customer as Covered Entity |
| Document in breach log | 6-year retention |

Medora assists Customer with available audit evidence.

---

## 6. Communication templates

Maintain (outside git):

- Customer notification email (suspected incident)
- Customer notification email (confirmed breach)
- Internal Slack/war room channel protocol

---

## 7. Related runbooks

- `docs/ER_PILOT_MONITORING_AND_INCIDENTS.md`
- `docs/ER_PILOT_DOWNTIME_RUNBOOK.md`
- `docs/DEPLOYMENT_RUNBOOK.md`

---

## 8. Contact

**security@medora.health** (configure)  
On-call: [ROTATION TBD]
