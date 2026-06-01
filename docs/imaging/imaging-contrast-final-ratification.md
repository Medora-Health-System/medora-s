# Imaging Contrast Final Ratification (3C-B1B)

**Phase:** 3C-B1B (audit-only)  
**Scope:** Final governance closure for the 2 active contrast blockers after 3C-B1A  
**Baseline:** ICM-1.0; 44-row backfill design (`imaging-classifier-backfill-mapping-44.md`)  
**Prior closure:** `imaging-contrast-manual-review-closure.md` (3C-B1A)

---

## Executive summary

| Code | Final disposition | Confidence | Active contrast auto-apply blocker? |
|------|-------------------|:----------:|:-----------------------------------:|
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` | **KEEP MANUAL_REVIEW** — intentional null contrast FK (ratified) | **HIGH** | **NO** (governance-closed) |
| `MRI_SPINE` | **KEEP MANUAL_REVIEW** — intentional null contrast FK (ratified) | **HIGH** | **NO** (governance-closed) |

**Contrast governance queue:** **CLOSED** for 3C-B1 (all 11 contrast-adjacent rows have a final disposition: 5 APPLY from 3C-B1A + 2 intentional null + 2 predecessor/inactive null + `CT_HEAD_WO_CONTRAST` already APPLY).

**3C-B1 production execution:** remains **NOT SAFE** — primary blocker is **Gate W1 OPEN** (no clinical sign-off; workbook CSV gate not met), not unresolved contrast adjudication.

---

## Part 1 — `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`

### 1.1 Current catalog definition

| Attribute | Value |
|-----------|--------|
| Code | `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` |
| displayNameEn | CT chest/abdomen/pelvis trauma protocol |
| displayNameFr | TDM thorax/abdomen/bassin protocole trauma |
| Active | ✓ |
| Legacy modality | CT |
| Legacy bodyRegion | `chest_abdomen_pelvis` |
| Aliases | `trauma pan scan`, `CT CAP`, `trauma CT` |
| searchText | `ct chest abdomen pelvis trauma protocol pan scan cap tdm thorax abdomen bassin` |

**Source:** `apps/api/prisma/data/haiti-imaging-studies.ts`

### 1.2 Current search behavior

- Discoverable via display names (EN/FR), aliases (`CT CAP`, `trauma pan scan`), and trauma/pan-scan tokens in `searchText`.
- Radlex candidate script requires `trauma` in haystack for this code (`generate-imaging-radlex-candidates.ts`).
- **No contrast tokens** in display, aliases, or searchText.

### 1.3 Trauma order-set usage

| Finding | Evidence |
|---------|----------|
| **Not in bundled trauma order set** | `CreateOrderModal` trauma set: `CT_HEAD_WO_CONTRAST` (+ `CT_HEAD` fallback), `CT_CERVICAL_SPINE`, `XR_CHEST` — no CAP row |
| Trauma workflow still supported | Individual catalog order; search aliases; FAST/US and spine CT in same clinical pathway |

### 1.4 Legacy inventory mappings

| Result | Detail |
|--------|--------|
| **No legacy FULL/PARTIAL row** | `legacy-vs-medora-coverage.md` has no dedicated legacy “CT CAP” / pan-scan line — **Medora-native canonical** |
| Normalization rule | `Trauma`, `CAP`, pan-scan → `PROTOCOL_CT_CAP_TRAUMA` (protocol layer, not contrast) |

### 1.5 CPT / billing

| Status | Notes |
|--------|-------|
| `UNKNOWN_CPT` | Workbook population |
| Review file | `imaging-cpt-mapping-review.ts`: “Trauma pan-scan billing may require **multiple CPT lines**; pending licensed CPT source and site billing policy.” |
| Billing impact of contrast FK | **None at backfill** — CPT not wired; contrast FK does not set fee schedule |

### 1.6 Existing classifier tuple (44-row design)

| Field | Disposition |
|-------|-------------|
| `modalityClassifierId` | `MODALITY_CT` (APPLY) |
| `bodyRegionClassifierId` | `BODY_REGION_CHEST_ABDOMEN_PELVIS` (APPLY) |
| `lateralityClassifierId` | `LATERALITY_UNSPECIFIED` (APPLY) |
| `protocolClassifierId` | `PROTOCOL_CT_CAP_TRAUMA` (APPLY) |
| `viewCountClassifierId` | NOT_APPLICABLE |
| `anatomicSubregionClassifierId` | NOT_APPLICABLE |
| `contrastTypeClassifierId` | **MANUAL_REVIEW → ratified intentional null** |

### 1.7 Option evaluation (A–E)

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **A. CONTRAST_TYPE_WITHOUT** | **REJECT** | No display/legacy wo anchor; trauma pan-scan is not universally non-contrast — would be clinical guess |
| **B. CONTRAST_TYPE_WITH** | **REJECT** | Many trauma CAP protocols use IV contrast, but not all — would be clinical guess |
| **C. CONTRAST_TYPE_WITH_AND_WITHOUT** | **REJECT** | Implies a combined w&wo orderable; this row is a single protocol bundle, not a combined study code |
| **D. CONTRAST_TYPE_UNSPECIFIED** | **REJECT** | **Forbidden** in ICM-1.0 (`imaging-classifier-manifest.md`) |
| **E. KEEP MANUAL_REVIEW** | **APPROVED** | Contrast phase is **out of scope** for this single 44-row orderable; `PROTOCOL_CT_CAP_TRAUMA` carries trauma intent |

### 1.8 Final ratification — `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`

| Item | Value |
|------|--------|
| **Recommended disposition** | **E. KEEP MANUAL_REVIEW** |
| **Ratification ID** | **B1B-RAT-CAP-001** |
| **Backfill behavior** | Exclude from `CONTRAST_CATALOG_CODE_TO_CLASSIFIER` auto-apply; leave `contrastTypeClassifierId` **null** |
| **Confidence** | **HIGH** |
| **Clinical rationale** | Pan-scan trauma CT contrast (wo vs w IV) is chosen per patient/protocol at order time, not encoded in catalog display name |
| **Governance rationale** | ICM forbids guessing; protocol classifier already assigned; no legacy FULL contrast anchor; future 2E may split contrast-specific CAP rows |
| **Billing impact** | None at FK backfill; multi-line CPT remains Gate W3 / licensed source |
| **Search impact** | None — search does not read contrast FK today |
| **Backfill impact** | Contrast slot **SKIPPED** (audit: MANUAL_REVIEW / unchanged null); other 6 fields still APPLY per mapping |

---

## Part 2 — `MRI_SPINE`

### 2.1 Current catalog definition

| Attribute | Value |
|-----------|--------|
| Code | `MRI_SPINE` |
| displayNameEn | MRI spine |
| displayNameFr | IRM rachis |
| Active | ✓ |
| Legacy modality | MRI |
| Legacy bodyRegion | RACHIS |
| Aliases | `mri spine`, `irm rachis`, `spine mri` |
| searchText | `mri spine irm rachis cord compression back pain` |

### 2.2 Legacy mappings (9 PARTIAL rows → one code)

| Legacy study | Medora code | Coverage |
|--------------|-------------|----------|
| MRI C-Spine w / wo / w&wo Contrast | `MRI_SPINE` | PARTIAL |
| MRI L-Spine w / wo / w&wo Contrast | `MRI_SPINE` | PARTIAL |
| MRI T-Spine w / wo / w&wo Contrast | `MRI_SPINE` | PARTIAL |

**No FULL legacy wo→`MRI_SPINE` tie** (contrast with `MRI_BRAIN` ← `MRI Head wo Contrast` FULL).

### 2.3 MRI family coverage

| Row | Contrast disposition (3C-B1A/B1B) |
|-----|--------------------------------|
| `MRI_BRAIN` | APPLY `CONTRAST_TYPE_WITHOUT` (FULL legacy wo anchor) |
| `MRI_SPINE` | KEEP MANUAL_REVIEW — intentional null |
| Future 2E | Workbook proposes `MRI_SPINE_LUMBAR_WO_CONTRAST` etc. — **out of 44-row scope** |

### 2.4 Contrast usage patterns

- Legacy inventory **collapses** region (C/T/L) and contrast (w/wo/w&wo) into one generic spine orderable.
- Applying a single contrast classifier would **misrepresent** at least 6 of 9 legacy intents.
- Parity with `MRI_BRAIN` is **not symmetric**: brain had one FULL wo anchor; spine does not.

### 2.5 CPT / billing

| Status | Notes |
|--------|-------|
| `UNKNOWN_CPT` | `pendingLicense("MRI_SPINE")` |
| Billing impact of contrast FK | None at backfill |

### 2.6 Existing classifier tuple

| Field | Disposition |
|-------|-------------|
| `modalityClassifierId` | `MODALITY_MRI` (APPLY) |
| `bodyRegionClassifierId` | `BODY_REGION_SPINE` (APPLY) |
| `lateralityClassifierId` | `LATERALITY_UNSPECIFIED` (APPLY) |
| `protocolClassifierId` | NOT_APPLICABLE |
| `contrastTypeClassifierId` | **MANUAL_REVIEW → ratified intentional null** |

### 2.7 Option evaluation (A–E)

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **A. CONTRAST_TYPE_WITHOUT** | **REJECT** | Would privilege wo over w and w&wo legacy rows — **guess** without FULL anchor |
| **B. CONTRAST_TYPE_WITH** | **REJECT** | Same — would ignore wo/w&wo legacy rows |
| **C. CONTRAST_TYPE_WITH_AND_WITHOUT** | **REJECT** | Not a combined-study catalog code |
| **D. CONTRAST_TYPE_UNSPECIFIED** | **REJECT** | Forbidden in ICM-1.0 |
| **E. KEEP MANUAL_REVIEW** | **APPROVED** | Null FK until 2E split or explicit new orderables |

### 2.8 Final ratification — `MRI_SPINE`

| Item | Value |
|------|--------|
| **Recommended disposition** | **E. KEEP MANUAL_REVIEW** |
| **Ratification ID** | **B1B-RAT-MRI-SPINE-001** |
| **Backfill behavior** | Exclude from contrast auto-apply; leave `contrastTypeClassifierId` **null** |
| **Confidence** | **HIGH** |
| **Clinical rationale** | Generic “MRI spine” bundles cervical/thoracic/lumbar and w/wo/w&wo variants — contrast is not one value |
| **Governance rationale** | 3C-B1A rule: no FULL wo tie → no APPLY; 2E expansion documented in workbook population |
| **Relationship to `MRI_BRAIN`** | Brain closed via FULL `MRI Head wo`; spine **cannot** use same rule |
| **Billing impact** | None at FK backfill |
| **Search impact** | None |
| **Backfill impact** | Contrast slot SKIPPED; other fields APPLY |

---

## Part 3 — Production safety review (post–3C-B1B)

### 3.1 Contrast field counts (44 rows)

| Metric | After 3C-B1A | After 3C-B1B (ratified) |
|--------|-------------:|------------------------:|
| `contrastTypeClassifierId` APPLY | 40 | **40** (unchanged) |
| `contrastTypeClassifierId` MANUAL_REVIEW | 4 | **4** (unchanged — disposition finalized) |
| Active rows with **unadjudicated** contrast | 2 | **0** |
| Active rows with **intentional null** contrast | 0 | **2** (`CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_SPINE`) |

### 3.2 Global slot counts (44 × 7 = 308)

| State | After 3C-B1A | After 3C-B1B |
|-------|-------------:|-------------:|
| APPLY | 199 | **199** |
| MANUAL_REVIEW | 4 | **4** |
| NOT_APPLICABLE | 105 | 105 |

*No count delta from B1B — closure is **governance disposition**, not new APPLY rows.*

### 3.3 Contrast governance blocker status

| Blocker (pre–B1B) | Post–B1B status |
|-------------------|-----------------|
| `CT_CHEST_ABDOMEN_PELVIS_TRAUMA` contrast undecided | **CLOSED** — B1B-RAT-CAP-001 intentional null |
| `MRI_SPINE` contrast undecided | **CLOSED** — B1B-RAT-MRI-SPINE-001 intentional null |

### 3.4 SAFE / NOT SAFE matrix

| Decision point | Verdict |
|----------------|---------|
| 3C-B1B contrast final ratification audit | **SAFE** |
| 3C-B1 implementation (map + service per approved mapping) | **SAFE** |
| 3C-B1 production execution | **NOT SAFE** — Gate W1 **OPEN** (see Part 4) |

### 3.5 Additional blockers (unchanged)

| Blocker | Blocks production? |
|---------|:------------------:|
| Gate W1 clinical / operational sign-off | **YES** |
| Gate W3 licensed CPT / billing activation | No (out of 3C-B1 FK scope) |
| Phase 2D duplicate retirement execution | No (separate phase; documented in readiness) |
| `CTA_HEAD_NECK` / `CTA_ABDOMEN_PELVIS` protocol MR | **NO** (per `imaging-classifier-backfill-plan-3c-b1.md`) |

---

## Part 4 — Gate W1 review

**Definition source:** `imaging-taxonomy-workbook-readiness.md` §6

### 4.1 Checklist evidence

| Gate W1 criterion | Status | Evidence |
|-------------------|--------|----------|
| `imaging-taxonomy-workbook.csv` exists (44 active + 1 retired) | **NOT MET** | Deliverables checklist: CSV “✗ Out of scope (population = Phase 3D.2)” |
| All classifier columns filled with valid proposed codes | **PARTIALLY MET** | `imaging-classifier-backfill-mapping-44.md` is design-time surrogate; not signed CSV |
| `Manual Review Required = NO` on all active rows | **NOT MET** | Workbook population: **34** rows MR=YES; mapping-44: **2** active contrast intentional null + broader workbook MR |
| Clinical sign-off recorded | **NOT MET** | `imaging-classifier-signoff.md`: “Clinical radiology sign-off — **NOT RECEIVED**” |
| No duplicate active `Canonical Code` | **MET** | 44-row catalog codes unique in `haiti-imaging-studies.ts` |

### 4.2 Gate W1 status

| Status | **OPEN** |
|--------|----------|
| Partial credit | **PARTIALLY SATISFIED** — ICM-1.0 + governance appendix (MR-M2–M5); 44-row mapping doc; contrast queue B1A+B1B closed; seeds documented ready |
| Not satisfied | CSV workbook artifact; clinical sign-off; MR=NO on all active workbook rows |

### 4.3 References to Gate W1 / clinical approval

| Document | Statement |
|----------|-----------|
| `imaging-classifier-signoff.md` | 3C-B1 backfill execution **NOT SAFE** until Gate W1 |
| `imaging-classifier-seed-readiness.md` | Gate W1 clinical sign-off ✗ Pending |
| `imaging-classifier-backfill-readiness.md` | Gate W1 sign-off package required |
| `imaging-taxonomy-expansion-readiness.md` | W1 status **NOT MET** |
| `imaging-taxonomy-governance-appendix.md` | Closes MR-M2–M5 only — **does not** close Gate W1 |

---

## Part 5 — Backfill execution readiness (post–B1B)

| Workstream | Status | Notes |
|------------|--------|-------|
| **3C-B1 implementation** | **SAFE** | Extend `catalog-classifier-backfill-map.ts` / service per mapping-44; honor `CONTRAST_MANUAL_REVIEW_IMAGING_CODES` including CAP + MRI_SPINE for contrast skip |
| **3C-B1 production execution** | **NOT SAFE** | Gate W1 OPEN; flag `TERMINOLOGY_BACKFILL_ENABLED` requires operational sign-off |
| **3C-B1 rollback** | **DESIGN-READY** | Idempotent re-run; FK writes reversible via audit trail (per `imaging-classifier-backfill-plan-3c-b1.md`) — execution not performed |
| **3C-B1 audit trail** | **DESIGN-READY** | Field-level audit rows specified; not produced until run |

### 5.1 Expected contrast backfill audit (when executed)

| contrastTypeClassifierId outcome | Rows |
|----------------------------------|-----:|
| APPLIED (allowlist + 3C-B1A APPLY set) | 40 |
| SKIPPED / MANUAL_REVIEW (intentional null) | 4 |
| — inactive/predecessor | `CT_HEAD`, `CT_ABD` |
| — intentional null (B1B) | `CT_CHEST_ABDOMEN_PELVIS_TRAUMA`, `MRI_SPINE` |

---

## Part 6 — Cross-reference index

| Artifact | Role |
|----------|------|
| `imaging-contrast-manual-review-closure.md` | 3C-B1A — 9-row initial adjudication |
| `imaging-classifier-backfill-mapping-44.md` | 44×7 matrix (updated B1B notes) |
| `imaging-classifier-backfill-readiness.md` | Go/no-go checklist (updated) |
| `imaging-taxonomy-governance-appendix.md` | S4–S6 / MR-M2–M5 — not Gate W1 |
| `catalog-classifier-backfill-map.ts` | Runtime allowlist + `CONTRAST_MANUAL_REVIEW_IMAGING_CODES` (implementation reference only) |

---

*Audit only. No code, backfill, DB writes, seeds, migrations, commits, or deployments.*
