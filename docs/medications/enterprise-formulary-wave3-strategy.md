# M1.7B Planning — Enterprise Formulary Wave 3 Strategy

**Phase ID (proposed):** M1.7B  
**Status:** PLANNING ONLY — do not implement in M1.7A  
**Target size:** **100–150 medications**  
**Prerequisite:** M1.6H pilot GO on staging; Wave 1+2 stable on staging/production

---

## Wave 3 mission

Close **ambulatory and primary-care–hospital gap** classes that remain absent or thin after Waves 1–2:

- Nephrology  
- Dermatology  
- Rheumatology  
- Neurology (AED / neuropathic completion)  
- Psychiatry expansion  
- Pulmonary maintenance completion  
- Endocrine insulin/SGLT2 depth  
- Selected ID / peds formulations  

**Explicitly out of Wave 3:** oncology chemo, biologics, HIV full ART, C-II opioid expansion, provider search cutover (M1.5F).

---

## Design principles (carry forward from M1.6)

1. Manifest-driven CREATE/ENRICH in `@medora/shared`  
2. Per-wave billing manifest (HCPCS + NDC11 + `requiresManualReview=true`)  
3. Governance flags before any activation  
4. Enterprise markers (`ENTERPRISE_M17B_WAVE3_FORMULARY` — name TBD at implementation)  
5. No bulk activation — pilot pattern per medication after wave seed  
6. Idempotent seed; bounded alias expansion  

---

## Wave 3 candidate list (120 medications — planning)

### Nephrology (12) — CRITICAL

| # | Generic (planning) | Form / route | Priority |
|---|-------------------|--------------|----------|
| 1 | Sevelamer carbonate | Oral | CRITICAL |
| 2 | Calcium acetate | Oral | HIGH |
| 3 | Calcitriol | Oral | HIGH |
| 4 | Cinacalcet | Oral | MEDIUM |
| 5 | Sodium polystyrene sulfonate | Oral | MEDIUM |
| 6 | Iron sucrose | IV | HIGH |
| 7 | Ferric carboxymaltose | IV | MEDIUM |
| 8 | Epoetin alfa | SC | MEDIUM (policy) |
| 9 | Darbepoetin alfa | SC | LOW |
| 10 | Furosemide (IV enrichment) | IV | ENRICH if Haiti exists |
| 11 | Bumetanide | IV | HIGH |
| 12 | Vitamin D2 ergocalciferol high-dose | Oral | MEDIUM |

### Dermatology (18) — HIGH

| # | Generic | Form | Priority |
|---|---------|------|----------|
| 13 | Triamcinolone acetonide topical | Cream | HIGH |
| 14 | Clobetasol propionate | Cream | HIGH |
| 15 | Betamethasone valerate | Cream | MEDIUM |
| 16 | Mupirocin | Ointment | ENRICH |
| 17 | Clotrimazole topical | Cream | ENRICH |
| 18 | Ketoconazole topical | Cream | HIGH |
| 19 | Permethrin 5% | Cream | ENRICH |
| 20 | Hydrocortisone topical 2.5% | Cream | HIGH |
| 21 | Benzoyl peroxide | Gel | MEDIUM |
| 22 | Clindamycin topical | Gel | MEDIUM |
| 23 | Tretinoin | Cream | LOW |
| 24 | Silver sulfadiazine | Cream | MEDIUM |
| 25 | Calamine / zinc oxide | Lotion | LOW |
| 26–30 | Additional antifungal / steroid SKUs | Various | MEDIUM |

### Rheumatology (12) — HIGH

| # | Generic | Priority |
|---|---------|----------|
| 31 | Methotrexate | CRITICAL |
| 32 | Hydroxychloroquine | HIGH |
| 33 | Colchicine | HIGH |
| 34 | Allopurinol | ENRICH |
| 35 | Prednisone (rheum dosing) | ENRICH |
| 36 | Sulfasalazine | MEDIUM |
| 37 | Azathioprine | MEDIUM |
| 38 | Celecoxib | MEDIUM |
| 39 | Indomethacin | MEDIUM |
| 40–42 | Topical diclofenac / capsaicin | LOW |

### Neurology (14) — HIGH

| # | Generic | Priority |
|---|---------|----------|
| 43 | Phenytoin | ENRICH (W2 may exist) |
| 44 | Carbamazepine | HIGH |
| 45 | Valproic acid / divalproex | HIGH |
| 46 | Lamotrigine | HIGH |
| 47 | Topiramate | MEDIUM |
| 48 | Oxcarbazepine | MEDIUM |
| 49 | Pregabalin | ENRICH |
| 50 | Gabapentin | ENRICH |
| 51 | Levodopa/carbidopa | LOW (setting policy) |
| 52 | Sumatriptan | MEDIUM |
| 53–56 | Additional AED strengths | MEDIUM |

### Psychiatry (16) — HIGH

| # | Generic | Priority |
|---|---------|----------|
| 57 | Bupropion | ENRICH |
| 58 | Venlafaxine | HIGH |
| 59 | Duloxetine | HIGH |
| 60 | Mirtazapine | HIGH |
| 61 | Trazodone | HIGH |
| 62 | Aripiprazole | HIGH |
| 63 | Quetiapine | HIGH |
| 64 | Olanzapine | MEDIUM |
| 65 | Lithium carbonate | MEDIUM (monitoring) |
| 66 | Methylphenidate | MEDIUM (C-II policy) |
| 67 | Atomoxetine | LOW |
| 68–72 | Additional SSRI strengths / SNRI titration packs | MEDIUM |

### Pulmonary (12) — HIGH

| # | Generic | Priority |
|---|---------|----------|
| 73 | Fluticasone/salmeterol | HIGH |
| 74 | Budesonide/formoterol | HIGH |
| 75 | Tiotropium | HIGH |
| 76 | Ipratropium | ENRICH |
| 77 | Montelukast | ENRICH |
| 78 | Theophylline | MEDIUM |
| 79 | Roflumilast | LOW |
| 80–84 | Additional ICS/LABA strengths | MEDIUM |

### Endocrinology / diabetes (14) — HIGH

| # | Generic | Priority |
|---|---------|----------|
| 85 | Insulin lispro | ENRICH |
| 86 | Insulin aspart | HIGH |
| 87 | Insulin glargine (U-100) | ENRICH |
| 88 | Insulin detemir | MEDIUM |
| 89 | Empagliflozin | ENRICH |
| 90 | Dapagliflozin | HIGH |
| 91 | Canagliflozin | MEDIUM |
| 92 | Glimepiride | ENRICH |
| 93 | Pioglitazone | MEDIUM |
| 94–98 | GLP-1 additional strengths | MEDIUM |

### Infectious disease / public health (10) — MEDIUM

| # | Generic | Priority |
|---|---------|----------|
| 99 | Oseltamivir | HIGH |
| 100 | Nitrofurantoin | HIGH |
| 101 | Doxycycline (LD dosing) | ENRICH |
| 102 | Clindamycin oral | MEDIUM |
| 103 | Fluconazole oral | MEDIUM |
| 104–108 | Pediatric ABX suspensions (enrich) | MEDIUM |

### GI / miscellaneous ambulatory (8) — MEDIUM

| # | Generic | Priority |
|---|---------|----------|
| 109 | Sucralfate | MEDIUM |
| 110 | Dicyclomine | LOW |
| 111 | Mesalamine (oral low dose) | LOW |
| 112–116 | Antiemetic / laxative enrich | MEDIUM |

### Vaccine top-up (4) — LOW (W1 has core set)

| # | Generic | Priority |
|---|---------|----------|
| 117 | Hepatitis A vaccine | MEDIUM |
| 118 | RSV vaccine (adult) | LOW |
| 119–120 | Travel vaccines (policy) | LOW |

**Planning total: 120 CREATE/ENRICH rows** (expand to 150 with committee additions).

---

## Wave 3 acceptance criteria (implementation phase)

| Gate | Target |
|------|--------|
| Manifest entries | 100–150 |
| Billing manifest parity | 100% NDC11 + HCPCS |
| `requiresManualReview` | 100% true on new profiles |
| Governance review | 100% `REVIEW_REQUIRED` at seed |
| Pilot activation | Separate M1.6F-style tranche after wave seed |
| M1.5F search cutover | **Not in Wave 3** |

---

## Dependencies

- Clinical committee sign-off on psych/C-II subset  
- Pharmacy informatics on nephrology + rheum DMARDs  
- M1.4B billing remediation remains baseline for new rows  
- Generator script pattern from Wave 2 (`generate-wave2-manifest.mjs` → Wave 3 equivalent)
