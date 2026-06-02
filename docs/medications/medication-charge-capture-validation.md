# Medication Charge Capture Validation (M1.4C)

**Program:** Enterprise Medication Billing & Revenue Integrity  
**Phase:** M1.4C  
**Date:** 2026-06-02  

---

## Test matrix

| Scenario | Expected | Test location |
|----------|----------|---------------|
| Administered billable med → capture enriched | HCPCS + source metadata | `medication-administration-charge-capture.spec.ts` |
| Refused / not available / md_changed → no resolver | `null` resolution | `medication-administration-billing-resolve.util.spec.ts` |
| `billingCodeDefault` preferred | Source `CATALOG_BILLING_CODE_DEFAULT` | resolve util spec |
| `BillingCatalog` fallback | Source `BILLING_CATALOG_MEDICATION` | resolve util spec |
| NDC snapshot on capture | `ndc11` from MAR | resolve util spec |
| Unmapped → manual review metadata | `MANUAL_REVIEW` + reason | resolve util spec |
| MAR billable action guard | Only `administered` | `medicationAdministrationMarBilling.test.ts` |
| Duplicate capture prevention | `upsertBillingCaptureItem` by source key | shared `billingCaptureV1` (existing) |
| Duplicate MED_ADMIN event | `appendBillingEventIfNotExists` | existing auto-billing |
| M1.4B mapping regression | Haiti coverage ≥95% | `medication-billing-mapping-validation.spec.ts` |

---

## Billing source priority (validation)

```
CatalogMedication.billingCodeDefault
  ↓ if empty
BillingCatalog (MEDICATION, externalCode = catalog code / derived keys)
  ↓ if empty
MedicationPackage.billingProfiles[].hcpcsCodeSuggested
  ↓ if empty
MedicationProduct default package profile
  ↓ if empty
MANUAL_REVIEW (capture metadata; UNMAPPED MED_ADMIN fallback)
```

---

## Non-billable MAR actions

| Action | Bills? |
|--------|--------|
| `administered` | Yes (when catalog line exists) |
| `refused` | No |
| `not_available` | No |
| `md_changed` | No |
| Infusion START (explicit skip flags) | No |

---

## Duplicate prevention

| Layer | Mechanism |
|-------|-----------|
| `billingCaptureJson` | Replace item with same `MEDICATION_ADMINISTRATION:{administrationId}` |
| `BillingEvent` (capture sync) | Upsert by `(facilityId, sourceModule, sourceRecordId)` |
| `MED_ADMIN` auto line | `appendBillingEventIfNotExists` before append |

---

## Waste handling

- Waste documentation does **not** create administration capture.
- No waste billing event in M1.4C.
- **PASS WITH OBSERVATIONS**

---

## Governance-sensitive billing

Billing resolution runs **after** MAR row persisted with `marAction=administered`. Governance verifications do not alter HCPCS selection.

**PASS**

---

## Deferred infusion billing (M1.4D)

- Infusion initial / additional hour CPT automation
- Full hydration vs therapeutic infusion rule engine
- `infusionDurationBillingManualReview` flag remains on STOP rows

---

## Required commands

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api test -- billing
pnpm --filter @medora/api test -- medication
pnpm --filter @medora/api test -- orders
pnpm --filter @medora/api run build
pnpm verify:web
pnpm --filter @medora/web test
```

---

## Verdict summary

| Part | Result |
|------|--------|
| MAR → capture hardening | **PASS** |
| Source resolution | **PASS** |
| Admin CPT companion | **PARTIAL** (push/IM ready; infusion deferred) |
| Waste | **PASS WITH OBSERVATIONS** |
| Governance | **PASS** |
| **Overall** | **SAFE (conditional)** |

Conditional: illustrative HCPCS; infusion hour coding deferred; production seed not run.
