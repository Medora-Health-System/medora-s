# Medication Intelligence Phase 11 — Shadow Validation, Coverage, Pharmacist Review, Activation Readiness

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_11_SHADOW_VALIDATION_COVERAGE_PHARMACIST_REVIEW_ACTIVATION_READINESS`  
**Expected result:** `MEDICATION_INTELLIGENCE_PHASE_11_CERTIFIED`

## 1. Mission

Transform the Phase 10 patient-specific medication safety shadow engine into a measurable, clinically governed, pharmacist-reviewed validation program. Phase 11 determines whether the engine is accurate, complete, explainable, performant, and sufficiently governed for a *future* limited clinical activation pilot.

## 2. Existing certified foundation

Builds on Phases 1–10: canonical medication identity, RxNorm governance, controlled ingestion, Phase 7 EM batch foundation, Phase 8 clinical knowledge, Phase 9 safety knowledge, and Phase 10 shadow evaluation (`DISABLED` | `SHADOW` only).

## 3. Shadow-only boundary

Phase 11 **may** analyze shadow findings, assign pharmacist reviewers, measure coverage, calculate readiness, and attest readiness.

Phase 11 **must not**:

- show alerts to ordering providers
- block medication orders
- require provider acknowledgements or override reasons
- modify orders, doses, allergies, MAR, pharmacy verification, or billing
- enable active CDS or passive provider alerts
- emit `READY_FOR_ACTIVATION`, `ACTIVE`, `ENABLED`, `LIVE`, or `PRODUCTION_ALERTING`

**Explicit confirmation:** Provider-facing alerts remain **OFF**. Order blocking remains **OFF**. Clinical activation did **not** occur.

## 4–8. Medication-family inventory, coverage domains, scoring, critical gates

Inventory metrics are computed from **repository + database state**, not prompt examples.

Coverage domains include IDENTITY, PRODUCT, PACKAGE, CATALOG, THERAPEUTIC_CLASS, CLINICAL_PROFILE, dosing/renal/hepatic/pregnancy/lactation/administration/infusion/monitoring, CONTRAINDICATION, BLACK_BOX_WARNING, DRUG_INTERACTION, ALLERGY_MAPPING, CROSS_REACTIVITY, DUPLICATE_THERAPY, EMERGENCY_CONTEXT, SHADOW_EVALUATION, PHARMACIST_VALIDATION.

Weighted scores use `PHASE11_COVERAGE_CALCULATION_VERSION`. Missing allergy/interaction/duplicate-therapy domains prevent activation readiness even if the average looks high.

Critical gates (all required for future readiness): CanonicalIdentityResolved, ActiveProductsResolved, TherapeuticClassAssigned, ClinicalProfileApproved, SafetyKnowledgeApproved, DuplicateTherapyMembershipReviewed, AllergyMappingReviewed, ShadowEvaluationSuccessful, PharmacistValidationCompleted, NoCriticalKnowledgeConflict, NoUnresolvedIdentityBlocker.

`VALIDATED` and `ACTIVATION_CANDIDATE` are never auto-assigned.

## 9–13. Pharmacist roles, cases, dual/blind review, adjudication

Roles reuse existing `RoleCode` values:

| Phase 11 role | Mapped RoleCode |
|---|---|
| Pharmacist reviewer | `MEDICATION_REVIEWER`, `PHARMACY` |
| Pharmacist adjudicator | `MEDICATION_ADMIN` (+ platform admins) |
| Medication admin | `MEDICATION_ADMIN`, `MEDORA_SUPER_ADMIN` |

Validation cases support dual review for high-severity / contraindicated / allergy / pregnancy / pediatric high-risk findings. Blind review hides peer classifications until submission. Completed reviews are locked. Disagreement opens adjudication; reviewers cannot adjudicate their own disputed case (unless admin).

## 14–15. Validation batches and gold-standard reference sets

Batches are reproducible when locked (engine version, knowledge versions, selection criteria, outcomes). Reference sets are synthetic, fixture-marked (`MEDICATION_SAFETY_REFERENCE_FIXTURE` / `PHASE11_VALIDATION_FIXTURE`), excluded from production clinical analytics unless explicitly evaluating fixture-derived readiness.

## 16–20. Accuracy, severity, burden, EM relevance

- False positives: confirmed only from **reviewed** classifications; denominators stated.
- False negatives: require expected findings (reference sets); fixture-derived metrics labeled.
- Severity calibration compares engine vs pharmacist severity.
- Alert burden is **simulation only**.
- Emergency Medicine contexts are measured; protocol context does not erase legitimate findings.

## 21–25. Gap registries, suppression, reliability

Knowledge, identity, and patient-context gap registries track remediation. Phase 11 does **not** auto-create canonical identities, auto-approve knowledge, or write missing context into the chart. Suppression hiding true positives is a critical governance issue (manual versioned fix only). Reliability metrics distinguish fixture / local / staging / production-shadow.

## 26–29. Readiness policies, assessments, candidates, attestations

Approved policies are immutable (new version required). Assessments are scoped and may reach at most `READY_FOR_GOVERNANCE_REVIEW` — never `READY_FOR_ACTIVATION`. Candidates never use live statuses. Attestations are immutable checksummed artifacts stating:

```text
ProviderFacingAlertsEnabled: NO
OrderBlockingEnabled: NO
ClinicalActivationPerformed: NO
```

## 30–31. Statistical limitations and security

Rates report numerator, denominator, sample source, and review status. JWT + medication governance roles required. Role spoofing rejected. Identifiable case access audited.

## 32–34. API, UI, CLI

- API base: `/medications/safety-validation/*`
- UI: `/app/admin/medication-governance/safety-validation`
- CLI: `pnpm --filter @medora/api medication:safety-validation:*` and `medication:certify:phase11`

## 35–36. Testing and certification

Focused tests cover coverage scoring, gates, readiness blocking, review immutability, and safety boundaries. Certification probes schema, migration, services, API, UI, i18n, CLI, and isolation safeguards.

## 37. Future Phase 12 boundary

Phase 12 may design a tightly controlled provider-facing pilot **only after** Phase 11 produces acceptable validated readiness for a narrow scope. Phase 12 is not started merely because Phase 11 code exists.

## 38. Confirmation

Provider alerts and order blocking remain disabled. Ordering, search, MAR, and billing are unchanged by Phase 11 workflows.
