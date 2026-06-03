# M1.7A — Enterprise Formulary Gap Audit

**Date:** 2026-06-03  
**Phase:** M1.7A (read-only audit)  
**Sources:** Wave 1/2 manifests, Haiti 247 catalog, Railway staging SQL

---

## Current inventory summary

| Layer | Count | Notes |
|-------|------:|-------|
| Enterprise Wave 1 (manifest) | **45** | Anticoag 7, Vaccine 13, Chronic 25 |
| Enterprise Wave 2 (manifest) | **89** | See bucket table below |
| **Enterprise total (unique codes)** | **134** | Staging `MedicationProduct` with W1/W2 markers |
| Haiti legacy catalog (active) | **247** | MVP Haiti formulary |
| **Union unique codes (W1+W2+Haiti active)** | **~325** | 56 overlap between enterprise + Haiti |
| Staging active `CatalogMedication` | **364** | Includes enrich + create rows |
| Tranche A pilot eligible | **12** | 0 activated post M1.6H repair |
| Pilot markers on staging | **0** | — |

### Wave 2 bucket distribution (89)

| Bucket | Count |
|--------|------:|
| CARDIOLOGY | 18 |
| ER_CRITICAL | 13 |
| DIABETES | 10 |
| PULMONOLOGY | 10 |
| INFECTIOUS_DISEASE | 10 |
| CHRONIC | 10 |
| PSYCHIATRY | 6 |
| GI | 5 |
| WOMENS_HEALTH | 5 |
| ANTICOAGULATION | 2 |

---

## Part 1 — Coverage by clinical domain (enterprise 134)

Rollup from manifest metadata (therapeutic class + bucket). Haiti-only contribution shown for context.

| Domain | Enterprise (134) | Haiti active (~247) | Combined signal |
|--------|-----------------:|--------------------:|-----------------|
| **Cardiology** (incl. anticoag) | **38** | 25 | **Strong** — HTN, statins, DOACs, warfarin, clopidogrel |
| **Endocrinology** | **17** | 10 | **Strong** — metformin, GLP-1/GIP, insulins, thyroid |
| **Vaccines** | **13** | 0 | **Strong** (enterprise) — influenza, Tdap, pneumococcal, etc. |
| **Pulmonary** | **10** | 9 | **Partial** — inhalers; missing several LABA/ICS combos |
| **Infectious Disease** | **10** | 65 | **Partial** — Haiti ABX depth; enterprise adds ID hospital subset |
| **Gastroenterology** | **6** | 11 | **Partial** — PPI/H2; limited IBD/bowel agents |
| **Psychiatry** | **6** | 0 | **Partial** — SSRI/atypical starters; no full psych formulary |
| **Emergency / Critical Care** | **19** | 57 | **Partial** — ER_CRITICAL + Haiti resus; no ICU paralytics/sedation depth |
| **Hospital Medicine (IV/oral inpatient)** | **7** | 104 | **Partial** — Haiti IV-heavy; enterprise adds governed hospital subset |
| **Nephrology** | **0** | 0 | **Critical gap** |
| **Neurology** | **~3** | 0 | **Critical gap** — levetiracetam/gabapentin in W2; no full AED set |
| **Dermatology** | **0** | 0 | **Critical gap** |
| **Rheumatology** | **0** | 0 | **Critical gap** |
| **OB/GYN** | **5** | 0 | **Partial** (W2 WOMENS_HEALTH) — not full contraception/IUD |
| **Pediatrics** | **0** | 0 | **Critical gap** (dedicated peds SKUs) |
| **Oncology** | **0** | 0 | **Critical gap** (defer Wave 5) |
| **Transplant / biologics** | **0** | 0 | **Critical gap** (defer Wave 5) |
| **Pain (controlled / multimodal)** | **0** | 9 | **Partial** — Haiti analgesics; no governed opioid expansion |

### Coverage verdict by domain

| Rating | Domains |
|--------|---------|
| **Strong** | Cardiology, Endocrinology, Vaccines (enterprise) |
| **Partial** | Pulmonary, ID, GI, Psychiatry, Emergency, Hospital oral/IV mix, OB/GYN |
| **Critical gap** | Nephrology, Dermatology, Rheumatology, Pediatrics (formulations), Oncology, Transplant/biologics, Pain (C-II policy) |

---

## Part 2 — Benchmark vs care settings (estimated)

Method: weighted coverage of **~80 core medication classes** per setting (present = 1, partial = 0.5, absent = 0).  
Baseline inventory: **~325** unique codes (enterprise + Haiti), **134** enterprise-governed.

| Setting | Est. core classes | Est. coverage % | Notes |
|---------|------------------:|----------------:|-------|
| **Family Medicine clinic** | 400–500 items | **58–65%** | Strong chronic + vaccines; weak derm, rheum, peds |
| **Urgent Care** | 200–280 items | **68–72%** | ABX, analgesics, steroids, epinephrine well covered |
| **Internal Medicine (ambulatory)** | 450–550 items | **52–58%** | Cards/diabetes solid; nephro/neuro/psych gaps |
| **Emergency Department** | 150–220 items | **62–68%** | Resus + ABX; missing thrombolytics, broad sedation |
| **Community Hospital** | 800–1200 items | **32–38%** | Missing ICU, onc, blood products, broad IV nutrition |
| **Critical Access Hospital** | 300–400 items | **62–68%** | Haiti + enterprise adequate for basic clinic/ER; weak inpatient specialty |

**Usable provider formulary today:** aligns with **~300–380** medications when counting governed + legacy-search-visible Haiti rows (M1.5F not cut over).

---

## Part 3 — Missing therapeutic classes (priority)

| Priority | Class / module | Status in 134 enterprise | Wave target |
|----------|----------------|--------------------------|-------------|
| **CRITICAL** | Nephrology (phosphate binders, CKD minerals) | Absent | Wave 3 |
| **CRITICAL** | Oncology chemo / biologics | Absent | Wave 5 |
| **CRITICAL** | Vaccines (ped/adult completeness) | **Largely addressed W1** | Wave 3 top-up only |
| **CRITICAL** | Anticoagulants | **Largely addressed W1/W2** | Maintenance only |
| **HIGH** | Dermatology topicals | Absent | Wave 3 |
| **HIGH** | Rheumatology DMARDs | Absent | Wave 3 |
| **HIGH** | Neurology AEDs / neuropathic pain | Partial | Wave 3 |
| **HIGH** | Psychiatry (SSRI/SNRI/ADHD/mood) | Partial (6) | Wave 3 |
| **HIGH** | Respiratory maintenance (LABA/ICS/LAMA) | Partial | Wave 3 |
| **HIGH** | Insulin analog completeness | Partial | Wave 3 |
| **HIGH** | HIV / ART | Absent | Wave 5 |
| **MEDIUM** | Pain — opioid C-II multimodal | Policy-gated | Wave 4 subset |
| **MEDIUM** | Anesthesia / sedation (OR/ICU) | Minimal | Wave 4 |
| **MEDIUM** | Electrolyte / resuscitation protocols | Partial (Haiti IV) | Wave 4 |
| **MEDIUM** | Blood products | Absent | Wave 4+ |
| **LOW** | Transplant immunosuppression | Absent | Wave 5 |
| **LOW** | Biologics (non-onc) | Absent | Wave 5 |
| **LOW** | ADHD stimulants (C-II) | Absent | Wave 3/4 policy |

---

## Gap vs long-term targets

| Target | Gap from today (~325 unique) | Waves required |
|--------|------------------------------|----------------|
| **600 medications** | ~275 | Wave 3 (~125) + part Wave 4 (~150) |
| **800 medications** | ~475 | Wave 3 + Wave 4 (~200) |
| **1000+ medications** | ~675+ | Waves 3–5 + ongoing Haiti harmonization |

---

## Staging verification (read-only, 2026-06-03)

| Check | Value |
|-------|------:|
| Enterprise W1 markers | 45 |
| Enterprise W2 markers | 89 |
| Enterprise total | 134 |
| Pilot markers | 0 |
| Active enterprise products | 0 |
| Enterprise `orderSearchEnabled=true` | 0 |
| Enterprise `billingEnabled=true` | 0 |
| Billing profiles (manual review) | 134 / 134 |

---

## M1.7A scope boundary

- **No** Wave 3 implementation  
- **No** seed or activation changes  
- **No** billing engine or governance redesign  

Planning outputs: `enterprise-formulary-wave3-strategy.md`, `enterprise-formulary-roadmap-1000-medications.md`, `enterprise-formulary-benchmark-analysis.md`.
