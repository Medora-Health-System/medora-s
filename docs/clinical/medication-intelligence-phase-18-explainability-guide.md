# Phase 18 — Explainability Guide

Every recommendation exposes: clinical reasoning, evidence chain, authoritative sources, confidence calculation, versions, reviewer, approval history, lifecycle, literature identifiers (metadata), conflicts/exclusions considered.

**Never** expose copyrighted source content — provenance and identifiers only.

API: `GET /medications/recommendation-ops/recommendations/:id/explanation|lineage|provenance|version`
