# Medication Intelligence Phase 18 — Architecture

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_18_OPERATIONAL_SAFETY_MONITORING_EXPLAINABILITY_REGULATORY_READINESS`

**Extends:** Phases 15–17 (does not rewrite engines).

## Mission

Operational governance platform: transparency, explainability, monitoring, auditability, regulatory *evidence* readiness — **without increasing autonomy**.

## Activation ceiling (unchanged)

Enterprise Active blocked · Production CDS OFF · Order blocking OFF · MAR/chart mutation OFF · Auto order/prescribe OFF · Order-from-recommendation DISABLED · Advisory only.

## Components

| Layer | Path |
|-------|------|
| Shared | `medicationRecommendationEngineGovernance.ts` (`PHASE18_*`) |
| Migration | `20261023120000_medication_phase_18_operational_governance` |
| Nest | `apps/api/src/medications/recommendation-ops/` |
| Admin UI | `/app/admin/medication-governance/operations-center` |
| CLI | `medication:phase18:*` |

## Engines

- Explainability (metadata/provenance only — no copyrighted excerpts)
- Deterministic replay (read-only)
- Version immutability + rollback (never delete)
- Drift detection (governance-admin alerts only)
- Operational / quality / safety metrics
- Regulatory evidence artifacts (no approval claim)
