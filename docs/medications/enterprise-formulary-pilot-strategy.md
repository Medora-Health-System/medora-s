# M1.6E — Enterprise Formulary Pilot Strategy

**Date:** 2026-06-02  
**Prerequisite:** M1.6E validation audit complete — staging 134/134 data-ready  
**Out of scope:** M1.5F provider search cutover, bulk activation, claim engine changes

---

## Recommendation

Proceed with **Wave 1 controlled pilot** — **10–15 medications** — before any Wave 2 activation.

| Decision | Value |
|----------|-------|
| Pilot ready? | **YES (conditional)** |
| First wave | **Wave 1 tranche A** |
| Pilot size | **10–15 products** |
| Wave 2 in pilot? | **No** (defer until Wave 1 tranche validated) |

---

## Tranche plan

### Tranche A — Wave 1 chronic oral (recommended first)

**Target:** 10–12 products  
**Category:** Non-high-alert chronic oral from Wave 1 ENRICH rows  

Candidate profile:

- Hypertension / lipid / GI chronic (e.g. amlodipine, lisinopril, losartan, omeprazole, simvastatin)
- Already M1.5E-linked catalog + Wave 1 marker
- No controlled schedule
- No high-alert flag
- Pharmacy team familiar workflows

**Exclude from tranche A:**

- Anticoagulation (warfarin, enoxaparin, DOACs) — high-alert + witness
- Vaccines — workflow / documentation distinct
- Insulin / high-alert chronic

### Tranche B — Wave 1 vaccines + remaining chronic

**Target:** 8–10 products  
**After:** Tranche A stable ≥2 weeks

- Influenza, Tdap, pneumococcal, hepatitis B, MMR, etc.
- Requires immunization documentation path validated

### Tranche C — Wave 1 anticoagulation

**Target:** 5–8 products  
**After:** Pharmacy verification + witness workflow signed off

- Warfarin, enoxaparin, apixaban, rivaroxaban, dabigatran, heparin variants
- Mandatory pharmacy lead approval per product

### Tranche D — Wave 2 by category (post Wave 1)

| Sub-tranche | Category | Size | Priority |
|-------------|----------|-----:|----------|
| D1 | Diabetes oral (glipizide, metformin-adjacent if in W2) | ~5 | Medium |
| D2 | Pulmonology inhalers (albuterol, budesonide) | ~5 | Medium |
| D3 | Cardiology breadth | ~8 | Medium |
| D4 | ER critical | ~5 | **Defer** |
| D5 | Psychiatry + controlled | ~6 | **Defer** |

---

## Activation sequence (per product)

1. **Pre-flight** — confirm staging/prod row: marker, billing profile, alias, safety profile.
2. **Facility formulary** — create `FacilityFormularyItem` for default package + pilot `facilityId`.
3. **Governance approve** — formulary approval action + clinician note.
4. **Activate** — set product + concept active (`REVIEW_REQUIRED` → approved state via governance).
5. **Order search** — enable runtime flag (still legacy catalog visible until M1.5F).
6. **MAR** — enable after administration profile verified.
7. **Billing** — pharmacist clears manual review; enable with reviewed HCPCS/unit/role.
8. **Verify** — smoke test: search, order, MAR entry (test patient); no production cutover without sign-off.
9. **Monitor** — 48h watch for search misses, billing blockers, governance alerts.

---

## Rollback (per product)

| Step | Action |
|------|--------|
| 1 | Disable billing → MAR → order search runtime flags |
| 2 | Deactivate product + concept |
| 3 | Set governance status back to `REVIEW_REQUIRED` if needed |
| 4 | Deactivate or remove facility formulary item |
| 5 | Log rollback note in governance audit |

**No re-seed required.** Markers remain for future re-activation.

---

## Success criteria (pilot)

| Metric | Target |
|--------|--------|
| Tranche A activated without data defects | 10–15 products |
| Billing gate blocks bypass | 0 bypass incidents |
| Provider search (legacy) finds activated meds | 100% tranche spot-check |
| High-alert witness enforced | N/A in tranche A |
| Rollback tested | ≥1 dry rollback in staging |
| Production pilot | After staging tranche A passes |

---

## Timeline suggestion

| Week | Activity |
|------|----------|
| W1 | Staging tranche A (10 meds) + rollback drill |
| W2 | Clinician UAT on staging; pharmacist billing review |
| W3 | Production tranche A (if staging green) |
| W4+ | Tranche B/C planning; Wave 2 not before W3 production stable |

---

## What not to do

- Do not activate all 45 Wave 1 at once.
- Do not activate Wave 2 ER/psych/controlled in first production pilot.
- Do not enable billing without clearing `requiresManualReview`.
- Do not treat formulary activation as M1.5F provider search cutover.
- Do not skip facility formulary linkage.

---

## Next phase label

**M1.6F — Controlled Pilot Activation (Wave 1 Tranche A)**
