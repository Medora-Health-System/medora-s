# Medication Intelligence Phase 3 — Scoped RxNorm Reference Ingestion

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_3_SCOPED_RXNORM_REFERENCE_INGESTION_STAGING_PROVENANCE_MAPPING`

**Decision:** See `apps/api/prisma/medications/audit-summaries/medication-phase3-enterprise-certification-summary.json`.

**Related:** [Phase 2](./medication-intelligence-phase-2-canonical-identity.md) · [Roadmap](./medication-intelligence-roadmap.md)

---

## 1. Repository audit findings

| # | Topic | Finding |
|---|--------|---------|
| 1 | Phase 2 architecture | RxNorm mapping metadata on `MedicationConcept`; dual-layer status; route permissions; fixture classification — **present** |
| 2 | RxNorm-capable fields | `rxNormConceptId` + mapping status/confidence/version/review — **0 populated** |
| 3 | Source vocabulary | Field ready; no release registry before Phase 3 |
| 4 | Mapping states | Phase 2 lifecycle `UNMAPPED|CANDIDATE|VERIFIED|REJECTED|RETIRED` |
| 5 | Import/ETL | ICD CLI pattern (`icd:import`) + formulary workbook staging — **no RxNorm importer** |
| 6 | Staging tables | `MedicationFormularyImportStaging` exists; **unsuitable** for RxCUI releases |
| 7 | Generic job framework | **No** shared `ImportJob` model; ICD uses in-row versioning + CLI |
| 8 | Clinical search | `MedicationCatalogService` → `CatalogMedication` only |
| 9 | Canonical deps | Concept/product/package global; not search-authoritative |
| 10 | Historical deps | Order/MAR snapshots must not be rewritten |
| 11 | Audit | CLI job rows + release provenance |
| 12 | Admin permissions | Formulary import HTTP is admin-gated; RxNorm Phase 3 is **CLI-only** |
| 13 | Tenant boundaries | Reference data global; formulary/MAR/billing facility-scoped |
| 14–18 | Recommended models | New `RxNormReferenceRelease`, `RxNormImportJob`, `RxNormStagingConcept`, `RxNormMappingCandidate`, `RxNormImportConflict` |
| 19 | Rollback | Status + deactivate; preserve staging/job history |
| 20 | Indexes | On release status, staging RxCUI/checksum, candidate status |
| 21–23 | Risks | Migration additive (low); runtime unchanged (low); name-match candidate volume (medium, review-only) |
| 24 | Order workflows | Scoped import **can** complete without changing order/MAR/billing |
| 25 | RxNorm source files | **None** in repo — synthetic certification fixture only |

---

## 2. Source and licensing

```text
RealRxNormDataUsed: NO
SyntheticFixtureUsed: YES
```

- NLM RxNorm was **not** downloaded, committed, or redistributed.
- Certification uses `apps/api/prisma/medications/rxnorm/fixtures/synthetic-rxnorm-cert-p3.json`.
- Markers: `fixtureKind=SYNTHETIC_CERTIFICATION`, `notRealRxNorm=true`, RxCUIs prefixed `SYNTH`.
- Operators may later supply a local licensed source path; Phase 3 does not ship NLM artifacts.

---

## 3. Supported term-type policy

| Disposition | Types |
|-------------|-------|
| **Supported (stage + candidate)** | IN, PIN, MIN, SCD, SBD, SCDF, SBDF, BN, DF, GPCK |
| **Deferred / excluded** | BPCK, SCDG, SBDG, DFG (policy-rejected in fixture) |

All types: `everOrderable=false`, clinical `searchableReference=false` in Phase 3.

---

## 4. Architecture decisions

1. Dedicated RxNorm staging models (do not overload formulary staging).
2. Synthetic fixture for certification; real NLM import deferred.
3. Import modes: `VALIDATE_ONLY | STAGE_ONLY | CANDIDATE_MAPPING | ACTIVATE_REFERENCE_RELEASE | ROLLBACK_RELEASE`.
4. Activation requires `--confirm-activate`; rollback requires `--confirm-rollback`.
5. Candidates never auto-verify; `MedicationConcept.rxNormConceptId` not written by importer.
6. Clinical search / formulary / inventory / MAR / billing untouched.

---

## 5. Database / migration

Migration: `20261005120000_medication_phase_3_rxnorm_staging`

### Local

```bash
pnpm --filter @medora/api exec prisma migrate deploy
pnpm --filter @medora/api exec prisma generate
```

### Production (document only — do not run here)

```bash
DATABASE_URL="<RAILWAY_DATABASE_URL>" pnpm --filter @medora/api exec prisma migrate deploy
```

### Seed

```text
Seed Required: NO
```

---

## 6. CLI runbook

```bash
pnpm --filter @medora/api medication:rxnorm:validate
pnpm --filter @medora/api medication:rxnorm:stage
pnpm --filter @medora/api medication:rxnorm:candidates
pnpm --filter @medora/api medication:rxnorm:activate -- --confirm-activate
pnpm --filter @medora/api medication:rxnorm:rollback -- --confirm-rollback
```

Optional: `--file=/path/to/source.json --release=SYNTHETIC-CERT-P3-20260717`

Idempotency: re-stage skips duplicate `[releaseId, rowChecksum]` rows.

---

## 7. Safety isolation

| Layer | Phase 3 effect |
|-------|----------------|
| Clinical search | Unchanged |
| Orderability | Unchanged |
| Formulary / inventory | Unchanged |
| MAR | Unchanged |
| Billing / charges | Unchanged |
| French / English search | Unchanged |
| Route permissions | Not auto-populated from RxNorm |
| Canonical RxCUI | Not auto-populated |

---

## 8. Certification

```bash
pnpm --filter @medora/api medication:certify:phase3
```

Artifacts: `apps/api/prisma/medications/audit-summaries/medication-phase3-*.json` (22 files).

---

## 9. Known gaps

### Blocking
None when schema, focused tests, verify/build/diff-check pass and `autoVerifiedCandidates=0`.

### Non-blocking
- Real NLM RxNorm not ingested
- RRF parser deferred
- Admin reference-search UI deferred
- HTTP import API not exposed (CLI-only)
- Candidates remain unverified pending Phase 4 review workflows

---

## 10. Phase 4 readiness

Phase 4 may plan **controlled RxNorm canonical reconciliation and enterprise medication catalog expansion** only after Phase 3 certification. Phase 3 does **not** authorize automatic verification, search cutover, or full-catalog import.
