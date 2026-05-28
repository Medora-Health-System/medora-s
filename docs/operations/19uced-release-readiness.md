# 19UCED — Release Readiness Checklist

Phase **19UCED.10** finalization audit for the enterprise billing classification, UC↔ED conversion, export readiness, review workspaces, claim assembly preview, and governance analytics initiative.

**Scope:** 19UCED.1 through 19UCED.9 (preview/governance only — no claim submission, no reimbursement, no auto-coding).

**Core principle:** ONE encounter · ONE chart · ONE clinical workflow · ZERO duplicate EMRs.

---

## 1. Local verification

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/shared test

pnpm verify:web
pnpm --filter @medora/web test
pnpm --filter @medora/web build

pnpm verify:api
pnpm --filter @medora/api test -- billing-classification
pnpm --filter @medora/api test -- billing-export-readiness
pnpm --filter @medora/api test -- billing-ledger-readiness
pnpm --filter @medora/api test -- facility-fee-readiness
pnpm --filter @medora/api test -- charge-review
pnpm --filter @medora/api test -- coding-review
pnpm --filter @medora/api test -- claim-assembly-preview
pnpm --filter @medora/api test -- billing-governance
pnpm --filter @medora/api test -- chart-export
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api exec prisma generate
```

**Expected:** All targeted suites pass; `verify:web` and `verify:api` clean.

**Note:** Full `pnpm --filter @medora/api test` may include unrelated e2e suites (`rbac.e2e.spec.ts`) that depend on local DB cleanup order. Use targeted 19UCED filters for release gate.

---

## 2. Production migration verification

### Required migrations (19UCED)

| Migration | Phase | Purpose |
|-----------|-------|---------|
| `20260819120000_encounter_billing_classification_19uced1` | 19UCED.1 | Encounter billing classification fields + transition JSON |
| `20260828120000_facility_billing_workflow_config_19uced2` | 19UCED.2 | Facility billing workflow mode + UC↔ED controls |

**Phases 19UCED.3–9:** No additional migrations (shared helpers, read-only API, read-only UI).

### Commands

```bash
# Production (after backup)
pnpm --filter @medora/api exec prisma migrate deploy

# Verify
pnpm --filter @medora/api exec prisma migrate status
```

**Rollback:** Do not rename applied migrations. Rollback = restore DB snapshot + redeploy prior API/web artifacts. Workflow columns are additive; down-migration not shipped.

---

## 3. Facility onboarding verification

For each pilot facility:

- [ ] `billingClassificationMode` set (CLINIC_ONLY, URGENT_CARE_ONLY, EMERGENCY_ONLY, HYBRID_UC_ED, or HOSPITAL_ENTERPRISE)
- [ ] `allowedEncounterBillingClassifications` matches mode
- [ ] Hybrid/hospital: `allowUrgentCareToEmergencyUpgrade` and `showEncounterBillingControls` reviewed
- [ ] `requireUcToEdPatientAcknowledgement` aligned with local policy
- [ ] Facility billing identity complete (legal name, address, city, country minimum)
- [ ] Admin → Identité de facturation reviewed
- [ ] Staff trained on UC vs ED distinction (handbook §4)

---

## 4. Hybrid conversion verification

- [ ] UC encounter → convert to ED with acknowledgment → same `encounterId`
- [ ] Diagnoses, orders, results unchanged on same chart
- [ ] Transition appended to `billingClassificationTransitionJson`
- [ ] Audit events: `UC_TO_ED_CONVERSION_COMPLETED`, `ENCOUNTER_BILLING_CLASSIFICATION_CHANGED`
- [ ] ED trackboard shows encounter after conversion (when applicable)
- [ ] ED → UC downgrade (hybrid only, policy-dependent) preserves chart
- [ ] UC-only facility blocks UC→ED when upgrade disabled

---

## 5. Billing governance dashboard verification

Route: `/app/admin/billing-governance`

Roles: ADMIN, BILLING, MEDORA_SUPER_ADMIN

- [ ] Disclaimer visible: analytics only, no claim submission
- [ ] Overview tiles load (counts only)
- [ ] UC↔ED conversion section shows aggregate counts
- [ ] Readiness summaries (export, ledger, facility-fee, charge, coding, claim assembly)
- [ ] Facility configuration warnings surface missing identity/mode
- [ ] No patient table, no export/submit buttons
- [ ] API: `GET /admin/billing-governance/summary` returns `previewOnly: true`

---

## 6. Observation review verification

- [ ] Observation/inpatient encounters show facility-fee readiness on billing encounter page
- [ ] Extended observation flag appears when LOS threshold met (preview only)
- [ ] Observation review does not block clinical discharge workflow
- [ ] Governance dashboard observation counts align with sample (≤500 recent encounters)

---

## 7. Claim assembly preview verification

Routes:

- Queue: `/app/billing/claim-assembly-preview`
- Encounter: `/app/billing/encounters/[id]` → Claim Assembly Preview card

- [ ] Professional CMS-1500 / Facility UB-04 panels show readiness
- [ ] Disclaimer: preview only — no claim generated or submitted
- [ ] No submit / generate / clearinghouse buttons
- [ ] Composes 19UCED.3–7 layers on single-encounter endpoint
- [ ] Does not invoke `ClaimExportService` or X12 generator

---

## 8. PHI safety verification

Automated guards (`FORBIDDEN_*` keys tested in shared + API specs):

| Module | Constant |
|--------|----------|
| Export readiness | `FORBIDDEN_BILLING_EXPORT_READINESS_KEYS` |
| Ledger readiness | `FORBIDDEN_BILLING_LEDGER_READINESS_KEYS` |
| Facility fee | `FORBIDDEN_FACILITY_FEE_READINESS_KEYS` |
| Charge review | `FORBIDDEN_CHARGE_REVIEW_KEYS` |
| Coding review | `FORBIDDEN_CODING_REVIEW_KEYS` |
| Claim assembly | `FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS` |
| Governance analytics | `FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS` |
| Classification audit | `FORBIDDEN_BILLING_CLASSIFICATION_AUDIT_KEYS` |

Manual spot-check: no patient names, diagnosis text, payer names, note text, claim/X12 payloads in review queue rows or governance summary.

---

## 9. RBAC verification

| Surface | Roles |
|---------|-------|
| Encounter readiness 19UCED.3–8 | BILLING, ADMIN, PROVIDER, FRONT_DESK |
| Review queues 19UCED.6–8 | BILLING, ADMIN, FRONT_DESK |
| Classification change 19UCED.1 | Clinical + admin rules in service |
| Governance dashboard 19UCED.9 | ADMIN, BILLING, MEDORA_SUPER_ADMIN |
| ROI monitoring (platform) | MEDORA_SUPER_ADMIN only |

- [ ] Unauthenticated → 401
- [ ] Wrong role → 403
- [ ] Cross-facility encounter → 404 (facility scoping)

---

## 10. Rollback plan

1. **Application rollback:** Redeploy previous API + web build artifacts.
2. **Database:** Restore pre-deploy snapshot if migration caused issues. Do not drop 19UCED columns in production without coordinated plan.
3. **Feature isolation:** 19UCED.3–9 are read-only; disabling UI links does not affect clinical writes.
4. **Classification:** Revert facility workflow config via admin if misconfigured (no code rollback required).

---

## 11. Deployment order

1. Database backup
2. `prisma migrate deploy` (19UCED.1 + 19UCED.2 if not yet applied)
3. Deploy API
4. Deploy web
5. Configure facility billing workflow per facility
6. Run smoke test matrix (§12)
7. Train billing/admin staff on preview-only semantics

---

## 12. Smoke test matrix

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 1 | Clinic visit | Classification CLINIC_VISIT; professional export preview; no facility package |
| 2 | UC encounter | URGENT_CARE; CMS-1500 preview path |
| 3 | ED encounter | EMERGENCY_DEPARTMENT; professional + facility preview |
| 4 | Observation | OBSERVATION; facility UB-04 preview emphasis |
| 5 | Inpatient | INPATIENT; facility preview |
| 6 | Telehealth | TELEHEALTH; professional preview |
| 7 | Procedure | PROCEDURE; review-only package type |
| 8 | UC→ED conversion | Same encounter ID; transition JSON + audit |
| 9 | ED→UC conversion | Hybrid facility; same chart preserved |
| 10 | Hybrid facility | Workflow controls visible; both classifications allowed |
| 11 | UC-only facility | No ED upgrade when disabled |
| 12 | ED-only facility | ED/OBS classification defaults |
| 13 | Hospital enterprise | Both-side ledger preview applicable |
| 14 | Coding review queue | `/app/billing/coding-review` loads; disclaimer visible |
| 15 | Charge review queue | `/app/billing/charge-review` loads |
| 16 | Claim assembly preview | Queue + encounter card; no submit buttons |
| 17 | Governance dashboard | `/app/admin/billing-governance` aggregate only |
| 18 | Facility-fee review | Card on billing encounter page |
| 19 | Extended observation | Warning/review flag when LOS threshold met |
| 20 | RBAC denial | RN-only user blocked from admin governance (403/redirect) |

---

## Release sign-off

| Area | Owner | Date | OK |
|------|-------|------|-----|
| Migrations applied | | | |
| Facility config | | | |
| Smoke matrix | | | |
| PHI review | | | |
| Billing staff training | | | |

**19UCED.3–9:** No migration required beyond 19UCED.1/19UCED.2.
