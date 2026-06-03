# Enterprise Formulary Expansion Audit (M1.6A)

**Program:** Medora-S medication platform  
**Phase:** M1.6A — audit only  
**Date:** 2026-06-02  
**Constraints:** No code, seeds, migrations, activations, search/billing/governance changes, or imports.

**Data source:** Railway staging (`switchyard.proxy.rlwy.net`) — read-only SQL + `auditHaitiCanonicalStabilization` + manifest analysis. **Production Haiti clinic:** NOT VERIFIED.

**Companion:** [enterprise-formulary-gap-register.md](./enterprise-formulary-gap-register.md) · [enterprise-formulary-roadmap.md](./enterprise-formulary-roadmap.md) · [enterprise-formulary-readiness.md](./enterprise-formulary-readiness.md)

---

## Precondition gate — **PASS (staging)**

Haiti canonical program complete on **Railway staging** (post M1.5R.1):

| Precondition | Required | Railway staging | Verdict |
|--------------|----------|-----------------|---------|
| **M1.5R** remediation | 0 quarantine links; 0 active `19G*` pollution | **0** quarantined; **0** active `19G*` | **PASS** |
| **M1.5E** backfill | ~**192** clean links; M1.5E markers | **192** markers; **0** manifest missing links | **PASS** |
| **M1.5G** validation | 38 eligible; 0 blocking failures | Dry-run **38** activatable; **0** failures | **PASS** |
| **M1.5H** | **STABILIZED** | `m15hRecheck.overall` **PASS** | **PASS** |

**M1.6A may proceed as enterprise planning audit.** Expansion **execution** remains phased (M1.6B+); not a bulk go-live approval.

---

## Executive summary

| Question | Answer |
|----------|--------|
| Ready for **full** enterprise formulary expansion? | **NOT READY** |
| Ready for **M1.6B Wave 1** (anticoag, vaccines, chronic core)? | **READY (conditional)** — after clinical sign-off + wave manifest |
| Recommended strategy | **D — Hybrid phased expansion** (curated waves; canonical link/activate per M1.5E/G pattern; no 1000+ bulk import) |
| **SAFE / NOT SAFE** | **SAFE (conditional)** for Haiti MVP + staged Wave 1 on staging; **NOT SAFE** for national/enterprise cutover or search replacement |

Medora-S has a **mature Haiti clinic formulary** (**247** active clinical catalog codes), **stabilized canonical linkage** (**192** M1.5E chains), and **strong ER/infectious-disease coverage**. **US enterprise breadth** (anticoag DOACs, vaccines, psychiatry, oncology, inpatient hospital formulary) is **largely absent**. Billing and governance **manifests exist**; **staging billing seed (M1.4B) is not fully applied** on catalog rows.

---

## Part 1 — Current formulary inventory

### 1.1 Entity counts (Railway staging, read-only)

| Entity | Total | Active | Inactive | Notes |
|--------|------:|-------:|---------:|-------|
| `CatalogMedication` | **289** | **286** | **3** | **247** Haiti clinical + **39** PRI_ER `CTL_CAT_*` |
| `MedicationAlias` | **344** | **344** | **0** | Legacy provider-search aliases |
| `MedicationConcept` | **224** | **39** | **185** | **+120** from M1.5E |
| `MedicationProduct` | **296** | **39** | **257** | **192** M1.5E linkage-only (inactive) |
| `MedicationPackage` | **296** | **39** | **257** | **192** M1.5E packages |
| `MedicationSafetyProfile` | **224** | **224** | **0** | **120** created with M1.5E |
| `MedicationBillingProfile` | **80** | **80** | **0** | **38** on M1.5E pilot-eligible injectables |
| `MedicationSearchAlias` | **104** | **104** | **0** | Canonical search aliases |
| `MedicationFormularyImportStaging` | **356** | — | — | Workbook/staging only |

### 1.2 Linkage and coverage percentages

| Metric | Count | % of Haiti 247 target |
|--------|------:|----------------------:|
| Products with `legacyCatalogMedicationId` | **228** | — |
| M1.5E manifest-aligned links | **192** | **100%** of `MISSING_CANONICAL_TARGET` |
| PRI_ER inventory links (non-Haiti) | **36** | N/A (separate path) |
| Quarantined / incorrect links | **0** | **100%** clean |
| Active `19G*` pollution catalogs | **0** | **100%** remediated |
| Catalog rows with ≥1 `MedicationAlias` | **247** / 286 active | **86%** alias coverage (active catalogs) |
| `billingCodeDefault` on active catalogs | **0** | **0%** (M1.4B catalog seed not applied on staging) |
| `ndc11` on active catalogs | **0** | **0%** |
| `ndc11` on packages | **42** | Partial (PRI_ER + subset) |
| `BillingCatalog` (`triggerSource=MEDICATION`) | **4** | Manifest design **83** — **~5%** applied |

### 1.3 Classification

| Class | Catalog (active) | Canonical (M1.5E) | Notes |
|-------|------------------:|------------------:|-------|
| **Haiti Phase 1 formulary** | **247** | **192** linked inactive products | Source: `haitiMedicationFormularyCatalog` |
| **PRI_ER promoted inventory** | **39** `CTL_CAT_*` | **36** linked | Parallel to Haiti; not M1.5E manifest |
| **M1.5G pilot-eligible (T1)** | subset of 247 | **38** validated | Not yet activated on staging |
| **US enterprise / inpatient** | — | — | **Not modeled** |
| **Vaccines** | **0** | **0** | **Absent** |
| **Oncology chemo** | **0** | **0** | **Absent** |

---

## Part 2 — Clinical specialty coverage (0–100)

*Enterprise score = safe catalog + billing + governance + search at **US hospital/ambulatory** breadth. Haiti MVP scores higher where seed is intentional.*

| Specialty | Score | Rationale (staging) |
|-----------|------:|---------------------|
| Primary Care | **58** | Strong antibiotics, analgesics, PPIs; gaps vaccines, statins depth, thyroid |
| Internal Medicine | **52** | No DOACs; limited diabetes intensification |
| Family Medicine | **55** | Overlaps primary; no vaccine panel |
| Emergency Medicine | **78** | Haiti ER/IV strong; tPA/tenecteplase not in catalog |
| Urgent Care | **70** | Overlaps ER; anticoag/vaccine gaps |
| Hospital Medicine | **42** | No inpatient formulary module |
| Critical Care | **55** | Pressors/sedation in Haiti seed; paralytics/albumin/linezolid gaps |
| Cardiology | **45** | BB, amlodipine partial; no DOACs, clopidogrel, atorvastatin |
| Endocrinology | **48** | Metformin, insulin present; no GLP-1/SGLT2 brands as rows |
| Pulmonology | **62** | Salbutamol, steroids, inhalers in seed |
| Psychiatry | **38** | Haloperidol; no SSRI/SNRI catalog rows |
| Neurology | **35** | Limited antiepileptics; no tPA |
| Nephrology | **32** | Furosemide; no sevelamer, IV iron, EPO |
| Gastroenterology | **50** | PPIs, metronidazole; limited IBD/biologics |
| Infectious Disease | **72** | Strong antibiotic/antimalarial Haiti block |
| Rheumatology | **28** | NSAIDs; no methotrexate/biologics |
| Dermatology | **45** | Topical antifungals/steroids partial |
| Pediatrics | **22** | No weight-based pediatric SKU set |
| OB/GYN | **48** | Oxytocin, misoprostol, medroxyprogesterone; limited contraception |
| Oncology | **12** | No chemo/supportive care module |
| Orthopedics | **40** | Analgesics; limited bone health |
| Pain Management | **55** | Morphine, fentanyl, hydromorphone; no oxycodone/buprenorphine rows |

**Average specialty score:** **~46/100** (enterprise US-oriented).

---

## Part 3 — Top medication gaps (priority)

See [enterprise-formulary-gap-register.md](./enterprise-formulary-gap-register.md) for full **Top 100** with CRITICAL/HIGH/MEDIUM/LOW.

**Summary by priority:**

| Priority | Count | Examples |
|----------|------:|----------|
| **CRITICAL** | 12 | Warfarin, enoxaparin, apixaban, rivaroxaban, influenza/Tdap/pneumococcal vaccines, carboplatin/paclitaxel (if oncology scope) |
| **HIGH** | 28 | DOACs, insulin analog brands, SSRIs, atorvastatin/rosuvastatin, clopidogrel, linezolid, vancomycin PO |
| **MEDIUM** | 35 | Pulmonary maintenance inhalers, psych atypicals, HIV ART, OB contraception SKUs |
| **LOW** | 25 | Specialty deferrals, blood products, biologics wave 4 |

---

## Part 4 — Anticoagulation audit

| Agent | Present | Searchable | Billable | Governance | Notes |
|-------|---------|------------|----------|------------|-------|
| **Heparin** | **Yes** | Yes (2 rows: Haiti + PRI_ER) | Partial (1 M1.5E BP on injectables subset) | High-alert manifest | In Haiti seed |
| **Warfarin** | **No** | No (Coumadin alias **0** hits) | No | MANIFEST_ONLY | **HIGH gap** |
| **Enoxaparin** | **No** | No (Lovenox **0** hits) | No | MANIFEST_ONLY | **HIGH gap** |
| **Apixaban** | **No** | No | No | Not in catalog | DOAC |
| **Rivaroxaban** | **No** | No | No | Not in catalog | DOAC |
| **Dabigatran** | **No** | No | No | Not in catalog | DOAC |
| **Edoxaban** | **No** | No | No | Not in catalog | DOAC |

**Anticoagulation enterprise readiness:** **25/100** (heparin only).

---

## Part 5 — Vaccine audit

| Vaccine | Present | Searchable | Billable | Governance ready |
|---------|---------|------------|----------|------------------|
| Influenza | **No** | No | No | N/A |
| COVID-19 | **No** | No | No | N/A |
| Tdap / Td | **No** | No | No | N/A |
| MMR | **No** | No | No | N/A |
| Varicella | **No** | No | No | N/A |
| Shingrix | **No** | No | No | N/A |
| Pneumococcal | **No** | No | No | N/A |
| Hepatitis A / B | **No** | No | No | N/A |
| HPV | **No** | No | No | N/A |
| Meningococcal | **No** | No | No | N/A |
| RSV | **No** | No | No | N/A |

**Vaccine enterprise readiness:** **0/100** — requires **Wave 1** module (immunization catalog + billing + documentation workflow).

---

## Part 6 — Chronic care audit

| Condition | Medication completeness (staging) | Score |
|-----------|-----------------------------------|------:|
| Hypertension | Amlodipine, atenolol, methyldopa; **no lisinopril depth** | **55** |
| Diabetes | Metformin (**4** rows), insulin (**3**); no GLP-1/SGLT2 | **50** |
| CHF | Furosemide, spironolactone partial | **45** |
| COPD / Asthma | Salbutamol (**6**), budesonide/beclomethasone | **65** |
| Hyperlipidemia | Simvastatin (**1**); **no atorvastatin** | **35** |
| Depression / Anxiety | **No** sertraline/fluoxetine/escitalopram | **20** |
| Thyroid | Levothyroxine (**2**) | **40** |
| GERD | Omeprazole (**2**), pantoprazole | **60** |
| BPH | Tamsulosin (**1**) | **45** |

**Chronic care bundle readiness:** **~45/100** — Wave 1 should add **statins, ACE/ARB depth, SSRI baseline, insulin SKU normalization**.

---

## Part 7 — Enterprise search audit

**Method:** Active `CatalogMedication` + `MedicationAlias` + M1.5H search scenarios on staging.

| Check | Result |
|-------|--------|
| M1.5H alias scenarios (13 queries) | **13/13 PASS**; **0** clone/pollution hits |
| Brand ↔ generic pairs (sample) | |
| Coumadin ↔ Warfarin | **FAIL** (0 warfarin) |
| Lovenox ↔ Enoxaparin | **FAIL** |
| Lasix ↔ Furosemide | **PASS** (3 furosemide) |
| Rocephin ↔ Ceftriaxone | **PASS** (3 ceftriaxone) |
| Ativan ↔ Lorazepam | **PASS** (2 lorazepam) |
| Zofran ↔ Ondansetron | **PASS** (3 ondansetron) |
| Alias on active catalogs | **86%** (247/286) |
| Canonical `MedicationSearchAlias` | **104** rows (not provider-primary) |

**Search enterprise readiness score:** **58/100** — Haiti/ER strong; **US brand gaps** for anticoag and psych.

---

## Part 8 — Billing readiness audit

| Capability | Staging | Manifest / design | Enterprise ready? |
|------------|---------|-------------------|-------------------|
| `billingCodeDefault` on catalog | **0** / 286 active | M1.4B **83** codes | **FAIL** operational |
| `MedicationBillingProfile` | **80** | Package-level HCPCS | **PARTIAL** (38/192 M1.5E) |
| `ndc11` catalog | **0** | NDC map **16** keys | **FAIL** operational |
| `ndc11` packages | **42** | — | **PARTIAL** |
| `BillingCatalog` MEDICATION | **4** | **83** intended | **FAIL** operational |
| Infusion / admin billing | Catalog `administrationType` on Haiti rows | M1.4D design | **PASS** design |
| J-code / HCPCS coverage | **38** pilot injectables profiled | **82** billable manifest | **PARTIAL** |

**Billing enterprise readiness score:** **42/100** (architecture **75**, staging seed **25**).

---

## Part 9 — Governance readiness audit

| Domain | Staging | Manifest | Enterprise ready? |
|--------|---------|----------|-------------------|
| Controlled substances (catalog flag) | **6** active controlled | M1.3C **17** entries | **PARTIAL** |
| High-alert (`MedicationSafetyProfile`) | **10** profiles | M1.3D **15** APPLY | **PARTIAL** |
| LASA (`lasaGroupId`) | **0** populated | M1.3E **4** groups | **FAIL** persistence |
| Witness (`requiresWitness` on catalog) | **0** | High-alert manifest | **PARTIAL** |
| Double-sign | On opioid rows in seed | Manifest | **PARTIAL** |
| Waste workflows | Code paths exist | Not formulary-scoped | **PARTIAL** |
| Pharmacy verification | Product `governanceStatus` | Staging inactive | **PASS** design / **FAIL** runtime |
| Quarantine enforcement | **PASS** (M1.5H) | M1.5D | **PASS** |

**Governance enterprise readiness score:** **55/100**.

---

## Part 10 — Expansion waves (summary)

Detailed in [enterprise-formulary-roadmap.md](./enterprise-formulary-roadmap.md).

| Wave | Scope | Est. new catalog rows | Complexity | Risk |
|------|--------|----------------------:|------------|------|
| **1 (M1.6B)** | Anticoagulants, vaccines, chronic core | **~45–60** | Medium | **HIGH** (controlled/vaccine workflows) |
| **2** | Cardiology, endocrinology, pulmonology | **~80–100** | Medium | MEDIUM |
| **3** | Psychiatry, neurology, nephrology, GI | **~90–120** | High | HIGH |
| **4** | Oncology, critical care infusion, biologics | **~150+** | Very high | **CRITICAL** |

---

## Part 11 — Risk register (summary)

Full register: [enterprise-formulary-gap-register.md](./enterprise-formulary-gap-register.md).

| ID | Risk | Level |
|----|------|-------|
| R-E1 | Bulk import without canonical/quarantine gates | **CRITICAL** |
| R-E2 | Anticoagulant activation without witness/INR workflow | **HIGH** |
| R-E3 | Vaccine module absent — orders may use wrong catalog pattern | **HIGH** |
| R-E4 | M1.4B not applied on staging — revenue leakage on new rows | **HIGH** |
| R-E5 | Provider search cutover before wave validation | **CRITICAL** |
| R-E6 | Oncology chemo without separate governance module | **CRITICAL** |

---

## Part 12 — Enterprise readiness scorecard

| Dimension | Score (0–100) |
|-----------|---------------:|
| Catalog completeness | **38** |
| Search readiness | **58** |
| Billing readiness | **42** |
| Governance readiness | **55** |
| Canonical architecture | **92** |
| Activation readiness | **68** |
| **Enterprise formulary readiness** | **52** |

*Canonical architecture reflects M1.5H PASS on staging; enterprise score capped by catalog breadth and billing seed gaps.*

---

## Part 13 — Final decision

### Enterprise formulary expansion (full platform)

# **NOT READY FOR ENTERPRISE FORMULARY EXPANSION**

### Phased Wave 1 (M1.6B) planning

# **READY (conditional)** — architecture stabilized; execute Wave 1 manifest + M1.4B on new rows + M1.5E/G per row

### SAFE / NOT SAFE

| Operation | Verdict |
|-----------|---------|
| Haiti MVP ordering (247 codes, post M1.5H) | **SAFE (conditional)** |
| M1.6B Wave 1 staging build | **SAFE (conditional)** — clinical + pharmacy sign-off |
| Bulk enterprise formulary import | **NOT SAFE** |
| M1.5F provider search cutover | **NOT SAFE** until waves validated |
| National / multi-facility formulary | **NOT SAFE** (Phase 6+) |

---

## Next phase

**M1.6B — Enterprise Formulary Wave 1** (Anticoagulants, Vaccines, Chronic Care Core) — see roadmap doc.
