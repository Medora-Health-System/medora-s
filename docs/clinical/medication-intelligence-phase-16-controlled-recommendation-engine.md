# Medication Intelligence Phase 16 — Controlled Shadow Recommendation Engine

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_16_CONTROLLED_ACTIVATION_ENTERPRISE_MEDICATION_RECOMMENDATION_ENGINE`

**Expected decision:** `MEDICATION_INTELLIGENCE_PHASE_16_CERTIFIED_SHADOW_ONLY`

**Extends:** Phase 15 authoritative knowledge / remediation (does not rewrite Phase 15).

---

## Mission

Build a governed Enterprise Medication Recommendation Engine that can safely expose medication knowledge to clinicians in **shadow mode**, fully reviewable and auditable — without automatically recommending therapies into care workflows.

Phase 16 is **not** production CDS activation.

## Constitutional boundaries

Medication Intelligence remains advisory. Phase 16 must never:

- block ordering or delay treatment / administration / dispensing
- modify MAR, reconciliation, order sets, billing, or documentation workflows
- activate production CDS, provider alerts, or order blocking
- allow ordering directly from a recommendation card
- enable Controlled Pilot or Enterprise Active (schema-ready; runtime blocked)

## Activation ceiling

Lifecycle states exist through Enterprise Active, but Phase 16 runtime and certification allow only up to:

`SHADOW_RECOMMENDATION`

`CONTROLLED_PILOT` and `ENTERPRISE_ACTIVE` transitions throw.

## Wave 1 scope

Same eight families as Phase 15. Acetaminophen remains identity-blocked and out of catalog.

## Architecture

```
Approved Wave 1 shadow knowledge → Recommendation definitions (Draft…Shadow)
→ Shadow evaluation store → Analytics / audit
→ Admin governance UI
→ Provider read-only cards (shadow-exposed only)
```

No edge from recommendations into Orders / MAR / Chart.

## Recommendation lifecycle

Draft → Evidence Complete → Expert Review → Approved → Shadow Recommendation → (blocked) Controlled Pilot → (blocked) Enterprise Active → Retired

## Shadow mode

During shadow evaluation:

- calculate and store recommendations
- audit differences / feedback
- produce analytics
- never mutate orders, MAR, provider workflow, patient chart, or clinical decision making

## APIs

| Method | Path |
|--------|------|
| GET | `/medications/recommendations` (exposableOnly for providers) |
| GET | `/medications/recommendations/:id/explanation` |
| GET | `/medications/recommendations/:id/evidence` |
| GET | `/medications/recommendations/:id/history` |
| POST | `/medications/recommendations/shadow/evaluate` |
| POST | `/medications/recommendations/:id/feedback` |
| POST | `/medications/recommendations/:id/review` |
| GET | `/medications/recommendations/governance/dashboard` |
| GET | `/medications/recommendations/analytics` |

## Admin / Provider UI

- Admin: `/app/admin/medication-governance/recommendations`
- Provider read-only: `/app/provider/medication-recommendations`

## CLI

```bash
pnpm --filter @medora/api medication:phase16:seed
pnpm --filter @medora/api medication:phase16:promote-shadow
pnpm --filter @medora/api medication:phase16:shadow:evaluate
pnpm --filter @medora/api medication:phase16:pipeline
pnpm --filter @medora/api medication:phase16:certify
```

## Certification semantics

Certification means: engine exists, Wave 1 shadow definitions governed, shadow evaluations non-mutating, Pilot/Active off, zero clinical activation, UI/API present, limitations disclosed.

Certification does **not** mean production recommendations influence care.

## Not claimed

- Production CDS / Controlled Pilot / Enterprise Active
- Ordering from recommendations
- Fabricated clinical facts
- Acetaminophen resolution
- Full EM catalog expansion
- Real-patient outcome validation of recommendation precision/recall

## Related guides

- [Lifecycle](./medication-intelligence-phase-16-recommendation-lifecycle.md)
- [Shadow guide](./medication-intelligence-phase-16-shadow-recommendation-guide.md)
- [Activation guide (future-gated)](./medication-intelligence-phase-16-activation-guide.md)
- [Governance](./medication-intelligence-phase-16-governance-guide.md)
- [Operational manual](./medication-intelligence-phase-16-operational-manual.md)
- [Certification guide](./medication-intelligence-phase-16-certification-guide.md)

## Next phase (do not begin here)

Limited Controlled Pilot — only after additional shadow safety evidence and explicit product authorization.
