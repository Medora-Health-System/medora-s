# Medication Governance — Production Readiness (M1.3F.9)

**Phase:** M1.3F.9  
**Date:** 2026-06-02  
**Type:** Read-only readiness checklist for Haiti clinic MVP deployment  

---

## Readiness verdict

| Dimension | Status |
|-----------|--------|
| **Application code (M1.3B–F.8)** | **READY** |
| **Database schema (migrations in repo)** | **READY** |
| **Automated tests** | **READY** (one known unrelated e2e flake) |
| **Production database migrated** | **Operator verification required** |
| **Production governance seed** | **Operator execution required** |
| **Clinical / formulary sign-off** | **PARTIAL** — see catalog caveats |
| **Enterprise eMAR / barcode / queue** | **Out of scope** — correctly deferred |

### Rollout labels

| Label | Value |
|-------|-------|
| **Medication Governance Rollout Ready** | **Yes** (deploy code + run ops checklist) |
| **Medication Governance Rollout Blocked** | **No** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |

**SAFE (conditional)** means: safe to deploy the governance **application** to a pilot clinic after migrations and catalog seed; not safe to claim enterprise-wide medication safety closure without catalog and billing follow-up.

---

## Pre-deploy checklist (operators)

### 1. Database migrations

Run in maintenance window (order matters — lexicographic):

```
20260903120000_m1_3f1_mar_emar_schema_foundation
20260904120000_m1_3f4_controlled_substance_mar_audit_actions
20260905120000_m1_3f5_high_alert_mar_audit_actions
20260906120000_m1_3f6_lasa_mar_audit_actions
20260907120000_m1_3f7_pharmacy_mar_audit_actions
```

**Verify:**

```sql
-- Example: confirm audit enum values exist (PostgreSQL)
SELECT unnest(enum_range(NULL::"AuditAction"))::text
WHERE unnest(enum_range(NULL::"AuditAction"))::text LIKE '%MEDICATION%'
   OR unnest(enum_range(NULL::"AuditAction"))::text LIKE '%LASA%'
   OR unnest(enum_range(NULL::"AuditAction"))::text LIKE '%PHARMACY_VERIFICATION%';
```

**Status:** ☐ Not verified ☐ Verified on staging ☐ Verified on production

### 2. Catalog governance seed

Command (dev/staging/prod policy per facility):

```bash
pnpm --filter @medora/api prisma:seed-catalogs
```

Requires `@medora/shared` built (`pnpm --filter @medora/shared build`).

**Applies:**

- TermClassifier safety vocabulary (M1.3B)
- Controlled substance flags (M1.3C)
- High-alert profiles + safety requirement codes (M1.3D)
- LASA groups (M1.3E)

**Does not:** Create MAR rows or modify production patient data.

**Status:** ☐ Not run ☐ Run on staging ☐ Run on production

### 3. Application deploy

Deploy API + web build containing:

- MAR governance UI (F.3–F.7)
- Pharmacy verification API routes
- Chart export / snapshot / ROI manifest fields (F.8)

**Status:** ☐ Pending ☐ Deployed

### 4. Smoke tests (post-deploy)

| Step | Expected |
|------|----------|
| Order high-alert insulin (if on formulary) | Pharmacy verify or override path visible |
| MAR administer controlled opioid | Witness + waste prompts when applicable |
| Close encounter → chart export JSON | `medicationGovernanceSummaries` present when governance occurred |
| ROI packet from snapshot | Same manifest fields as export |

**Status:** ☐ Not run ☐ Pass ☐ Fail

---

## Dependency readiness matrix

| Dependency | Required for | Ready? |
|------------|--------------|--------|
| `MedicationSafetyProfile` + concept linkage | HA / LASA / pharmacy rules | **Yes** (schema + seed) |
| `CatalogMedication` controlled fields | Controlled MAR | **Yes** |
| `MedicationProduct` legacy link | Resolver merges profile + catalog | **Yes** |
| `PharmacyVerification` table | Pharmacy MAR gate | **Yes** |
| `MedicationAdministrationVerification` | Witness / double-check / LASA | **Yes** |
| Audit `AuditAction` enum extensions | Legal defensibility | **Yes** (after migrate) |
| Chart export service | Legal chart / ROI | **Yes** |
| Unified timeline service | Encounter timeline UI | **Yes** |
| `EncounterChartExportService` snapshots | ROI | **Yes** |

---

## Unresolved items (non-blocking for code deploy)

| Item | Impact | Owner / phase |
|------|--------|----------------|
| Tramadol controlled MANUAL_REVIEW in seed | No controlled enforcement on tramadol until resolved | Clinical + M1.3C follow-up |
| M1.1B absent molecules (oxycodone, etc.) | No governance on drugs not in catalog | Formulary / M1.2 |
| Live chart summary without governance block | Preview UX only; export/legal complete | Future UX |
| eMAR scheduling / barcode | Not in program scope | Future phase |
| Duplicate governance query on full export | Performance tuning | Engineering backlog |

---

## Readiness vs earlier audits

| Document | Prior verdict | F.9 alignment |
|----------|---------------|---------------|
| [medication-production-readiness.md](./medication-production-readiness.md) (M1.1B) | Enterprise NOT SAFE | Still true for **enterprise**; **clinic MVP governance code** is now READY |
| [controlled-substance-governance-readiness.md](./controlled-substance-governance-readiness.md) | Conditional SAFE | Unchanged for catalog gaps; MAR enforcement now exists |
| [medication-audit-legal-chart-integration.md](./medication-audit-legal-chart-integration.md) | F.8 complete | Confirmed in F.9 Part 4 |

---

## Sign-off template

| Role | Name | Date | Approve deploy? |
|------|------|------|-----------------|
| Engineering | | | ☐ |
| Clinical lead | | | ☐ |
| Facility admin | | | ☐ |

---

## Related

- [medication-governance-production-rollout-audit.md](./medication-governance-production-rollout-audit.md)
- [medication-governance-risk-assessment.md](./medication-governance-risk-assessment.md)
