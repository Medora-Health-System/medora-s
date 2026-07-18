# Phase 16 — Activation Guide (Future-Gated)

Phase 16 **does not** enable Controlled Pilot or Enterprise Active.

Database CHECK constraints and shared defaults keep:

- `controlledPilotAllowed = false`
- `enterpriseActiveAllowed = false`
- `clinicalActivationAllowed = false`
- `orderFromRecommendationAllowed = false`

A later phase may relax these only after explicit certification and product authorization. Do not bypass Phase 16 asserts.
