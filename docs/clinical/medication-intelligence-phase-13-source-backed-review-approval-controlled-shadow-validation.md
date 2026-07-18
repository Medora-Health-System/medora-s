# Medication Intelligence Phase 13 — Source-Backed Review, Approval, and Controlled Shadow Validation

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_13_SOURCE_BACKED_REVIEW_APPROVAL_CONTROLLED_SHADOW_VALIDATION`

**Expected result:** `MEDICATION_INTELLIGENCE_PHASE_13_CERTIFIED`

---

## 1. Mission

Convert Phase 12 Emergency Medicine draft scaffolding into a governed pathway for **source-backed**, human/pharmacist-reviewed knowledge that may be approved **for shadow use only**, then measured with controlled synthetic reference validation.

Phase 13 does **not** enable provider alerts, order blocking, or clinical activation.

## 2. Existing certified foundation

Phases 1–12: identity, clinical/safety knowledge models, Phase 10 SHADOW/DISABLED evaluation, Phase 11 coverage/validation/readiness, Phase 12 population architecture (35 families, 34 resolved, 1 identity-blocked, drafts only).

## 3. Phase 12 baseline

Recalculated from the live database (not hard-coded). Typical starting state:

- Batch `EM_KNOWLEDGE_POPULATION_V1` / `CONTENT_CREATED`
- 35 requested / 34 resolved / 1 identity-blocked (`acetaminophen`)
- Clinical/safety drafts present; **0** approved-for-shadow until remediation

## 4–6. Phase 13A — Identity resolution

`MedicationKnowledgeIdentityResolutionCase` investigates blockers (acetaminophen, synonyms such as paracetamol/APAP as **search candidates only**).

Outcomes include deferred blocker, requires new identity governance, or explicit governed resolve of an **active exact** concept. No fuzzy auto-accept. No direct concept creation in Phase 13.

Acetaminophen may remain `DEFERRED_IDENTITY_BLOCKER` / `IDENTITY_REVIEW_REQUIRED` and is excluded from Wave 1 approval, eligibility, and expected findings until resolved.

## 7–12. Phase 13B — Approval waves, sources, placeholders

`MedicationKnowledgeApprovalWave` / `WaveItem` select a narrow Wave 1 (suggested 5–10 families from resolved identities only).

Source readiness rejects Phase 12 institutional scaffolding (`PHASE12_*_FRAMEWORK`, `INSTITUTIONAL_SCAFFOLDING`) as insufficient for approval. Placeholders cannot be approved merely by attaching a source label.

## 13–36. Domains, review, approval-for-shadow, immutability

Reuses Phase 8/9 review lifecycles and Phase 11 dual/blind/adjudication patterns. Approval status for Phase 13 scope: `APPROVED_FOR_SHADOW` with `clinicalActivationAllowed = false` and `shadowUseAllowed = true`.

Gates: identity, structured content, non-placeholder, source version, clinical + pharmacist review, medical review when high-risk, no blocking conflicts.

Approved knowledge remains immutable via existing fork/supersede paths.

## 37–52. Phase 13C — Controlled shadow validation

Synthetic reference set `PHASE13_EM_WAVE1_REFERENCE_SET_V1`. Expected findings must cite approved knowledge (none until remediation). Non-finding identity cases verify drafts are ignored.

`MedicationKnowledgeShadowValidationRun` + case results + unexpected-finding review + engine gaps. Metrics labeled `synthetic-reference-derived`.

Readiness ceiling: `NOT_READY` | `REMEDIATION_REQUIRED` | `READY_FOR_ADDITIONAL_SHADOW_VALIDATION` — never live alerting/activation.

## 53–59. Security, audit, API, UI, CLI, testing, certification

- API: `/medications/source-backed-validation/*`
- UI: `/app/admin/medication-governance/source-backed-validation`
- i18n: `medicationSourceBackedValidation.*`
- CLI: `medication:source-backed-validation:*` / `medication:certify:phase13`
- Migration: `20261016120000_medication_phase_13_source_backed_review_approval_shadow_validation`

## 60. Known limitations

- Wave 1 families still contain Phase 12 scaffolding until licensed sources + human approval
- `ClinicalRecordsApprovedForShadow` may remain **0** after certification of the **system**
- Acetaminophen may remain unresolved
- No production patient backfill

## 61. Phase 14 boundary

Remediate gaps, expand families, calibrate severity/suppression, larger staging validation — still no automatic provider-facing alerts.

## 62. Explicit confirmation

| Control | Status |
|---------|--------|
| Provider alerts | OFF |
| Order blocking | OFF |
| Overrides | OFF |
| Clinical activation | OFF |
| Automatic knowledge approval | OFF |
| Automatic identity creation | OFF |
| Draft knowledge in shadow engine | NOT CONSUMED |
| Ordering / search / MAR / billing | Unchanged |
