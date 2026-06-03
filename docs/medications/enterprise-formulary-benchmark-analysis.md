# M1.7A — Enterprise Formulary Benchmark & Impact Analysis

**Date:** 2026-06-03  
**Companion:** `enterprise-formulary-gap-audit.md`, `enterprise-formulary-wave3-strategy.md`

---

## Part 2 — Benchmark detail by setting

### Scoring model

- **Present (1.0):** Class represented with appropriate route/form/strength for setting  
- **Partial (0.5):** Some agents but missing common alternatives or inpatient variants  
- **Absent (0):** Not in enterprise 134 and not adequately in Haiti for that setting  

### Family Medicine clinic

| Class cluster | Score | Evidence |
|---------------|------:|----------|
| HTN / lipids / HF oral | 1.0 | W1 chronic + W2 cardiology |
| Type 2 diabetes oral / injectable | 1.0 | Metformin, GLP-1, insulins in enterprise |
| Vaccines adult/peds core | 1.0 | W1 vaccine bucket (13) |
| Anticoag ambulatory | 1.0 | Warfarin, DOACs, enoxaparin |
| ABX common outpatient | 0.5 | Haiti depth; enterprise ID subset |
| Psychiatry ambulatory | 0.5 | 6 psych rows; missing SNRI/ADHD breadth |
| Dermatology | 0 | No enterprise derm module |
| Rheumatology | 0 | No DMARDs |
| Nephrology CKD | 0 | No binders/EPO |
| **Weighted estimate** | **~62%** | — |

### Urgent Care

| Class cluster | Score | Evidence |
|---------------|------:|----------|
| Analgesics / antipyretics | 1.0 | Haiti + acetaminophen/ibuprofen |
| Steroids short course | 1.0 | Prednisone, dexamethasone |
| ABX URI/UTI/skin | 1.0 | Haiti ABX |
| Epinephrine / anaphylaxis | 1.0 | Haiti + ER_CRITICAL |
| Antiemetic | 0.5 | Ondansetron in W2 |
| Fracture pain C-II | 0 | Policy gap |
| **Weighted estimate** | **~70%** | — |

### Internal Medicine (ambulatory + limited inpatient)

| Class cluster | Score | Evidence |
|---------------|------:|----------|
| Cardiology | 1.0 | Strong enterprise |
| Endocrine | 1.0 | Strong enterprise |
| Pulmonary | 0.5 | Partial inhaler matrix |
| GI | 0.5 | PPI/H2; weak IBD |
| Nephro | 0 | Critical gap |
| Neuro | 0.5 | Partial AED |
| **Weighted estimate** | **~55%** | — |

### Emergency Department

| Class cluster | Score | Evidence |
|---------------|------:|----------|
| Resuscitation / ACLS | 1.0 | Adenosine, amiodarone, epinephrine |
| Anaphylaxis | 1.0 | Epinephrine IM |
| Pain IV (non-C-II) | 0.5 | Morphine/ketamine policy varies |
| Thrombolytics | 0 | Not in enterprise |
| Broad IV ABX | 0.5 | Haiti IV + partial W2 |
| **Weighted estimate** | **~65%** | — |

### Community Hospital (combined med/surg/ICU)

| Class cluster | Score | Evidence |
|---------------|------:|----------|
| Floor oral formulary | 0.5 | 325 union helps; not hospital-complete |
| ICU sedation/pressors | 0 | Wave 4 |
| Chemotherapy | 0 | Wave 5 |
| Blood products | 0 | Wave 4+ |
| **Weighted estimate** | **~35%** | — |

### Critical Access Hospital

| Class cluster | Score | Evidence |
|---------------|------:|----------|
| Primary care + ER basics | 1.0 | Haiti + enterprise vaccines/anticoag |
| Limited ICU | 0.5 | Partial IV in Haiti |
| Specialty referral meds | 0 | Waves 3–5 |
| **Weighted estimate** | **~65%** | — |

---

## Part 7 — Billing impact audit (M1.4 architecture)

### Current state (staging)

| Metric | Value |
|--------|------:|
| Enterprise billing profiles | 134 |
| `requiresManualReview=true` | **100%** |
| `billingEnabled` runtime (enterprise) | **0** |
| Claims / charge engine coupling | **None** via pilot seed |

### Projected incremental work by wave

| Wave | New catalog rows (est.) | New billing manifest rows | New `MedicationBillingProfile` | HCPCS / NDC research load |
|------|------------------------:|--------------------------:|-------------------------------:|---------------------------|
| Wave 3 | 120 | 120 | 120 | **HIGH** — mostly J-codes + retail NDC |
| Wave 4 | 200 | 200 | 200 | **VERY HIGH** — IV J-codes, infusion units |
| Wave 5 | 250 | 250 | 250 | **CRITICAL** — chemo J-codes, biologic billing |

### M1.4 architecture impact

| Component | Change required? | Notes |
|-----------|------------------|-------|
| `MedicationBillingProfile` schema | **NO** | Extend manifests only |
| `BillingCatalog` seed | **LOW** | New HCPCS rows per wave |
| `billingCodeDefault` on catalog | **ENRICH** | Per-wave remediation pass |
| Charge capture / claims | **NO** | Activation keeps `billingEnabled=false` |
| Manual review gate | **UNCHANGED** | Remains true until pharmacist workflow |

**Billing go/no-go for planning phase:** **GO** — extension-only; no engine redesign.

---

## Part 8 — Search impact audit

### Current state

| Metric | Value |
|--------|------:|
| Enterprise alias coverage (staging) | 134 / 134 catalogs with aliases |
| Provider search authority | **Legacy catalog IDs** (M1.5F deferred) |
| `orderSearchEnabled` on enterprise | **0** |

### Projected growth

| Wave | New catalog codes | Est. new aliases (2–4 per code) | Search text updates |
|------|------------------:|--------------------------------:|---------------------|
| Wave 3 | 120 | **240–480** | 120 |
| Wave 4 | 200 | **400–800** | 200 |
| Wave 5 | 250 | **500–1000** | 250 |

### Risks & mitigations

| Risk | Severity | Mitigation (M1.7E + wave discipline) |
|------|----------|--------------------------------------|
| Duplicate brand/generic rows | MEDIUM | Manifest duplicate detector (Wave 2 pattern) |
| Alias collision across waves | MEDIUM | Wave-prefixed seed audit script |
| Normalization drift (accent, strength) | MEDIUM | M1.7E RxNorm-style normalization pass |
| Unintended provider visibility | HIGH | Keep `orderSearchEnabled=false` until M1.5F sign-off |
| Legacy vs canonical search split | MEDIUM | Documented; no cutover in Waves 3–5 |

**Search go/no-go for planning phase:** **GO** — alias growth bounded by manifest; cutover still deferred.

---

## Part 9 — Readiness projection table

| State | Enterprise | Union unique | Family med % | Community hosp % | Billing ready | Search ready |
|-------|------------|--------------|-------------|------------------|---------------|--------------|
| Now | 134 | ~325 | ~62% | ~35% | Profiles 100% manual review | Aliases 100% enterprise |
| +Wave 3 | ~254 | ~470 | ~72% | ~40% | +120 profiles | +~360 aliases |
| +Wave 4 | ~454 | ~670 | ~78% | ~55% | +200 profiles | +~600 aliases |
| +Wave 5 | ~704 | ~950 | ~85% | ~65% | +250 profiles | +~750 aliases |

---

## Governance & operational (planning go/no-go)

| Domain | Planning verdict |
|--------|------------------|
| Governance | **GO** — wave manifests + flags; psych/onc require committee per wave |
| Operational | **GO** — runbooks exist for pilot; wave seeds require new runbooks at M1.7B+ |
| Data safety | **GO** — no migration; ENRICH-first; RESTRICT deletes unchanged |

---

## SAFE / NOT SAFE (M1.7A audit only)

| Verdict | Rationale |
|---------|-----------|
| **SAFE** | Read-only audit; no seed/activation; Waves 3–5 are **planned** not executed |
| **NOT SAFE** would apply only if bulk activation or search cutover attempted without wave governance |
