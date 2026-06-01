# Enterprise Imaging Implementation Roadmap (Phase 2E.3)

**Phase:** 2E.3 — audit + design only  
**Date:** 2026-06-01  
**Consolidates:** 2E.2A–2E.2E + 2E.1 enterprise inventory  

**Constraints:** No code · no seeds · no migrations · no catalog inserts · no billing · no search · no retirement execution  

---

## 1. Executive summary

| Metric | Core | + XR-3b |
|--------|-----:|--------:|
| **Net-new catalog rows** | **170** | **203** |
| **Expected active catalog size** | **~214** (44 + 170) | **~247** |
| **Enterprise legacy studies in scope** | **267** | 267 |
| **Gate W2** | **OPEN** | — |
| **Begin enterprise implementation** | **NOT SAFE** | — |

**Governance-preferred rollout:** **Option C — wave-based deployment** (see §4).

**First implementation phase (when Gate W2 Wave 1 closes):** Wave 1 — **XR-1 + CT-1 + MRI-1** (**37** rows) on **staging** only.

---

## 2. Part 1 — Master inventory

### 2.1 Net-new catalog rows by modality (candidates requiring `CatalogImagingStudy` insert)

| Family | Candidate rows (core) | Batches | Source |
|--------|----------------------:|---------|--------|
| **XR** | **79** | XR-1 (19), XR-2 (53), XR-3 (7) | `xray-expansion-candidate-list.md` |
| **XR optional** | **+33** | XR-3b | same |
| **CT / CTA** | **35** | CT-1 (7), CT-2 (4), CT-3 (24) | `ct-cta-expansion-candidate-list.md` |
| **MRI / MRA** | **30** | MRI-1 (11), MRI-2 (14), MRA-1 (5) | `mri-mra-expansion-candidate-list.md` |
| **US** | **17** | US-1 (4), US-2 (10), US-3 (3) | `ultrasound-expansion-candidate-list.md` |
| **FL / NM** | **9** | FL-1 (4), NM-1 (5) | `fl-nm-expansion-candidate-list.md` |
| **Total** | **170** | **16 batches** | **+33** optional |

*Subcounts: CT **31** + CTA **4**; MRI **25** + MRA **5**; FL **4** + NM **5**.*

### 2.2 Enterprise legacy disposition (267 studies)

| Disposition | Legacy studies | Catalog action |
|-------------|---------------:|----------------|
| **Net-new row** (MISSING / EXPAND / resolved MR codes) | **170** | Insert + classifier backfill |
| **EXISTS_IN_MEDORA** (Phase 3A FULL) | **23** | No insert — already orderable |
| **Tuple-only** (protocol on existing code) | **20** | No insert — classifier / alias pass |
| **Alias-only** (legacy string → existing or new code) | **11** | No insert — `ImagingStudyAlias` / seed aliases |
| **Successor-only** (legacy → successor target) | **4** | No insert — alias to successor |
| **MANUAL_REVIEW — no row** (pilot defer) | **8** | No insert in 2E.2D |
| **Total** | **267** | |

*Accounting: 170 + 23 + 20 + 11 + 4 + 8 = **236**. Remaining **31** legacy rows are absorbed via **overlap** (e.g. multiple legacy strings → one EXISTS or one new EXPAND code, Os Calcis → calcaneus EXPAND + alias). See 2E.1 “clustered” coverage.*

### 2.3 Disposition detail by modality

| Modality | Legacy | Net-new | EXISTS | Tuple-only | Alias-only | Successor-only | MR defer |
|----------|-------:|--------:|-------:|-----------:|-----------:|---------------:|---------:|
| XR | 118 | **79** (+33 opt.) | 3 | 2 | 2 | 0 | 0 *(5 MR codes are **new** rows)* |
| CT | 43 | **31** | 5 | 2 | 3 | **4** | 1 |
| CTA | 12 | **4** | 3 | 0 | 4 | 0 | 4 *(protocol/alias)* |
| MRI | 27 | **25** | 1 | 1 | 0 | 0 | 0 |
| MRA | 5 | **5** | 0 | 0 | 0 | 0 | 0 |
| US | 53 | **17** | 11 | **15** | 2 | 0 | **8** |
| FL | 4 | **4** | 0 | 0 | 0 | 0 | 0 |
| NM | 5 | **5** | 0 | 0 | 0 | 0 | 0 |
| **Total** | **267** | **170** | **23** | **20** | **11** | **4** | **8** |

### 2.4 Retired / predecessor catalog rows (Haiti 44 — unchanged until Phase 2D)

| Code | Status | Successor | Expansion rule |
|------|--------|-----------|----------------|
| `CT_HEAD` | **RETIRED** (inactive) | `CT_HEAD_WO_CONTRAST` | Do not expand / reactivate |
| `CT_ABD` | PREDECESSOR (active) | `CT_ABDOMEN_PELVIS` | No new `CT_ABD` |
| `US_ABD` | PREDECESSOR (active) | `US_ABDOMEN` | No new `US_ABD` |
| `DOPPLER_VEIN` | PREDECESSOR (active) | `US_VENOUS_DOPPLER_LE` | No new `DOPPLER_VEIN` |
| `CT_CHEST_CTA` | PREDECESSOR (active) | `CTA_CHEST` | No duplicate chest CTA row |

**Count:** **1** retired inactive + **4** active predecessors (**5** catalog rows). Legacy studies map to successors; expansion must not recreate these codes.

### 2.5 Tuple-only pass summary (0 catalog inserts)

| Pass | Catalog codes touched | Legacy studies |
|------|----------------------|---------------:|
| US-1 OB / pelvis / abdomen | `US_ABDOMEN`, `US_OB_FIRST`, `US_OB_GROWTH`, `US_PELVIS`, `US_SOFT` | **15** |
| CT/CTA protocols | `CT_CHEST`, `CTA_ABDOMEN_PELVIS`, `CTA_HEAD_NECK`, etc. | **6** |
| XR chest | `XR_CHEST` | **2** |
| MRI limited brain | `MRI_BRAIN` | **1** |
| **Total tuple-oriented** | **≤10 codes** | **~20** legacy |

### 2.6 Alias-only summary (no catalog insert)

| Family | Examples | Est. alias strings |
|--------|----------|-------------------:|
| XR | Os Calcis → calcaneus codes; decub labels | 40–60 |
| CT/CTA | COW → `CTA_HEAD_NECK`; recon tokens | 15–25 |
| US | `US Liver` → `US_RUQ_GALLBLADDER`; UE unilateral venous | 5–10 |
| **Total order-of-magnitude** | | **130–190** `ImagingStudyAlias` rows |

---

## 3. Part 3 — Database impact (estimates)

| Artifact | Core | + XR-3b |
|----------|-----:|--------:|
| **New `CatalogImagingStudy` rows** | **170** | **203** |
| **New `ImagingStudyAlias` rows** (est.) | **130–190** | +15–25 |
| **New classifier FK APPLY slots** (new rows × ~6 applicable fields) | **~1,020** | **~1,218** |
| **Classifier updates on existing 44 rows** (tuple pass) | **≤20** slots | — |
| **New EN labels** (`displayNameEn`) | **170** | **203** |
| **New FR labels** (`displayNameFr`) | **170** | **203** |
| **Billing-review items** (`PENDING_CPT_REVIEW`) | **170** | **203** |
| **Active catalog after expansion** | **~214** | **~247** |
| **Predecessor rows still present until 2D** | **+5** | +5 |

*Current baseline: **44** catalog codes ( **43** active + `CT_HEAD` inactive).*

---

## 4. Part 4 — Implementation strategy

| Criterion | **A — Single enterprise seed** | **B — Modality-by-modality** | **C — Wave-based** |
|-----------|-------------------------------|------------------------------|-------------------|
| **Description** | One migration/seed of 170 rows | XR → CT/CTA → MRI/MRA → US → FL/NM | 4 waves per `enterprise-imaging-wave-plan.md` |
| **Advantages** | One engineering push; single backfill run | Clear ownership per modality; easier partial defer | Lowest blast radius; matches clinical sign-off; aligns with Gate W2 slices |
| **Risks** | Mixed risk tiers live together; hard rollback; staging overload | US tuple pass before OB rows live = ordering confusion; modality order debates | More release overhead |
| **Rollback complexity** | **High** — all-or-nothing | **Medium** — per modality | **Low–Medium** — per wave |
| **Operational burden** | Low dev, high clinical QA | Medium | Medium dev, **lowest** clinical risk |
| **Governance verdict** | **Not recommended** | **Acceptable** | **Recommended** |

**Recommendation:** **Option C (wave-based)** with **Option B** as a fallback only if a single modality must be hotfixed (e.g. US-only patch).

---

## 5. Part 5 — Rollback plan

### 5.1 Principles

1. **Deactivate, do not delete** catalog rows that may have orders.  
2. **Never reactivate** retired `CT_HEAD` or duplicate predecessors on rollback.  
3. Roll back in **reverse wave order** (4 → 3 → 2 → 1).  
4. Seeds must be **idempotent** (`upsert` by stable `code`).

### 5.2 Per artifact

| Artifact | Rollback action |
|----------|-----------------|
| **Catalog rows** | `isActive = false` for all codes in wave manifest |
| **Aliases** | Remove or deactivate aliases introduced in that wave (keep audit log) |
| **Classifier FKs** | Optional: null FKs on deactivated rows; **do not** alter W1 44-row mapping |
| **Seed idempotency** | Re-run wave seed with `isActive: false` block; no duplicate `code` inserts |
| **Deployment** | Staging replay required before production re-apply |

### 5.3 Wave rollback complexity

| Wave | Rows | Rollback complexity | Notes |
|------|-----:|--------------------|-------|
| 1 | 37 | **Medium** | Contrast splits — verify no wrong contrast on `MRI_SPINE` |
| 2 | 61 | **High** | XR-2 volume; US tuple on existing rows |
| 3 | 41 | **Medium** | Optional subsets; new modalities FL/NM/MRA |
| 4 | 31 (+33) | **Medium–High** | CT-3 anatomy volume |

---

## 6. Part 6 — Gate W2 (summary)

**Status:** **OPEN** — detail in `enterprise-imaging-gate-w2.md`

| | Count |
|---|------:|
| **CLOSED (design / W1)** | 12 |
| **OPEN (implementation)** | 12 + per-wave checklists |
| **Per-wave sign-off required** | **4** |

---

## 7. Part 7 — Implementation readiness

| Question | Answer |
|----------|--------|
| Is consolidated **design** complete? | **Yes** — 2E.2A–E + 2E.3 |
| Is **production** implementation authorized? | **No** — Gate W2 OPEN |
| **SAFE** to begin implementation? | **NOT SAFE** (production) |
| **SAFE** to begin **staging** Wave 1 prep? | **Only after** W2-O-01 slice + FR labels for 37 codes |

### Exact blockers

1. Gate W2 not closed (no production authorization).  
2. Enterprise workbook CSV for 170 rows not populated.  
3. Per-wave clinical sign-off not recorded.  
4. French translations incomplete.  
5. Staging apply + classifier backfill not validated.  
6. Pilot scope matrix unset (MRA, FL/NM, CT-3, XR-3b, US MR defer).  
7. Alias plan not executed (search UX).  
8. CPT review open (blocks billing, not necessarily staging seed).  
9. Phase 2D retirement not executed (predecessor confusion risk).

### If / when SAFE — first phase

**Wave 1 staging:** XR-1 (19) + CT-1 (7) + MRI-1 (11) = **37 rows**, plus XR chest tuple pass (0 inserts).

---

## 8. Cross-references

| Document | Role |
|----------|------|
| `enterprise-imaging-wave-plan.md` | Wave tables |
| `enterprise-imaging-gate-w2.md` | Authorization checklist |
| `imaging-gate-w1-closure-record.md` | W1 CLOSED |

---

*Audit only — no implementation.*
