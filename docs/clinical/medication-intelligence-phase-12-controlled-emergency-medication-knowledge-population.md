# Medication Intelligence Phase 12 — Controlled Emergency Medication Clinical and Safety Knowledge Population

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_12_CONTROLLED_EMERGENCY_MEDICATION_CLINICAL_SAFETY_KNOWLEDGE_POPULATION`

**Expected result:** `MEDICATION_INTELLIGENCE_PHASE_12_CERTIFIED`

---

## 1. Mission

Populate Medora’s first controlled, governed, clinically reviewable Emergency Medicine medication knowledge batch using canonical medication identities and governance from Phases 1–11.

Phase 12 converts an identity-rich but knowledge-empty catalog into a **shadow-evaluation foundation**. It does **not** enable clinical activation, provider alerts, or order blocking.

## 2. Existing certified foundation

Reuses Phases 1–7 (identity, RxNorm, EM family manifest), Phase 8 (clinical knowledge models), Phase 9 (safety knowledge models), Phase 10 (shadow evaluation), and Phase 11 (coverage / readiness).

Does **not** create parallel medication masters, interaction registries, allergy masters, or approval engines.

## 3. Live database baseline (pre-population)

Typical environment reported before Phase 12:

| Metric | Value |
|--------|------:|
| Medication concepts | 1377 |
| Medication products | 1429 |
| Medication packages | 1428 |
| Catalog medications | 1042 |
| Family coverage profiles | 679 |
| Approved clinical profiles | 0 |
| Approved safety knowledge records | 0 |
| Shadow-evaluable families | 0 |
| Emergency Medicine families identified | 35 |

Exact counts after population must come from live CLI/dashboard metrics, not this document.

## 4. Controlled 35-family scope

Locked family names (must resolve to existing canonical concepts; never auto-create identities):

acetaminophen, ibuprofen, naproxen, aspirin, ondansetron, metoclopramide, promethazine, famotidine, pantoprazole, omeprazole, lactulose, ceftazidime, vancomycin, clindamycin, azithromycin, doxycycline, ciprofloxacin, metronidazole, meropenem, fluconazole, acyclovir, metoprolol, heparin, enoxaparin, ipratropium, budesonide, dexamethasone, prednisone, cetirizine, magnesium sulfate, calcium gluconate, potassium chloride, tranexamic acid, vitamin K, oxytocin.

Ambiguous resolution → `IDENTITY_REVIEW_REQUIRED` (e.g. acetaminophen when multiple inactive candidates exist).

## 5. Suggested population waves

Wave 1 (lower complexity / high frequency), Wave 2 (antimicrobials), Wave 3 (high-alert / electrolytes / OB), Wave 4 (remaining). Sequencing is advisory; source availability and identity status govern execution.

## 6. Canonical identity resolution

Batch items map `requestedFamilyName` → exact/normalized `MedicationConcept.genericName`. No fuzzy auto-accept. Multiple active candidates or only inactive ambiguous hits remain blocked.

## 7–10. Source governance, licensing, tiers, versions

Reuses `MedicationClinicalKnowledgeSource` / `Version` and `MedicationSafetyKnowledgeSource` / `Version`.

Tiers: `TIER_1_REGULATORY` … `TIER_7_EXPERT_CONSENSUS`. Precedence does not silently resolve clinically meaningful conflicts — conflicts create `MedicationKnowledgeConflict` rows.

Phase 12 institutional scaffolding sources (`PHASE12_*_FRAMEWORK_V1`) are **not** FDA labeling. They support draft structure only. Approved facts require labeled, licensed, attributable sources.

Do not scrape proprietary monographs; do not store credentials or wholesale copyrighted narrative.

## 11–13. Manifest and intake schemas

- Manifest: `apps/api/prisma/medications/knowledge-population/medication-phase12-emergency-knowledge-manifest.json`
- Schemas: `phase12-family-manifest.schema.json`, `phase12-clinical-knowledge.schema.json`, `phase12-safety-knowledge.schema.json`
- Intake fixtures: `phase12-clinical-intake.json`, `phase12-safety-intake.json` (scaffolding drafts; no fabricated approved dosing)

## 14–26. Clinical and safety domains

Population targets Phase 8 domains (profile, dosing, renal/hepatic, administration/infusion, monitoring, contraindications/warnings, pregnancy/lactation, high-alert, EM profile) and Phase 9 domains (classes, allergens, cross-reactivity, interactions, duplicate therapy, EM contexts).

Not every domain is required for every family. Domains may be `REQUIRED`, `APPLICABLE`, `NOT_APPLICABLE`, `SOURCE_UNAVAILABLE`, `REVIEW_REQUIRED`, or `DEFERRED`.

Empty approved records are forbidden. Safety records keep `clinicalActivationAllowed = false`.

## 27. Product-specific knowledge

Concept-level for shared facts; product-level only when concentration/form/route materially differs. No package-level duplication of identical knowledge.

## 28–32. Import, duplicates, conflicts

Stages: PARSE → VALIDATE_SCHEMA → RESOLVE_IDENTITIES → VALIDATE_SOURCES → CLASSIFY_DUPLICATES → DETECT_CONFLICTS → CALCULATE_IMPACT → CREATE_DRAFTS → VERIFY_COUNTS.

- Preview: no knowledge writes
- Dry-run: validations + audit run only
- Execute: **DRAFT only**, idempotent, `createdApprovedRecords = false` (DB CHECK)
- Rollback: unapproved Phase 12 drafts only; preserves identity, approvals, audit

## 33–38. Review, approval, immutability

Lifecycle reuses Phase 8/9 review paths. Minimum: medication reviewer + pharmacist; medical review for high-risk content. No self-approval when separation-of-duties applies. No batch-level approve bypass. Approved records immutable; corrections via fork → draft → review → approve → supersede.

## 39–41. Coverage, eligibility, reference cases

Phase 11 coverage recalculation after drafts/approvals. Drafts never count as approved coverage.

Shadow-evaluable only when identity + governed source + approved clinical/safety gates pass and no critical conflicts/identity blockers.

Reference cases are synthetic/deterministic and must cite approved knowledge only.

## 42–43. Phase 10 / Phase 11 integration

Phase 10 may consume approved knowledge in `DISABLED` / `SHADOW` only. Phase 12 does not change Phase 10 modes.

Phase 11 coverage/gaps/eligibility may update; families are **not** auto-marked `VALIDATED` / `ACTIVATION_CANDIDATE` / `READY_FOR_GOVERNANCE_REVIEW`.

## 44–48. Security, audit, API, UI, CLI

- API base: `/medications/knowledge-population/*` (JWT + medication governance roles)
- UI: `/app/admin/medication-governance/knowledge-population`
- Required banners: CONTROLLED KNOWLEDGE POPULATION · SHADOW USE ONLY · NO PROVIDER ALERTS · NO ORDER BLOCKING · NO CLINICAL ACTIVATION
- i18n: `medicationKnowledgePopulation.*` (French product UI; clinical narrative translation remains draft until human review)
- CLI: `pnpm --filter @medora/api medication:knowledge-population:*` and `medication:certify:phase12`

## 49–50. Testing and certification

Focused tests: `medication-phase12-certification`, `medicationKnowledgePopulation`, shared governance. Certification probes schema, migration, services, manifest, import safeguards, UI, CLI, isolation constraints.

## 51. Known content limitations

- Scaffolding drafts ≠ approved clinical truth
- Shadow-evaluable count remains 0 until real source-backed approvals satisfy gates
- Ambiguous identities (e.g. acetaminophen) stay blocked
- Interactions/dosing not bulk-fabricated for all 35 families

## 52. Phase 13 boundary

Phase 13 should run controlled shadow validation against **approved** Phase 12 knowledge (reference sets, synthetic cases, FP/FN calibration). Still no provider-facing alerts.

## 53. Explicit confirmation

| Control | Status |
|---------|--------|
| Provider alerts | OFF |
| Order blocking | OFF |
| Provider overrides | OFF |
| Clinical activation | OFF |
| Automatic knowledge approval | OFF |
| Automatic medication identity creation | OFF |
| Ordering / search / MAR / billing | Unchanged |

---

## Migration

`20261015120000_medication_phase_12_controlled_emergency_knowledge_population`

## Related

- [`medication-intelligence-roadmap.md`](./medication-intelligence-roadmap.md)
- Phase 8–11 clinical docs in this folder
