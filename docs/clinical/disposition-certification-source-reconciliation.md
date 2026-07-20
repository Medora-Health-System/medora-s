# Disposition certification source reconciliation

**Decision:** `DISCHARGE_CERTIFICATION_RECONCILIATION_CERTIFIED_WITH_REVIEW_ITEMS`  
**Scope:** Home-discharge follow-up / instruction content / communication semantics before Stage B2 push.  
**Migration:** NO · **Do not push** (policy for B2 stack until gate cleared).

## Root cause

`mergeDischargeSummaryJson` (used by `getDispositionSafetyReadiness`) previously copied only flat string keys and `patientInstructionsGiven`. It dropped structured provider-discharge arrays:

- `providerDischargeFollowUps`
- `providerDischargeDiagnosisDocs`
- `providerDischargeDiagnosisRefs`

The disposition UI hydrates follow-up from those arrays. When flat `followUp` / `followUpInstructions` rollups were absent, readiness incorrectly emitted `DISCHARGE_FOLLOW_UP_MISSING` while the chart showed structured follow-up.

`DISCHARGE_INSTRUCTIONS_NOT_GIVEN` was correctly tied to `patientInstructionsGiven`, but titles/dedupe collapsed it into “instructions missing,” conflating content with communication.

## Fix

1. `effective-discharge-summary.util.ts` — preserve structured arrays + provider string keys for readiness/close.
2. Semantic model `homeDischargeDocumentationState.ts` — separate content / planning / communication.
3. Dedupe — `DISCHARGE_INSTRUCTIONS_NOT_GIVEN` → root `DISCHARGE_INSTRUCTIONS_NOT_COMMUNICATED` (not content-missing).
4. Stage A titles + FR/EN copy — communication wording.
5. Canonical overlay — do not wipe non-empty provider rollups when canonical form fields are empty.
6. `applyProviderDischargeDocumentationToDischargeForm` — sync follow-up rollup onto legacy form.

## Established authority

Home-discharge blockers remain from `computeDispositionSafetyReadiness` / closure helpers (`hasClosureFollowUpDocumented`, etc.). Stage B1 projects them; advisory nursing education aliases collapse onto the communication root key.
