# Enterprise Formulary Wave 4 — Seed Readiness Report (M1.7C.2A)

**Date:** 2026-06-03  
**Auditor phase:** M1.7C.2A (final pre-seed integrity audit)  
**Target environment:** Railway staging (first Wave 4 ED/Hospital formulary load)

---

## Executive Summary

Enterprise Wave 4 ED/Hospital formulary (**227 medications**) has passed manifest validation, billing/localization/search/governance integrity checks, and seed helper dry-run review. The tranche is **ready for the first inactive staging seed** with explicit feature flag gating.

**Overall Wave 4 Readiness Score: 98 / 100**

Deductions: post-seed product-marker count nuance for ENRICH rows (−1); 12 questionable high-alert flags deferred to activation pharmacy review (−1).

---

## Readiness Scores (0–100)

| Dimension | Score | Status |
|-----------|------:|--------|
| **Seed Readiness** | **98** | Ready — idempotent helper, 0 manifest errors |
| **Governance Readiness** | **100** | 0 policy conflicts; double-RN matrix locked |
| **Billing Readiness** | **100** | 227/227 billing profiles + HCPCS/NDC |
| **Localization Readiness** | **100** | 100% EN/FR labels, aliases, search terms |
| **Search Readiness** | **95** | Hardening pass; **cutover NOT enabled** (`orderSearchEnabled: false`) |
| **Activation Readiness** | **0** | Intentionally blocked — all `REVIEW_REQUIRED` |
| **Overall Wave 4 Readiness** | **98** | **SAFE for staging seed only** |

---

## Expected Post-Seed State

| Property | Expected value |
|----------|----------------|
| `MedicationProduct.isActive` | **false** (all Wave 4) |
| `MedicationProduct.governanceStatus` | **REVIEW_REQUIRED** |
| `MedicationBillingProfile.requiresManualReview` | **true** |
| `orderSearchEnabled` | **false** (readiness validation; not activation) |
| `billingEnabled` | **false** (no billing activation path in seed) |
| Provider ordering | **Disabled** |
| Pilot activation | **Disabled** |

---

## Pre-Seed Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Manifest entry count = 227 | **PASS** |
| 2 | CREATE = 193, ENRICH = 34 | **PASS** |
| 3 | Duplicate catalog codes | **0** |
| 4 | Ondansetron = 3 SKUs (inj, ODT, oral) | **PASS** |
| 5 | Insulin SQ + IV infusion separated | **PASS** |
| 6 | Metoprolol oral = ENRICH (no duplicate CREATE) | **PASS** |
| 7 | Blood products = 5 with double RN | **PASS** |
| 8 | Billing coverage 100% | **PASS** |
| 9 | Localization coverage 100% | **PASS** |
| 10 | Search collision hardening | **PASS** |
| 11 | Governance conflicts | **0** |
| 12 | Seed helper idempotency | **PASS** |
| 13 | Automated test suites | **PASS** |

---

## Staging Seed Command (DO NOT RUN until authorized)

```bash
MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1 \
  pnpm --filter @medora/api exec prisma db seed
```

Wiring: `apps/api/prisma/seed-catalogs.ts` (feature-flag gated).

---

## Post-Seed Validation (required after seed)

Run read-only SQL from `enterprise-formulary-wave4-final-preseed-review.md`:

1. Wave 4 product marker count (expect ≥ 193; target 227 linked entries)
2. Active products = 0
3. REVIEW_REQUIRED = all Wave 4 products
4. Billing profile coverage for Wave 4 packages
5. Blood product governance rows

---

## Remaining Risks (non-blocking for staging seed)

1. **12 questionable high-alert flags** — pharmacy review at activation (see governance reconciliation doc)
2. **Pediatric ondansetron CREATE SKUs** — new inactive catalog rows; no Haiti legacy row
3. **ENRICH dependency** — 34 entries require pre-existing catalog/product from Waves 1–3; seed skips with conflict if missing
4. **Search cutover** — separate activation phase; not in scope for M1.7C.2A

---

## Migration / Seed / SQL

| Action | Required? |
|--------|-----------|
| **Migration** | **NO** |
| **Seed** | **YES** — first Railway staging load when approved |
| **Post-seed SQL** | **YES** — read-only validation queries |

---

## Verdict

| Scope | Verdict |
|-------|---------|
| Railway staging seed (inactive) | **SAFE** |
| Provider ordering / search / activation | **NOT SAFE** (by design) |
