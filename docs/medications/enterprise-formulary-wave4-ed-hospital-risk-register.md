# M1.7C — Enterprise Formulary Wave 4 ED/Hospital Risk Register

**Date:** 2026-06-03  
**Status:** Pre-activation (staging seed only)

## Risk summary

| ID | Risk | Severity | Mitigation | Residual |
|----|------|----------|------------|----------|
| W4-R01 | Premature activation exposes 219 high-acuity meds to ordering | High | All `isActive=false`, `REVIEW_REQUIRED`, env-gated seed | Low until explicit activation tranche |
| W4-R02 | LASA opioid confusion (morphine / hydromorphone / fentanyl) | High | LASA groups + high-alert flags; hydromorphone IV **no** double RN per M1.7B.2 | Medium — requires clinician training at activation |
| W4-R03 | RSI paralytic mis-administration | High | High-alert + review-required; no new MAR hard stop (by design) | Medium |
| W4-R04 | Thrombolytic (tPA/TNK) wrong-patient or wrong-dose | Critical | High-alert + thrombolytic flag; inactive until governance review | Low while inactive |
| W4-R05 | Vasopressor concentration / rate errors | High | High-alert + vasopressor classification | Medium at activation |
| W4-R06 | Dangerous alias ambiguity (e.g. “Levo”) | Medium | Scoped aliases; validation pairs for common ED abbreviations | Low |
| W4-R07 | Billing NDC/HCPCS placeholder drift | Medium | Manifest validation + `requiresManualReview=true` | Low |
| W4-R08 | ENRICH rows duplicate prior-wave products | Low | ENRICH mode adds marker only; no duplicate CREATE | Low |
| W4-R09 | Pharmacy verification perceived as blocker | Medium | Policy tests confirm informational-only (`marPharmacyVerificationBlocksAdministration() === false`) | Low |
| W4-R10 | Double RN scope creep | Medium | Validation enforces approved categories only; heparin bolus excluded | Low |

## Governance decisions locked in M1.7C

1. **Hydromorphone IV push:** warning-only — no pharmacy block, no double RN.
2. **Double RN:** insulin IV, heparin infusion, blood products, PCA/continuous opioid infusion only.
3. **Heparin bolus:** high-alert, no double RN.
4. **Rh immune globulin:** not classified as blood product; no double RN.
5. **Pharmacy verification:** informational only (unchanged from M1.7B.5).

## Remaining gaps (post-M1.7C)

| Gap | Notes | Target phase |
|-----|-------|--------------|
| Provider order search cutover | Wave 4 not searchable until activation tranche | Future activation |
| Facility-specific ED formulary subset | Full 219-row enterprise set may exceed small-clinic needs | Pilot configuration |
| Pediatric weight-based dosing helpers | Catalog entries only; no dosing calculators | Future |
| Chemotherapy double RN | Reserved for future oncology tranche | Future |
| Staging seed execution | Requires Railway staging `DATABASE_URL` | Ops |

## Activation checklist (future — do not run now)

- [ ] Clinical pharmacy review of high-alert / LASA / controlled entries
- [ ] Per-facility activation manifest (subset or full wave)
- [ ] Order search enablement tranche with governance sign-off
- [ ] Staff training on RSI, vasopressor, thrombolytic workflows
- [ ] Post-activation SQL: `active_wave4_products` matches approved subset only
