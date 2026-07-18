# Medication Intelligence Phase 17 — Controlled Pilot Architecture

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_17_CONTROLLED_PILOT_QUALIFICATION_SAFETY_MONITORING_LIMITED_CLINICAL_ADVISORY`

**Extends:** Phase 16 shadow recommendation engine (does not rewrite Phase 15/16).

---

## Mission

Qualify Wave 1 shadow recommendations for a strictly limited, reversible, facility-scoped controlled pilot that may show **nonblocking informational advisories** to authorized providers only.

Phase 17 is **not** enterprise activation and **not** production CDS.

## Constitutional activation ceiling

| Mode | Phase 17 |
|------|----------|
| `SHADOW_RECOMMENDATION` | Allowed (default) |
| `CONTROLLED_PILOT` | Allowed only with explicit, scoped pilot authorization |
| `ENTERPRISE_ACTIVE` | **Blocked** (fail closed) |

## Defaults (fail closed)

- `clinicalActivationEnabled: false`
- `enterpriseActiveAllowed: false`
- `controlledPilotAllowed: false` (until an approved program is activated)
- `shadowRecommendationAllowed: true`
- `productionCdsEnabled: false`
- `providerAlertsEnabled: false`
- `orderBlockingEnabled: false`
- `orderFromRecommendationEnabled: false`
- `autoOrderEnabled: false`
- `autoSelectEnabled: false`

## Architecture

```
Phase 16 shadow definitions
  → Pilot qualification (evidence + thresholds)
  → Pilot program authorization (facility / definitions / providers / time)
  → Encounter-adjacent informational advisory
  → Acknowledgement / dismiss / disagree (nonblocking)
  → Monitoring + automatic suspension
```

No edge into Orders, Prescriptions, MAR, chart mutation, billing, or diagnoses.

## Key components

| Layer | Location |
|-------|----------|
| Shared governance | `packages/shared/src/medication/medicationRecommendationEngineGovernance.ts` |
| Migration | `20261022120000_medication_phase_17_controlled_pilot` |
| Nest module | `apps/api/src/medications/recommendation-pilot/` |
| Admin UI | `/app/admin/medication-governance/recommendation-pilot` |
| Provider UI | `/app/provider/medication-recommendations` (encounter advisory panel) |
| CLI | `medication:phase17:*` |

## Non-goals

Enterprise-wide activation, interruptive alerts, hard stops, order-from-recommendation, Wave 2 families, acetaminophen identity resolution, automatic pilot resumption, rewriting Phase 15/16 engines.
