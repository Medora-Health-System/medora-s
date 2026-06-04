# M1.7C.10 — Wave 4 Clinical Review Queue Resolution

**Phase:** Clinical governance review (audit and decision matrix only)  
**Date:** 2026-06-04  
**Prerequisite:** M1.7C.9 staging revalidation **PASS**  
**Scope:** 12 clinical-review SKUs + 11 respiratory MAR-blocked SKUs (separate queues)  
**No activation, no code changes in this phase**

---

## Executive verdict

**SAFE FOR M1.7C.11 CLINICAL REMEDIATION IMPLEMENTATION**

Clinical dispositions are defined with enough specificity to update manifest metadata, governance flags, and post-review clearance markers **without** enabling order search, billing, or MAR. Implementation must remain disposition-only until M1.7C.12+ staging validation.

**Not in scope:** 227 bulk activation — only the 23 intentionally deferred SKUs plus downstream forecast for the remaining 204 gate-safe products.

---

## Part 1 — Clinical review inventory (12 SKUs)

**Source:** `WAVE4_CLINICAL_REVIEW_REQUIRED_CATALOG_CODES` in `packages/shared/src/medication/wave4AdministrationTypeRemediation.ts`

**Staging disposition (all):** `isActive=false`, `governanceStatus=REVIEW_REQUIRED`, Wave 4 marker present, gate-safe `administrationType` (no INJECTION/SUBCUTANEOUS).

| # | Catalog code | Display (FR) | Route | Admin type | Therapeutic class | Bucket | Mode | High alert | Double RN | Witness | Controlled | RSI paralytic | Vasopressor | Current disposition |
|---|--------------|--------------|-------|------------|-------------------|--------|------|------------|-----------|---------|------------|---------------|-------------|---------------------|
| 1 | `SUCCINYLCHOLINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE` | Succinylcholine | intraveineuse | PUSH | Paralytique RSI | RSI | CREATE | ✓ | — | — | — | ✓ | — | Clinical queue; MAR deferred |
| 2 | `SUCCINYLCHOLINE_100_MG_POUDRE_INTRAVEINEUSE` | Succinylcholine | intraveineuse | PUSH | Paralytique RSI | RSI | CREATE | ✓ | — | — | — | ✓ | — | Clinical queue; MAR deferred |
| 3 | `ROCURONIUM_10_MG_ML_INJECTABLE_INTRAVEINEUSE` | Rocuronium | intraveineuse | PUSH | Paralytique RSI | RSI | CREATE | ✓ | — | — | — | ✓ | — | Clinical queue; MAR deferred |
| 4 | `ROCURONIUM_50_MG_5_ML_INJECTABLE_INTRAVEINEUSE` | Rocuronium | intraveineuse | PUSH | Paralytique RSI | RSI | CREATE | ✓ | — | — | — | ✓ | — | Clinical queue; MAR deferred |
| 5 | `VECURONIUM_10_MG_POUDRE_INTRAVEINEUSE` | Vécuronium | intraveineuse | PUSH | Paralytique RSI | RSI | CREATE | ✓ | — | — | — | ✓ | — | Clinical queue; MAR deferred |
| 6 | `VECURONIUM_1_MG_ML_INJECTABLE_INTRAVEINEUSE` | Vécuronium | intraveineuse | PUSH | Paralytique RSI | RSI | CREATE | ✓ | — | — | — | ✓ | — | Clinical queue; MAR deferred |
| 7 | `LIDOCAINE_1_INJECTABLE_INJECTABLE` | Lidocaïne | injectable | PUSH | Anesthésique local | PROCEDURAL_SEDATION | CREATE | — | — | — | — | — | — | Clinical queue; MAR deferred |
| 8 | `LIDOCAINE_2_INJECTABLE_INJECTABLE` | Lidocaïne | injectable | PUSH | Anesthésique local | PROCEDURAL_SEDATION | CREATE | — | — | — | — | — | — | Clinical queue; MAR deferred |
| 9 | `BUPIVACAINE_0_25_INJECTABLE_INJECTABLE` | Bupivacaïne | injectable | PUSH | Anesthésique local | PROCEDURAL_SEDATION | CREATE | — | — | — | — | — | — | Clinical queue; MAR deferred |
| 10 | `BUPIVACAINE_0_5_INJECTABLE_INJECTABLE` | Bupivacaïne | injectable | PUSH | Anesthésique local | PROCEDURAL_SEDATION | CREATE | — | — | — | — | — | — | Clinical queue; MAR deferred |
| 11 | `PHENYLEPHRINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE` | Phényléphrine | intraveineuse | PUSH | Vasopresseur | VASOPRESSORS | CREATE | ✓ | — | — | — | — | ✓ | Clinical queue; MAR deferred |
| 12 | `GLUCAGON_1_MG_POUDRE_INJECTABLE` | Glucagon | injectable | PUSH | Antidote hypoglycémie | TOXICOLOGY | CREATE | ✓ | — | — | — | — | — | Clinical queue; MAR deferred |

**Related SKU (not in clinical queue):** `PHENYLEPHRINE_50_MG_250_ML_PERFUSION_INTRAVEINEUSE` — already `INFUSION`, vasopressor, high-alert; follows infusion MAR session pattern when activated later.

**Related SKU (not in clinical queue):** `LIDOCAINE_20_MG_ML_INJECTABLE_INTRAVEINEUSE` — IV antiarrhythmic concentration; distinct from % local anesthetic vials.

---

## Part 2 — RSI recommendations (Succinylcholine, Rocuronium, Vecuronium)

### Clinical context

- All six SKUs are **IV paralytics** for RSI/intubation.
- Manifest: `administrationType=PUSH`, `isRsiParalytic=true`, `isHighAlert=true`.
- Medora MAR gate accepts **PUSH** (`SAFE_MAR_ADMIN_TYPES`).
- Wave 4 policy: **no double RN** on IV push paralytics (consistent with hydromorphone IV push — warning/high-alert only).

### Per-drug decisions

| Agent | Final admin type | MAR eligibility | High alert | Double RN | Witness | Activation recommendation |
|-------|------------------|-----------------|------------|-----------|---------|---------------------------|
| Succinylcholine (2 SKUs) | **PUSH** (keep) | **Conditional** — after RSI policy card | **Yes** (keep) | **No** (keep) | **Optional facility policy** — recommend witness for succinylcholine only | **REVIEW_REQUIRED** until RSI documentation path signed off |
| Rocuronium (2 SKUs) | **PUSH** (keep) | **Conditional** | **Yes** | **No** | **No** | **REVIEW_REQUIRED** until RSI policy signed off |
| Vecuronium (2 SKUs) | **PUSH** (keep) | **Conditional** | **Yes** | **No** | **No** | **REVIEW_REQUIRED** until RSI policy signed off |

### Rationale

1. **Administration type:** IV bolus paralytic = **PUSH** is correct for MAR taxonomy; do not revert to INJECTION.
2. **MAR eligibility:** Technically gate-safe today, but **clinically premature** — RSI is a time-critical bundle (induction + paralytic + intubation). Medora has procedural sedation flowsheets but **no dedicated RSI flow** in `clinicalDocumentationRegistry`. MAR-only documentation risks fragmenting RSI without checklist timing.
3. **High-alert:** Required — apnea, hemodynamic effects, anaphylaxis (succinylcholine).
4. **Double RN:** Wave 4 double-RN list correctly **excludes** IV push paralytics; do not add unless national policy mandates independent paralytic verification.
5. **Activation:** Clear from clinical queue → **catalog/order-search eligible** only after pharmacy signs RSI MAR policy; **MAR enable** should trail dedicated RSI documentation alignment (Phase B in implementation plan).

**Post-review target disposition:** 6 SKUs → **READY** for catalog activation; **MAR enable** remains **REVIEW_REQUIRED** until RSI workflow MVP.

---

## Part 3 — Vasopressor recommendation (Phenylephrine bolus)

### SKU in queue

`PHENYLEPHRINE_10_MG_ML_INJECTABLE_INTRAVEINEUSE` — **PUSH**, high-alert, `isVasopressor=true`.

### Separate infusion SKU (not in queue)

`PHENYLEPHRINE_50_MG_250_ML_PERFUSION_INTRAVEINEUSE` — **INFUSION**, same vasopressor class.

### PUSH vs INFUSION

| Workflow | SKU | Admin type | Medora pattern |
|----------|-----|------------|----------------|
| ED bolus / ICU push dose | 10 mg/mL vial | **PUSH** | Single-dose MAR |
| Continuous infusion | 50 mg/250 mL bag | **INFUSION** | Infusion session MAR (START/STOP) |

### Recommendation

- **Keep bolus SKU as PUSH** — correct for ED push workflow.
- **Keep infusion SKU as INFUSION** — already correct; no clinical-queue flag needed.
- **High-alert:** Yes — hypertensive crisis / reflex bradycardia risk.
- **Double RN:** No for IV push (aligned with Wave 4 vasopressor policy except insulin/heparin infusion/blood/PCA).
- **MAR eligibility:** **Yes** after clinical sign-off (gate-safe PUSH).
- **Activation:** **READY** for catalog activation post M1.7C.11 metadata clearance; MAR after order-search cutover.

---

## Part 4 — Local anesthetic recommendation (Lidocaine, Bupivacaine)

### SKUs in queue (4)

Percent-strength **local infiltration** vials (`1%`, `2%`, `0.25%`, `0.5%` bupivacaine) — bucket `PROCEDURAL_SEDATION`, generic injectable route.

### Medora workflow evidence

- **Procedure documentation:** `encounterProcedureLaceration` schema includes `LIDOCAINE_1`, `LIDOCAINE_2`, `LIDOCAINE_EPI` as structured local-anesthetic choices.
- **Clinical documentation:** `flow_procedural_sedation` exists with witness signature requirement.
- **MAR:** Generic PUSH path exists but does **not** capture infiltration site, volume, or procedure linkage.

### Recommendation: **B — Procedure documentation medications** (primary path)

| Dimension | Decision |
|-----------|----------|
| Final admin type | **PUSH** (keep for formulary taxonomy if product rows exist) |
| MAR eligibility | **No** (default) — exclude from MAR activation tranche |
| Order search | **Optional** — may be orderable for documentation linkage only after review |
| Activation path | **Procedure / laceration / sedation flows**, not bedside MAR |

### Rationale

Local anesthetics are **procedural adjuncts**, not recurring scheduled inpatient medications. MAR without procedure context creates medico-legal ambiguity (which wound, how much, with epinephrine?). Medora already models locals in **procedure modules** — align Wave 4 with that pattern.

**Post-review target disposition:** 4 SKUs → **BLOCKED** for MAR; **READY** for catalog + procedure-documentation linkage after M1.7C.11 flags `procedureMedication=true` (design-only field).

---

## Part 5 — Glucagon recommendation

### SKU

`GLUCAGON_1_MG_POUDRE_INJECTABLE` — powder for reconstitution, antidote class, **high-alert**, manifest **PUSH**.

### Administration type options

| Type | Fit |
|------|-----|
| **IM** | Traditional EMS/ward emergency kit (thigh IM) |
| **SQ** | Some protocols |
| **PUSH** | Common inpatient/ED after reconstitution → slow IV push |
| **INFUSION** | Not appropriate |

### Recommendation

- **Final administration type: PUSH** (keep) — matches ED/hospital reconstitution + IV push practice in acute care.
- Document in governance notes: *may also be administered IM per protocol; product row remains PUSH for IV push after reconstitution.*
- **High-alert:** Yes (keep) — vomiting, hyperglycemia, rebound hypoglycemia.
- **Double RN / witness:** No.
- **MAR eligibility:** **Yes** after sign-off — emergency hypoglycemia is a core nursing MAR use case.
- **Activation:** **READY** for catalog activation post review; prioritize in first non-RSI MAR pilot tranche.

---

## Part 6 — Respiratory exclusion strategy (11 SKUs)

**Source:** `WAVE4_KEEP_BLOCKED_RESPIRATORY_CATALOG_CODES` — **separate from clinical review queue**.

| # | Catalog code | Display | Route | Admin type | Bucket | High alert | Notes |
|---|--------------|---------|-------|------------|--------|------------|-------|
| 1 | `SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION` | Salbutamol | inhalée | INHALATION | RESPIRATORY | — | Nebulizer |
| 2 | `ALBUTEROL_0_5_SOLUTION_DE_NEBULISATION_INHALEE` | Salbutamol | inhalée | INHALATION | RESPIRATORY | — | Nebulizer |
| 3 | `IPRATROPIUM_0_5_MG_2_5_ML_SOLUTION_DE_NEBULISATION_INHALEE` | Ipratropium | inhalée | INHALATION | RESPIRATORY | — | Nebulizer |
| 4 | `RACEMIC_EPINEPHRINE_2_25_SOLUTION_DE_NEBULISATION_INHALEE` | Épinéphrine racémique | inhalée | INHALATION | RESPIRATORY | ✓ | Croup/adult neb |
| 5 | `MAGNESIUM_SULFATE_1_G_50_ML_NEB_SOLUTION_DE_NEBULISATION_INHALEE` | Sulfate de magnésium | inhalée | INHALATION | RESPIRATORY | — | Asthma neb (verify indication) |
| 6 | `BUDESONIDE_0.5_MG_PER_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE` | Budésonide | inhalée | INHALATION | RESPIRATORY | — | ENRICH on W3 code |
| 7 | `TERBUTALINE_0_25_MG_ML_SOLUTION_DE_NEBULISATION_INHALEE` | Terbutaline | inhalée | INHALATION | RESPIRATORY | — | Nebulizer |
| 8 | `NALOXONE_4_MG_0_4_ML_INJECTABLE_INTRANASALE` | Naloxone | intranasale | INHALATION* | TOXICOLOGY | ✓ | *Taxonomy proxy; not true inhalation |
| 9 | `MIDAZOLAM_5_MG_0_5_ML_NASAL_SOLUTION_NASALE_NASALE` | Midazolam | nasale | INHALATION* | PEDIATRIC_ED | ✓ | Seizure intranasal |
| 10 | `ALBUTEROL_0_083_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE` | Salbutamol peds | inhalée | INHALATION | PEDIATRIC_ED | — | Peds neb |
| 11 | `RACEMIC_EPINEPHRINE_0_25_ML_PEDS_NEB_SOLUTION_DE_NEBULISATION_INHALEE` | Épinéphrine racémique peds | inhalée | INHALATION | PEDIATRIC_ED | ✓ | Peds croup |

\*INHALATION used as MAR gate blocker; intranasal SKUs need future **NASAL** route type.

### Long-term strategy

| Subgroup | Count | Future workflow | MAR in current gate? |
|----------|------:|-----------------|----------------------|
| Nebulizer bronchodilators / steroids | 7 | **`flow_respiratory_therapy`** + RT/nursing neb documentation | **No** — requires INHALATION/NEB route or non-MAR administration record |
| Intranasal emergency (naloxone, midazolam) | 2 | **Emergency protocol documentation** (toxicology / peds seizure) | **No** — add **NASAL** admin type in future phase |
| None | 0 | Move to current PUSH/IM MAR without product redesign | — |

**Do not activate** any of the 11 in M1.7C.11. Keep `administrationType=INHALATION` and MAR gate `ADMINISTRATION_ROUTE_UNSAFE` until respiratory workflow phase.

---

## Part 7 — Governance impact matrix (clinical queue + respiratory)

| Catalog code | High alert | Double RN | Witness | Controlled | LASA | RSI | Vasopressor | Procedure med | Respiratory block |
|--------------|:----------:|:---------:|:-------:|:----------:|:----:|:---:|:-----------:|:-------------:|:-----------------:|
| Succinylcholine ×2 | ✓ | — | opt | — | — | ✓ | — | — | — |
| Rocuronium ×2 | ✓ | — | — | — | — | ✓ | — | — | — |
| Vecuronium ×2 | ✓ | — | — | — | — | ✓ | — | — | — |
| Lidocaine 1%/2% | — | — | — | — | — | — | — | **✓** | — |
| Bupivacaine 0.25/0.5% | — | — | — | — | — | — | — | **✓** | — |
| Phenylephrine push | ✓ | — | — | — | — | — | ✓ | — | — |
| Glucagon | ✓ | — | — | — | — | — | — | — | — |
| Respiratory 11 | partial | — | — | 1† | — | — | — | — | **✓** |

† Midazolam nasal: controlled Schedule IV in manifest.

---

## Part 8 — Activation readiness matrix (post-review decisions)

### Clinical review queue (12)

| SKU group | Count | Post-M1.7C.11 disposition | MAR | Order search | Catalog activate |
|-----------|------:|-------------------------|-----|--------------|------------------|
| RSI paralytics | 6 | **REVIEW_REQUIRED** (MAR policy) / **READY** (catalog) | Deferred | After catalog | After pharmacy RSI sign-off |
| Local anesthetics | 4 | **BLOCKED** (MAR) / **READY** (procedure path) | No | Optional later | With procedure flag |
| Phenylephrine push | 1 | **READY** | Yes (post cutover) | After catalog | Yes |
| Glucagon | 1 | **READY** | Yes | After catalog | Yes |

### Respiratory blocked (11)

| Disposition | Count | Reason |
|-------------|------:|--------|
| **BLOCKED** | 11 | `INHALATION` ∉ `SAFE_MAR_ADMIN_TYPES`; no neb/nasal workflow |

### Remainder of Wave 4 (204 SKUs)

Unchanged from M1.7C.9: **READY** at MAR gate (subject to governance activation workflow), still **inactive** today.

---

## Part 9 — Final Wave 4 forecast (after M1.7C.11 metadata remediation, no activation)

| Bucket | Before M1.7C.10 | After disposition applied (projected) |
|--------|----------------:|--------------------------------------:|
| **READY** (catalog + gate-safe MAR path) | 204 | **210** (+1 glucagon, +1 phenylephrine push, +6 RSI catalog-only) |
| **REVIEW_REQUIRED** (MAR or policy hold) | 12 | **6** (RSI MAR hold) |
| **BLOCKED** (MAR permanently or until new route) | 11 | **15** (+4 locals MAR-blocked) |

**Still inactive on staging until explicit activation phase:** all **227**.

---

## Part 10 — Implementation plan (design only)

### Phase A — Clinical queue remediation (M1.7C.11)

1. Add disposition metadata per SKU (e.g. `clinicalReviewDisposition: READY | MAR_DEFERRED | MAR_BLOCKED | PROCEDURE_ONLY`).
2. Remove cleared SKUs from `WAVE4_CLINICAL_REVIEW_REQUIRED_CATALOG_CODES` only after pharmacy sign-off record.
3. Apply high-alert class mapping per `high-alert-medication-governance-design.md` (PARALYTIC, VASOPRESSOR, OTHER).
4. Add governance notes for glucagon IM/IV push dual-protocol wording.
5. Flag local anesthetics `procedureMedication=true` (manifest generator field).

### Phase B — Respiratory strategy (M1.7C.12+)

1. Keep `WAVE4_KEEP_BLOCKED_RESPIRATORY` until `NASAL` and/or `NEBULIZER` admin types exist.
2. Wire `flow_respiratory_therapy` to nebulizer catalog codes.
3. Intranasal naloxone/midazolam → emergency protocol cards, not MAR.

### Phase C — Staging validation (M1.7C.12)

1. Re-seed after manifest disposition updates (no activation flags).
2. SQL: clinical queue cleared count, respiratory still 11 INHALATION, locals MAR-blocked metadata.
3. Confirm 227/227, idempotent seed.

### Phase D — Production readiness (future)

1. Pilot tranche: glucagon + phenylephrine push + non-review PUSH meds.
2. RSI and locals excluded from first MAR pilot.
3. Respiratory remains catalog-only inactive until workflow phase.

---

## Remaining risks

1. **RSI MAR without RSI flow** — highest clinical risk if activated too early.
2. **Intranasal taxonomy** — INHALATION proxy blocks MAR correctly but confuses reporting; needs NASAL type.
3. **User expectation of “14” clinical meds** — authoritative set is **12**; +2 are respiratory/intranasal blocked, not clinical queue.
4. **Lidocaine 20 mg/mL IV** — not in review queue; antiarrhythmic IV push is separate activation decision.

---

## Verdict summary

| Question | Answer |
|----------|--------|
| Clinical queue fully inventoried? | **Yes — 12/12** |
| Respiratory kept separate? | **Yes — 11/11** |
| Safe to implement M1.7C.11 disposition metadata? | **Yes** |
| Safe to activate Wave 4 in M1.7C.11? | **No** |

**SAFE FOR M1.7C.11 CLINICAL REMEDIATION IMPLEMENTATION**
