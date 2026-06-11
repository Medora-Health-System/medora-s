# HIPAA Security Rule Matrix — Medora Platform

**Program:** GOV.3  
**Version:** 1.0  
**Reference:** 45 CFR §164.308, §164.310, §164.312, §164.314, §164.316

**Legend:** ✅ Implemented | ⚠️ Partial | ❌ Gap | N/A | 🔗 Vendor-delegated

---

## Administrative Safeguards (§164.308)

| CFR | Requirement | Status | Medora control / artifact |
|-----|-------------|--------|---------------------------|
| (a)(1)(i) | Risk analysis | ❌ | `hipaa-risk-management-plan.md` — execute RA |
| (a)(1)(ii)(A) | Risk management | ⚠️ | Product hardening; formal plan needed |
| (a)(1)(ii)(B) | Sanction policy | ❌ | HR policy needed |
| (a)(1)(ii)(C) | Information system activity review | ⚠️ | `GET admin/audit/events`, compliance service |
| (a)(2) | Assigned security responsibility | ❌ | Designate Security Officer |
| (a)(3)(i) | Authorization and/or supervision | ⚠️ | RBAC |
| (a)(3)(ii)(A) | Workforce clearance procedure | ❌ | Background check policy |
| (a)(3)(ii)(B) | Termination procedures | ⚠️ | Deactivate `UserRole`, revoke sessions |
| (a)(4)(i) | Isolating clearinghouse | N/A | |
| (a)(4)(ii)(A) | Access authorization | ⚠️ | Admin user management |
| (a)(4)(ii)(B) | Access establishment/modification | ⚠️ | UserRole assignment |
| (a)(4)(ii)(C) | Minimum necessary | ⚠️ | Role-based; improve granularity |
| (a)(5)(i) | Security awareness training | ❌ | `hipaa-training-program.md` |
| (a)(5)(ii)(A) | Security reminders | ❌ | |
| (a)(5)(ii)(B) | Protection from malicious software | 🔗 | Customer endpoints + hosting |
| (a)(5)(ii)(C) | Log-in monitoring | ⚠️ | `failed-login-tracker.ts` (in-memory) |
| (a)(5)(ii)(D) | Password management | ✅ | `password-policy.ts`, Argon2 |
| (a)(6)(i) | Security incident procedures | ⚠️ | `incident-response-plan.md` |
| (a)(6)(ii) | Response and reporting | ⚠️ | Alert webhook (PHI-safe) |
| (a)(7)(i) | Contingency plan establishment | ⚠️ | DR/BCP docs |
| (a)(7)(ii)(A) | Data backup plan | ⚠️ | Railway backups + env flags |
| (a)(7)(ii)(B) | Disaster recovery plan | ⚠️ | `ER_RESTORE_DRILL_CHECKLIST.md` |
| (a)(7)(ii)(C) | Emergency mode operation | ❌ | |
| (a)(7)(ii)(D) | Testing and revision | ⚠️ | Restore drill env |
| (a)(7)(ii)(E) | Applications and data criticality | ⚠️ | Implicit in runbooks |
| (a)(8) | Evaluation | ❌ | Annual review not scheduled |
| (b)(1) | Business associate contracts | ❌ | BAA templates; unsigned |
| (b)(2) | BA contract requirements | ❌ | Subcontractor BAA template |

---

## Physical Safeguards (§164.310)

| CFR | Requirement | Status | Notes |
|-----|-------------|--------|-------|
| (a)(1) | Facility access controls | 🔗 | Railway/Vercel SOC reports |
| (a)(2)(i) | Contingency operations | 🔗 | |
| (a)(2)(ii) | Facility security plan | 🔗 | |
| (a)(2)(iii) | Access control/validation | 🔗 | |
| (a)(2)(iv) | Maintenance records | 🔗 | |
| (b) | Workstation use | ❌ | Customer policy |
| (c)(1) | Device/media disposal | ⚠️ | Customer + hosting |
| (c)(2) | Media re-use | N/A | Cloud SaaS |
| (c)(3) | Accountability | ⚠️ | |
| (c)(4) | Data backup/storage | 🔗 | Railway |

---

## Technical Safeguards (§164.312)

| CFR | Requirement | Status | Medora implementation |
|-----|-------------|--------|------------------------|
| (a)(1) | Access control | ✅ | Auth + RBAC + facility scope |
| (a)(2)(i) | Unique user identification | ✅ | User.id |
| (a)(2)(ii) | Emergency access procedure | ⚠️ | Break-glass (`break-glass.service.ts`) |
| (a)(2)(iii) | Automatic logoff | ⚠️ | JWT TTL; no idle timeout |
| (a)(2)(iv) | Encryption/decryption | ⚠️ | MFA AES-GCM; DB relies on Railway |
| (b) | Audit controls | ⚠️ | `AuditLog`; immutability gap |
| (c)(1) | Integrity mechanism | ⚠️ | Chart HMAC; append-only rules |
| (c)(2) | Mechanism to authenticate ePHI | ⚠️ | Partial |
| (d) | Person or entity authentication | ✅ | Password + MFA |
| (e)(1) | Transmission security | ✅ | TLS |
| (e)(2)(i) | Integrity controls | ✅ | TLS |
| (e)(2)(ii) | Encryption | ✅ | TLS in transit |

---

## Organizational & Documentation (§164.314, §164.316)

| CFR | Requirement | Status |
|-----|-------------|--------|
| 164.314(a)(1) | BA contract | ❌ |
| 164.314(a)(2)(i) | BA permitted uses | ❌ (template) |
| 164.314(a)(2)(ii) | BA safeguards | ⚠️ (product) |
| 164.314(a)(2)(iii) | Subcontractor BAAs | ❌ |
| 164.314(b)(1) | Group health plan | N/A |
| 164.316(a) | Policies and procedures | ❌ |
| 164.316(b)(1) | Documentation retention | ❌ |
| 164.316(b)(2)(i) | Time limit (6 years) | ❌ |
| 164.316(b)(2)(ii) | Availability | ❌ |

---

## Product file index (audit evidence)

| Control area | Primary files |
|--------------|---------------|
| Auth | `apps/api/src/auth/auth.service.ts`, `password-policy.ts` |
| MFA | `apps/api/src/auth/mfa/*` |
| RBAC | `roles.guard.ts`, `UserRole` model |
| Audit | `audit.service.ts`, `AuditLog` model |
| Break-glass | `break-glass.service.ts`, `BreakGlassSession` |
| PHI logging | `redact-phi.ts` |
| Backup readiness | `backup-readiness.service.ts` |
| Ops | `docs/ENV_PRODUCTION_CHECKLIST.md`, `ER_RESTORE_DRILL_CHECKLIST.md` |

---

**Next review:** Upon completion of P0 items or major platform release.
