# Medication Intelligence Phase 6.5 — Controlled Emergency Medication Pilot & Duplicate Prevention

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_6_5_CONTROLLED_EMERGENCY_MEDICATION_PILOT_DUPLICATE_PREVENTION`

## Purpose

Phase 6.5 proves Medora can safely prepare a **controlled Emergency Medicine medication pilot** (~75–125 curated products, default ~100) while hardening duplicate prevention across the medication identity lifecycle.

This phase is **not** clinical activation and **not** a national catalog import.

## Why duplicate prevention is a medication-safety requirement

Duplicate medication records cause:

- conflicting RxNorm mappings
- ambiguous orderables
- inconsistent MAR / formulary / billing identity
- reviewer queue noise and unsafe auto-merge pressure

Phase 6.5 therefore treats duplicate prevention as a primary safety control: false duplicates and false merges are both forbidden without human review.

## Normalization rules

Deterministic normalization (Unicode NFKC, whitespace, case, punctuation, units, routes, dosage forms, decimals, abbreviations) preserves original source strings while producing comparable keys.

Examples that normalize together:

- `1 mg/mL` / `1mg/ml` / `1 MG per ML`
- `1000 mg` / `1 g` (total quantity equivalence)

Concentration is **not** equated to total dose (`10 mg/mL` ≠ `10 mg`) unless package/form context later establishes equivalence under human review.

Combination ingredients are ordered deterministically (e.g. `piperacillin / tazobactam` ≡ `tazobactam / piperacillin` at concept layer).

## Identity-key design

| Layer | Key builder | Typical components |
|-------|-------------|--------------------|
| Concept | `buildConceptIdentityKey` | normalized ingredient set + salt/ester |
| Product | `buildProductIdentityKey` | concept + strength + concentration + form + release + route + brand-where-distinct |
| Package | `buildPackageIdentityKey` | product + NDC + qty/unit + container + single/multi-dose |

Keys are persisted on pilot items and (nullable) on canonical concept/product/package rows, with **partial unique indexes** for active rows.

## Duplicate classifications

`EXACT_DUPLICATE` · `NORMALIZED_DUPLICATE` · `PROBABLE_DUPLICATE` · `POSSIBLE_DUPLICATE` · `CLINICALLY_DISTINCT` · `SOURCE_DUPLICATE` · `PACKAGE_DUPLICATE` · `MAPPING_DUPLICATE` · `SYNONYM_DUPLICATE` · `NO_DUPLICATE`

- Probable/possible duplicates **never** auto-merge.
- Source/mapping collisions **block staging**.
- Exact match against an existing valid entity recommends **reuse**, not a second record.

## False-merge prevention

Records remain distinct when they differ by ingredient set, strength/concentration, dose form, route, release mechanism, package, device, or clinically meaningful salt/brand formulation.

## Pilot manifest lifecycle

Defaults:

- `clinicalDomain = EMERGENCY_MEDICINE`
- `dataClassification = CONTROLLED_REAL_PILOT`
- `clinicalActivationAllowed = false`
- `pilotStatus / approvalStatus = DRAFT`

Approved manifests are immutable except via explicit versioning. Staging requires `--confirm-stage`, approved manifest, complete duplicate assessment, and matching manifest hash.

## Reviewer workflow

Phase 6 governance UI/API gains pilot duplicate metrics and filters (`pilotId`, duplicate classification, category). Reviewer actions:

`LINK_TO_EXISTING` · `APPROVE_NEW_RECORD` · `CONFIRM_DISTINCT` · `REJECT_DUPLICATE` · `DEFER` · `REQUEST_CLARIFICATION`

No bulk approval of real mappings. Phase 4 remains the sole verified-mapping mutation authority.

## CLI usage

```bash
pnpm --filter @medora/api medication:pilot:manifest
pnpm --filter @medora/api medication:pilot:manifest -- --approve
pnpm --filter @medora/api medication:pilot:validate
pnpm --filter @medora/api medication:pilot:dedupe
pnpm --filter @medora/api medication:pilot:preview
pnpm --filter @medora/api medication:pilot:stage -- --confirm-stage
pnpm --filter @medora/api medication:pilot:candidates
pnpm --filter @medora/api medication:pilot:report
pnpm --filter @medora/api medication:pilot:rollback -- --confirm-rollback
```

Dry-run / validate / dedupe / preview write **no** clinically active catalog records. Candidates are prepared with `autoVerified=false` and `requiresHumanReview=true`.

## Rollback

Rollback removes safe pilot staging/assessment/job rows. It refuses when active real verified mappings (controlled pilot classification) or other dependent clinical activations exist without a retirement/supersession plan.

## Security

- Operators: `MEDICATION_REVIEWER`, `MEDICATION_ADMIN`
- Admin-only: approve manifest, stage, rollback, approve new canonical records / link merges
- Authenticated actor identity only — payload `reviewerUserId` spoofing is rejected

## French-language support

Pilot dashboard labels, duplicate classifications, reviewer actions, lifecycle statuses, filters, and warnings use i18n (`medicationRxNormReview.*`). Medication display names are **not** auto-translated; missing French displays are reported, not invented.

## Known limitations

- Pilot staging prepares governance rows; it does not populate a full national RxNorm release.
- Existing canonical identity keys may be null until backfill.
- Candidate generation records pilot intent/audit; Phase 4 verification is still required for verified mappings.
- Patient-facing search, ordering, MAR, billing, and formulary behavior remain unchanged.

## Phase 7 readiness criteria (scaled batch)

Scaled batch ingestion (~500–1,000) may begin only when:

- Phase 6.5 certified
- Duplicate prevention certified
- Pilot workflow deterministic
- No unresolved source/mapping collisions
- No automatic verification
- No clinical activation
- Pilot rollback validated
- At least one controlled pilot can complete safely
- Reviewer workflow operational
- Duplicate resolution metrics available

Roadmap Phase 7 (prescription entity) remains a separate clinical feature track.

## Certification

```bash
pnpm --filter @medora/api medication:certify:phase6-5
```

Expected: `MEDICATION_INTELLIGENCE_PHASE_6_5_CERTIFIED` with `PilotImportExecutedDuringCertification: NO` and `RealVerifiedMappingsCreatedByCertification: 0`.
