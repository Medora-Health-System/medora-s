# Vendor BAA Matrix — Medora Platform

**Program:** GOV.5  
**Version:** 1.0  
**Date:** 2026-06-10  
**Owner:** [Privacy Officer / Legal — TBD]

---

## Summary

| Status | Count |
|--------|-------|
| Vendors evaluated | 12 |
| PHI exposure likely | 7 |
| BAA required | 6 |
| BAA executed | **0** (as of audit) |
| BAA available from vendor | 4 (typical on paid/enterprise tier) |

---

## Vendor evaluation matrix

| Vendor | Class | PHI exposure | Data handled | BAA required? | BAA status | SOC 2 / reports | Recommended action | Priority |
|--------|-------|--------------|--------------|---------------|------------|-----------------|-------------------|----------|
| **Railway** | Database + API hosting | **High** | Full Postgres clinical DB | **Yes** | ❌ Not executed | Request SOC 2 | Sign Railway BAA (Pro/Team); confirm encryption at rest & backup retention | **P0** |
| **Vercel** | Web BFF hosting | **Medium–High** | Session cookies, request payloads via BFF proxy | **Yes** (if PHI transits) | ❌ Not executed | SOC 2 available (Enterprise) | Execute Vercel BAA on Enterprise; minimize PHI in edge logs; review data processing terms | **P0** |
| **PostgreSQL (via Railway)** | Database engine | **High** | All structured PHI | Covered by Railway BAA | ❌ | Via Railway | Same as Railway | **P0** |
| **External billing vendor** | Integration webhook | **High** | Patient demographics, encounter billing in JSON/CSV export | **Yes** | ❌ Unknown | Unknown | Execute BAA before enabling `MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL`; or disable in HIPAA customers | **P0** |
| **Clearinghouse (X12/SFTP)** | Claims transmission | **High** | Claim PHI | **Yes** | ❌ Per vendor | Vendor-specific | BAA with each clearinghouse partner; sandbox-only until signed | **P1** |
| **GitHub** | Source code | **Low** | No prod PHI (must not be stored) | **No** (if no PHI) | N/A | SOC 2 | Prohibit PHI in repo; DPA optional | P2 |
| **Alert webhook** | Monitoring | **Low** (by design) | PHI-safe alert payloads | **No** if no PHI | N/A | — | Verify `medoraAlert.ts` never includes PHI; document in security addendum | P1 |
| **Email provider** (future) | Transactional email | **Medium** | Password reset links, names | **Yes** if PHI in email | ❌ Not configured | — | Select HIPAA-eligible provider (e.g., Paubox, SES with BAA); implement reset email | **P1** |
| **SMS provider** (future) | Notifications | **Medium–High** | PHI if clinical content | **Yes** | ❌ Not present | — | Avoid SMS PHI until BAA; use non-PHI messages only | P2 |
| **Cloud storage** (future) | Attachments | **High** | Lab/radiology images | **Yes** | ❌ Not present | — | Today: base64 in DB — plan S3/GCS with BAA for scale | P2 |
| **Monitoring (Datadog/Sentry)** | APM/logs | **Medium** | Could leak PHI if misconfigured | **Yes** if PHI logged | ❌ Not confirmed | Vendor SOC 2 | Scrub PHI; use BAA tier or self-host | P2 |
| **Cursor / AI dev tools** | Development | **Low** (policy) | Must not paste prod PHI | **No** (policy prohibition) | N/A | — | Policy: no prod PHI in AI tools | P1 |

---

## PHI exposure detail by integration

### Railway (P0)

- **Exposure:** Entire `Patient`, `Encounter`, `MedicationAdministration`, `AuditLog`, etc.
- **Mitigation:** TLS, access control, encrypted volumes (confirm), backups
- **Action:** Execute BAA; document subprocessors; obtain SOC report

### Vercel (P0)

- **Exposure:** BFF proxies API; cookies; possible request logging
- **Mitigation:** HttpOnly cookies, Secure, minimal logging
- **Action:** Enterprise BAA; disable verbose logging; DPA

### External billing automation (P0)

- **Code:** `external-billing-automation.service.ts`
- **Exposure:** Daily export with patient demographics
- **Action:** BAA or disable for HIPAA customers until compliant

### Clearinghouse (P1)

- **Exposure:** X12 claim PHI
- **Action:** Production credentials only with signed BAA

---

## Subcontractor flow-down

```
Covered Entity (Hospital)
    ↓ BAA
Medora Health, LLC (Business Associate)
    ↓ Subcontractor BAA
Railway, Vercel, [Billing vendor], [Clearinghouse]
```

Use `docs/legal/subcontractor-baa-template.md` when vendor does not provide standard paper.

---

## Vendor onboarding checklist

- [ ] Determine PHI exposure (none / limited / full)
- [ ] Require BAA if PHI created/received/maintained
- [ ] Obtain SOC 2 Type II or equivalent
- [ ] Review subprocessors list
- [ ] Document in this matrix with signed date
- [ ] Add to DPA Annex III
- [ ] Annual re-certification

---

## BAA status tracking (update when executed)

| Vendor | Signed date | Expiry | Document location |
|--------|-------------|--------|-------------------|
| Railway | [TBD] | | Counsel vault |
| Vercel | [TBD] | | Counsel vault |
| [Billing vendor] | [TBD] | | |

---

**Overall vendor readiness score: 1.0 / 5** (identified vendors; no executed BAAs)

**Related:** `hipaa-gap-analysis.md`, `data-processing-addendum-template.md`
