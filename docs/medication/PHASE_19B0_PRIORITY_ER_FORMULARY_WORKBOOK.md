# Phase 19B.0 — Priority ER Formulary + Inventory Normalization Workbook

**Status:** Design + governance only (read-only process).  
**Inputs:** Phase 19A.1 audit, Phase 19A.2 canonical catalog design.  
**Out of scope:** Prisma changes, migrations, medication import, API/MAR/billing code changes.

---

## Purpose

Prepare **Priority Emergency Room** pharmacy inventory for safe reconciliation against the future Medora canonical model:

`MedicationConcept` → `MedicationProduct` → `MedicationPackage` → `FacilityFormularyItem` (+ billing/safety/administration profiles).

This document defines the **workbook structure**, **classification rules**, **governance sign-off**, and **import validation gates** that must be completed **before** any Phase 19B schema or seed work.

---

## Workbook artifacts (deliverables)

| Artifact | Format | Owner | Notes |
|----------|--------|-------|-------|
| **A. Source inventory extract** | CSV/XLSX from Priority ER | Pharmacy | Raw rows: SKU, description, qty, NDC if known, location (crash cart, Pyxis, fridge) |
| **B. Normalization workbook (master)** | CSV (UTF-8) or Google Sheet | Pharmacy lead | One row per **package candidate** (see below) |
| **C. NDC evidence annex** | CSV | Pharmacy + billing | Links to `medication-ndc-mappings.ts` style evidence; no auto-wire |
| **D. Medora legacy crosswalk** | CSV | Medora tech | Maps workbook rows → existing `CatalogMedication.code` / `haiti-medications.ts` |
| **E. Sign-off register** | PDF or sheet tab | Governance | Per-gate approvals with name, role, date |

**Row grain:** Default = **one workbook row per `MedicationPackage` candidate**.  
If inventory SKU maps 1:1 to a package, one row. If one SKU can dispense multiple NDCs, **split rows** (one per package) and link SKU in `inventory_sku_refs`.

---

## Reconciliation workflow

```text
[1] Extract Priority ER inventory (Artifact A)
        ↓
[2] Pharmacy normalizes each line → Workbook row (Artifact B)
        ↓
[3] Classify match status (§3) + apply normalization rules (§5)
        ↓
[4] Crosswalk to Medora legacy catalog (Artifact D)
        ↓
[5] Attach NDC evidence (Artifact C) — confidence = confirmed | review
        ↓
[6] Parallel review tracks (§6): pharmacy, nursing, ED MD, billing, compliance
        ↓
[7] Pass import validation gates (§7) per row
        ↓
[8] Export APPROVED rows only → Phase 19B.1 import staging (future; not in 19B.0)
```

### Entity mapping (what each review pass validates)

| Canonical entity | Workbook responsibility |
|------------------|-------------------------|
| **MedicationConcept** | `generic_name`, therapeutic class, duplicate-therapy class, LASA group at concept level |
| **MedicationProduct** | concentration, route, dosage form, administration type, infusion/hydration class, product-level codes |
| **MedicationPackage** | package type, total volume, NDC11, UoM, inventory SKU refs |
| **FacilityFormularyItem** | formulary category, ED favorites, RSI/crash cart flags, facility active dates |
| **MedicationBillingProfile** | HCPCS, revenue code, billing unit strategy, wastage eligible — **billing sign-off required** |
| **MedicationSafetyProfile** | controlled, high-alert, LASA, pediatric restrictions, override requirements |
| **MedicationAdministrationProfile** | bedside vs pharmacy, MAR workflow, partial dose |
| **InfusionProfile** | infusion capable, hydration vs therapeutic, start/stop rules |
| **MedicationSearchAlias** | brand, aliases, ED quick-search keywords |

---

## Classification taxonomy (required per row)

Use **exactly one primary** `reconciliation_status` and any applicable **secondary flags**.

### Primary `reconciliation_status`

| Code | Meaning | Action |
|------|---------|--------|
| `EXISTING_CONCEPT_MATCH` | Ingredient/combo exists in Medora concept map | Link `medora_concept_code`; may still need new product/package |
| `NEW_CONCEPT_REQUIRED` | No safe concept match | Propose new `proposed_concept_code` |
| `EXISTING_PRODUCT_MATCH` | Concept exists; strength/form/route matches a Medora product | Link `medora_product_code` |
| `NEW_PRODUCT_REQUIRED` | Concept exists (or new) but presentation is new | Propose `proposed_product_code` |
| `PACKAGE_NDC_VARIANT_ONLY` | Product exists; only NDC/package/SKU differs | Link product; new package row only |
| `LEGACY_CATALOG_MATCH` | Maps 1:1 to existing `CatalogMedication.code` | Link `legacy_catalog_medication_code` for migration |
| `DEFERRED` | Not in Phase 19B scope | Document `defer_reason` |
| `REJECTED` | Do not import | Document `reject_reason` |

### Secondary review flags (multi-select)

| Flag | Meaning |
|------|---------|
| `BILLING_REVIEW_REQUIRED` | HCPCS/NDC/units need biller |
| `SAFETY_REVIEW_REQUIRED` | High-alert, controlled, LASA, peds |
| `INFUSION_REVIEW_REQUIRED` | Infusion session, hydration vs therapeutic, premix |
| `MAR_WORKFLOW_REVIEW_REQUIRED` | Push vs infusion path, witness rules |
| `DUPLICATE_THERAPY_REVIEW` | Same class as existing formulary line |
| `SEARCH_UX_REVIEW` | Aliases / quick-search / LASA display |
| `INVENTORY_ONLY` | Stock tracking only; no bedside order (e.g. supplies misclassified) |
| `VACCINE_PARALLEL_SYSTEM` | Route to `VaccineCatalog`; exclude from Rx workbook |

---

## Workbook columns (master sheet)

### Identity & source

| Column | Required | Description |
|--------|----------|-------------|
| `workbook_row_id` | Yes | Stable UUID or `PRI_ER_###` |
| `source_inventory_sku` | If stocked | Priority ER SKU |
| `source_inventory_description` | Yes | Raw inventory text |
| `source_location` | No | Crash cart, main pharmacy, fridge, etc. |
| `source_qty_on_hand` | No | For reconciliation only; not imported to Medora in 19B |

### Clinical — concept & product

| Column | Required | Description |
|--------|----------|-------------|
| `generic_name` | Yes | INN / generic (English canonical for mapping) |
| `display_name_fr` | Yes | French UI label (product level) |
| `display_name_en` | No | English display |
| `brand_name` | No | Primary brand for search |
| `therapeutic_class` | Yes | Normalized class (vasopressor, RSI, etc.) |
| `combination_ingredients` | If combo | e.g. piperacillin + tazobactam |
| `concentration_numerator` | If applicable | e.g. 4 |
| `concentration_numerator_unit` | If applicable | mg |
| `concentration_denominator` | If applicable | e.g. 1 |
| `concentration_denominator_unit` | If applicable | mL |
| `total_volume_amount` | If applicable | e.g. 250 (bag fill) |
| `total_volume_unit` | If applicable | mL |
| `concentration_display` | Yes | Human string: `4 mg/4 mL`, `0.9% 500 mL` |
| `route` | Yes | Enum: PO, IV, IV_PUSH, IVPB, IM, SQ, IN, PR, TOPICAL, OTHER |
| `dosage_form` | Yes | vial, bag, syringe, tablet, solution, premix, ampule, etc. |
| `administration_type` | Yes | ORAL, IM, SQ, PUSH, INFUSION, OTHER |
| `package_type` | Yes | VIAL, SYRINGE, BAG_PREMIX, BAG_BASE, AMPULE, TABLET_BOTTLE, etc. |

### Package & identifiers

| Column | Required | Description |
|--------|----------|-------------|
| `package_description` | Yes | e.g. `10 mL vial`, `250 mL premix bag` |
| `ndc11` | If known | 11 digits, no dashes |
| `ndc_display` | No | Hyphenated display |
| `ndc_confidence` | If NDC | `confirmed` \| `review` \| `unknown` |
| `ndc_evidence_ref` | If NDC | File/row ref in NDC annex |
| `proposed_product_code` | For new | UPPER_SNAKE per seed convention |
| `proposed_package_code` | For new | Unique per package |
| `proposed_concept_code` | For new | `CONCEPT_*` |

### Medora crosswalk

| Column | Required | Description |
|--------|----------|-------------|
| `reconciliation_status` | Yes | Primary classification (§3) |
| `review_flags` | No | Pipe-separated secondary flags |
| `legacy_catalog_medication_code` | If match | e.g. `NOREPINEPHRINE_4MG_4ML_IV` |
| `medora_concept_code` | If match | Future concept code |
| `medora_product_code` | If match | Future product code |
| `medora_package_code` | If match | Future package code |

### Billing (suggestions only until biller sign-off)

| Column | Required | Description |
|--------|----------|-------------|
| `hcpcs_j_code_suggested` | No | Suggestion only |
| `hcpcs_unit_type` | No | mg, mL, each |
| `revenue_code_suggested` | No | Facility revenue code |
| `billing_unit_strategy` | Yes | PER_MG, PER_ML, PER_EACH, PER_HOUR_INFUSION, CUSTOM, UNKNOWN |
| `companion_procedure_cpt_suggested` | No | e.g. 96372 — **not licensed data in Medora** |
| `wastage_billable` | Yes | yes \| no \| unknown |
| `billing_review_status` | Yes | pending \| approved \| rejected |
| `billing_reviewer` | If approved | Name |
| `billing_review_date` | If approved | ISO date |

### Safety & governance

| Column | Required | Description |
|--------|----------|-------------|
| `controlled_substance` | Yes | yes \| no |
| `controlled_schedule` | If yes | II, III, IV, V, etc. |
| `high_alert` | Yes | yes \| no |
| `high_alert_category` | If yes | vasopressor, insulin, anticoag, sedation, etc. |
| `lasa_risk` | Yes | none \| pair_id \| review |
| `lasa_pair_description` | If pair | e.g. EPINEPHrine vs EPINEPHrine |
| `duplicate_therapy_class` | No | For duplicate checks |
| `pediatric_restrictions` | No | free text + min age/weight if known |
| `override_requirements` | No | allergy_ack, witness, double_sign, high_alert_ack |
| `safety_review_status` | Yes | pending \| approved \| rejected |

### Administration & infusion

| Column | Required | Description |
|--------|----------|-------------|
| `infusion_capable` | Yes | yes \| no |
| `infusion_type` | If infusion | HYDRATION \| THERAPEUTIC \| BLOOD \| TPN \| N/A |
| `hydration_vs_therapeutic` | If infusion | HYDRATION \| THERAPEUTIC \| N/A |
| `mar_workflow` | Yes | SINGLE_DOSE \| INFUSION_SESSION \| PRN |
| `bedside_administer` | Yes | yes → ADMINISTER_CHART |
| `pharmacy_dispense` | Yes | yes → PHARMACY_DISPENSE |
| `default_fulfillment_intent` | Yes | ADMINISTER_CHART \| PHARMACY_DISPENSE |
| `allows_partial_dose` | No | yes \| no |
| `allows_waste_documentation` | No | yes \| no |
| `infusion_review_status` | If infusion | pending \| approved \| rejected |

### Formulary & UX

| Column | Required | Description |
|--------|----------|-------------|
| `formulary_category` | Yes | ED_CORE, RSI, CRASH_CART, VASOPRESSOR, ABX_IV, FLUID, SEDATION, ANALGESIC, etc. |
| `ed_formulary` | Yes | yes \| no |
| `rsi_formulary` | No | yes \| no |
| `crash_cart` | No | yes \| no |
| `favorite_tier` | No | FACILITY, RSI, CRASH_CART, INFUSION_QUICK, PROTOCOL |
| `ed_quick_search_keywords` | No | Pipe-separated |
| `aliases` | No | Pipe-separated (brand, abbrev, typo) |
| `search_ux_review_status` | No | pending \| approved |

### Inventory alignment

| Column | Required | Description |
|--------|----------|-------------|
| `inventory_sku_refs` | If stocked | Pipe-separated SKUs tied to this package |
| `unit_of_measure_stock` | Yes | each, vial, bag, mL, box |
| `unit_of_measure_billing` | Yes | Often matches billing_unit_strategy |
| `refrigeration_required` | No | yes \| no |
| `storage_notes` | No | Room temp, light sensitive |
| `reorder_level` | No | Facility policy |

### Workflow status

| Column | Required | Description |
|--------|----------|-------------|
| `import_gate_status` | Yes | See §7 — `BLOCKED` until all gates pass |
| `overall_status` | Yes | draft \| in_review \| approved \| deferred \| rejected |
| `pharmacy_signoff` | For approved | Name + date |
| `nursing_signoff` | For MAR/infusion | Name + date |
| `ed_md_signoff` | For RSI/high-risk formulary | Name + date |
| `compliance_signoff` | For controlled | Name + date |
| `notes` | No | Free text |

---

## Normalization rules

### Rule 1 — Premix bag vs vial concentrate

| Situation | Concept | Product | Package |
|-----------|---------|---------|---------|
| Norepinephrine 4 mg/4 mL vial | One concept | Product A: concentrate | Package: vial NDC |
| Norepinephrine 4 mg/250 mL premix | **Same concept** | **Product B**: premix bag | Package: bag NDC |

**Never** merge vial and premix into one product row.

### Rule 2 — Same concept, different concentrations

- Amoxicillin 250 mg/5 mL vs 400 mg/5 mL → **one concept**, **two products**.
- Adrenaline 1 mg/mL vs 0.1 mg/mL (peds) → **one concept**, **two products**; flag `pediatric_restrictions`.

### Rule 3 — Same product, different NDC packages

- Same strength/vial size, different manufacturers → **one product**, **multiple package rows** (different `ndc11`).
- Workbook: duplicate product columns; unique `workbook_row_id` per NDC.

### Rule 4 — Hydration fluid vs therapeutic infusion

| Example | `administration_type` | `infusion_type` | `hydration_vs_therapeutic` |
|---------|----------------------|-----------------|---------------------------|
| NS 0.9% 500 mL | INFUSION | HYDRATION | HYDRATION |
| Piperacillin-tazobactam 4.5 g | INFUSION | THERAPEUTIC | THERAPEUTIC |
| IV push adenosine | PUSH | N/A | N/A |

Fluids without active drug → concept `NORMAL_SALINE` etc.; billing class HYDRATION.

### Rule 5 — Push vs infusion presentations

- Same drug may have **PUSH** product (adenosine 6 mg/2 mL) — `mar_workflow: SINGLE_DOSE`, `infusion_capable: no`.
- If inventory lists “IV drip” only but clinical use is push → **INFUSION_REVIEW_REQUIRED** + nursing sign-off.

### Rule 6 — Bag size variants

- NS 500 mL vs 1 L → **same concept**, **different products** (volume is part of product identity) **or** separate packages under one product if billing identical — **pharmacy must pick one pattern** and apply consistently in the workbook.

**Recommendation (19A.2 aligned):** separate **products** per bag size for fluids.

### Rule 7 — Combination products

- Piperacillin-tazobactam → **one concept** with `combination_ingredients`; not two concepts.

### Rule 8 — Inventory description cleanup

Normalize before mapping:

1. Strip vendor prefixes / internal codes from `generic_name`.
2. Split “mg/mL” from total volume (“250 mL bag”).
3. Flag rows that are **supplies** (syringe empty, alcohol pad) → `INVENTORY_ONLY` or `REJECTED`.

### Rule 9 — Legacy Medora match

If `legacy_catalog_medication_code` matches but NDC or package type differs → status `PACKAGE_NDC_VARIANT_ONLY`, not `EXISTING_PRODUCT_MATCH` alone.

### Rule 10 — Code derivation (for proposed codes)

Align with `seed-haiti-medication-catalog.ts` `deriveMedicationCode()`:

`GENERIC_STRENGTH_FORM_ROUTE` → UPPER_SNAKE.  
Document proposed codes in workbook; **do not auto-generate in Medora** until 19B.1 import script.

---

## Governance workflow

### Roles and responsibilities

| Role | Reviews | Sign-off on |
|------|---------|-------------|
| **Pharmacy lead** | All rows: concept/product/package, NDC, storage, SKU | Primary workbook accuracy |
| **Staff pharmacist** | NDC evidence, package type, duplicates | NDC annex |
| **ED nursing educator / charge nurse** | MAR workflow, infusion vs push, partial dose, waste | `nursing_signoff`, infusion flags |
| **ED medical director** | RSI list, crash cart, high-alert formulary | `ed_md_signoff`, RSI/crash cart rows |
| **Billing / revenue cycle** | HCPCS, revenue code, units, wastage | `billing_review_status` |
| **Compliance / admin** | Controlled substances, witness rules | `compliance_signoff` |
| **Medora technical** | Legacy crosswalk, code collisions, import staging | Artifact D only |

### Review sequence (recommended)

1. Pharmacy completes draft rows + classification.  
2. Nursing + ED MD parallel review (MAR/infusion/formulary).  
3. Billing reviews all rows with `BILLING_REVIEW_REQUIRED` or any NDC.  
4. Compliance reviews controlled / schedule rows.  
5. Pharmacy publishes **APPROVED** export.  
6. Medora tech validates crosswalk (no duplicate `proposed_product_code`).

### Meeting cadence (suggested)

- **Weekly triage** until 80% rows drafted.  
- **Final sign-off session** before handoff to 19B.1.

---

## Import validation gates

A row may only move to `overall_status: approved` and `import_gate_status: READY` when **all applicable gates** pass.

| Gate ID | Applies when | Pass criteria |
|---------|--------------|---------------|
| **G1_PACKAGE** | Always | `package_type`, `package_description`, `concentration_display` consistent |
| **G2_NDC** | `ndc11` present OR explicitly `ndc_confidence: unknown` with pharmacy approval | 11-digit validation OR documented waiver |
| **G3_BILLING** | Any HCPCS/revenue suggested OR controlled/high-cost | `billing_review_status: approved` |
| **G4_MAR** | `bedside_administer: yes` | `mar_workflow` set; push vs infusion consistent with `administration_type` |
| **G5_INFUSION** | `infusion_capable: yes` | `infusion_type`, hydration/therapeutic set; `infusion_review_status: approved` |
| **G6_DUPLICATE_THERAPY** | Same `duplicate_therapy_class` as another **approved** row | Pharmacist documented distinction or deferral |
| **G7_LASA** | `lasa_risk` not `none` | `search_ux_review_status: approved`; aliases include disambiguation |
| **G8_SEARCH_UX** | `ed_formulary: yes` | French display + ≥1 alias or keyword |
| **G9_SAFETY** | high-alert or controlled | `safety_review_status: approved` |
| **G10_SIGNOFF** | Always | Required sign-offs for row category present |

`import_gate_status` values: `BLOCKED` | `IN_PROGRESS` | `READY` | `WAIVED` (requires compliance + pharmacy written waiver in `notes`).

---

## Never auto-import categories

| Category | Reason | Workbook action |
|----------|--------|-----------------|
| Historical MAR/backfill | Append-only clinical record | Do not touch |
| HCPCS/J-codes from external files without review | Billing liability | `BILLING_REVIEW_REQUIRED`; never seed from FDA file alone |
| NDC from FDA “candidate” with `confidence: review` | Wrong package risk | `ndc_confidence: review` blocks READY until confirmed |
| Free-text discharge meds | Not structured Rx | Out of workbook |
| Vaccines | Separate `VaccineCatalog` | `VACCINE_PARALLEL_SYSTEM` |
| Compounded admixtures (custom bags) | Needs Phase 20+ compound model | `DEFERRED` |
| Medical supplies (non-medication) | Wrong domain | `REJECTED` or `INVENTORY_ONLY` |
| Obsolete / expired inventory only | Not on active formulary | `DEFERRED` unless clinically required |
| Duplicate legacy codes | Collision | Manual merge before import |
| Auto-derived therapeutic class from string match | Error-prone | Human assigns `therapeutic_class` |
| LASA pairs without UX plan | Patient safety | Block G7 |
| Peds weight-based dosing rules | Phase 21+ | Document only; do not enforce in seed |

---

## Priority ER category checklist

Use this to ensure workbook coverage (map each inventory line to a category):

| Category | Normalization focus | Typical flags |
|----------|---------------------|---------------|
| Vasopressors | Vial vs premix; infusion session | high-alert, infusion review |
| RSI medications | RSI + crash cart | ed_md signoff, safety |
| Premix infusion bags | Separate product from concentrate | billing review |
| Electrolyte drips | Therapeutic vs hydration | infusion review |
| Controlled substances | Schedule, witness | compliance signoff |
| IV push meds | PUSH, single MAR | MAR review |
| Vaccines | Parallel system | exclude |
| Discharge Rx | PHARMACY_DISPENSE default | may be off ED formulary |
| Bedside ED meds | ADMINISTER_CHART | MAR + search UX |
| Oral / topical ED | ORAL route | lower infusion risk |

**Medora legacy baseline:** Crosswalk against `apps/api/prisma/data/haiti-medications.ts` (ED critical-care section) and `apps/api/prisma/data/medication-ndc-mappings.ts`.

---

## Safest implementation order (after workbook completion)

| Step | Phase | Prerequisite |
|------|-------|--------------|
| 1 | **19B.0 complete** | APPROVED workbook export + sign-off register |
| 2 | **19B.1** | Additive schema (concept/product/package) — **no production import** |
| 3 | **19B.1** | Staging import script reads **APPROVED CSV only** |
| 4 | **19B.2** | Billing/safety/administration profiles from workbook columns |
| 5 | **19B.3** | `FacilityFormularyItem` for Priority facility |
| 6 | **19C** | Dual-write `OrderItem` + legacy `catalogItemId` |
| 7 | **19C** | `InfusionSession` + MAR package snapshots |
| 8 | **19D** | UI cutover + deprecate legacy catalog writes |

**Do not start 19B.1 until:** ≥95% of **active ED formulary** rows are `overall_status: approved` with `import_gate_status: READY` or documented `WAIVED`.

---

## Template file

CSV template (headers only):  
`docs/medication/templates/priority-er-formulary-workbook-template.csv`

Copy → fill → store outside repo if containing contractual NDC pricing.  
Commit **anonymized** classification crosswalk only if policy allows.

---

## Version history

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-05-18 | Phase 19B.0 initial workbook process |
