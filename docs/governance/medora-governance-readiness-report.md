# Medora Governance Readiness Report

**Program:** GOV.1–GOV.6  
**Version:** 1.0  
**Date:** 2026-06-10  
**Classification:** Internal — governance source documents  
**Prepared by:** Governance audit (codebase + documentation review)

---

## Executive summary

Medora has built a **clinically serious EMR platform** with meaningful security primitives (RBAC, audit logging, break-glass, MFA infrastructure, facility scoping). The **enterprise governance package** required for US hospital procurement — executed legal agreements, HIPAA program, vendor BAAs, and SOC 2 — is **in early stage**. This GOV program created **source markdown templates and compliance roadmaps**; all legal and policy documents require **counsel review** before execution or publication.

---

## Readiness scores

| Domain | Score (0–5) | Summary |
|--------|-------------|---------|
| **Corporate governance** | **1.5** | No operating agreement or IP assignments in repo; product ops strong |
| **Legal documentation** | **1.0** | Templates created; none executed |
| **HIPAA compliance** | **2.0** | Partial technical controls; administrative program incomplete |
| **Security program** | **2.5** | Good product security; policies now drafted; SOC 2 not started |
| **Vendor / BAA** | **1.0** | Matrix complete; zero executed BAAs |

**Composite governance readiness: 1.6 / 5**

Interpretation: **Not ready** to sign hospital BAA without P0 remediation. **Ready** for continued clinic MVP with risk acceptance and counsel engagement.

---

## Document inventory

### Phase 1 — Corporate governance (`docs/governance/`)

| Document | Status |
|----------|--------|
| `medora-corporate-governance-audit.md` | ✅ Created |
| `medora-founder-ownership-framework.md` | ✅ Created |
| `medora-ip-assignment-framework.md` | ✅ Created |
| `medora-governance-readiness-report.md` | ✅ Created (this file) |

### Phase 2 — Legal templates (`docs/legal/`)

| # | Document | File |
|---|----------|------|
| 1 | LLC Operating Agreement | `llc-operating-agreement-template.md` |
| 2 | Founder Ownership Agreement | `founder-ownership-agreement-template.md` |
| 3 | Founder IP Assignment | `founder-ip-assignment-agreement-template.md` |
| 4 | Independent Contractor Agreement | `independent-contractor-agreement-template.md` |
| 5 | Mutual NDA | `mutual-nda-template.md` |
| 6 | Employee Confidentiality (CIIA) | `employee-confidentiality-agreement-template.md` |
| 7 | Customer Master Services Agreement | `customer-master-services-agreement-template.md` |
| 8 | Business Associate Agreement | `business-associate-agreement-template.md` |
| 9 | Subcontractor BAA | `subcontractor-baa-template.md` |
| 10 | Terms of Service | `terms-of-service-template.md` |
| 11 | Privacy Policy | `privacy-policy-template.md` |
| 12 | Acceptable Use Policy | `acceptable-use-policy-template.md` |
| 13 | Data Processing Addendum | `data-processing-addendum-template.md` |
| 14 | Security Addendum | `security-addendum-template.md` |

**All legal templates: DRAFT — REQUIRES COUNSEL REVIEW**

### Phase 3 — HIPAA compliance (`docs/compliance/`)

| Document | Status |
|----------|--------|
| `hipaa-gap-analysis.md` | ✅ Created |
| `hipaa-security-rule-matrix.md` | ✅ Created |
| `hipaa-risk-management-plan.md` | ✅ Created |
| `hipaa-training-program.md` | ✅ Created |
| `vendor-baa-matrix.md` | ✅ Created |

### Phase 4 — Security program (`docs/security/`)

| Document | Status |
|----------|--------|
| `security-program-overview.md` | ✅ Created |
| `incident-response-plan.md` | ✅ Created |
| `disaster-recovery-plan.md` | ✅ Created |
| `business-continuity-plan.md` | ✅ Created |
| `vulnerability-management-policy.md` | ✅ Created |
| `access-control-policy.md` | ✅ Created |
| `secure-development-policy.md` | ✅ Created |
| `change-management-policy.md` | ✅ Created |

### Existing product/ops docs (complementary)

| Document | Relevance |
|----------|-----------|
| `docs/ENV_PRODUCTION_CHECKLIST.md` | Production security gates |
| `docs/ER_RESTORE_DRILL_CHECKLIST.md` | DR evidence |
| `docs/DEPLOYMENT_RUNBOOK.md` | Change management |
| `docs/operations/handbook-fr-administration-governance-operations.md` | French ops handbook |
| `docs/medications/mar-emar-audit-legal-chart-design.md` | Clinical audit design |

**Total new GOV documents: 30**

---

## Missing items (critical)

| Item | Domain | Priority |
|------|--------|----------|
| Executed LLC Operating Agreement | Corporate | P0 |
| Founder IP assignments (all founders) | Corporate | P0 |
| Cap table | Corporate | P0 |
| Designated Security & Privacy Officer | HIPAA | P0 |
| Executed Railway BAA | Vendor | P0 |
| Executed Vercel BAA (if PHI via BFF) | Vendor | P0 |
| Customer BAA template → executed with first CE | Legal | P0 |
| Formal HIPAA Risk Analysis (signed) | HIPAA | P0 |
| `AUDIT_FAILURE_MODE=fail_closed` in production | Technical | P0 |
| `MFA_REQUIRED_ROLES` enforced in production | Technical | P0 |
| MFA disable server-side enforcement fix | Technical | P0 |
| Cyber liability + E&O insurance | Corporate | P1 |
| Workforce HIPAA training attestations | HIPAA | P1 |
| Restore drill evidence (`MEDORA_LAST_RESTORE_DRILL_AT`) | DR | P1 |
| Audit log DB immutability | Technical | P1 |
| External billing vendor BAA or disable | Vendor | P1 |
| Penetration test report | Security | P2 |
| SOC 2 Type I | Security | P2 |
| Published Privacy Policy + ToS (counsel-approved) | Legal | P2 |
| Field-level PHI encryption assessment | Technical | P2 |
| SOC 2 Type II | Security | P3 |

---

## Product strengths (audit evidence)

These implemented controls support governance claims once policies and BAAs are in place:

| Control | Location |
|---------|----------|
| Facility-scoped RBAC | `RolesGuard`, `UserRole` |
| 100+ audit actions | `AuditLog`, `AuditAction` enum |
| Break-glass (20 min, audited) | `BreakGlassSession`, `break-glass.service.ts` |
| Password policy (12 char) | `password-policy.ts` |
| MFA (TOTP, encrypted secrets) | `auth/mfa/*` |
| Session revoke on password change | `auth.service.ts` |
| Chart export HMAC | `chart-export-signature.util.ts` |
| PHI log redaction | `redact-phi.ts` |
| Backup readiness dashboard | `backup-readiness.service.ts` |
| ROI workflow | `ChartRoiRequest` |
| Compliance audit gaps UI | `admin-compliance.service.ts` |

---

## Prioritized roadmap

### P0 — Before first US Covered Entity contract (0–30 days)

1. Engage healthcare counsel to review all `docs/legal/` templates
2. Formally establish entity + Operating Agreement + founder IP assignments
3. Appoint Security Officer and Privacy Officer
4. Execute Railway BAA (+ confirm backup/encryption)
5. Execute Vercel BAA (Enterprise tier assessment)
6. Complete and sign HIPAA Risk Analysis
7. Production: `AUDIT_FAILURE_MODE=fail_closed`, `MFA_REQUIRED_ROLES` for clinical roles
8. Fix MFA disable API enforcement
9. Disable or BAA-wrap external billing webhook for HIPAA customers

### P1 — Enterprise readiness (30–90 days)

10. Workforce HIPAA training + attestations
11. Incident response tabletop
12. Semi-annual restore drill with documented evidence
13. Clearinghouse BAA (if production claims)
14. Customer MSA + BAA playbook for sales
15. Audit log immutability (DB trigger)
16. Publish counsel-approved Privacy Policy and ToS
17. Cyber insurance bound

### P2 — SOC 2 path (3–9 months)

18. Penetration test remediation
19. GRC tool or evidence binder
20. SOC 2 Type I audit
21. Password reset email via HIPAA-eligible provider
22. Open-source license audit

### P3 — Scale (9–18 months)

23. SOC 2 Type II
24. HITRUST (if health system pipeline requires)
25. Field-level encryption for high-sensitivity fields
26. Fine-grained authorization beyond coarse RBAC

---

## Recommended implementation sequence

```text
Week 1–2:  Counsel engagement + entity/IP P0 docs signed
Week 2–4:  Security/Privacy Officer + Risk Analysis + vendor BAAs
Week 4–6:  Production hardening (MFA, audit fail_closed, MFA API fix)
Week 6–8:  Training program launch + IR tabletop + restore drill
Week 8–12: First customer BAA + MSA execution (pilot hospital)
Month 4–6: Pen test + SOC 2 Type I preparation
Month 6–12: SOC 2 Type I → Type II observation
```

---

## Explicit confirmations (audit constraints)

| Constraint | Status |
|------------|--------|
| Application code modified | **No** |
| Database schema modified | **No** |
| Migrations / seeds | **No** |
| Runtime behavior changed | **No** |
| Git commit / push | **No** (per instructions) |
| PDF export | **No** — markdown source only |

---

## Next program phases (suggested)

| Program | Focus |
|---------|-------|
| **GOV.7** | Counsel review + execute P0 legal docs |
| **GOV.8** | Production security hardening (MFA, audit, MFA API) |
| **GOV.9** | Vendor BAA execution + evidence vault |
| **GOV.10** | SOC 2 readiness / GRC tooling |
| **GOV.11** | Customer-facing trust center (web page from approved policies) |

---

## Disclaimer

This report and all generated templates are **internal governance drafts** for planning purposes. They do **not** constitute legal advice, HIPAA certification, or SOC 2 attestation. Engage qualified healthcare counsel and compliance auditors before customer commitments.

---

**Document count:** 30 new markdown files across `docs/governance/`, `docs/legal/`, `docs/compliance/`, `docs/security/`
