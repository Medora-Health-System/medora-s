# Enterprise Medication Catalog Completion Audit (M1.5A)

**Program:** Enterprise Medication Catalog Completion Audit  
**Phase:** M1.5A — audit only  
**Date:** 2026-06-02  
**Companion deliverables:**

- [enterprise-medication-catalog-inventory.md](./enterprise-medication-catalog-inventory.md)
- [enterprise-medication-gap-register.md](./enterprise-medication-gap-register.md)
- [enterprise-medication-expansion-strategy.md](./enterprise-medication-expansion-strategy.md)

**Constraints honored:** No code, seeds, migrations, production writes, catalog imports, billing/MAR/search changes.

---

## Executive summary

Medora-S has a **usable Haiti clinic MVP medication directory** on the **legacy** `CatalogMedication` path (**316** active local rows, **0** duplicate codes), backed by a **269-row** Haiti seed and strong **injectable billing manifest** coverage in source (**100%** of billable Haiti rows in tests).

The **enterprise canonical layer** is **not operationally complete**: **993** products (**0** active), **998** inactive concepts, **256** legacy catalog rows without product linkage, and **0** persisted high-alert / LASA / controlled flags on `MedicationSafetyProfile` despite M1.3 manifests.

**M1.4B billing remediation is designed and tested but not reflected in the local database** (4 `BillingCatalog` keys, 0 `billingCodeDefault`).

| Decision | Result |
|----------|--------|
| **Enterprise Medication Catalog READY FOR EXPANSION** | **No** |
| **Enterprise Medication Catalog NOT READY FOR EXPANSION** | **Yes** |
| **SAFE / NOT SAFE** | **NOT SAFE** for enterprise expansion; **SAFE (conditional)** for continued Haiti MVP on legacy catalog only |

---

## Part 2 — Legacy vs canonical reconciliation

### 2.1 Counts

| Check | Count | Verdict |
|-------|-------|---------|
| Catalog meds **without** `MedicationProduct.legacyCatalogMedicationId` | **256** / 316 | **FAIL** — majority not linked to canonical |
| Products **with** legacy link | **60** | **PARTIAL** |
| Products **active** + legacy link | **0** | **FAIL** |
| Concepts active | **5** / 1003 | **FAIL** |
| Packages active | **5** / 993 | **FAIL** |
| Duplicate `CatalogMedication.code` | **0** | **PASS** |
| Duplicate generic groups (multi-strength SKUs) | **61** groups | **PARTIAL** — expected variants |
| Duplicate brand via `displayNameEn` groups | **62** | **PARTIAL** |
| Inactive legacy catalog | **0** | **PASS** |
| Orphan `MedicationBillingProfile` | not exhaustively SQL-checked | **PARTIAL** — 426 profiles exist; package graph mostly inactive |

### 2.2 Interpretation

| Path | Runtime status |
|------|----------------|
| **Orders / MAR / pharmacy search** | **Legacy `CatalogMedication`** — operational |
| **Canonical order FKs** (`medicationProductId`, `medicationPackageId`) | **Not populated** in MVP flows |
| **Provider search activation gate** | Applies only to **60** legacy-linked products; all **60** excluded locally (inactive product/concept) → **256** unlinked meds bypass gate |

**Overall reconciliation:** **FAIL** (dual catalog; canonical layer dormant).

---

## Part 3 — Clinical category completion audit

Method: Haiti seed section comments (`haiti-medications.ts` §1–14) + generic-name presence + local DB therapeuticClass distribution. Scores are **enterprise readiness** (0–100) for **Haiti clinic MVP + observation/ER**, not U.S. tertiary completeness.

| Category | Present (seed / local) | Missing high-priority examples | Enterprise readiness |
|----------|------------------------|--------------------------------|----------------------|
| Emergency / ER medications | **Strong** — §13 injectable/IV block (opioids, RSI, pressors, sedation) | Rocuronium/succinylcholine in seed; etomidate in manifest | **78** |
| Controlled substances | **Partial** — morphine, fentanyl, hydromorphone, ketamine, midazolam IV | Oxycodone, hydrocodone, codeine combos, alprazolam | **42** |
| High-alert medications | **Catalog presence** for heparin, insulin, pressors, paralytics | Persisted `isHighAlert` profiles **0** | **35** |
| LASA medications | **Manifest** (5 groups) | Applied `lasaGroupId` **0** | **30** |
| Antibiotics | **Strong** — §3–4 | Linezolid, tigecycline (specialty) | **72** |
| Antivirals | **Partial** — acyclovir IV | HIV/hepatitis antivirals | **48** |
| Antifungals | **Present** — fluconazole IV, oral azoles | Amphotericin B | **55** |
| Antiparasitics | **Strong** — §5 malaria/GI | — | **70** |
| Analgesics / antipyretics | **Strong** — §1 | — | **75** |
| NSAIDs | **Strong** — §2 | — | **72** |
| Opioids | **Partial** — morphine, fentanyl, hydromorphone, tramadol | Oxycodone, hydrocodone | **50** |
| Benzodiazepines | **Partial** — diazepam, lorazepam, midazolam | Consistent oral controlled flags | **48** |
| Sedatives | **Present** — propofol, midazolam, ketamine | Dexmedetomidine | **60** |
| Paralytics | **Present** — rocuronium, succinylcholine | Cisatracurium | **58** |
| Vasopressors | **Present** — norepinephrine, epinephrine, phenylephrine, vasopressin, dopamine, dobutamine | — | **70** |
| Anticoagulants | **Partial** — heparin injectable | **Warfarin**, enoxaparin (Lovenox) | **38** |
| Antiplatelets | **Partial** — aspirin | Clopidogrel, ticagrelor | **45** |
| Antihypertensives | **Present** — §7 | — | **65** |
| Antiarrhythmics | **Present** — amiodarone, adenosine | Procainamide | **55** |
| Cardiology medications | **Present** — ACE/ARB, statins, nitrates | — | **62** |
| Diabetes medications | **Present** — metformin, glibenclamide | GLP-1, SGLT2 (specialty) | **60** |
| Insulins | **Present** — regular, NPH, 70/30 | Rapid analogs, pens | **58** |
| Respiratory | **Present** — salbutamol, steroids, antihistamines | Biologics | **62** |
| Steroids | **Present** — dexamethasone, prednisone, hydrocortisone | — | **68** |
| GI / antiemetics | **Strong** — §10 | — | **70** |
| Psych medications | **Partial** — haloperidol injectable | Risperidone, SSRI breadth | **40** |
| Seizure medications | **Partial** — phenytoin, valproate, diazepam | Levetiracetam | **50** |
| OB/GYN | **Present** — §11 oxytocin, magnesium, contraception | — | **65** |
| Pediatric common | **Present** — §12 liquids, ORS | Neonatal ICU set | **55** |
| Vaccines | **Absent** in Haiti seed | Routine immunization products | **15** |
| Topicals / derm / ophth / otic | **Present** — §14 | — | **60** |
| Endocrine / thyroid | **Present** — levothyroxine | — | **62** |
| Renal | **Partial** — electrolytes, furosemide | Dialysis-specific | **45** |
| IV fluids / electrolytes | **Strong** — NS, LR, D5, KCl, Mg | — | **75** |
| Infusion medications | **Strong** — IV antibiotics, pressor drips | Auto infusion billing still partial (M1.4D) | **65** |
| Chemotherapy / specialty | **Placeholders only** | Oncology biologics | **20** |

**Clinical category readiness (mean of table):** **~56**

---

## Part 4 — Common medication benchmark

Representative enterprise benchmark (minimum set). Status from Haiti seed + local active catalog + alias/search SQL.

| Medication / pair | Setting | Status | Notes |
|-------------------|---------|--------|-------|
| Acetaminophen / Tylenol | Primary, UC, ER | **Supported** | Paracetamol naming; Tylenol alias |
| Ibuprofen / Advil | Primary, UC | **Supported** | |
| Amoxicillin | Primary, peds | **Supported** | |
| Ceftriaxone / Rocephin | ER, hospital | **Supported** | Alias hits |
| Azithromycin | Primary, ER | **Supported** | |
| Metformin / Glucophage | Primary, endocrine | **Supported** | Hardcoded search expansion |
| Lisinopril | Cardiology | **Supported** | |
| Furosemide / Lasix | Cardiology, ER | **Supported** | Lasix alias |
| Morphine | ER, ICU | **Supported** | Controlled flag |
| Fentanyl | ER, ICU | **Supported** | Controlled |
| Hydromorphone / Dilaudid | ER | **Supported** | Dilaudid alias |
| Midazolam / Versed | ER, ICU | **Supported** | Generic search |
| Lorazepam / Ativan | ER, psych | **Supported** | Ativan alias; oral control gap |
| Ondansetron / Zofran | ER, GI | **Supported** | Zofran alias |
| Dexamethasone / Decadron | ER, allergy | **Supported** | |
| Diphenhydramine / Benadryl | ER, allergy | **Supported** | |
| Heparin | ER, hospital | **Supported** | No safety profile flag |
| **Warfarin / Coumadin** | Cardiology | **Missing** | 0 catalog rows |
| **Enoxaparin / Lovenox** | Hospital | **Missing** | |
| Norepinephrine | ICU | **Supported** | |
| Epinephrine | ER | **Supported** | |
| Insulin regular | Endocrine, hospital | **Supported** | |
| Normal saline / LR | ER, infusion | **Supported** | |
| Haloperidol | Psych, ER | **Supported** | |
| Levothyroxine | Endocrine | **Supported** | |
| **Oxycodone** | Pain service | **Missing** | |
| **Influenza / childhood vaccines** | Primary | **Missing** | |
| Propofol | ICU, ER | **Supported** | |
| Ketamine | ER | **Supported** | Controlled III |

**Benchmark summary:** **Supported ~24** · **Missing ~5** · **Duplicate** multi-strength SKUs (expected) · **Manual review ~8** (tramadol schedule, oral benzo flags, baseline `19G*` search noise)

---

## Part 5 — Billing completeness cross-check

### 5.1 Designed coverage (M1.4B manifest + tests)

| Metric | Value |
|--------|-------|
| Haiti billable injectable/IV rows | **89** (per M1.4B audit) |
| Manifest `catalogCode` entries | **83** |
| Billable HCPCS coverage (source) | **100%** (tests PASS) |
| NDC manifest keys | **16** high-priority injectables |
| Manifest orphan codes | **0** |

### 5.2 Local database (runtime)

| Field | Active catalog coverage |
|-------|-------------------------|
| `billingCodeDefault` | **0** / 316 (**0%**) |
| `ndc11` on catalog | **0** / 316 |
| `BillingCatalog` MEDICATION | **4** distinct `externalCode` |
| `MedicationBillingProfile` | **426** rows (package layer; products inactive) |

### 5.3 Billing completeness %

| Lens | % | Notes |
|------|---|-------|
| **Source / manifest (billable subset)** | **100%** | Ready to seed |
| **Local DB (all active catalog)** | **~1.3%** (4/316 BillingCatalog) | Remediation seed not run |
| **Local DB (billable subset est.)** | **~4.5%** if 89 billable | Same as M1.4A baseline |

**Billing completeness (enterprise, local DB):** **~5%**  
**Billing completeness (post-seed projection):** **~28%** all meds (89/316 mapped) · **100%** billable injectables

### 5.4 Blockers and revenue risk

| Blocker | Severity |
|---------|----------|
| M1.4B seed not applied on local/possibly prod | **HIGH** |
| `mapMedicationToBillingCode` uses `BillingCatalog` only — profiles not auto-read | **MEDIUM** |
| Oral/topical meds largely unmapped (by design) | **LOW** for Haiti ER focus |
| NDC only 16/316 | **MEDIUM** payer export |
| Manifest HCPCS illustrative — payer sign-off required | **MEDIUM** compliance |

**Revenue leakage risk:** **HIGH** until remediation seed + billing review workflow on production.

---

## Part 6 — Safety governance cross-check

| Domain | Catalog / seed | `MedicationSafetyProfile` (local) | Manifest (M1.3) |
|--------|----------------|-----------------------------------|-----------------|
| Controlled flag | **9** `isControlled` | **0** `isControlled` | **17** entries (9 APPLY, 2 MANUAL_REVIEW, 6 MISSING_CATALOG) |
| High-alert | soft UI rules only | **0** `isHighAlert` | **15** APPLY `catalogCode` rows |
| LASA | none on legacy | **0** `lasaGroupId` | **5** groups |
| Pharmacy verification | schema + workflow docs | not catalog-wide | classifier `REQUIRES_PHARMACY_VERIFICATION` |
| Witness / double-sign | catalog columns; **5** seed spreads | profiles **0** | manifest-driven |
| Waste documentation | MAR workflow (M1.3F) | — | `REQUIRES_WASTE_DOCUMENTATION` classifier |

**Safety governance completeness % (persisted flags on orderable concepts):** **~8%**  
**Safety governance completeness % (manifest + catalog partial):** **~45%**

**Gaps:** Oral diazepam/lorazepam/tramadol controlled inconsistency; no warfarin; HA/LASA not persisted.

**Manual review list:** Tramadol schedule (2 manifest rows), illustrative HCPCS, tramadol/diazepam policy, baseline import rows.

---

## Part 7 — Provider orderability audit

| Criterion | Count / finding |
|-----------|-----------------|
| Active `CatalogMedication` | **316** |
| Appears in medication search (`isActive` + text/alias) | **316** candidates |
| After `filterProviderSearchCatalogIds` (local) | **256** (unlinked); **60** linked products **excluded** (inactive product) |
| Usable display name (`displayNameFr`) | **316** — **69** missing `route` degrades UX |
| Route / strength / form populated | strength/form **100%**; route missing **69** (baseline import) |
| Billing readiness (local DB) | **~5%** auto-map |
| Safety governance when needed | opioids present; flags **incomplete** |

| Bucket | Count |
|--------|-------|
| **Orderable (legacy search path)** | **~256** |
| **Non-orderable (activation-gated linked)** | **~60** |
| **Orderable but unsafe** (opioid/benzo without full control profile) | **~12** est. |
| **Orderable but billing-incomplete** (billable IV without `BillingCatalog` row locally) | **~85** est. |

---

## Part 8 — Search / alias completeness audit

Method: local SQL + `MEDICATION_SEARCH_QUERY_ALIASES` + Haiti `commonAliases`.

| Example query | Result (local) | Verdict |
|---------------|----------------|---------|
| Tylenol / acetaminophen / paracetamol | 2+ hits via alias | **PASS** |
| Advil / ibuprofen | supported in seed | **PASS** |
| Lasix / furosemide | 2 hits | **PASS** |
| Coumadin / warfarin | **0** | **FAIL** |
| Lovenox / enoxaparin | **0** | **FAIL** |
| Zofran / ondansetron | 3 hits | **PASS** |
| Rocephin / ceftriaxone | supported | **PASS** |
| Decadron / dexamethasone | supported | **PASS** |
| Benadryl / diphenhydramine | 1 hit | **PASS** |
| Ativan / lorazepam | 2 hits | **PASS** |
| Versed / midazolam | via generic | **PARTIAL** (no brand alias) |
| Dilaudid / hydromorphone | 1 hit | **PASS** |
| Misspellings (`acetaminofen`) | **0** | **FAIL** |
| French clinical names | `displayNameFr` + FR routes | **PASS** |
| English | `displayNameEn` + aliases | **PARTIAL** (52 Tablet EN mix) |
| Hardcoded brand map | 8 prefixes only | **PARTIAL** |

**Search / alias audit:** **PARTIAL**

---

## Part 9 — Enterprise readiness scores (0–100)

| Domain | Score | Rationale |
|--------|-------|-----------|
| Catalog completeness | **58** | Solid Haiti seed; +47 DB drift; canonical inactive |
| Orderability | **68** | 256/316 provider-visible; 69 missing route |
| Billing readiness | **48** | Manifest 100% billable; DB not seeded |
| Safety governance | **22** | Manifests without persisted HA/LASA/control profiles |
| Search readiness | **54** | Aliases good; no fuzzy; warfarin/enoxaparin gaps |
| Clinical category readiness | **56** | Broad primary/ER; vaccines/anticoag gaps |
| **Enterprise medication readiness** | **51** | Weighted mean (equal weight) |

Rubrics: **80+** enterprise-ready · **60–79** MVP with gaps · **40–59** partial · **&lt;40** not ready

---

## Part 10 — Gap register summary

See [enterprise-medication-gap-register.md](./enterprise-medication-gap-register.md) for full table (**18** gaps). Top severity:

1. **CRITICAL** — Canonical layer inactive; expansion on canonical without activation plan risks zero orderable products  
2. **CRITICAL** — Safety profiles empty for high-alert / LASA / controlled persistence  
3. **HIGH** — M1.4B billing seed not applied on local DB (production NOT VERIFIED)  
4. **HIGH** — Warfarin / enoxaparin absent  
5. **HIGH** — 256/316 legacy rows not linked to canonical products  

---

## Part 11 — Expansion strategy (summary)

**Recommended:** **Option D — Hybrid** (see [enterprise-medication-expansion-strategy.md](./enterprise-medication-expansion-strategy.md))

1. **Do not** bulk-import 1000+ meds before reconciliation.  
2. **Expose** existing canonical concepts/products via legacy link + activation for high-value categories.  
3. **Curated phased** formulary additions (anticoagulants, vaccines, missing opioids policy).  
4. Apply **M1.4B seed** + governance seeds on pilot DB before expansion tranche.

---

## Part 12 — Final audit decision

| Verdict | Selection |
|---------|-----------|
| Enterprise Medication Catalog **READY FOR EXPANSION** | **No** |
| Enterprise Medication Catalog **NOT READY FOR EXPANSION** | **Yes** |
| **SAFE / NOT SAFE** | **NOT SAFE** for enterprise catalog expansion; **SAFE (conditional)** to continue Haiti MVP on legacy catalog after production count verification |

### Conditions before expansion tranche

- [ ] Production read-only counts (inventory doc matrix)  
- [ ] Run idempotent M1.4B + M1.3 governance seeds on pilot  
- [ ] Reconcile legacy ↔ canonical linkage plan (target ≥90% Haiti codes linked)  
- [ ] Clinical sign-off on controlled/HA/LASA manifests  
- [ ] Close warfarin/enoxaparin gap or document intentional omission  
- [ ] Activation policy: which canonical products enter provider search  

---

## Validation log

| Check | Result |
|-------|--------|
| `pnpm --filter @medora/api exec prisma validate` | PASS |
| Read-only SQL | Local dev only |
| `medication-billing-mapping-validation.spec.ts` | PASS (4 tests) |
| Production DB | **NOT VERIFIED** |
