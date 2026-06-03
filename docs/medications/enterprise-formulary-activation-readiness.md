# M1.6E — Enterprise Formulary Activation Readiness

**Date:** 2026-06-02  
**Status:** Data-ready, operationally gated

---

## Can we activate?

| Question | Answer |
|----------|--------|
| Can Wave 1 activate? | **Yes — controlled pilot** (45 products, data complete) |
| Can Wave 2 activate? | **Yes — after Wave 1 pilot** (89 products, data complete) |
| Can selected tranches activate? | **Yes — recommended approach** |
| Bulk / automatic activation? | **No — not supported, not safe** |

---

## Current activation state (Railway staging)

| State | Wave 1 | Wave 2 | Total |
|-------|-------:|-------:|------:|
| `isActive=false` | 45 | 89 | 134 |
| `governanceStatus=REVIEW_REQUIRED` | 45 | 89 | 134 |
| `concept.isActive=false` | 45 | 89 | 134 |
| Marker present | 45 | 89 | 134 |
| `orderSearchEnabled` (runtime JSON) | 0 | 0 | 0 |
| `baselineAvailable=true` | 0 | 0 | 0 |

**No activation has been executed.** Staging is in the designed pre-pilot posture.

---

## Activation gate stack

Each product must pass sequential governance actions (`MedicationProductActivationGovernanceService`):

```
1. Duplicate governance resolved (if staging inventory origin)
2. Approve formulary (governance action + note)
3. Activate product + concept
4. Enable order search (explicit runtime flag)
5. Enable MAR (administration type safe)
6. Enable billing (reviewed HCPCS/unit/role; clears manual review path)
```

Parallel hard gates when enterprise markers present:

- **Wave 1 billing gate** — profile + HCPCS + NDC required before billing activation.
- **Wave 2 billing gate** — same pattern for `ENTERPRISE_M16D_WAVE2_FORMULARY`.

Provider order search visibility (`evaluateProviderOrderSearchGate`) requires active product, active concept, order search enabled, and facility formulary approval — **not met for any enterprise product today**.

---

## Classification matrix

| Class | Criteria | Enterprise count |
|-------|----------|-----------------:|
| **Safe-to-activate (data)** | Full chain + billing + governance + alias | 134 |
| **Manual-review** | `REVIEW_REQUIRED` + `requiresManualReview` on billing | 134 |
| **Blocked (data)** | Missing chain, billing, or marker | 0 |
| **Do-not-activate (policy)** | Bulk activation, skip pharmacy review | — |

---

## Wave 1 vs Wave 2 activation readiness

| Dimension | Wave 1 | Wave 2 |
|-----------|--------|--------|
| Marker coverage | 45/45 | 89/89 |
| Billing complete | 45/45 | 89/89 |
| Safety profiles | 45/45 | 89/89 |
| Aliases on catalog | 45/45 | 89/89 |
| High-alert count | 10 | 13 |
| Controlled count | 0 | 4 |
| J-code HCPCS | 32/45 | 89/89 |
| Pilot suitability | **Higher** (smaller, core chronic + vaccines) | **Lower priority first** (breadth, ER, psych) |

---

## Blockers to full enterprise activation

| Blocker | Severity | Mitigation |
|---------|----------|------------|
| 100% billing manual review pending | HIGH | Pharmacist review queue before billing enable |
| M1.5F provider search cutover not done | MEDIUM | Legacy catalog remains searchable; canonical search deferred |
| No facility formulary items linked yet | MEDIUM | Create `FacilityFormularyItem` per package during pilot |
| Multi-step activation (no bulk tool) | LOW | By design — use governance UI per tranche |
| High-alert / controlled in Wave 2 | HIGH for those rows | Exclude from tranche 1; pharmacy witness workflow |

---

## Conditional approval

**Approved for controlled pilot activation** when:

1. Pilot tranche ≤ 15 medications.
2. Wave 1 chronic oral, non-high-alert preferred for tranche 1.
3. Each activation documented with governance note + rollback plan.
4. Billing enable deferred until pharmacist clears `requiresManualReview`.
5. Provider search cutover explicitly out of scope until M1.6F/M1.5F planning complete.

**Not approved:** bulk activation, Wave 2 ER/controlled tranche without pharmacy sign-off, or activation without facility formulary linkage.

---

## Rollback approach

Per product:

1. Disable billing runtime flag.
2. Disable MAR runtime flag.
3. Disable order search runtime flag.
4. Set `isActive=false` on product; deactivate concept if no other active products.
5. Remove or deactivate `FacilityFormularyItem` for pilot facility.
6. Audit trail preserved via existing governance audit events.

No schema migration or re-seed required for rollback.
