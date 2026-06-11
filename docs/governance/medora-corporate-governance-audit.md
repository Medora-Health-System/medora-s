# Medora Corporate Governance Audit

**Program:** GOV.1 — Corporate Governance  
**Version:** 1.0 (draft)  
**Date:** 2026-06-10  
**Status:** Audit + roadmap — requires legal counsel review before execution  
**Scope:** Medora healthcare software platform (EMR/EHR evolution)

---

## Executive summary

Medora has **strong product-level operational governance** (RBAC, audit logging, break-glass, facility scoping, French enterprise handbook) but **minimal formal corporate governance documentation**. The company is not yet structurally prepared to sign enterprise MSAs, BAAs, or SOC 2 attestations without completing entity formation, IP chain-of-title, and board/member governance artifacts.

| Domain | Readiness (0–5) | Notes |
|--------|-----------------|-------|
| Entity & operating structure | **1** | No operating agreement in repo; assume LLC formation in progress or undocumented |
| Founder / equity governance | **1** | No cap table or vesting docs in repo |
| IP chain-of-title | **2** | Code exists; assignment agreements not in repo |
| Contractor / employment | **1** | No standard IC or employment templates in repo |
| Product governance (RBAC, audit) | **4** | Implemented in `apps/api`; documented in ops handbook |
| Board / decision rights | **0** | Not documented |

**Overall corporate readiness score: 1.5 / 5**

---

## 1. Corporate structure readiness

### Current state (inferred)

- Product brand: **Medora** / **Medora-S**
- Target market: Urgent care, freestanding ER, hospitals, multi-site organizations (US + Haiti pilot)
- Engineering artifacts reference platform operator email (`atranchant@medora.local`) and `MEDORA_SUPER_ADMIN` role — operational, not corporate
- No Certificate of Formation, EIN letter, or Operating Agreement found in repository

### Requirements for enterprise customers

| Requirement | Status | Gap |
|-------------|--------|-----|
| Legal entity (LLC or C-Corp) | Unknown | Confirm entity name, state of formation, EIN |
| Registered agent | Unknown | Required for US contracts |
| Good standing | Unknown | Annual report compliance |
| Authorized signatory matrix | Missing | Who may sign BAA/MSA |
| D&O / E&O insurance | Unknown | Often required by hospital procurement |
| Cyber liability insurance | Unknown | Required for HIPAA-covered customers |

### Recommendations (P0)

1. Confirm legal entity name matches all contracts (`Medora Health, LLC` or equivalent — **counsel to finalize**).
2. Adopt Operating Agreement (see `docs/legal/llc-operating-agreement-template.md`).
3. Maintain cap table and signatory authority outside repo (Carta, Pulley, or counsel-managed spreadsheet).
4. Obtain E&O + cyber liability quotes before first hospital BAA.

---

## 2. Founder ownership structure

### Assessment

No founder ownership agreement, vesting schedule, or equity ledger exists in the repository. For a healthcare software company seeking hospital customers, investors, or acquirers, **unclear equity creates due-diligence blockers**.

### Recommended structure (framework)

See `medora-founder-ownership-framework.md`. Minimum elements:

- Founding members and ownership percentages
- Vesting (typically 4-year, 1-year cliff for founders receiving sweat equity)
- IP assignment tied to equity grants
- Decision thresholds (majority vs supermajority for fundraising, sale, BAA policy)
- Deadlock resolution
- Good leaver / bad leaver provisions

### Risks if unresolved

- Inability to grant stock options to key engineers
- Disputes over product IP ownership
- Delayed enterprise sales (customers ask for capitalization table representation in MSAs)

---

## 3. Equity governance requirements

| Artifact | Purpose | Priority |
|----------|---------|----------|
| Cap table | Ownership transparency | P0 |
| 409A valuation (if options) | IRS compliance | P1 (before first option grant) |
| Stock/LLC interest purchase agreement | Founder buys-in | P0 |
| Board consent resolutions | Major actions | P1 |
| 83(b) elections (if applicable) | Tax timing | P0 if restricted units issued |

Medora-S codebase does not implement cap table management — use external tooling.

---

## 4. Contractor engagement requirements

### Current state

- Contributors may include founders, contractors, and future employees
- No `Independent Contractor Agreement` template was in repo prior to GOV program
- Generated template: `docs/legal/independent-contractor-agreement-template.md`

### Minimum contractor controls

1. **Written agreement** before access to production, PHI, or source repo
2. **IP assignment** (work product belongs to company)
3. **Confidentiality** and **no PHI offboarding** obligations
4. **Background check** policy for production access (P1 for US hospital sales)
5. **Access revocation** on termination (align with `UserRole.isActive`, session revoke patterns in `auth.service.ts`)

---

## 5. Intellectual property assignment requirements

### Current state (technical)

- Substantial proprietary codebase: API (`apps/api`), web (`apps/web`), shared packages
- Clinical governance manifests, medication catalogs, enterprise formulary data
- French enterprise handbook and operational documentation
- **No executed IP assignment agreements** found in repository

### Required assignments

| IP class | Assignor | Instrument |
|----------|----------|------------|
| Source code & documentation | All founders | Founder IP Assignment |
| Source code & documentation | Contractors | IC Agreement + IP exhibit |
| Source code & documentation | Employees | Confidentiality + IP exhibit |
| Trademarks ("Medora") | Founders / entity | TM assignment if held personally |
| Domain names | Founders | Transfer to entity |

See `medora-ip-assignment-framework.md` and `docs/legal/founder-ip-assignment-agreement-template.md`.

### Open-source compliance (P1)

- Audit `package.json` / `pnpm-lock.yaml` for copyleft dependencies affecting SaaS distribution
- Maintain `NOTICE` file and third-party license inventory for enterprise customers

---

## 6. Alignment with product governance (strengths)

Medora-S implements operational controls that **support** corporate governance claims:

| Control | Implementation |
|---------|----------------|
| Facility-scoped RBAC | `UserRole`, `RolesGuard`, `x-facility-id` |
| Audit trail | `AuditLog`, 100+ `AuditAction` values |
| Break-glass emergency access | `BreakGlassSession`, 20-minute TTL, audited |
| Platform operator separation | `MEDORA_SUPER_ADMIN` vs facility `ADMIN` |
| MFA (optional) | TOTP, encrypted secrets, recovery codes |
| Chart export integrity | HMAC signing |
| ROI workflow | `ChartRoiRequest` for release of information |

These are **necessary but not sufficient** for HIPAA or SOC 2 — they must be mapped to policies and vendor contracts.

---

## 7. Prioritized corporate actions

| Priority | Action | Owner |
|----------|--------|-------|
| **P0** | Execute Operating Agreement + founder IP assignments | Founders + counsel |
| **P0** | Cap table + ownership percentages documented | Founders |
| **P0** | Signatory authority matrix for BAA/MSA | Founders |
| **P1** | IC agreements for all contractors with repo access | Operations |
| **P1** | E&O + cyber insurance | Finance |
| **P2** | Trademark registration (US) | Counsel |
| **P2** | Open-source license audit | Engineering |

---

## Document cross-references

- `medora-founder-ownership-framework.md`
- `medora-ip-assignment-framework.md`
- `medora-governance-readiness-report.md`
- `docs/operations/handbook-fr-administration-governance-operations.md`

---

**Disclaimer:** This audit is an internal readiness assessment, not legal advice. All corporate and contract documents require review by qualified legal counsel licensed in the applicable jurisdiction(s).
