# Gate W2 — Enterprise Imaging Catalog Expansion

**Phase:** 2E.3  
**Date:** 2026-06-01  
**Gate:** **W2 — Enterprise catalog expansion authorized**  
**Status:** **OPEN**  

**Predecessor:** **Gate W1 CLOSED** (2026-05-31) — 44-row classifier backfill on Haiti catalog  

---

## 1. Gate purpose

Authorize **net-new** `CatalogImagingStudy` rows (up to **170** core, **203** with XR-3b), scoped **classifier FK backfill**, and **alias** authoring from 2E.2A–E — by **wave**, on **staging** then **production**.

**Out of scope for W2:** billing activation (W3), search UX, Phase **2D** retirement execution, ad hoc codes not in signed workbook.

---

## 2. CLOSED items

| ID | Item | Evidence |
|----|------|----------|
| W2-C-01 | ICM-1.0 taxonomy seeded (incl. `MODALITY_FL`, `MODALITY_NM`, `MODALITY_MRA`) | `imaging-classifier-manifest.md` |
| W2-C-02 | 44-row classifier mapping approved | W1 workbook + mapping-44 |
| W2-C-03 | Contrast governance B1A/B1B closed | `imaging-contrast-final-ratification.md` |
| W2-C-04 | Retirement **design** (no `CT_HEAD` expansion, no `DOPPLER_VEIN` duplicate, etc.) | 2E.1–2E.2 |
| W2-C-05 | Successor **design** documented | mapping-44 predecessors |
| W2-C-06 | 2E.2A XR design | `xray-expansion-governance.md` — **SAFE** |
| W2-C-07 | 2E.2B CT/CTA design | `ct-cta-expansion-governance.md` — **SAFE** |
| W2-C-08 | 2E.2C MRI/MRA design | `mri-mra-expansion-governance.md` — **SAFE** |
| W2-C-09 | 2E.2D US design | `ultrasound-expansion-governance.md` — **SAFE** |
| W2-C-10 | 2E.2E FL/NM design | `fl-nm-expansion-governance.md` — **SAFE** |
| W2-C-11 | 2E.3 consolidated roadmap + wave plan | This phase |
| W2-C-12 | 3C-B1 dry-run acceptance criteria defined | 3C-B1E docs |
| W2-C-13 | Master inventory: **170** net-new rows enumerated | 2E.2 candidate lists |

---

## 3. OPEN items

| ID | Requirement | Type |
|----|-------------|------|
| W2-O-01 | **Enterprise workbook CSV** — 170 rows (code, classifiers, EN/FR, billing status) | Artifact |
| W2-O-02 | **Per-wave clinical sign-off** (4 waves) | Sign-off |
| W2-O-03 | **French `displayNameFr`** per wave | i18n |
| W2-O-04 | **Pilot scope matrix** (defer MRA, FL/NM, CT-3, XR-3b, US MR queue) | Product |
| W2-O-05 | **Staging seed apply** per wave | Engineering |
| W2-O-06 | **Staging classifier backfill** for new codes | Engineering |
| W2-O-07 | **Staging smoke tests** (order create, modality filter, predecessors) | QA |
| W2-O-08 | **Alias authoring** (~130–190 est.) | Engineering |
| W2-O-09 | **Preflight** on target DB before each production apply | Engineering |
| W2-O-10 | **XR abdomen policy** (`XR_ABDOMEN` vs `XR_ABD_AP`) | Clinical |
| W2-O-11 | **US tuple pass** sign-off (15 protocols on existing codes) | Clinical |
| W2-O-12 | **`MRI_SPINE` B1B null** regression gate | Engineering |

---

## 4. Required sign-offs

| Sign-off | Required before |
|----------|-----------------|
| Clinical lead — wave scope | Production apply that wave |
| Radiology / imaging champion — contrast + CTA/MRA | Wave 1–3 |
| Product — Haiti pilot defer matrix | Wave 3–4 |
| Engineering — staging parity with workbook | Production apply |
| Billing owner — CPT queue acknowledged | W3 (not blocking staging seed) |

---

## 5. Required validations

| Validation | Method | Pass criteria |
|------------|--------|---------------|
| Unique catalog `code` | Preflight SQL / script | 0 duplicates in wave |
| Classifier tuple | Dry-run backfill | All APPLY slots match workbook |
| Predecessor safety | Manual checklist | No new `CT_HEAD`, `CT_ABD`, `US_ABD`, `DOPPLER_VEIN`, `CT_CHEST_CTA` |
| `MRI_SPINE` contrast | Row inspection | `contrastTypeClassifierId` still null |
| Idempotent seed | Re-run staging seed | 0 duplicate rows; counts stable |
| Order smoke | Staging UI/API | Create order per new code in wave |

---

## 6. Required staging evidence

| Evidence | Per wave |
|----------|:--------:|
| Seed manifest (codes list) | ✓ |
| Before/after row counts | ✓ |
| Classifier backfill dry-run output | ✓ |
| Smoke test checklist signed | ✓ |
| Rollback drill (`isActive=false`) documented | ✓ |

---

## 7. Required billing evidence (Gate W3 — parallel track)

| Evidence | Note |
|----------|------|
| CPT mapping workbook for **170** rows | Does not block staging catalog seed |
| `PENDING_CPT_REVIEW` → resolved per code | Required before charge capture |
| No billing rule changes in 2E.3 | Confirmed out of scope |

---

## 8. Per-wave authorization checklist

### Wave 1 (37 rows)

- [ ] W2-O-01 slice: XR-1, CT-1, MRI-1  
- [ ] W2-O-02, W2-O-03, W2-O-05–07, W2-O-12  

### Wave 2 (61 rows)

- [ ] W2-O-01 slice: XR-2, CT-2, US-1  
- [ ] W2-O-11 US tuple pass  
- [ ] W2-O-02, W2-O-03, W2-O-05–07  

### Wave 3 (41 rows or subset)

- [ ] W2-O-04 pilot scope  
- [ ] W2-O-01 slice  
- [ ] W2-O-02, W2-O-03, W2-O-05–07  

### Wave 4 (31 + optional 33)

- [ ] W2-O-04 CT-3 / XR-3b scope  
- [ ] W2-O-01 slice  
- [ ] W2-O-02, W2-O-03, W2-O-05–07  

---

## 9. Gate closure criteria

**Full W2 CLOSED** when:

1. Agreed pilot scope applied on staging + production.  
2. Workbook matches live catalog for all **authorized** rows.  
3. All four wave checklists complete (or waves formally deferred with workbook update).  
4. No open **Critical** blockers.  
5. Closure record published (`imaging-gate-w2-closure-record.md` — future).

**Partial closure:** `W2-Wave-N` authorizes production for that wave only.

---

## 10. Authorization matrix

| Action | W1 | W2 OPEN | W2 wave closed |
|--------|:--:|:-------:|:--------------:|
| Backfill classifiers on **44** rows | ✓ | ✓ | ✓ |
| Insert net-new catalog rows | ✗ | ✗ | ✓ wave only |
| Tuple/protocol on existing 44 | ✗ | ✗ | ✓ |
| Retire predecessors (2D) | ✗ | ✗ | ✗ |
| Activate CPT / billing | ✗ | ✗ | ✗ (W3) |

---

## 11. Return summary

| Field | Value |
|-------|--------|
| **Gate W2 status** | **OPEN** |
| **Total enterprise legacy studies** | **267** |
| **Net-new catalog rows** | **170** (+33 optional) |
| **Expected catalog size (active)** | **~214** (~247 with 3b) |
| **CLOSED items** | **13** |
| **OPEN items** | **12** |
| **Begin enterprise implementation** | **NOT SAFE** |

### Exact blockers (production)

1. Gate W2 not closed.  
2. Workbook CSV not populated.  
3. No per-wave staging validation.  
4. French labels incomplete.  
5. Pilot scope unset.  
6. Alias plan not executed.  
7. CPT review open (W3).  
8. Phase 2D retirement pending (operational confusion).  
9. Eight US MANUAL_REVIEW studies unresolved (low severity).

### First phase when blockers clear

**Wave 1 staging → production:** XR-1 + CT-1 + MRI-1 (**37** rows).

| Verdict | |
|---------|---|
| **2E.3 planning** | **SAFE** |
| **Enterprise implementation** | **NOT SAFE** |

---

*Audit only — no implementation.*
