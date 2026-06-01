# Imaging Taxonomy Workbook Gap Analysis

**Phase:** 3D (audit + design only)  
**Baseline:** Phase 3A legacy inventory (267 studies); Medora catalog (44 rows); Phase 3C taxonomy design  
**Workbook status:** Schema designed — **267-row population not started**

---

## 1. Executive summary

| Readiness area | Status | Completion |
|----------------|--------|------------|
| Workbook schema design | **Complete** | 100% |
| 44-row classifier tuple draft | **Complete** (design) | 100% draft; 0% signed-off |
| 267-row legacy mapping (pre-audit) | **Partial** | Coverage assigned in `legacy-vs-medora-coverage.md`; classifier tuple **not** assigned |
| Localization governance | **Partial** | 44-row audit clean; duplicate FR pairs flagged |
| Billing governance | **Partial** | Status taxonomy defined; 100% pending_license |
| Duplicate governance | **Partial** | 5 pairs in map; 1 additional pair flagged |
| Workbook artifact (CSV/XLSX) | **Missing** | 0 rows materialized |

**Overall workbook gap:** Schema ready; **population and sign-off are the critical path**.

---

## 2. Legacy inventory mapping (Part 3)

### 2.1 Coverage summary (267 legacy studies)

**Source:** `legacy-vs-medora-coverage.md`, `imaging-gap-analysis.md`

| Coverage Status | Count | % |
|-----------------|------:|--:|
| **FULL** | 23 | 8.6% |
| **PARTIAL** | 107 | 40.1% |
| **MISSING** | 137 | 51.3% |
| **Total** | **267** | 100% |

### 2.2 Coverage by modality family

| Family | Total | FULL | PARTIAL | MISSING |
|--------|------:|-----:|--------:|--------:|
| X-Ray | 118 | 3 | 62 | 53 |
| CT | 43 | 5 | 13 | 25 |
| CTA | 12 | 3 | 5 | 4 |
| MRI | 27 | 1 | 12 | 14 |
| MRA | 5 | 0 | 0 | 5 |
| Ultrasound | 53 | 11 | 15 | 27 |
| Nuclear Medicine | 5 | 0 | 0 | 5 |
| Fluoroscopy | 4 | 0 | 0 | 4 |

### 2.3 Workbook mapping status by coverage tier

| Tier | Legacy rows | Canonical Code assigned | Classifier tuple assigned | Billing Status assigned |
|------|------------:|------------------------:|--------------------------:|------------------------:|
| FULL | 23 | 23 (in coverage doc) | **0** | **0** |
| PARTIAL | 107 | 107 (best-match code) | **0** | **0** |
| MISSING | 137 | **0** (requires NEW_*) | **0** | **0** |
| **Total** | **267** | **130** partial code mapping | **0** | **0** |

### 2.4 FULL coverage rows (23) — workbook priority P0

These legacy studies map exactly to active Medora codes and should be the **first workbook rows validated**:

| Legacy Study | Canonical Code |
|--------------|----------------|
| Abdomen KUB | `XR_ABD_AP` |
| Chest X-Ray 1 View (CXR) | `XR_CHEST` |
| Chest X-Ray 2 View (CXR) | `XR_CHEST_2V` |
| CT Abdomen/Pelvis w IV Contrast | `CT_ABDOMEN_PELVIS` *(partial contrast)* |
| CT C-Spine wo IV Contrast | `CT_CERVICAL_SPINE` |
| CT Chest wo IV Contrast | `CT_CHEST` |
| CT Head wo IV Contrast | `CT_HEAD_WO_CONTRAST` |
| CT L-Spine wo IV Contrast | `CT_SPINE_LUMBAR` |
| CTA Chest | `CTA_CHEST` |
| CTA Head/Neck | `CTA_HEAD_NECK` |
| CTA Abdomen/Pelvis | `CTA_ABDOMEN_PELVIS` |
| FAST | `US_FAST` |
| MRI Head wo Contrast | `MRI_BRAIN` |
| MRI Spine wo Contrast | `MRI_SPINE` |
| US Abdomen Complete | `US_ABDOMEN` |
| US OB <14 Weeks | `US_OB_FIRST` |
| US OB >14 Weeks | `US_OB_GROWTH` |
| US Pelvis | `US_PELVIS` |
| US Renal | `US_RENAL` |
| US RUQ / Gallbladder | `US_RUQ_GALLBLADDER` |
| US Scrotum | `US_SCROTUM_TESTICULAR` |
| US Soft Tissue | `US_SOFT` |
| US LE Venous Doppler | `US_VENOUS_DOPPLER_LE` |

*Note: Several FULL rows still require contrast/view/laterality tuple refinement — coverage tier reflects orderable identity, not complete classifier tuple.*

### 2.5 PARTIAL coverage pattern (107 rows)

**Dominant pattern:** Generic Medora MSK XR (`XR_KNEE`, `XR_ANKLE`, etc.) absorbs legacy side-specific and multi-view orderables.

| Pattern | Example legacy | Medora code | Workbook gap |
|---------|----------------|-------------|--------------|
| Generic MSK absorbs laterality | `Knee Left 3V` | `XR_KNEE` | Need `LATERALITY_LEFT` + `VIEW_COUNT_THREE` on **new row** or accept PARTIAL |
| Generic MSK absorbs views | `Elbow Left 4V` | `XR_ELBOW` | Need view classifier or separate code |
| Protocol not modeled | `Chest Post Intubation` | `XR_CHEST` | Need `PROTOCOL_XR_CHEST_POST_INTUBATION` |
| Contrast not modeled | `CT Chest w IV Contrast` | `CT_CHEST` | Need contrast classifier or separate code |
| Subregion not modeled | `C-Spine 2-3V` (XR) | none | MISSING → NEW code in 2E |
| Angio folded into CT | `CTA Chest Triple Rule Out` | `CTA_CHEST` | Need `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` |

**Workbook decision required:** For each PARTIAL row, mark `Catalog Action` as either:

- **EXPAND** — new canonical code (enterprise parity), or  
- **TUPLE** — map to existing code with classifier dimensions (hybrid strategy per Phase 3B)

### 2.6 MISSING coverage clusters (137 rows)

| Cluster | Count | Target modality | Workbook action |
|---------|------:|-----------------|-----------------|
| XR spine / specialty (C/T/L-spine, ribs, sinus, skull, digits, …) | 53 | `MODALITY_XR` | NEW codes + subregion classifiers |
| US breast / arterial / carotid / specialty | 27 | `MODALITY_US` | NEW codes + protocol classifiers |
| CT MSK / facial / perfusion / STN | 25 | `MODALITY_CT` | NEW codes + contrast/subregion |
| MRI body / MSK / cholangiogram / sella | 14 | `MODALITY_MRI` | NEW codes + contrast/subregion |
| MRA (entire family) | 5 | `MODALITY_MRA` *(proposed)* | NEW modality + codes |
| Nuclear Medicine (entire family) | 5 | `MODALITY_NM` *(proposed)* | NEW modality + protocol |
| CTA extremity angiography | 4 | `MODALITY_CTA` | NEW codes |
| Fluoroscopy (entire family) | 4 | `MODALITY_FL` *(proposed)* | NEW modality + protocol |

**Estimated target catalog size after normalization:** ~100–150 canonical rows (Phase 3B hybrid), not 267.

### 2.7 Tuple collision risks (workbook must detect)

| Risk | Example | Detection rule |
|------|---------|----------------|
| Same tuple, different CPT | `CT Chest wo` vs `CT Chest w` contrast | Different `CONTRAST_TYPE` → separate codes if CPT differs |
| Same tuple, different protocol | `CTA Chest` vs `CTA Chest Triple Rule Out` | Different `PROTOCOL` → separate codes |
| Same legacy intent, two Medora codes | `XR_ABDOMEN` vs `XR_ABD_AP` | Duplicate governance §6.2 |
| Laterality on shared generic code | 48× `Knee *V` → `XR_KNEE` | Flag `Manual Review Required` unless expanding rows |

---

## 3. Classifier vocabulary gaps (workbook dependency)

Workbook columns reference classifiers **not yet seeded**:

| Domain | Seeded today | Workbook needs (estimate) | Gap |
|--------|-------------:|----------------------------:|----:|
| MODALITY | 4 | 8 | +4 (CTA, MRA, NM, FL) |
| BODY_REGION | 28 | ~45 | +~17 |
| VIEW_COUNT | 1 | 6 | +5 |
| CONTRAST_TYPE | 2 | 5 | +3 |
| LATERALITY | 0 | 4 | +4 (new domain) |
| ANATOMIC_SUBREGION | 0 | ~50 | +~50 (new domain) |
| PROTOCOL | 0 | ~60 | +~60 (new domain) |

**Blocker:** Workbook rows cannot be validated against production DB until Phase 3C-S1/S2 vocabulary seeds are designed (already specified in `imaging-taxonomy-migration-plan.md`).

---

## 4. Localization gaps (Part 4)

### 4.1 Current catalog (44 rows)

| Issue | Severity | Count |
|-------|----------|------:|
| Mixed EN/FR in display fields | None | 0 |
| Missing EN or FR | None | 0 |
| Duplicate FR among active codes | Medium | 3 pairs |
| Duplicate EN among active codes | Low | 2 pairs |
| Legacy `name` field English bodyRegion tokens | Low | 6 codes use English legacy keys (`head`, `scrotum`, etc.) — not user-facing |

### 4.2 Projected legacy workbook localization gaps

| Issue | Estimated impact |
|-------|------------------|
| NEW row FR labels not yet authored | 137 MISSING legacy studies |
| Laterality in EN not mirrored in FR | ~90 legacy studies with Left/Right/Bilat |
| View count parenthetical inconsistency | EN `(2 views)` vs FR `(2 incidences)` — enforce in workbook template |
| Legacy English names used as FR display | **Forbidden** — must author French |

### 4.3 Workbook validation rules (not yet automated)

- [ ] EN column regex / dictionary check
- [ ] FR column regex / dictionary check
- [ ] Duplicate hash detection across active rows
- [ ] Retirement pair label deduplication post-cutover

---

## 5. Billing gaps (Part 5)

### 5.1 44-row catalog

| Billing Status | Count |
|----------------|------:|
| KNOWN_CPT_EXAMPLE | 20 |
| UNKNOWN_CPT | 24 |
| PENDING_CPT_REVIEW | 44 |
| CPT_CONFLICT | 6 (see design doc §5.3) |

### 5.2 Legacy / expansion billing gaps

| Gap | Impact |
|-----|--------|
| No licensed CPT source | 100% workbook rows must stay `PENDING_CPT_REVIEW` |
| NM / FL / MRA families | No example CPT infrastructure at all |
| Contrast-differentiated CT/MRI | Cannot assign example CPT until contrast tuple signed |
| Multi-line trauma CAP | Workbook must flag `CPT_CONFLICT` / multi-line note |
| View/laterality-sensitive XR | CPT may change when enterprise rows expand |

**No billing changes in Phase 3D** — gaps documented for workbook `Billing Status` column only.

---

## 6. Duplicate governance gaps (Part 6)

| Gap | Detail |
|-----|--------|
| `XR_ABDOMEN` ↔ `XR_ABD_AP` | Not in successor map; workbook must decide canonical + retirement |
| `doppler` global alias | `DOPPLER_VEIN` alias collision on retirement (Phase 2D finding) |
| `CT_CHEST_CTA` → `CTA_CHEST` | No licensed CPT on successor — blocks billing-safe retirement |
| Successor `BillingCatalog` rows | Local DB gap from Phase 2D audit — blocks Tier A batch |
| Production OrderItem counts | Not queried — retirement safety unverified |

### Alias coverage gap

| Metric | Count |
|--------|------:|
| Legacy studies | 267 |
| Medora `ImagingStudyAlias` seeds | ~80 aliases across 44 codes (estimate from seed file) |
| Legacy studies with no alias path | ~180+ |

Workbook `Legacy Aliases` column must be populated for search parity during Phase 2E.

---

## 7. Workbook schema gaps

| Required column | Schema defined | Validation rules defined | Automated checker |
|-----------------|:--------------:|:------------------------:|:-----------------:|
| Legacy Study | ✓ | ✓ | ✗ |
| Canonical Code | ✓ | ✓ | ✗ |
| Display Name EN/FR | ✓ | ✓ | ✗ |
| MODALITY … PROTOCOL | ✓ | ✓ | ✗ |
| Coverage Status | ✓ | ✓ | ✗ |
| Billing Status | ✓ | ✓ | ✗ |
| Retirement Candidate | ✓ | ✓ | ✗ |
| Successor Code | ✓ | ✓ | ✗ |
| Manual Review Required | ✓ | ✓ | ✗ |

**Missing tooling (future Phase 3E+):** CSV linter, classifier code validator against MRV seed manifest, duplicate tuple detector, retirement map exporter.

---

## 8. Cross-reference integrity gaps

| Source A | Source B | Gap |
|----------|----------|-----|
| Workbook Canonical Code | `haiti-imaging-studies.ts` | 44 codes documented; not exported as CSV |
| Workbook Coverage | `legacy-vs-medora-coverage.md` | 267 rows pre-mapped; not merged into workbook |
| Workbook Retirement | `imaging-catalog-successor-map.ts` | 5 pairs; 1 pair missing |
| Workbook Billing | `imaging-cpt-mapping-review.ts` | Status only; no CPT values |
| Workbook Classifiers | `catalog-classifier-backfill-map.ts` | Partial maps; 3 new domains absent |
| Workbook NEW codes | `imaging-family-normalization-proposal.md` | Naming convention proposed; codes not assigned |

---

## 9. Gap priority matrix

| Priority | Gap | Blocks |
|----------|-----|--------|
| **P0** | Materialize 44-row signed workbook | 3C-B1 backfill |
| **P0** | Phase 3C vocabulary seed design sign-off | Workbook classifier validation |
| **P0** | Contrast manual review resolution (9 CT/MRI codes) | Accurate tuple on current catalog |
| **P1** | Populate 267-row workbook from coverage doc | 2E expansion planning |
| **P1** | EXPAND vs TUPLE decision for 107 PARTIAL rows | Catalog row count / classifier depth |
| **P1** | XR abdomen duplicate decision | Search alias safety |
| **P2** | Author FR labels for ~137 NEW rows | Product UI quality |
| **P2** | Licensed CPT workbook | Billing activation |
| **P2** | Workbook CSV linter | Ongoing governance |

---

*Phase 3D — audit only. No workbook file created.*
