# Medication Intelligence Phase 4 — Controlled Canonical Reconciliation

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_4_CONTROLLED_CANONICAL_RECONCILIATION_HUMAN_VERIFICATION_RXCUI_ASSIGNMENT`

**Decision:** See `apps/api/prisma/medications/audit-summaries/medication-phase4-enterprise-certification-summary.json`.

**Related:** [Phase 3](./medication-intelligence-phase-3-rxnorm-reference-ingestion.md) · [Roadmap](./medication-intelligence-roadmap.md)

---

## 1. Audit summary

| Topic | Finding |
|-------|---------|
| Phase 2 | Concept RxNorm fields present; all UNMAPPED before Phase 4 cert verify |
| Phase 3 | Staging + 645 AMBIGUOUS candidates; CLI import; clinical search unchanged |
| Governance UI | Formulary activation exists; **no** RxNorm verification UI |
| Delivery | **CLI-only** verification service (mirrors Phase 3 import) |
| History model | New durable `RxNormVerifiedMapping` (source of truth) |
| Blocking rule | `SYNTH*` RxCUI → only `FIXTURE` + `SYNTH_MC_*` / `SYNTH_MP_*` targets |

Phase 4 can complete **without** changing order/MAR/billing workflows.

---

## 2. Architecture decisions

1. Human verification required; `AutomaticVerificationEnabled: NO`.
2. Durable history table + candidate status updates + optional current RxCUI on **FIXTURE** concepts only.
3. Optimistic concurrency via `reviewVersion`.
4. Conflict/ambiguous verification requires acknowledge + override reasons + notes.
5. No web UI in Phase 4; no HTTP verify API.
6. Synthetic-only verified sample for certification (`RealRxNormDataUsed: NO`).

---

## 3. Mapping lifecycle

```text
CANDIDATE | NEEDS_REVIEW | AMBIGUOUS | CONFLICT
        → VERIFIED | REJECTED
VERIFIED → RETIRED (via retirement / supersession)
```

Illegal transitions throw. Import/candidate generation never writes `VERIFIED`.

---

## 4. Target compatibility

| Term types | Verify target |
|------------|---------------|
| IN, PIN, MIN, BN | `MEDICATION_CONCEPT` |
| SCD, SBD, SCDF, SBDF | `MEDICATION_PRODUCT` |
| DF, DFG | Rejected |
| GPCK, BPCK | Deferred (package architecture) |

`CATALOG_MEDICATION` verification rejected in Phase 4.

---

## 5. CLI runbook

```bash
pnpm --filter @medora/api medication:rxnorm:ensure-synthetic-targets
pnpm --filter @medora/api medication:rxnorm:review-report
pnpm --filter @medora/api medication:rxnorm:verify -- \
  --candidate-id=<uuid> --review-version=0 \
  --rationale="..." --actor=PHASE4_CERT_REVIEWER --confirm-verify \
  [--acknowledge-conflicts --override-reasons=MULTIPLE_CANDIDATES]
pnpm --filter @medora/api medication:rxnorm:reject -- \
  --candidate-id=<uuid> --rejection-reason=INSUFFICIENT_EVIDENCE \
  --rationale="..." --actor=... --confirm-reject
pnpm --filter @medora/api medication:rxnorm:retire -- \
  --mapping-id=<uuid> --rationale="..." --actor=... --confirm-retire
```

---

## 6. Migration

`20261006120000_medication_phase_4_canonical_reconciliation`

Local:

```bash
pnpm --filter @medora/api exec prisma migrate deploy
pnpm --filter @medora/api exec prisma generate
```

Production (document only):

```bash
DATABASE_URL="<RAILWAY_DATABASE_URL>" pnpm --filter @medora/api exec prisma migrate deploy
```

```text
Seed Required: NO
```

---

## 7. Isolation guarantees

Verification does **not** change: clinical search, orderability, formulary, inventory, route permissions, MAR, billing, HCPCS, EN/FR search.

---

## 8. Certification

```bash
pnpm --filter @medora/api medication:certify:phase4
```

---

## 9. Known gaps

**Blocking:** none when certification gates pass.

**Non-blocking:** real NLM RxNorm unused; admin UI/API deferred; pack verification deferred; large AMBIGUOUS backlog; optional AuditLog entity enrichment.

---

## 10. Phase 5 readiness

Phase 5 may plan **controlled real RxNorm ingestion and limited canonical enrichment** only after Phase 4 certification. Phase 4 does **not** authorize bulk real verification or search cutover.
