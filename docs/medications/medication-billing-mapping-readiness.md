# Medication Billing Mapping Readiness (M1.4B)

**Program:** Enterprise Medication Billing & Revenue Integrity  
**Phase:** M1.4B — Medication Billing Mapping Remediation  
**Date:** 2026-06-02  

Supersedes mapping-gap sections in [medication-billing-readiness.md](./medication-billing-readiness.md) (M1.4A) for **catalog HCPCS / BillingCatalog coverage** only. M1.4A foundation scores for infusion unit math, eMAR, and enterprise payer automation remain unchanged.

---

## Readiness verdict

| Question | Answer |
|----------|--------|
| Medication billing **mapping** remediated for Haiti billable injectables? | **Yes** |
| Safe to run remediation seed in non-prod / pilot refresh? | **Yes** (idempotent) |
| Safe for **production billing automation** without further review? | **Conditional** |
| Medication governance rollout blocked? | **No** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |

### Conditional qualifiers

- HCPCS/J-codes are **illustrative** U.S. hospital examples — replace with licensed payer sets before payer submission.
- Runtime auto-map still uses **`BillingCatalog` only** — `MedicationBillingProfile` is seeded but not consumed by `mapMedicationToBillingCode` (unchanged by M1.4B).
- NDC coverage is **priority subset** (16 codes), not full catalog.
- Production **deployment** of seed was **not** executed in this phase.

---

## Coverage metrics

| Metric | Before M1.4A | After M1.4B |
|--------|--------------|-------------|
| `MEDICATION` `BillingCatalog` keys (legacy) | 4 | 4 preserved + up to 82 manifest |
| Billable Haiti medications | 89 | 89 |
| Mapped (HCPCS/J on billable rows) | 4 | **89** |
| Unmapped billable | 85 | **0** |
| Coverage % (billable) | ~4.5% | **100%** |
| Manifest entries | — | **82** |
| NDC manifest entries | — | **16** |

---

## Remediation counters (seed contract)

On first idempotent application per environment:

| Counter | Meaning |
|---------|---------|
| `billingCatalogCreated` | New `BillingCatalog` MEDICATION rows |
| `catalogBillingDefaultCreated` | New `billingCodeDefault` on catalog |
| `catalogNdcCreated` | New catalog NDC |
| `packageBillingProfileCreated` | New `MedicationBillingProfile` on default package |
| `packageNdcCreated` | New package NDC |
| `*SkippedExisting` / `duplicateProtected` | Existing data preserved |

Second run: all `*Created` → 0; skips match manifest size.

---

## Revenue integrity status

| Path step | M1.4B status |
|-----------|--------------|
| Medication catalog code | ✅ Haiti derive aligned with manifest |
| Order → MAR | ✅ Unchanged |
| MAR → billing capture candidate | ✅ Validated statically |
| Capture → `BillingCatalog` map | ✅ Post-seed rows exist for billable codes |
| Billing event / export | ✅ No engine changes; path remains viable |

**Revenue integrity (mapping layer):** **PASS**

---

## Governance interaction

| Area | Status |
|------|--------|
| M1.3 controlled / high-alert / LASA / witness | No code changes |
| Billable controlled & high-alert injectables mapped | ✅ |
| Billing blocked by governance | No (decoupled) |

---

## Known gaps (documented, not blockers for M1.4B sign-off)

| Gap | Phase |
|-----|-------|
| Auto-map ignores `MedicationBillingProfile` | M1.4C |
| Infusion CPT/HCPCS auto-selection | M1.4C / M1.4D |
| Full-catalog NDC | Future data quality |
| J-code unit calculation | Enterprise |
| Waste billing | Future |
| Oral medication HCPCS | N/A (non-billable rule) |

---

## Validation commands (2026-06-02)

| Command | Result |
|---------|--------|
| `pnpm prisma validate` | ✅ |
| `pnpm test -- billing` | ✅ |
| `pnpm test -- medication` | ✅ shared; ⚠️ api `medication-governance-lifecycle.e2e` needs migrated DB |
| `pnpm test -- orders` | ✅ |
| `pnpm verify:web` | ✅ |

---

## Next phase

**M1.4C — Medication Administration Charge Capture Hardening** (recommended)

Wire administration CPT companions, strengthen MAR→billing capture, and optionally connect package profiles to auto-map — without expanding into full infusion governance (M1.4D).

---

## Sign-off checklist

- [x] Manifest validated (`assertMedicationBillingMappingManifest` at seed)
- [x] ≥95% billable coverage (achieved 100% Haiti billable)
- [x] Idempotent remediation seed
- [x] No governance / MAR / pharmacy / claim engine changes
- [x] Regression tests added
- [ ] Production seed run (deferred — not in M1.4B scope)
- [ ] Licensed code set replacement (operational)

**Mapping remediation:** **COMPLETE**  
**Production review:** **SAFE (conditional)**
