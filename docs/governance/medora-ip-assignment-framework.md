# Medora IP Assignment Framework

**Program:** GOV.1  
**Version:** 1.0 (draft)

---

## Purpose

Ensure Medora Health (entity) owns all intellectual property required to operate, license, and sell the Medora EMR/EHR platform without third-party chain-of-title defects.

---

## 1. IP inventory (Medora-S platform)

| Category | Examples | Location |
|----------|----------|----------|
| **Application source** | API, web, shared packages | `apps/`, `packages/` |
| **Database schema** | Prisma models, migrations | `apps/api/prisma/` |
| **Clinical content** | Medication catalogs, imaging taxonomy, governance manifests | `packages/shared/`, `apps/api/prisma/data/` |
| **Documentation** | Enterprise handbook, runbooks, governance audits | `docs/` |
| **Branding** | Medora name, UI design system | `apps/web/`, `docs/ui/` |
| **Trade secrets** | Formulary mappings, billing rules, clinical workflows | Throughout codebase |

---

## 2. Assignment requirements by contributor type

| Contributor | Required agreement | Timing |
|-------------|-------------------|--------|
| **Founder (pre-formation)** | Founder IP Assignment + Operating Agreement | Before first customer contract |
| **Founder (post-formation)** | IP exhibit to ownership agreement | At grant |
| **Employee** | Confidentiality + IP assignment (CIIA) | Day 1 before repo access |
| **Independent contractor** | IC Agreement + IP exhibit | Before first commit / access |
| **Advisor** | Advisor agreement with IP clause | Before strategic access |
| **Acquired code** | Asset purchase + assignment | At closing |

---

## 3. Work product definition (minimum scope)

Assignor agrees company owns all:

- Software, documentation, diagrams, and data models
- Bug fixes, features, and derivative works
- Ideas conceived using company time, equipment, or confidential information
- Contributions to `medora-s` monorepo and related repositories

**Excluded (must be listed in writing):**

- Pre-existing IP listed on **Exhibit A — Prior Inventions**
- Open-source contributions unrelated to Medora (with approval)

---

## 4. Moral rights / attribution

Assignor waives moral rights to the extent permitted by law. Company may modify, combine, and sublicense without further consent.

---

## 5. Third-party and open-source IP

| Control | Action |
|---------|--------|
| License compliance | Maintain SBOM / dependency audit |
| Copyleft risk | Legal review of GPL/AGPL dependencies in SaaS context |
| Vendor SDKs | Review terms (Stripe, clearinghouse, etc.) |
| Fonts / assets | Confirm commercial license |

**P1:** Engineering runs `pnpm licenses` export; counsel reviews top copyleft packages.

---

## 6. Haiti / international considerations

- If Haiti clinic data or local partners contribute content, **written assignment or license to entity** required
- French clinical copy in product UI is company-owned if created by employees/contractors under assignment
- Government or MSPP data formats — confirm no restriction on commercial EMR use

---

## 7. Enforcement & audit trail

| Event | Record |
|-------|--------|
| New contractor | Signed IC + IP before GitHub access |
| Employee hire | Signed CIIA in HR file |
| Founder join | Signed assignment in corporate minute book |
| Annual review | Cap table + assignment completeness checklist |

**Do not store executed signatures in git** — use counsel vault / DocuSign / HRIS.

---

## 8. Due diligence readiness (enterprise / M&A)

Buyers and hospital procurement will request:

1. List of all IP assignment agreements (founders, employees, contractors)
2. Confirmation no founder retains parallel rights to codebase
3. Open-source attribution file
4. Trademark status for "Medora"
5. No liens on IP

Target: **100% assignor coverage** for anyone with production or PHI access.

---

## 9. Templates

- `docs/legal/founder-ip-assignment-agreement-template.md`
- `docs/legal/independent-contractor-agreement-template.md`
- `docs/legal/employee-confidentiality-agreement-template.md`

---

**Disclaimer:** Framework only — not legal advice. Counsel must adapt to jurisdiction and entity type.
