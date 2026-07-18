# Medication Intelligence Phase 10 — Patient-specific safety evaluation (shadow mode)

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_10_PATIENT_SPECIFIC_MEDICATION_SAFETY_EVALUATION_SHADOW_MODE`

## 1. Mission

Run patient-specific medication safety evaluation against Phases 8–9 knowledge while remaining exclusively in **SHADOW** mode: findings may be stored and reviewed administratively, but never interrupt care.

## 2. Existing foundation

Canonical identity (1–7), clinical knowledge (8), interaction/allergy/duplicate-therapy knowledge (9).

## 3. Shadow-mode boundary

Allowed: read patient context, evaluate rules, store findings, admin UI/CLI/metrics.  
Forbidden: provider alerts, order blocking/overrides, MAR/pharmacy interruption, automatic dose/allergy/order changes, clinical notifications.

## 4. Patient-context architecture

`MedicationSafetyPatientContextSnapshot` stores minimized identifiers and normalized fields (age, weight, renal/hepatic/pregnancy when provided, order/allergy/diagnosis IDs). No full chart copy.

## 5. Medication identity resolution

Resolve product → concept → ingredients/classes. Never create concepts during evaluation. Unresolved identities become governance findings.

## 6. Evaluation pipeline

Context assembly → identity resolution → knowledge retrieval → domain evaluators → emergency context / suppression → deduplicated persistence → audit/analytics.

## 7–10. Domain evaluation

Approved Phase 9 DDI / allergen / cross-reactivity / duplicate-therapy rules; combination products expand to ingredient concepts without inventing identities.

## 11–14. Clinical knowledge evaluation

Approved Phase 8 renal/hepatic/pregnancy/lactation/monitoring/weight/age knowledge produce shadow review findings. Calculations record inputs/units/formula; orders are never modified.

## 15. Laboratory and diagnosis foundations

Interfaces use coded diagnoses and optional lab IDs when present; missing required context yields `INSUFFICIENT_PATIENT_CONTEXT`.

## 16. Emergency Medicine context

Context tags may mark findings as requiring validation or match approved suppression rules; no undocumented auto-clearing.

## 17–18. Deduplication and suppression

Deterministic `deduplicationKey`; replay is idempotent. Suppression rules are versioned, admin-approved, shadow-only, immutable when approved.

## 19. Administrative validation

`MedicationSafetyFindingValidation` classifications (true/false positive, intentional, etc.) are governance-only — not provider overrides.

## 20–21. Asynchronous integration and failure isolation

`enqueueOrderSignShadowEvaluation` is fire-and-forget. Evaluation failure never fails or mutates orders.

## 22–26. Performance, privacy, API, UI, CLI

Per-run durations recorded. Admin API `/medications/safety-evaluation/*`. UI `/app/admin/medication-governance/safety-evaluation` with French `medicationSafetyEvaluation.*`. CLI `medication:safety-evaluation:*`.

## 27–28. Testing and certification

`pnpm --filter @medora/api medication:certify:phase10` → `MEDICATION_INTELLIGENCE_PHASE_10_CERTIFIED`.

## 29. Data retention

Runs/findings/snapshots retained; do not auto-delete in Phase 10. Fixtures marked `PHASE10_SHADOW_FIXTURE` excluded from production clinical interpretation.

## 30. Phase 11 activation-readiness

Provider alerts, soft/hard stops, overrides, and live CDS remain out of scope until shadow quality metrics are acceptable.

## Explicit confirmation

**Provider alerts remain disabled. Order blocking remains disabled. Ordering, search, MAR, and billing remain unchanged. No clinical override workflow exists in Phase 10.**
