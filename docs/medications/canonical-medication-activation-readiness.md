# Canonical medication activation readiness (M1.5G)

## Pilot readiness score (0–100)

Computed by `computePilotReadinessScores` after activation dry-run or seed:

| Dimension | Inputs |
|-----------|--------|
| Activation safety | Linkage integrity %, billing avg, governance warnings |
| Search safety | Provider catalog id inflation (0 = pass) |
| Billing safety | Per-row billing preservation score |
| Governance safety | Safety profile / flag drift warnings |
| Ordering safety | Mean of activation + search |
| Enterprise readiness | Mean of all five (informational only — **not** enterprise go-live) |

## Production rollout guidance

1. **M1.5E** linkage backfill on staging; confirm ≥ 75% integrity on eligible pilot codes.
2. **M1.5F** audit reviewed; confirm legacy-authoritative search unchanged.
3. Run activation **dry-run** (`MEDORA_HAITI_CANONICAL_ACTIVATION_PILOT_DRY_RUN=1`).
4. Review failures / duplicate findings / billing warnings in seed result.
5. Activate **≤ 38** auto-eligible rows in one facility pilot only.
6. Smoke-test: provider search (no new catalog rows), order, MAR administer, billing capture, audit.
7. Keep rollback script path documented; run rollback if search inflation or duplicate rows appear.

## SAFE / NOT SAFE (M1.5G)

| Check | Expected |
|-------|----------|
| Pilot scope T1 only, ≤ 82 classified | **PASS** |
| Auto-eligible ≤ 82 | **38 PASS** |
| Duplicate manifest codes | **PASS** |
| Quarantine activation | **BLOCKED** |
| Provider search identity inflation | **PASS** (design) |
| Billing engine changes | **NONE** (this phase) |
| MAR workflow rule changes | **NONE** (this phase) |
| Enterprise formulary cutover | **OUT OF SCOPE** |

**Pilot activation SAFE for staged facility dry-run:** YES — when M1.5E backfill + M1.5F preconditions met, dry-run shows zero blocking validation failures, and search catalog id sets are unchanged.

**Enterprise / national cutover SAFE:** **NO** — M1.5H stabilization audit required; 44 T1 rows remain manual-review deferred.

## Performance

Measure provider medication search latency and result counts before/after pilot in staging. Goal: no meaningful degradation; duplicate count must remain **0**.

## Rollback plan

Use `rollbackHaitiCanonicalActivationPilot({ facilityId, dryRun: false })`:

- Deactivates pilot products.
- Restores `HAITI_M15E_CANONICAL_LINKAGE_ONLY`.
- Preserves links, billing profiles, governance data (no deletes).

## Known allowed test flake

Pre-existing acetaminophen lifecycle flake in unrelated medication tests may still appear; not introduced by M1.5G.
