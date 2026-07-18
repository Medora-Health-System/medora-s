# Medication Intelligence Phase 15 Part 2C — Governed Remediation Execution, Requalification, and Certification

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_15_AUTHORITATIVE_SOURCE_ACQUISITION_TIER1_KNOWLEDGE_COMPLETION_AND_WAVE1_REMEDIATION`

**Part 2C implementation ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_15_PART2C_EXECUTION_CERTIFICATION`

**Continues:** Part 1 (foundation), Part 2A (DB/remediation infra), Part 2B (API/UI/CLI).

---

## Mission

Execute the governed Wave 1 remediation workflow using authoritative, legally usable evidence only. Recalculate quality, requalify shadow snapshots, report synthetic shadow status, reconcile gaps, determine readiness, and certify Phase 15 truthfully.

Preferred outcome when Tier-1 completion is supported: `QUALIFIED_WITH_COMPLETE_AUTHORITATIVE_KNOWLEDGE`.

Truthful outcome when Tier-1 licensed sources are absent (live repository state): **governed deferral** of positive Tier-1 knowledge gaps → certification as:

`MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED_WITH_GOVERNED_DEFERRALS`

Certification reflects live data. It must not fabricate clinical facts to force `CERTIFIED` without deferrals.

## Constitutional boundaries

Medication Intelligence governs **knowledge quality only**. It must never:

- block ordering, delay treatment/administration/dispensing
- require pharmacist approval for bedside care
- modify MAR, reconciliation, order sets, billing, or documentation workflows
- activate production CDS, provider/interaction/allergy/duplicate-therapy alerts, or order blocking

Expert review governs knowledge publication and shadow qualification only.

## Wave 1 scope (fixed)

ibuprofen, ondansetron, famotidine, pantoprazole, dexamethasone, prednisone, cetirizine, ipratropium

Acetaminophen remains `IDENTITY_BLOCKED` and outside Phase 15 calculations.

## Reuse map (no parallel engines)

| Concern | Existing implementation |
|---------|-------------------------|
| Gap registry | Phase 14B `MedicationShadowGapLink` |
| Source registration / versioning | Phase 8 / 14A `MedicationEvidenceSourceRegistration` (+ Part 2A lifecycle fields) |
| Knowledge revisions / domains | Phases 3–9 clinical & safety domain models |
| Expert review / quality / shadow qualify | Phase 13 / 14A / 14B expert-review services |
| Immutable snapshots | `MedicationShadowSnapshot` |
| Synthetic evaluation | Phase 14B / Phase 10 `SHADOW` path (`runShadowSafetyEvaluation` equivalents) |
| Remediation program / work items | Part 2A models + Part 2B orchestrator |
| Part 2C execution | `medication-phase15-part2c-execution.service.ts` |
| Certifier | `medication:phase15:certify` |

## Execution outcomes

Each work item concludes as one of: `REMEDIATED`, `DEFERRED`, `BLOCKED`, `CHANGES_REQUESTED`, `NO_CHANGE`, `ALREADY_COMPLETE`, `OUT_OF_SCOPE`.

When no Tier-1/licensed authoritative source is available, Part 2C **defers** openly. Gaps stay **OPEN** until the underlying deficiency is resolved; work items move to `DEFERRED` with audit.

## CLI

```bash
pnpm --filter @medora/api medication:phase15:baseline
pnpm --filter @medora/api medication:phase15:remediation:preview
pnpm --filter @medora/api medication:phase15:remediation:execute
pnpm --filter @medora/api medication:phase15:quality:recalculate
pnpm --filter @medora/api medication:phase15:shadow:requalify
pnpm --filter @medora/api medication:phase15:shadow:evaluate
pnpm --filter @medora/api medication:phase15:readiness
pnpm --filter @medora/api medication:phase15:pipeline
pnpm --filter @medora/api medication:phase15:certify
```

## Artifacts

Under `apps/api/prisma/medications/audit-summaries/`:

- `medication-phase15-pre-remediation-baseline.json`
- `medication-phase15-remediation-preview.json`
- `medication-phase15-remediation-results.json`
- `medication-phase15-quality-report.json`
- `medication-phase15-shadow-requalification.json`
- `medication-phase15-synthetic-shadow-results.json`
- `medication-phase15-readiness-report.json`
- `medication-phase15-certification.json`
- `medication-phase15-certification.md`
- `medication-phase15-certification-summary.json`

## Certification semantics

Certification means: governance implemented, live DB consistent, Wave 1 remediation executed correctly, provenance preserved, quality recalculated, shadow qualification truthful, synthetic validation deterministic, limitations disclosed, clinical workflows unchanged.

Certification does **not** mean production CDS, complete domains for every drug, acetaminophen resolution, real-patient validation, or EM catalog expansion.

### Decision values

- `MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED`
- `MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED_WITH_GOVERNED_DEFERRALS`
- `MEDICATION_INTELLIGENCE_PHASE_15_NOT_CERTIFIED`

## Zero-activation guarantees

`ClinicalActivations=0`, `ProviderAlerts=0`, `OrderBlocks=0`, `ProductionCDS=OFF`.

Admin UI labels certification as **knowledge governance certification**, not production clinical activation.

## Admin UI / API

- UI: `/app/admin/medication-governance/remediation`
- API: `/medications/remediation/*` (Part 2B)

## Not claimed

- Production CDS / provider-facing recommendations / patient-facing validation
- Real-patient clinical validation
- Full EM family coverage or full catalog intelligence
- Acetaminophen resolution
- Pediatric/pregnancy completeness for every drug
- Exhaustive interaction or duplicate-therapy coverage
- Specialty expansion
- Medication Intelligence control over patient care

## Next phase (do not begin here)

`MEDICATION_INTELLIGENCE_PHASE_16_EMERGENCY_MEDICINE_FAMILY_EXPANSION_AND_CONTROLLED_KNOWLEDGE_POPULATION`
