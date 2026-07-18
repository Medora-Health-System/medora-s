# Phase 16 — Recommendation Lifecycle

States: `DRAFT` → `EVIDENCE_COMPLETE` → `EXPERT_REVIEW` → `APPROVED` → `SHADOW_RECOMMENDATION` → `CONTROLLED_PILOT` → `ENTERPRISE_ACTIVE` → `RETIRED`.

Phase 16 allows transitions only through `SHADOW_RECOMMENDATION`. Pilot/Active are refused by `isPhase16LifecycleTransitionAllowed`.

Promotion to shadow requires provenance (evidence registration or evidence link). Unsupported clinical domains must not be fabricated to complete a definition.
