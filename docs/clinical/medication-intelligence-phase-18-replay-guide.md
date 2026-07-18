# Phase 18 — Replay Guide

Given encounter (optional), recommendation version, and knowledge version, regenerate the recommendation fingerprint and compare to the stored definition identity.

- Read-only — never mutates patient care
- Mismatch → `MedicationRecommendationReplayFailure` + audit
- Certification fails closed if unmatched replays exist

CLI: `pnpm medication:phase18:replay-all`
