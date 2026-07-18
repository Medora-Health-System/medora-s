# Medication Intelligence Phase 14B — Expert Knowledge Review, Approval for Shadow, and Wave 1 Qualification

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_14B_EXPERT_KNOWLEDGE_REVIEW_APPROVAL_FOR_SHADOW_AND_WAVE1_QUALIFICATION`

**Expected result:** `MEDICATION_INTELLIGENCE_PHASE_14B_CERTIFIED`

---

## Mission

Convert Phase 14A evidence-governed Wave 1 drafts into expert-reviewed knowledge that may be marked **APPROVED_FOR_SHADOW** for controlled offline/shadow validation.

Phase 14B does **not** activate CDS, alerts, recommendations, or any patient-care workflow.

## Constitutional rules

1. Medication Intelligence governs knowledge — never patient care  
2. Expert review governs knowledge quality — never medication orders  
3. No clinician requires Medora approval before care  
4. No blocking of ordering / administration / dispensing / MAR  
5. Knowledge approval ≠ patient approval  
6. Shadow qualification ≠ clinical activation  
7. ApprovedForShadow ≠ ApprovedForProduction  
8. Per-family review only — no bulk global approval  

## Reuse

- Phase 13 `attemptApproveForShadow` / wave items / gates  
- Phase 14A evidence links + completeness scores  
- Phase 8 clinical profile lifecycle (`DRAFT → UNDER_REVIEW → APPROVED`) with `clinicalActivationAllowed=false`  

## Pipeline

1. Clinical domain review  
2. Safety domain review  
3. Cross-domain consistency  
4. Deterministic quality scoring  
5. Shadow eligibility + rule-based approval  
6. Immutable shadow snapshot (+ synthetic case package metadata for Part 3)  

## Models

| Model | Purpose |
|-------|---------|
| `MedicationExpertReviewBatch` | Program batch |
| `MedicationKnowledgeDomainReview` | Per-domain review status |
| `MedicationKnowledgeQuality` | Deterministic quality scores |
| `MedicationShadowQualification` | Eligibility / qualification decision |
| `MedicationShadowSnapshot` | Immutable approved-for-shadow snapshot |
| `MedicationReviewConflict` | Conflicts + resolution |
| `MedicationExpertReviewAuditEvent` | Audit |

## Wave 1

Eight Phase 13 families only. Acetaminophen remains identity-blocked.

Deferred domains (dosing maxima, pregnancy, licensed interactions, etc.) stay explicitly **DEFERRED** — not inferred.

## API / UI / CLI

- API: `/medications/review/*`, `/medications/quality/*`, `/medications/shadow/*`, `/medications/conflicts/*`  
- UI: `/app/admin/medication-governance/expert-review`  
- CLI: `medication:review`, `medication:quality`, `medication:shadow`, `medication:approve-shadow`, `medication:review-report`, `medication:review-conflicts`, `medication:certify:phase14b`  

## Migration

`20261018120000_medication_phase_14b_expert_knowledge_review_approval_for_shadow_wave1_qualification`

## Phase boundary

Phase 14B ends when Wave 1 families are reviewed, scored, and (when eligible) APPROVED_FOR_SHADOW with immutable snapshots. Part 3 adds controlled synthetic shadow evaluation execution and enterprise reporting toward Phase 15.
