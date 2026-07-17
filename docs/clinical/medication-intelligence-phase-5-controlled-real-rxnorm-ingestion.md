# Medication Intelligence Phase 5 — Controlled Real RxNorm Reference Ingestion

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_5_CONTROLLED_REAL_RXNORM_REFERENCE_INGESTION_RELEASE_GOVERNANCE_NONCLINICAL_VALIDATION`

**Decision:** See `apps/api/prisma/medications/audit-summaries/medication-phase5-enterprise-certification-summary.json`.

**Related:** [Phase 4](./medication-intelligence-phase-4-canonical-reconciliation.md) · [Roadmap](./medication-intelligence-roadmap.md)

---

## Purpose

Build a controlled, legal, auditable path to ingest **authentic NLM RxNorm** (or approved extracts) into Medora’s **reference staging layer only** — without clinical activation, automatic verification, or RxCUI assignment to canonical medications.

Certification uses a **structural RXNCONSO-shaped fixture** (`DEV_SAMPLE`):

```text
RealRxNormDataSupported: YES
RealRxNormDataUsedDuringCertification: NO
```

---

## Non-negotiable constraints

| Gate | Value |
|------|-------|
| HumanVerificationRequired | YES |
| AutomaticVerificationEnabled | NO |
| ClinicalActivationEnabled | NO |
| FullReleaseImportExecuted (cert) | NO |
| SourceFilesCommittedToGit | NO |
| RealVerifiedMappingsCreatedByCertification | 0 |

Real import does **not** write `MedicationConcept.rxNormConceptId` or touch CatalogMedication / formulary / inventory / MAR / billing.

---

## Source acquisition (operator responsibility)

1. Obtain RxNorm through an **authorized NLM distribution channel**.
2. Place files under local (gitignored) `.local-data/rxnorm/`.
3. Build a manifest with license acknowledgment and SHA-256 file hashes.
4. Run validate → stage → candidates with confirmation flags.
5. Review candidates via **Phase 4** human verification (never auto-verify).

**Do not commit** `RXNCONSO.RRF`, archives, credentials, or API keys.

---

## Manifest

See `apps/api/prisma/medications/rxnorm/fixtures/structural-rxnorm-manifest-p5.json` for the structural example.

Required: `sourceClassification`, `releaseScope`, `releaseVersionOfficial`, `licenseAcknowledged: true`, `files[]` with hashes, `importPurpose`.

`FULL_RELEASE` requires `--confirm-full-release` (not used in Phase 5 certification).

---

## CLI

```bash
pnpm --filter @medora/api medication:rxnorm:real:manifest -- --manifest=... --source-dir=...
pnpm --filter @medora/api medication:rxnorm:real:validate -- --manifest=... --source-dir=... --actor=...
pnpm --filter @medora/api medication:rxnorm:real:stage -- \
  --manifest=... --source-dir=... --actor=... \
  --confirm-real-source --confirm-nonclinical-only
pnpm --filter @medora/api medication:rxnorm:real:candidates -- \
  --confirm-real-source --confirm-nonclinical-only ...
pnpm --filter @medora/api medication:rxnorm:real:report -- ...
pnpm --filter @medora/api medication:rxnorm:real:rollback -- \
  --confirm-rollback-real-release ...
```

Structural fixture defaults (certification):

```bash
pnpm --filter @medora/api medication:rxnorm:real:validate
pnpm --filter @medora/api medication:rxnorm:real:stage -- \
  --confirm-real-source --confirm-nonclinical-only --actor=PHASE5_CERT
```

---

## Migration

`20261007120000_medication_phase_5_real_rxnorm_ingestion` — additive release/job provenance fields.

Local:

```bash
pnpm --filter @medora/api exec prisma migrate deploy
pnpm --filter @medora/api exec prisma generate
```

Production schema only (document — do not auto-import RxNorm):

```bash
DATABASE_URL="<RAILWAY_DATABASE_URL>" pnpm --filter @medora/api exec prisma migrate deploy
```

```text
Seed Required: NO
```

---

## Activation terminology

| Term | Meaning in Phase 5 |
|------|---------------------|
| `REFERENCE_RELEASE_ACTIVE` | Release available for governance/reference tooling |
| `CLINICALLY_ACTIVE` | **Never set** in Phase 5 |

---

## Certification

```bash
pnpm --filter @medora/api medication:certify:phase5
```

---

## Known gaps

- No authentic full NLM release tested in CI
- No admin UI / REST API / automated download
- No pack mapping / relationships / French RxNorm terms
- No real mapping review completed
- Ambiguous candidate backlog remains
- AuditLog enrichment optional
- Phase 3 certification uses provenance-aware classification: governed Phase 4 synthetic FIXTURE assignments (`SYNTH_*` RxCUI + verified mapping + synthetic release) are accepted; unauthorized real or unexplained canonical RxCUI assignments still fail Phase 3.

---

## Phase 6 recommendation

**Governed RxNorm Review Operations, Admin API/UI, and Controlled Real Mapping Pilot** — only after Phase 5 certification. Still no broad clinical activation without a separate certification.
