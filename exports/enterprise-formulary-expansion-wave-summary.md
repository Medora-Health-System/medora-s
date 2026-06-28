# Enterprise Formulary Expansion Wave Audit

**Ticket:** MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVES_AUDIT.1
**Generated:** 2026-06-28T05:42:28.986Z
**Final decision:** ENTERPRISE_FORMULARY_EXPANSION_AUDIT_COMPLETE

## Current readiness counts

| Metric | Count |
|---|---:|
| Total catalog medications | 710 |
| Provider-orderable | 198 |
| MAR-ready | 683 |
| Present but not provider-orderable | 512 |
| Provider-orderable but not MAR-ready | 0 |
| Missing route | 0 |
| Missing strength | 0 |
| Missing search aliases (<2) | 229 |
| Duplicate/near-duplicate families (>4 variants) | 15 |
| Controlled substances not governed | 17 |
| High-alert not governed | 175 |
| IVPB missing infusion metadata | 67 |

## Wave plans

### WAVE_1 — Emergency / Inpatient Core Stabilization

**Goal:** 600+ provider-orderable and MAR-ready medications
**Focus provider-orderable / MAR-ready in focus:** 31 / 144
**Safe / metadata / governance / catalog-add / deferred CS:** 5 / 0 / 5 / 0 / 0

| Candidate | Area | Catalog | Orderable | MAR | Safety |
|---|---|:---:|:---:|:---:|---|
| Epinephrine | Emergency / ACLS | yes | yes | yes | NEEDS_GOVERNANCE_REVIEW |
| Norepinephrine infusion | Critical Care / ICU | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Vancomycin IV | Infectious Disease / Antibiotics | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |
| Piperacillin-tazobactam IVPB | Infectious Disease / Antibiotics | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Potassium chloride IV | Renal / Electrolytes | yes | yes | yes | NEEDS_GOVERNANCE_REVIEW |
| Enoxaparin | Hematology / Anticoagulation | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |
| Acetaminophen | Pain / Analgesia | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Ondansetron | Gastrointestinal | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Propofol infusion | Critical Care / ICU | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |
| Ceftriaxone | Infectious Disease / Antibiotics | yes | no | yes | SAFE_TO_ACTIVATE_NOW |

### WAVE_2 — Full Inpatient Hospital Core

**Goal:** 850–950 provider-orderable and MAR-ready medications
**Focus provider-orderable / MAR-ready in focus:** 152 / 495
**Safe / metadata / governance / catalog-add / deferred CS:** 9 / 0 / 1 / 0 / 0

| Candidate | Area | Catalog | Orderable | MAR | Safety |
|---|---|:---:|:---:|:---:|---|
| Insulin glargine | Endocrine / Diabetes | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |
| Metformin | Endocrine / Diabetes | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Pantoprazole | Gastrointestinal | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Albuterol | Pulmonary | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Levetiracetam IV | Neurology | yes | no | yes | SAFE_TO_ACTIVATE_NOW |
| Metoprolol | Cardiology | yes | no | yes | SAFE_TO_ACTIVATE_NOW |
| Haloperidol | Psychiatry | yes | no | yes | SAFE_TO_ACTIVATE_NOW |
| Magnesium sulfate OB | OB/GYN | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Amoxicillin suspension pediatric | Pediatrics | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Cefazolin | Orthopedics | yes | no | yes | SAFE_TO_ACTIVATE_NOW |

### WAVE_3 — Specialty Expansion

**Goal:** 1,100–1,300 provider-orderable and MAR-ready medications
**Focus provider-orderable / MAR-ready in focus:** 15 / 44
**Safe / metadata / governance / catalog-add / deferred CS:** 4 / 0 / 2 / 0 / 0

| Candidate | Area | Catalog | Orderable | MAR | Safety |
|---|---|:---:|:---:|:---:|---|
| Betamethasone topical | Dermatology | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Prednisolone ophthalmic | ENT / Ophthalmology | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Tamsulosin | Urology | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Methotrexate | Rheumatology / Immunology | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |
| Filgrastim | Oncology supportive care | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |
| Linezolid | Infectious Disease / Antibiotics | yes | no | yes | SAFE_TO_ACTIVATE_NOW |

### WAVE_4 — Academic / Advanced Enterprise Coverage

**Goal:** 1,500+ governed medications
**Focus provider-orderable / MAR-ready in focus:** 11 / 37
**Safe / metadata / governance / catalog-add / deferred CS:** 1 / 0 / 2 / 2 / 0

| Candidate | Area | Catalog | Orderable | MAR | Safety |
|---|---|:---:|:---:|:---:|---|
| Rasburicase | Oncology supportive care | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |
| Infliximab | Rheumatology / Immunology | no | no | no | NEEDS_CATALOG_ADDITION |
| Dobutamine infusion | Critical Care / ICU | yes | yes | yes | SAFE_TO_ACTIVATE_NOW |
| Neonatal caffeine citrate | Pediatrics | no | no | no | NEEDS_CATALOG_ADDITION |
| Cyclophosphamide | Oncology supportive care | yes | no | yes | NEEDS_GOVERNANCE_REVIEW |

## Therapeutic area coverage

| Area | Catalog | Orderable | MAR-ready | Safe candidates | Blocked |
|---|---:|---:|---:|---:|---:|
| Emergency / ACLS | 24 | 2 | 23 | 5 | 16 |
| Critical Care / ICU | 14 | 2 | 14 | 0 | 12 |
| Infectious Disease / Antibiotics | 33 | 12 | 33 | 18 | 3 |
| Cardiology | 26 | 5 | 26 | 15 | 6 |
| Neurology | 18 | 0 | 17 | 5 | 12 |
| Endocrine / Diabetes | 30 | 9 | 27 | 11 | 7 |
| Pulmonary | 27 | 4 | 19 | 15 | 0 |
| Gastrointestinal | 365 | 121 | 357 | 150 | 86 |
| Renal / Electrolytes | 25 | 6 | 25 | 8 | 11 |
| Hematology / Anticoagulation | 14 | 1 | 9 | 0 | 8 |
| Psychiatry | 16 | 0 | 16 | 13 | 3 |
| Pain / Analgesia | 40 | 8 | 40 | 7 | 25 |
| Pediatrics | 12 | 9 | 12 | 2 | 1 |
| OB/GYN | 15 | 4 | 15 | 7 | 4 |
| Orthopedics | 6 | 0 | 6 | 6 | 0 |
| Dermatology | 19 | 8 | 19 | 11 | 0 |
| ENT / Ophthalmology | 12 | 5 | 12 | 2 | 5 |
| Urology | 2 | 2 | 2 | 0 | 0 |
| Oncology supportive care | 10 | 0 | 10 | 2 | 8 |
| Rheumatology / Immunology | 2 | 0 | 1 | 1 | 0 |

## Safety invariants

- Provider-orderable but not MAR-ready: **0** (PASS)
- Controlled substance holds: **28**
- Activated controlled substances (must be 0): **0**

## Seed / migration forecast

- Migration required: **no** (audit-only; future waves may need seed)
- Seed required when activating catalog additions: **yes**
- Local seed: `pnpm --filter @medora/api run prisma:seed-catalogs`

## Recommended next prompt

MEDUI.MEDS.ENTERPRISE_FORMULARY_EXPANSION_WAVE_1_ACTIVATION.1 — activate SAFE_TO_ACTIVATE_NOW catalog rows in Wave 1 focus areas only; no controlled substances; preserve provider-orderable-not-MAR-ready invariant at 0.