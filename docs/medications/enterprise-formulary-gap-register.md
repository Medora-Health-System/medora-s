# Enterprise Formulary Gap Register (M1.6A)

**Date:** 2026-06-02  
**Environment:** Railway staging (read-only)  
**Precondition:** M1.5H **STABILIZED** on staging

---

## Stabilization blockers (closed)

| ID | Gap | Status |
|----|-----|--------|
| SB-01 | M1.5R quarantined acet links | **CLOSED** (0 on staging) |
| SB-02 | M1.5E not applied | **CLOSED** (192 markers) |
| SB-03 | M1.5G validation | **CLOSED** (38 eligible, 0 blocking) |
| SB-04 | M1.5H not passed | **CLOSED** (overall PASS) |

---

## Active expansion blockers

| ID | Gap | Severity | Wave |
|----|-----|----------|------|
| **EB-01** | Zero vaccine catalog rows | **CRITICAL** | Wave 1 |
| **EB-02** | Warfarin / enoxaparin / DOACs absent | **CRITICAL** | Wave 1 |
| **EB-03** | `billingCodeDefault` 0% on active catalogs (M1.4B not seeded) | **HIGH** | Wave 1 prerequisite |
| **EB-04** | `BillingCatalog` MEDICATION 4 vs 83 manifest | **HIGH** | Wave 1 prerequisite |
| **EB-05** | LASA `lasaGroupId` not persisted on staging | **HIGH** | Wave 1–2 |
| **EB-06** | SSRI / SNRI psychiatry gap | **HIGH** | Wave 1 chronic |
| **EB-07** | Atorvastatin / rosuvastatin absent | **HIGH** | Wave 1 chronic |
| **EB-08** | Oncology chemo module absent | **CRITICAL** | Wave 4 only |
| **EB-09** | Inpatient hospital formulary not defined | **HIGH** | Wave 2+ |
| **EB-10** | Provider search still legacy-authoritative (M1.5F not cut over) | **MEDIUM** | Post-wave validation |

---

## Top 100 missing medications

*Priority for US/enterprise ambulatory + hospital gap vs Haiti 247-code MVP. **Present** = active `CatalogMedication` on staging.*

| # | Priority | Generic | Brands | Specialty | Clinical impact | Staging |
|---|----------|---------|--------|-----------|-----------------|---------|
| 1 | CRITICAL | Warfarin | Coumadin, Jantoven | Anticoag | Stroke prevention; INR workflow | **Missing** |
| 2 | CRITICAL | Enoxaparin | Lovenox | Anticoag / hospital | VTE prophylaxis/treatment | **Missing** |
| 3 | CRITICAL | Apixaban | Eliquis | Anticoag | AF/VTE; no INR | **Missing** |
| 4 | CRITICAL | Rivaroxaban | Xarelto | Anticoag | AF/VTE | **Missing** |
| 5 | HIGH | Dabigatran | Pradaxa | Anticoag | AF | **Missing** |
| 6 | HIGH | Edoxaban | Savaysa | Anticoag | AF | **Missing** |
| 7 | CRITICAL | Influenza vaccine | Fluzone, etc. | Vaccine / PH | Seasonal prevention | **Missing** |
| 8 | CRITICAL | Tdap vaccine | Adacel, Boostrix | Vaccine / OB | Pertussis prevention | **Missing** |
| 9 | CRITICAL | Pneumococcal vaccine | Prevnar, Pneumovax | Vaccine / PH | Pneumonia prevention | **Missing** |
| 10 | HIGH | COVID-19 vaccine | Comirnaty, etc. | Vaccine | Endemic prevention | **Missing** |
| 11 | HIGH | Hepatitis B vaccine | Engerix-B | Vaccine | HBV prevention | **Missing** |
| 12 | HIGH | MMR vaccine | M-M-R II | Vaccine / peds | Measles prevention | **Missing** |
| 13 | HIGH | Varicella vaccine | Varivax | Vaccine / peds | Chickenpox | **Missing** |
| 14 | HIGH | HPV vaccine | Gardasil | Vaccine / peds | Cervical cancer prevention | **Missing** |
| 15 | HIGH | Shingrix (zoster) | Shingrix | Vaccine / adult | Shingles prevention | **Missing** |
| 16 | HIGH | Meningococcal vaccine | Menveo | Vaccine / peds | Meningitis | **Missing** |
| 17 | MEDIUM | RSV vaccine | Abrysvo, Beyfortus | Vaccine | Infant/elderly RSV | **Missing** |
| 18 | HIGH | Insulin glargine | Lantus, Basaglar | Endocrine | Basal insulin | **Partial** (other insulins) |
| 19 | HIGH | Insulin lispro | Humalog | Endocrine | Bolus insulin | **Missing** |
| 20 | HIGH | Insulin aspart | Novolog | Endocrine | Bolus insulin | **Missing** |
| 21 | HIGH | Semaglutide | Ozempic, Wegovy | Endocrine | T2DM/weight | **Missing** |
| 22 | HIGH | Empagliflozin | Jardiance | Endocrine | T2DM/CV benefit | **Missing** |
| 23 | HIGH | Sitagliptin | Januvia | Endocrine | T2DM | **Missing** |
| 24 | MEDIUM | Levothyroxine | Synthroid | Endocrine | Hypothyroid | **Present** (2) |
| 25 | HIGH | Oxycodone | Roxicodone, OxyContin | Pain / C-II | Acute/chronic pain | **Missing** |
| 26 | HIGH | Hydrocodone/APAP | Vicodin, Norco | Pain / C-II | Pain | **Missing** |
| 27 | HIGH | Buprenorphine | Suboxone | Pain / addiction | OUD | **Missing** |
| 28 | MEDIUM | Methadone | Dolophine | Pain / addiction | OUD | **Missing** |
| 29 | HIGH | Alprazolam | Xanax | Psych / C-IV | Anxiety | **Missing** |
| 30 | HIGH | Sertraline | Zoloft | Psych | Depression | **Missing** |
| 31 | HIGH | Fluoxetine | Prozac | Psych | Depression | **Missing** |
| 32 | HIGH | Escitalopram | Lexapro | Psych | Depression | **Missing** |
| 33 | MEDIUM | Quetiapine | Seroquel | Psych | Psychosis/mood | **Missing** |
| 34 | MEDIUM | Aripiprazole | Abilify | Psych | Psychosis | **Missing** |
| 35 | MEDIUM | Lithium carbonate | Lithobid | Psych | Bipolar | **Missing** |
| 36 | MEDIUM | Valproic acid | Depakote | Psych / neuro | Seizure/mood | **Missing** |
| 37 | MEDIUM | Clopidogrel | Plavix | Cardiology | Antiplatelet | **Missing** |
| 38 | HIGH | Atorvastatin | Lipitor | Cardiology | Lipids | **Missing** |
| 39 | HIGH | Rosuvastatin | Crestor | Cardiology | Lipids | **Missing** |
| 40 | MEDIUM | Amiodarone | Pacerone | Cardiology | Arrhythmia | **Present** (tab) |
| 41 | MEDIUM | Nitroglycerin SL | Nitrostat | Cardiology | Angina | **Missing** |
| 42 | MEDIUM | Ipratropium | Atrovent | Pulmonology | COPD | **Missing** |
| 43 | MEDIUM | Tiotropium | Spiriva | Pulmonology | COPD | **Missing** |
| 44 | MEDIUM | Fluticasone/salmeterol | Advair | Pulmonology | Asthma/COPD | **Missing** |
| 45 | LOW | Linezolid | Zyvox | ID | MRSA | **Missing** |
| 46 | MEDIUM | Vancomycin oral | Vancocin | ID | C. diff | **Missing** (IV present) |
| 47 | LOW | Piperacillin-tazobactam | Zosyn | ID | Broad ABX | **Missing** (manifest MANUAL_REVIEW IV) |
| 48 | LOW | Meropenem | Merrem | ID | Carbapenem | **Present** |
| 49 | CRITICAL | Carboplatin | Paraplatin | Oncology | Chemo | **Missing** |
| 50 | CRITICAL | Paclitaxel | Taxol | Oncology | Chemo | **Missing** |
| 51 | CRITICAL | Cisplatin | Platinol | Oncology | Chemo | **Missing** |
| 52 | CRITICAL | Doxorubicin | Adriamycin | Oncology | Chemo | **Missing** |
| 53 | HIGH | Rituximab | Rituxan | Oncology | Biologic | **Missing** |
| 54 | HIGH | Trastuzumab | Herceptin | Oncology | Biologic | **Missing** |
| 55 | HIGH | Pembrolizumab | Keytruda | Oncology | IO | **Missing** |
| 56 | MEDIUM | Palonosetron | Aloxi | Oncology | CINV | **Missing** |
| 57 | MEDIUM | Levetiracetam | Keppra | Neurology | Seizure | **Missing** |
| 58 | MEDIUM | Phenytoin | Dilantin | Neurology | Seizure | **Missing** |
| 59 | CRITICAL | Alteplase (tPA) | Activase | Neuro/ER | Stroke | **Missing** |
| 60 | HIGH | Tenecteplase | TNKase | Cardiology/ER | STEMI | **Missing** |
| 61 | MEDIUM | Alendronate | Fosamax | Bone | Osteoporosis | **Missing** |
| 62 | MEDIUM | Sevelamer | Renvela | Nephrology | Hyperphosphatemia | **Missing** |
| 63 | MEDIUM | Epoetin alfa | Epogen | Nephrology | Anemia CKD | **Missing** |
| 64 | LOW | Filgrastim | Neupogen | Oncology | Neutropenia | **Missing** |
| 65 | LOW | Albumin | — | Critical care | Resuscitation | **Missing** |
| 66 | LOW | Cisatracurium | Nimbex | Critical care | Paralytic | **Missing** |
| 67 | LOW | Vecuronium | — | Critical care | Paralytic | **Missing** |
| 68 | LOW | Dexmedetomidine | Precedex | Critical care | Sedation | **Missing** |
| 69 | MEDIUM | Combined OCP | — | OB/GYN | Contraception | **Missing** |
| 70 | MEDIUM | Levonorgestrel IUD | Mirena | OB/GYN | Contraception | **Missing** |
| 71 | LOW | Tenofovir (HIV) | Viread | ID | HIV | **Missing** |
| 72 | LOW | Dolutegravir | Tivicay | ID | HIV | **Missing** |
| 73 | LOW | Oseltamivir | Tamiflu | ID | Influenza treatment | **Missing** |
| 74 | MEDIUM | Fondaparinux | Arixtra | Anticoag | VTE | **Missing** |
| 75 | LOW | Vitamin D3 high-dose | — | Primary care | Deficiency | **Missing** |
| 76 | LOW | Ferrous sulfate IV | — | Nephrology | Iron deficiency | **Missing** |
| 77 | LOW | Calcitriol | Rocaltrol | Nephrology | CKD mineral | **Missing** |
| 78 | LOW | Mesna | Mesnex | Oncology | Hemorrhagic cystitis | **Missing** |
| 79 | LOW | Allopurinol | Zyloprim | Oncology/ rheum | Tumor lysis | **Missing** |
| 80 | LOW | Bevacizumab | Avastin | Oncology | Biologic | **Missing** |
| 81–100 | LOW–MEDIUM | Specialty deferrals (biologics, blood products, rare IV) | Various | Multiple | Context-dependent | **Missing** |

---

## Risk register (expansion)

| ID | Risk | Class | Level | Mitigation |
|----|------|-------|-------|------------|
| R-E1 | Bulk catalog import bypasses quarantine | Activation | **CRITICAL** | Wave manifests + M1.5E/G only |
| R-E2 | Anticoag without governance profiles | Clinical | **HIGH** | M1.3C/E before activate |
| R-E3 | Vaccine billing (admin code) missing | Billing | **HIGH** | Immunization billing manifest |
| R-E4 | Search inflation on wave add | Search | **HIGH** | M1.5F gate; catalog-id set tests |
| R-E5 | DOAC + heparin duplicate search rows | Search | **MEDIUM** | Alias dedup rules |
| R-E6 | Oncology without chemo governance | Clinical | **CRITICAL** | Defer Wave 4 until module |
| R-E7 | M1.4B not applied before wave billing | Billing | **HIGH** | Seed M1.4B on staging pre-6B |
| R-E8 | Pilot activation conflated with enterprise | Activation | **HIGH** | Keep M1.5G scope ≤38 until waves pass |

---

## Clinical / billing / governance / search / activation summary

| Domain | Top gap | Level |
|--------|---------|-------|
| Clinical | Vaccines + anticoag DOACs | CRITICAL |
| Billing | Catalog `billingCodeDefault` empty | HIGH |
| Governance | LASA not on DB; anticoag profiles | HIGH |
| Search | Warfarin/Coumadin pair | HIGH |
| Activation | 192 chains inactive by design | MEDIUM (expected) |
