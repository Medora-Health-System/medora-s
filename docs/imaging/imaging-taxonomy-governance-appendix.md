# Imaging Taxonomy Governance Appendix

**Phase:** 3C-S0C (audit-only)  
**Manifest baseline:** ICM-1.0 (141 imaging classifiers)  
**Purpose:** Final ratification package for MR-M2, MR-M3, MR-M4, MR-M5

---

## 1) MR-M2 ratification — BODY_REGION vs ANATOMIC_SUBREGION precedence

### 1.1 Final precedence matrix

| Overlap pair | PRIMARY | SECONDARY_ALLOWED | FORBIDDEN_COMBINATION |
|--------------|---------|-------------------|-----------------------|
| `BODY_REGION_SPINE_THORACIC` vs `ANATOMIC_SUBREGION_SPINE_THORACIC` | `BODY_REGION_SPINE_THORACIC` | `ANATOMIC_SUBREGION_SPINE_THORACIC` only when clinically needed for downstream protocol/search refinement | Setting both by default on routine rows without added specificity |
| `BODY_REGION_SINUS` vs `ANATOMIC_SUBREGION_SINUS` | `BODY_REGION_SINUS` | No (redundant for current catalog scope) | Dual-tagging both on the same routine sinus study |
| `BODY_REGION_BREAST` vs `ANATOMIC_SUBREGION_BREAST` | `BODY_REGION_BREAST` | No (BODY_REGION is sufficient for current US breast scope) | Dual-tagging both on the same breast study |
| `BODY_REGION_THYROID` vs `ANATOMIC_SUBREGION_THYROID` | `BODY_REGION_THYROID` | No (BODY_REGION is sufficient for current thyroid scope) | Dual-tagging both on the same thyroid study |
| `BODY_REGION_AORTA` vs `ANATOMIC_SUBREGION_AORTA` | `BODY_REGION_AORTA` | Yes for CTA runoff/search refinement cases | Blanket dual-tagging across all aorta rows |
| `BODY_REGION_RIBS` vs `ANATOMIC_SUBREGION_RIBS` | `ANATOMIC_SUBREGION_RIBS` | `BODY_REGION_RIBS` allowed when a broad rib-region anchor is required by a workflow | Using `BODY_REGION_RIBS` alone for side-specific rib studies where subregion precision is required |

### 1.2 Ratified rule

- Use **one primary anchor by default**.
- Add secondary classifier only when it contributes concrete routing, billing, or search value.
- Avoid systematic dual-tagging of semantically identical region/subregion pairs.

---

## 2) MR-M3 ratification — CTA protocol normalization

Scope reviewed: `CTA_HEAD`, `CTA_COW`, `CTA_CAROTID`, `CTA_RECON`.

| Item | Disposition | Rationale |
|------|-------------|-----------|
| `CTA_HEAD` | **KEEP DISTINCT** | Maintains clear head angiography order intent and broad compatibility with legacy head CTA usage |
| `CTA_CAROTID` | **KEEP DISTINCT** | Distinct neck/carotid vascular intent and clinically meaningful ordering target |
| `CTA_COW` | **ALIAS** → `CTA_HEAD` | Circle of Willis is a head-subset concept; alias preserves search discoverability without fragmenting orderables |
| `CTA_RECON` | **ALIAS** → parent CTA study (non-orderable technique token) | Reconstruction describes processing/technique, not an independently billable/orderable study |

**Merge decision:** No direct merge of `CTA_HEAD` and `CTA_CAROTID`; both remain distinct orderables.

---

## 3) MR-M4 ratification — `PROTOCOL_CT_CHEST_HR`

| Candidate disposition | Final |
|-----------------------|-------|
| Billing-distinct study | **APPROVED** |
| Search-only protocol | Rejected |
| Alias candidate | Rejected |

**Final disposition:** Keep `PROTOCOL_CT_CHEST_HR` as a **billing-distinct study protocol** (not alias-only, not search-only).  
This preserves explicit ordering/billing semantics for high-resolution chest CT workflows.

---

## 4) MR-M5 ratification — Global overlap package (12 items)

| # | Overlap item | Final action | Notes |
|---|--------------|--------------|-------|
| 1 | `BODY_REGION_SPINE_THORACIC` vs `ANATOMIC_SUBREGION_SPINE_THORACIC` | **ALLOW** | Primary BODY_REGION; secondary subregion only when needed |
| 2 | `BODY_REGION_SINUS` vs `ANATOMIC_SUBREGION_SINUS` | **MERGE** | Operationally collapse to BODY_REGION anchor for current scope |
| 3 | `BODY_REGION_BREAST` vs `ANATOMIC_SUBREGION_BREAST` | **MERGE** | Collapse to BODY_REGION for current scope |
| 4 | `BODY_REGION_THYROID` vs `ANATOMIC_SUBREGION_THYROID` | **MERGE** | Collapse to BODY_REGION for current scope |
| 5 | `BODY_REGION_AORTA` vs `ANATOMIC_SUBREGION_AORTA` | **ALLOW** | Dual use permitted only in CTA refinement scenarios |
| 6 | `BODY_REGION_RIBS` vs `ANATOMIC_SUBREGION_RIBS` | **ALLOW** | Prefer subregion for specificity; region optional anchor |
| 7 | `PROTOCOL_CTA_HEAD` vs `PROTOCOL_CTA_COW` | **ALIAS** | `CTA_COW` aliases to `CTA_HEAD` |
| 8 | `PROTOCOL_CTA_COW` vs `PROTOCOL_CTA_CAROTID` | **ALLOW** | Carotid remains distinct; COW alias resolves ambiguity |
| 9 | `PROTOCOL_CTA_CHEST_STANDARD` vs `PROTOCOL_CTA_CHEST_RECONSTRUCTION` | **ALIAS** | Reconstruction is technique token, not standalone orderable |
| 10 | `PROTOCOL_CT_CHEST_HR` vs standard chest CT protocol | **ALLOW** | Keep HR as billing-distinct protocol |
| 11 | `BODY_REGION_PELVIS` vs `BODY_REGION_HIP` | **ALLOW** | Maintain separate order intents; workbook must disambiguate |
| 12 | `BODY_REGION_SOFT_TISSUE` vs `BODY_REGION_NECK` | **ALLOW** | Maintain distinct intents; neck soft tissue mapping rule required |

**REJECT decisions:** None.

---

## 5) Governance closure and seed authorization impact

- **MR-M2:** RESOLVED
- **MR-M3:** RESOLVED
- **MR-M4:** RESOLVED
- **MR-M5:** RESOLVED

With this appendix ratified, governance blockers for S4/S5/S6 are closed at documentation level.

---

*Audit artifact only. No seed, migration, deployment, or code implementation performed.*
