# Medication Intelligence Phase 14A — Source Acquisition, Evidence Governance, and Knowledge Completion

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_14A_SOURCE_ACQUISITION_EVIDENCE_GOVERNANCE_KNOWLEDGE_COMPLETION`

**Expected result:** `MEDICATION_INTELLIGENCE_PHASE_14A_CERTIFIED`

---

## Mission

Transition Medora Medication Intelligence from scaffolding into an **evidence-governed** knowledge repository: every knowledge record is attributable to an approved evidence source with deterministic provenance.

Phase 14A does **not** expand governance frameworks from Phases 1–13. It **populates** them.

## Constitutional rules (permanent)

1. Single canonical medication identity  
2. Evidence before knowledge  
3. Deterministic provenance  
4. Knowledge is advisory — never controls patient care  
5. No runtime workflow regression (ordering, dispensing, administration, MAR, billing)  
6. Enterprise scalability across specialties  
7. Knowledge never overrides identity  

## Reuse

- Phase 8/9 `MedicationClinicalKnowledgeSource` / `Version` and safety equivalents  
- Phase 12 population drafts  
- Phase 13 Wave 1 (`EM_WAVE1_SOURCE_BACKED_V1`) and approval-for-shadow gates  

## What Phase 14A adds

| Model | Purpose |
|-------|---------|
| `MedicationEvidenceAcquisitionBatch` | Wave 1 evidence program batch |
| `MedicationEvidenceSourceRegistration` | Licensing/provenance metadata linked to Phase 8/9 versions |
| `MedicationKnowledgeEvidenceLink` | Deterministic record→source-version links |
| `MedicationKnowledgeCompletenessScore` | Domain completeness / provenance scores |
| `MedicationEvidenceGovernanceAuditEvent` | Audit |

## Wave 1 scope

Eight Phase 13 Wave 1 families (resolved identities only). Acetaminophen remains identity-blocked and out of scope until governed resolution.

## Completion semantics

- Phase 12 placeholder markers are retired from Wave 1 draft profiles  
- Profiles are relinked to Phase 14A evidence catalog versions  
- Evidence links created for clinical profile + safety memberships  
- Structured dosing maxima / labeled contraindications remain **deferred** until Tier-1/licensed sources are attached and human-reviewed  
- Records remain **DRAFT** — no automatic approval, no shadow activation by this phase alone  

## Safety boundaries

| Control | Status |
|---------|--------|
| Provider alerts | OFF |
| Order blocking | OFF |
| Clinical activation | OFF |
| Knowledge controls patient care | NO |
| Ordering / dispensing / admin / MAR / billing | UNCHANGED |

## API / UI / CLI

- API: `/medications/evidence-governance/*`  
- UI: `/app/admin/medication-governance/evidence-governance`  
- i18n: `medicationEvidenceGovernance.*`  
- CLI: `medication:evidence-governance:*` / `medication:certify:phase14a`  

## Migration

`20261017120000_medication_phase_14a_source_acquisition_evidence_governance_knowledge_completion`

## Phase boundary

Phase 14A ends when evidence governance and provenance completion are operational for Wave 1. Live CDS and order blocking remain out of scope.
