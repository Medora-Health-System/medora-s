# Imaging Classifier Sign-Off

**Phase:** 3C-S0 / 3C-S0A (audit-only)  
**Manifest version:** ICM-1.0 *(MR-M1 resolved)*  
**Purpose:** Governance approval package for 3C-S1 / 3C-S2 / 3C-B1

---

## 1. Executive verdict

| Item | Verdict |
|------|---------|
| **Manifest completeness (ICM-1.0)** | **SAFE** — 141 codes enumerated |
| **MR-M1 VIEW_COUNT policy** | **RESOLVED** — Option A (`VIEW_COUNT_UNSPECIFIED` approved) |
| **Duplicate code audit** | **SAFE** — no duplicate codes within domain |
| **Semantic overlap audit** | **SAFE** — ratified in governance appendix (MR-M5 closed) |
| **Clinical radiology sign-off** | **SATISFIED** — Medora W1.2 governance attestation *(pilot radiology follow-up optional)* |
| **Gate W1 (workbook / 44-row backfill)** | **CLOSED** — 2026-05-31 (`imaging-gate-w1-closure-record.md`) |
| **3C-S1 seed execution** | **SAFE** from classifier governance standpoint |
| **3C-S2 seed execution** | **SAFE** from classifier governance standpoint *(after 3C-S1 prerequisite)* |
| **3C-B1 backfill execution** | **AUTHORIZED** — preflight required (`imaging-b1-production-authorization.md`) |

---

## 2. Part 2 — Duplicate audit

### 2.1 Duplicate classifier codes

| Check | Result |
|-------|--------|
| Duplicate `(domain, code)` pairs in manifest | **0** — PASS |
| Duplicate code strings across domains | **0** — prefix namespaces disambiguate |
| Collision with existing seeded codes | **0** — all new codes are net-new or existing retained |

### 2.2 Duplicate semantic meanings

| Pair A | Pair B | Severity | Disposition |
|--------|--------|----------|-------------|
| `BODY_REGION_SPINE_CERVICAL` | `ANATOMIC_SUBREGION_SPINE_CERVICAL` | Low | **Allowed** — body region anchor + subregion refinement (workbook rule: both may be set on CT cervical) |
| `BODY_REGION_SPINE` | `ANATOMIC_SUBREGION_SPINE_LUMBAR` | Low | **Allowed** — generic spine + lumbar subregion |
| `BODY_REGION_SPINE_THORACIC` | `ANATOMIC_SUBREGION_SPINE_THORACIC` | **Medium** | **MANUAL_REVIEW** — pick primary anchor for T-spine XR/CT expansion |
| `BODY_REGION_HEAD_NECK` | `ANATOMIC_SUBREGION_CAROTID` / `COW` | Low | **Allowed** — region vs vascular subregion |
| `BODY_REGION_SINUS` | `ANATOMIC_SUBREGION_SINUS` | **Medium** | **MANUAL_REVIEW** — consolidate to one layer for sinus studies |
| `BODY_REGION_BREAST` | `ANATOMIC_SUBREGION_BREAST` | **Medium** | **MANUAL_REVIEW** — use BODY_REGION only for US breast |
| `BODY_REGION_THYROID` | `ANATOMIC_SUBREGION_THYROID` | **Medium** | **MANUAL_REVIEW** — use BODY_REGION; subregion redundant |
| `BODY_REGION_HEPATOBILIARY` | `ANATOMIC_SUBREGION_BILIARY` | Low | **Allowed** — region for HIDA; subregion for MR cholangiogram |
| `BODY_REGION_AORTA` | `ANATOMIC_SUBREGION_AORTA` | **Medium** | **MANUAL_REVIEW** — prefer BODY_REGION for US aorta; subregion for CTA runoff |
| `BODY_REGION_RIBS` | `ANATOMIC_SUBREGION_RIBS` | **Medium** | **MANUAL_REVIEW** — prefer ANATOMIC_SUBREGION for side-specific ribs |
| `BODY_REGION_LOWER_EXTREMITY` | `ANATOMIC_SUBREGION_LOWER_EXTREMITY_WHOLE` | Low | **Allowed** — Doppler vs whole-extremity XR |
| `CONTRAST_TYPE_NONE` | null FK on XR/US | Low | **Allowed** — NONE for explicit non-contrast; null when N/A |

**Semantic duplicate verdict:** No **REJECT** items. **6 MANUAL_REVIEW** pairs require workbook authoring rule before 2E expansion.

### 2.3 Overlapping protocol definitions

| Protocol A | Protocol B | Overlap | Disposition |
|------------|------------|---------|-------------|
| `PROTOCOL_CTA_CHEST_STANDARD` | `PROTOCOL_CTA_CHEST_TRIPLE_RULE_OUT` | Same modality/region; different clinical protocol | **Distinct** — keep both |
| `PROTOCOL_CTA_CHEST_STANDARD` | `PROTOCOL_CTA_CHEST_RECONSTRUCTION` | Reconstruction is technique, not protocol | **MANUAL_REVIEW** — recon may be alias not separate orderable |
| `PROTOCOL_CTA_HEAD` | `PROTOCOL_CTA_COW` | COW ⊂ head angio | **MANUAL_REVIEW** — legacy maps both to `CTA_HEAD_NECK` |
| `PROTOCOL_CTA_COW` | `PROTOCOL_CTA_CAROTID` | Carotid ⊂ head/neck CTA | **MANUAL_REVIEW** — may merge to single protocol + subregion |
| `PROTOCOL_NM_VQ_PERFUSION` | `PROTOCOL_NM_VQ_VENTILATION` | VQ components | **Distinct** — keep both |
| `PROTOCOL_NM_VQ_COMBINED` | perfusion + ventilation | Combined study | **Distinct** — superset orderable |
| `PROTOCOL_US_OB_FIRST_TRIMESTER` | `PROTOCOL_US_OB_FIRST_TRIMESTER_LIMITED` | Limited ⊂ first trimester | **Distinct** — keep both |
| `PROTOCOL_US_OB_FIRST_TRIMESTER` | `PROTOCOL_US_OB_FIRST_TRIMESTER_TV` | TV ⊂ first trimester | **Distinct** — keep both |
| `PROTOCOL_CT_CHEST_HR` | standard chest CT | HR = high-resolution protocol | **MANUAL_REVIEW** — CPT/billing may differ |

**Protocol overlap verdict:** **0 REJECT**. **4 MANUAL_REVIEW** CTA/CT protocols before 2E.

### 2.4 Overlapping body-region definitions

| Region A | Region B | Issue | Disposition |
|----------|----------|-------|-------------|
| `BODY_REGION_ABDOMEN` | `BODY_REGION_ABDOMEN_RUQ` | RUQ ⊂ abdomen | **Allowed** — hierarchical |
| `BODY_REGION_ABDOMEN` | `BODY_REGION_ABDOMEN_PELVIS` | Distinct orderables | **Allowed** |
| `BODY_REGION_PELVIS` | `BODY_REGION_HIP` | Hip studies may include pelvis | **MANUAL_REVIEW** — workbook disambiguation |
| `BODY_REGION_VASCULAR` | `BODY_REGION_LOWER_EXTREMITY` | Doppler overlap | **Allowed** — legacy Doppler maps to LE |
| `BODY_REGION_SOFT_TISSUE` | `BODY_REGION_NECK` | Neck soft tissue US | **MANUAL_REVIEW** — map `US Neck / Head Soft Tissue` |
| `BODY_REGION_FACE` | `BODY_REGION_HEAD` | Facial vs head CT | **Allowed** — separate expansion rows |

---

## 3. Part 3 — Governance audit by domain

| Domain | Count | Verdict | Rationale |
|--------|------:|---------|-----------|
| **MODALITY** | 8 | **SAFE** | Complete for legacy 267 + 2E; CTA/MRA/NM/FL cover missing families |
| **BODY_REGION** | 42 | **SAFE** | Covers Haiti seed + expansion clusters; 6 overlap pairs flagged for authoring rules |
| **VIEW_COUNT** | 6 | **SAFE** | MR-M1 resolved (3C-S0A): explicit UNSPECIFIED for XR; null only for non-XR / not-yet-backfilled |
| **CONTRAST_TYPE** | 5 | **SAFE** | WO/W/WWO/none/angio sufficient for CT/MRI/CTA; `CONTRAST_TYPE_UNSPECIFIED` correctly forbidden |
| **LATERALITY** | 4 | **SAFE** | Minimal closed set; required on all catalog rows |
| **ANATOMIC_SUBREGION** | 36 | **SAFE** | MR-M2 ratified with precedence matrix (primary/secondary/forbidden) |
| **PROTOCOL** | 40 | **SAFE** | MR-M3/MR-M4 ratified (CTA aliasing + CT CHEST HR billing-distinct) |

### 3.1 REJECT list

**None.** No classifier codes rejected from ICM-1.0.

### 3.2 Governance ratification summary (manifest-level)

| # | Topic | Status | Blocks |
|---|-------|--------|--------|
| ~~MR-M1~~ | ~~VIEW_COUNT policy~~ | **RESOLVED** (3C-S0A — Option A) | — |
| ~~MR-M2~~ | ~~BODY_REGION vs ANATOMIC_SUBREGION authoring rules (6 pairs)~~ | **RESOLVED** (3C-S0C) | `imaging-taxonomy-governance-appendix.md` §1 |
| ~~MR-M3~~ | ~~CTA protocol bundle (HEAD/COW/CAROTID/RECON)~~ | **RESOLVED** (3C-S0C) | `imaging-taxonomy-governance-appendix.md` §2 |
| ~~MR-M4~~ | ~~`PROTOCOL_CT_CHEST_HR` billing identity~~ | **RESOLVED** (3C-S0C) | `imaging-taxonomy-governance-appendix.md` §3 |
| ~~MR-M5~~ | ~~Global overlap package (12 items)~~ | **RESOLVED** (3C-S0C) | `imaging-taxonomy-governance-appendix.md` §4 |

### 3.3 Phase 3C-S0A — VIEW_COUNT policy resolution (MR-M1)

**Audit inputs:** 267 legacy studies; 44-row catalog; ICM-1.0 manifest.

#### Legacy inventory (view semantics)

| Category | Count | Examples |
|----------|------:|----------|
| Explicit numeric (1V–4V, 2 View) | 97 | Knee Left 3V, Chest X-Ray 2 View |
| Complete series | 6 | C-Spine Complete, Sinus Complete |
| Explicit <3V | 1 | Facial Bones <3V |
| Protocol view token (not view FK) | 1 | Chest 1V Decub → `PROTOCOL_XR_CHEST_DECUBITUS` |
| XR unspecified (no view token) | 16 | Abdomen KUB, Hip Bilateral w Pelvis |
| Non-XR not applicable | 146 | All CT, US, MRI, CTA, NM, FL, MRA |

#### Current Medora catalog (44 rows)

| Category | Rows | VIEW_COUNT policy |
|----------|-----:|-------------------|
| Explicit view in code/name | 3 | `VIEW_COUNT_ONE` or `VIEW_COUNT_TWO` |
| Generic XR (view not in code) | 15 | `VIEW_COUNT_UNSPECIFIED` |
| Non-XR | 26 | **null** *(dimension N/A)* |

Explicit rows: `XR_CHEST` → ONE; `XR_CHEST_2V` → TWO; `XR_ABD_AP` → ONE.

#### Option comparison

| Option | Total codes | Verdict |
|--------|------------:|---------|
| **A** — add `VIEW_COUNT_UNSPECIFIED` | 141 | **Approved** |
| **B** — null FK for unspecified XR | 140 | **Rejected** — conflates unknown, unspecified, and not-yet-backfilled |
| **C** — add `VIEW_COUNT_NOT_APPLICABLE` | 141+ | **Rejected** — non-XR N/A inferable from modality |

**Authoritative policy:** **Option A.** Final classifier total **141**.

**Approved VIEW_COUNT codes (6):** `VIEW_COUNT_ONE`, `VIEW_COUNT_TWO`, `VIEW_COUNT_THREE`, `VIEW_COUNT_FOUR`, `VIEW_COUNT_COMPLETE`, `VIEW_COUNT_UNSPECIFIED`.

---

## 4. Part 4 — Future expansion audit

| Modality family | Legacy count | MODALITY code | BODY/ SUBREGION | PROTOCOL | Support |
|-----------------|-------------:|---------------|-----------------|----------|---------|
| **X-Ray** | 118 | `MODALITY_XR` | MSK + spine + subregions | XR protocols (5) | **Full** |
| **CT** | 43 | `MODALITY_CT` | + contrast types | CT protocols (3) | **Full** |
| **CTA** | 12 | `MODALITY_CTA` | Aorta, head/neck | CTA protocols (8) | **Full** *(MR-M3)* |
| **MRI** | 27 | `MODALITY_MRI` | Spine, MSK, head | MRI cholangiogram | **Full** |
| **MRA** | 5 | `MODALITY_MRA` | Carotid, brain, LE | *(use CTA analogs)* | **Full** |
| **Ultrasound** | 53 | `MODALITY_US` | Breast, thyroid, LE/UE | US protocols (14) | **Full** |
| **Fluoroscopy** | 4 | `MODALITY_FL` | — | FL protocols (4) | **Full** |
| **Nuclear Medicine** | 5 | `MODALITY_NM` | Hepatobiliary | NM protocols (5) | **Full** |
| **Future Echo** | 0 in legacy | *Not in ICM-1.0* | Reserve `MODALITY_ECHO` | — | **Deferred** — do not conflate with US |
| **Future IR** | 0 in legacy | *Not in ICM-1.0* | — | — | **Deferred** — Phase 6+ |

**Expansion verdict:** ICM-1.0 supports all **267 legacy studies** and **2E target (105–140 catalog rows)**. Echo/IR explicitly out of scope.

---

## 5. Phase 3C-S0C gate completion audit

| Gate | Scope | Status | Blocker | Recommended resolution |
|------|-------|--------|---------|------------------------|
| **S1** | Classifier manifest completeness | **READY** | None | Lock ICM-1.0 (141) as authoritative baseline for seed guard checks |
| **S2** | MODALITY / BODY_REGION / VIEW_COUNT / CONTRAST_TYPE readiness | **READY** | None | Proceed with 3C-S1 seed package exactly as enumerated (8/42/6/5) |
| **S3** | LATERALITY readiness | **READY** | None | Keep 4-code closed set and apply uniformly in workbook/backfill |
| **S4** | ANATOMIC_SUBREGION readiness | **READY** | None | Ratified precedence matrix published in `imaging-taxonomy-governance-appendix.md` §1 |
| **S5** | PROTOCOL readiness | **READY** | None | CTA normalization and CT CHEST HR disposition ratified in `imaging-taxonomy-governance-appendix.md` §2–§3 |
| **S6** | Global duplicate / semantic overlap readiness | **READY** | None | 12-item overlap package ratified in `imaging-taxonomy-governance-appendix.md` §4 |

**Sign-off gate:** S1–S6 classifier governance gates are now READY. Seed execution still depends on operational prerequisites outside classifier governance.

---

## 6. Approval record (blank)

| Role | Name | Date | ICM version |
|------|------|------|-------------|
| Radiology clinical lead | | | ICM-1.0 |
| Product owner | | | ICM-1.0 |
| Engineering lead | | | ICM-1.0 |

---

*Phase 3C-S0 / 3C-S0A — audit only. No seed executed.*
