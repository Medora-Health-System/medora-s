# Enterprise Formulary Wave 4 — Governance Reconciliation (M1.7C.2)

**Date:** 2026-06-03  
**Entries:** 227 (post-remediation)

---

## Governance Policy Reconciliation

| Policy | M1.7C.1 | M1.7C.2 | Status |
|--------|---------|---------|--------|
| Double RN — insulin | 2 SKUs | 2 SKUs (SQ + IV drip) | **PASS** |
| Double RN — heparin infusion | 1 SKU | 1 SKU | **PASS** |
| Double RN — blood products | 4 SKUs | **5 SKUs** (+ whole blood) | **PASS** |
| Double RN — continuous opioid infusion | 3 SKUs | 3 SKUs | **PASS** |
| Double RN — hydromorphone IV push | None | None | **PASS** |
| Pharmacy verification blocks MAR | Never | Never | **PASS** |
| LASA | Warning-only | Warning-only | **PASS** |

**Double RN count:** 11 (unchanged — whole blood added, insulin SQ reclassified without duplicate double-RN)

---

## Blood Product Lineage

| Product | Catalog code | Double RN | Blood product |
|---------|--------------|-----------|---------------|
| PRBC | `PACKED_RED_BLOOD_CELLS_250_ML_PERFUSION_INTRAVEINEUSE` | Yes | Yes |
| FFP | `FRESH_FROZEN_PLASMA_250_ML_PERFUSION_INTRAVEINEUSE` | Yes | Yes |
| Platelets | `PLATELETS_APHERESIS_UNIT_PERFUSION_INTRAVEINEUSE` | Yes | Yes |
| Cryoprecipitate | `CRYOPRECIPITATE_10_UNITS_PERFUSION_INTRAVEINEUSE` | Yes | Yes |
| **Whole blood** | `WHOLE_BLOOD_500_ML_PERFUSION_INTRAVEINEUSE` | Yes | Yes |

Rh immune globulin: **not** blood product, **no** double RN (M1.7C governance fix retained).

---

## High-Alert Review Report (Part 5)

**Method:** `buildWave4HighAlertReviewReport()` — recommendations only, no manifest changes.

| Classification | Count | % of high-alert |
|----------------|-------|-----------------|
| APPROPRIATE | 137 | 92% |
| QUESTIONABLE | 12 | 8% |
| REMOVE | 0 | 0% |

**Total high-alert:** 149 / 227 (66%)

### APPROPRIATE (examples — retain at activation)

- All insulin, thrombolytics, RSI paralytics, vasopressors
- Continuous opioid infusions (fentanyl, morphine, remifentanil drips)
- Blood products (including whole blood)
- Concentrated electrolytes (KCl, MgSO4, calcium IV)
- Heparin infusion, enoxaparin, antidotes

### QUESTIONABLE (pharmacy review at activation — do not auto-downgrade)

| Catalog code | Generic | Rationale |
|--------------|---------|-----------|
| Vancomycin IV SKUs (3) | Vancomycin | Routine IV antibiotic infusion — high-alert may be excess unless concentration policy requires |
| `NITROGLYCERIN_0_4_MG_COMPRIME_SUBLINGUAL_ORALE` | Nitroglycerin | Oral SL ACS — consider informational-only |
| Ticagrelor 180/90 mg oral | Ticagrelor | Oral ACS antiplatelet |
| Albumin 5%/25% | Albumin | Maintenance colloid |
| Dextrose 5%/10% bags | Dextrose | Maintenance crystalloid |
| Normal saline 0.9% 1000 mL | Sodium chloride | Maintenance crystalloid |

**Recommendation:** At M1.7C.3 activation review, pharmacy may downgrade QUESTIONABLE entries to informational high-alert or remove flag — **never automatic in M1.7C.2**.

### REMOVE

None recommended. Conservative high-alert density is acceptable for ED/hospital staging tranche.

---

## Search Governance Reconciliation

| Rule | Implementation |
|------|----------------|
| Reject `MS`, `U`, bare `NTG` | `validateWave4DangerousAliases()` |
| Preserve Dilaudid, Versed, Roc, Zosyn, Vanc, Levophed | `validateWave4PreservedSafeAliases()` |
| Levofloxacin ≠ Levophed | `validateWave4LevophedLevofloxacinCollision()` |
| tPA scoped to alteplase/tenecteplase | `validateWave4ScopedAbbrevAliases()` |
| MgSO4 scoped to magnesium | Same |
| KCl scoped to potassium | Same |

Wired into `validateEnterpriseWave4EdHospitalFormularyManifest()` — fails CI if violated.

---

## Insulin SKU Reconciliation

| SKU | Route | Admin type | Double RN | Purpose |
|-----|-------|------------|-----------|---------|
| `REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SUBCUTANEOUS` | sous-cutanée | SUBCUTANEOUS | Yes | SQ insulin (Wave 2 ENRICH) |
| `REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE` | intraveineuse | INFUSION | Yes | IV insulin drip kit |

Code/route/administrationType alignment restored.

---

## Metoprolol Reconciliation

| Wave | Code | Mode |
|------|------|------|
| Wave 1 | `METOPROLOL_25_MG_COMPRIME_ORAL` | CREATE (canonical) |
| Wave 4 (before) | `METOPROLOL_25_MG_COMPRIME_ORALE` | CREATE (duplicate slug) |
| Wave 4 (after) | `METOPROLOL_25_MG_COMPRIME_ORAL` | **ENRICH** |

No duplicate catalog medication will be created on seed.
