# Medication Intelligence Phase 9 — Interaction, allergy, and duplicate-therapy knowledge foundation

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_9_INTERACTION_ALLERGY_DUPLICATE_THERAPY_KNOWLEDGE_FOUNDATION`

## 1. Purpose

Establish Medora’s structured, versioned, provenance-aware **medication safety knowledge** layer for drug–drug interactions, allergy/cross-reactivity relationships, therapeutic class membership, and duplicate-therapy classification.

## 2. Scope

In scope: knowledge storage, normalization, duplicate detection among knowledge records, human review, admin approval, audit, import preview/dry-run scaffolding, admin UI/API/CLI.

## 3. Out-of-scope CDS behavior

Phase 9 does **not**:

- evaluate patient medication lists, allergies, labs, renal function, or pregnancy
- interrupt providers or block orders
- emit interaction, allergy, or duplicate-therapy alerts
- change search, ordering, MAR, billing, or Phase 8 clinical knowledge behavior

## 4. Canonical identity reuse

All safety knowledge references `MedicationConcept` / `MedicationProduct` (and existing `MedicationTherapeuticClass`). No parallel medication master tables. Free-text names are not authoritative.

## 5. Drug-interaction architecture

`MedicationDrugInteraction` stores concept/product scoped pairs with severity, evidence, mechanism, management/monitoring recommendations, and optional EM context notes.

## 6. Symmetric versus directional interactions

- Symmetric pairs use deterministic `normalizedPairKey = lowerId|higherId|scope|sourceVersionId`.
- Directional pairs preserve subject→object order (`DIR|subject|object|scope|sourceVersionId`).
- Reversed symmetric inputs collapse to the same key (idempotent).

## 7. Therapeutic class architecture

Extends existing `MedicationTherapeuticClass` with optional terminology metadata. Governed memberships live in `MedicationTherapeuticClassMembership` (does not replace `concept.therapeuticClassId`).

## 8. Allergy and cross-reactivity architecture

`MedicationAllergenConcept`, `MedicationAllergenMapping`, and `MedicationAllergyCrossReactivityRule` distinguish relationship types and reaction kinds (allergy vs intolerance vs adverse effect vs cross-reactivity concern). Class membership alone is not treated as definite allergy.

## 9. Duplicate-therapy architecture

`MedicationDuplicateTherapyGroup`, memberships, and rules store classification only. Rules are never executed against patient lists in Phase 9.

## 10. Combination-product handling

Knowledge may reference the combination product, ingredient concepts, therapeutic classes, or duplicate-therapy groups. Prefer concept-level knowledge over package proliferation.

## 11. Provenance

Every governed safety record ties to `MedicationSafetyKnowledgeSource` / `MedicationSafetyKnowledgeVersion`. Interaction drafts require `evidenceLevel`.

## 12. Versioning

Source versions are first-class. Approved interactions are immutable; changes require fork → draft → review → approve (supersession).

## 13. Lifecycle

`DRAFT → UNDER_REVIEW → APPROVED → SUPERSEDED|RETIRED` (plus `REJECTED`). Only APPROVED may be future-CDS-eligible. Approval ≠ activation.

## 14. Duplicate prevention

Unique active keys for interaction pairs, class interactions, cross-reactivity identities, and membership uniques. Import preview classifies exact/reversed/source-version duplicates without silent merge of clinical conflicts.

## 15. Source conflict handling

Conflicts remain in review queues; conflicting severity/evidence/management recommendations are not auto-merged.

## 16. Emergency Medicine context metadata

Optional `emergencyContextNotesJson` on interactions and duplicate-therapy rules for ACLS/RSI/sedation/etc. Context does not imply universal safety.

## 17. API

Base path: `/medications/safety-knowledge/*` (JWT). Dashboard, sources/versions, interactions lifecycle, classes/memberships, allergens/mappings/cross-reactivity, duplicate-therapy, duplicate-check, import preview/dry-run/rollback.

## 18. Authorization

Reviewers draft/edit/submit/review. Medication Admin approves/supersedes/retires/manages sources and rollback. Role spoofing via body rejected. No API may set clinical activation true.

## 19. UI

Admin workspace: `/app/admin/medication-governance/safety-knowledge` (French i18n `medicationSafetyKnowledge.*`). Not exposed in provider ordering workflows.

## 20. Audit

`MedicationSafetyKnowledgeAuditEvent` records create/transition/import/rollback actions with before/after JSON.

## 21. Migration

`20261012120000_medication_phase_9_interaction_allergy_duplicate_therapy_knowledge` — additive; `clinicalActivationAllowed` defaults false; no identity/order/MAR/billing rewrites.

## 22. Testing

Shared pair-key governance tests, interaction service guards, Phase 9 certification probes for schema/services/API/UI/CLI/isolation.

## 23. Certification

`pnpm --filter @medora/api medication:certify:phase9` → `MEDICATION_INTELLIGENCE_PHASE_9_CERTIFIED`.

## 24. Future Phase 10 roadmap

Patient-specific evaluation, provider alerts, hard/soft stops, order composer / MAR / pharmacy verification integration — **not** implemented here.

## 25. Explicit confirmation

**Clinical alerts remain disabled. Clinical activation remains off. Ordering, search, MAR, and billing remain unchanged.**
