# Medication Intelligence Phase 7 — Controlled Emergency Medication Batch

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_7_CONTROLLED_EMERGENCY_MEDICATION_BATCH_IMPLEMENTATION`

## Objective

Execute Medora’s first governed Emergency Medicine medication **batch platform** on Phases 1–6.5 infrastructure:

- authentic RxNorm source governance
- curated EM medication families (~75–125, target ~100)
- duplicate prevention and existing-record reuse
- human mapping review (Phase 4 + Phase 6)
- clinically **inactive** catalog preparation only
- rollback / supersession readiness
- patient-facing isolation

This is the beginning of real medication content implementation — **not** a national catalog and **not** clinical activation by default.

## Medication family vs orderable product

| Layer | Meaning in Phase 7 |
|-------|--------------------|
| `MEDICATION_FAMILY` | Clinical scope unit (e.g. epinephrine) |
| `CANONICAL_CONCEPT` | Normalized ingredient identity |
| `CLINICALLY_DISTINCT_PRODUCT` | Strength/form/route/release/device presentation |
| `PACKAGE_PRESENTATION` | Package/NDC/container |
| `CATALOG_PREPARATION_RECORD` | Inactive prep row |
| `ORDERABLE_MEDICATION` | **Not** auto-created |

Example: epinephrine family may yield 1 mg/mL vial, 0.1 mg/mL prefilled syringe, and 0.3 mg autoinjector as distinct products.

## Authentic source governance

- Store authentic files under gitignored `.local-data/rxnorm/`
- Require release id, checksums, license acknowledgement, operator identity
- Classification: `AUTHENTIC_NLM_RXNORM`
- Scope: `CONTROLLED_EMERGENCY_MEDICINE_BATCH`
- Purpose: `PHASE_7_CONTROLLED_BATCH`
- `clinicalActivationAllowed = false`
- **No silent fixture fallback** for operator execution
- CI may use structural fixtures clearly marked non-authentic

## Batch manifest

`MedicationBatchManifest` defaults:

- `clinicalDomain = EMERGENCY_MEDICINE`
- `dataClassification = CONTROLLED_REAL_BATCH`
- `duplicateReviewRequired = true`
- `humanVerificationRequired = true`
- `clinicalActivationAllowed = false`
- `batchStatus = DRAFT`

Approved manifests are immutable (new version + hash + re-approval required).

## CLI

```bash
pnpm --filter @medora/api medication:batch:phase7:manifest
pnpm --filter @medora/api medication:batch:phase7:manifest -- --approve
pnpm --filter @medora/api medication:batch:phase7:validate -- --allow-structural-fixture-ci
pnpm --filter @medora/api medication:batch:phase7:extract -- --allow-structural-fixture-ci
pnpm --filter @medora/api medication:batch:phase7:preview
pnpm --filter @medora/api medication:batch:phase7:dedupe
pnpm --filter @medora/api medication:batch:phase7:stage -- --confirm-stage --allow-structural-fixture-ci
pnpm --filter @medora/api medication:batch:phase7:candidates
pnpm --filter @medora/api medication:batch:phase7:report
pnpm --filter @medora/api medication:batch:phase7:rollback -- --confirm-rollback
pnpm --filter @medora/api medication:batch:phase7:attest -- --source-checksum-verified --rollback-tested
```

Operator attestation (`MEDICATION_INTELLIGENCE_PHASE_7_BATCH_ATTESTED`) is separate from CI platform certification and must never run in CI against authentic NLM files automatically.

## API

`/medications/batches` — list, create, approve, extract, normalize, dedupe, preview, stage, candidates, report, rollback, items, conflicts, metrics.

Roles: `MEDICATION_REVIEWER` / `MEDICATION_ADMIN` (admin-only for approve/stage/rollback/create).

## Duplicate prevention and reuse

Reuses Phase 6.5 identity keys and assessments. Exact duplicates reuse or block; probable/possible require human review; false-merge risk blocks staging. Existing entities are linked via `MedicationBatchEntityLink` without silent overwrite.

## Human verification

Phase 4 remains the sole verified-mapping mutation authority. Phase 7 candidates always have `autoVerified=false`. No bulk real mapping approval.

Target operator outcome (staging attestation, not CI): ~25–125 real verified mappings through human review — never forced for numeric targets.

## Catalog preparation

Lifecycle ends at `CLINICALLY_INACTIVE` / catalog prepared. No default doses, interactions, order sentences, or clinical activation.

## Clinical isolation

`AutomaticClinicalActivations = 0`. Search, ordering, MAR, formulary, dispensing, inventory, billing unchanged.

## Rollback

Removes batch staging/assessments/jobs/links; refuses when dependent real verified mappings exist without retirement plan; never deletes reused preexisting entities.

## French-language handling

UI strings via i18n. Medication displays: `CURATED_FRENCH_AVAILABLE|MISSING|…` — no fabricated translations.

## Controlled-substance / high-alert

Governance review labels only (`CONTROLLED_SUBSTANCE_REVIEW_REQUIRED`, `HIGH_ALERT_REVIEW_REQUIRED`). Not regulatory scheduling or prescribing workflows.

## Two-level certification

1. **Platform (CI):** `MEDICATION_INTELLIGENCE_PHASE_7_CERTIFIED` — `RealBatchExecutedDuringCertification=NO`, `RealVerifiedMappingsCreatedByCertification=0`
2. **Batch attestation (operator/staging):** `MEDICATION_INTELLIGENCE_PHASE_7_BATCH_ATTESTED` — after approved authentic batch review

## Operator runbook (staging)

1. Place authentic RxNorm under `.local-data/rxnorm/` with checksummed manifest + license ack  
2. Approve batch manifest as `MEDICATION_ADMIN`  
3. validate → extract → preview → dedupe → stage → candidates  
4. Human review via Phase 6 console (batchId filter)  
5. Verify mappings via Phase 4 only  
6. Prepare inactive catalog records  
7. Produce batch attestation report  
8. Validate rollback on a disposable dry-run batch, not the final reviewed batch  

## Phase 8 readiness

Do not scale nationally until Phase 7 platform is certified, a real batch is attested in staging, duplicate/NDC/false-merge blockers are clear, reuse and rollback are validated, and clinical activation remained zero.

Recommended scale path: 8A 500–1,000 families → 8B broader acute care → 8C formulary/orderable build.

## Known gaps

- Authentic NLM files are not in Git and not required for CI
- Batch attestation is operator-run (not automated in this certifier)
- French medication display curation remains incomplete by design
- Roadmap “Phase 7 prescription entity” is a separate clinical track from this batch phase
