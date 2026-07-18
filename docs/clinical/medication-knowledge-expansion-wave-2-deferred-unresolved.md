# Wave 2 — Deferred and Unresolved Items

## Measured gap to target

- Target net-new concepts: **750**
- Measured distinct-generic delta: **716**
- Decision: `MEDICATION_KNOWLEDGE_EXPANSION_WAVE_2_CERTIFIED_WITH_REVIEW_ITEMS`

Limiting reasons:

1. Overlap with existing catalog generics (165 existing-concept new variants; 4 hard duplicates)
2. Indication-split candidate keys collapsed during reconcile (same generic ≠ new concept)
3. No fabrication of unsupported formulations to pad counts

## Unresolved terminology

- Nearly all Wave 2 rows lack RxNorm / NDC (by design — not fabricated)
- DailyMed linkage not implemented
- FDB not licensed

## Candidate quality follow-ups (Wave 3 prep)

- Rebuild candidate registry so `conceptKey` == normalized generic (no indication suffixes)
- Prefer authoritative RxNorm-backed imports when approved extracts are available
- ENT / specialized packs may need pharmacist review for orderable forms

## Explicitly out of scope

- Medication Intelligence Phase 19
- Recommendation auto-activation
- Production CDS / Enterprise Active
- Acetaminophen recommendation identity resolution
