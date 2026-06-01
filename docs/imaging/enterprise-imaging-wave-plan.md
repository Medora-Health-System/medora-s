# Enterprise Imaging Wave Plan (Phase 2E.3)

**Phase:** 2E.3 — audit + design only  
**Date:** 2026-06-01  

**Total net-new rows (core):** **170** · **Optional:** +33 (XR-3b)  

**Adjustment vs draft structure:** Wave 3 adds **MRA-1** (5) and **US-3** (3) — required to reach 170 core rows and avoid deferring MRI/MRA/US breast silently.

---

## 1. Wave summary

| Wave | Batches | Rows | Legacy studies covered (est.) | Risk | Billing review | FR labels | Rollback |
|------|---------|-----:|------------------------------:|------|---------------:|----------:|----------|
| **1** | XR-1, CT-1, MRI-1 | **37** | ~45 | **High** | 37 | 37 | Medium |
| **2** | XR-2, CT-2, US-1 | **61** | ~95 | **High** | 61 | 61 | High |
| **3** | MRI-2, MRA-1, US-2, US-3, FL-1, NM-1 | **41** | ~55 | **Medium** | 41 | 41 | Medium |
| **4** | XR-3, XR-3b*, CT-3 | **31** (+33) | ~72 | **High** / Low | 31–64 | 31–64 | Med–High |
| **Total** | 16 (+3b) | **170** (+33) | **267** | | **170** | **170** | |

\*XR-3b optional enterprise parity.

---

## 2. Wave 1 — Foundation

**Batches:** XR-1 · CT-1 · MRI-1  

| Metric | Value |
|--------|------:|
| **Row count** | **37** (19 + 7 + 11) |
| **Risk** | **High** — contrast governance (CT head/chest/abd; MRI brain/spine); spine splits |
| **Billing review** | **37** |
| **Translation (FR)** | **37** |
| **Rollback complexity** | **Medium** |

### Studies / scope

| Batch | Focus |
|-------|--------|
| XR-1 | C-spine, T-spine, ribs, abdomen MR-resolved, coccyx |
| CT-1 | Head/chest/abdomen contrast EXPAND; pelvis split |
| MRI-1 | Brain w/w&wo; C/T/L spine contrast EXPAND |

### Parallel (0 inserts)

- XR tuple: `XR_CHEST` decub + post-intubation protocols  
- CT tuple/alias pass (per 2E.2B) where tied to CT-1  

### Exit criteria

- `MRI_SPINE` B1B contrast null unchanged  
- No `CT_HEAD` / `CT_ABD` expansion  
- Staging smoke + Gate W2 Wave 1 sign-off  

---

## 3. Wave 2 — MSK volume + CTA extremity + US core

**Batches:** XR-2 · CT-2 · US-1  

| Metric | Value |
|--------|------:|
| **Row count** | **61** (53 + 4 + 4) |
| **Risk** | **High** — XR-2 largest batch; US tuple touches OB workflows |
| **Billing review** | **61** |
| **Translation (FR)** | **61** |
| **Rollback complexity** | **High** (XR-2 cardinality) |

### Studies / scope

| Batch | Focus |
|-------|--------|
| XR-2 | MSK laterality / view EXPAND (53) |
| CT-2 | CTA LE/UE (4) |
| US-1 | Thyroid, aorta, bladder, chest (4) |

### Parallel (0 inserts)

- **US-1 tuple:** 15 legacy PARTIAL → protocols on `US_ABDOMEN`, `US_OB_*`, `US_PELVIS`, `US_SOFT`  

### Exit criteria

- US tuple classifiers validated on existing 44-row slice  
- CTA codes distinct from `CTA_CHEST` / `CTA_HEAD_NECK`  
- Gate W2 Wave 2 sign-off  

---

## 4. Wave 3 — Advanced MRI/MRA, vascular US, breast, FL/NM

**Batches:** MRI-2 · MRA-1 · US-2 · US-3 · FL-1 · NM-1  

| Metric | Value |
|--------|------:|
| **Row count** | **41** (14 + 5 + 10 + 3 + 4 + 5) |
| **Risk** | **Medium** (scope risk for FL/NM/MRA) |
| **Billing review** | **41** |
| **Translation (FR)** | **41** |
| **Rollback complexity** | **Medium** |

### Studies / scope

| Batch | Rows | Focus | Pilot defer? |
|-------|-----:|-------|:------------:|
| MRI-2 | 14 | MSK MRI, pelvis, cholangiogram | No |
| MRA-1 | 5 | New `MODALITY_MRA` | **Yes** |
| US-2 | 10 | Carotid + LE/UE arterial + UE venous | UE subset optional |
| US-3 | 3 | Breast L/R/bilateral | **Yes** |
| FL-1 | 4 | Greenfield fluoroscopy | **Yes** |
| NM-1 | 5 | Greenfield nuclear medicine | **Yes** |

### Pilot-minimum Wave 3 (example)

| Included | Rows |
|----------|-----:|
| MRI-2 + US-2 (carotid + LE arterial only) | **18** |

### Exit criteria

- No duplicate `US_VENOUS_DOPPLER_LE`  
- MRA/FL/NM modality filters tested if included  
- Gate W2 Wave 3 sign-off  

---

## 5. Wave 4 — Advanced XR + CT

**Batches:** XR-3 · XR-3b *(optional)* · CT-3  

| Metric | Value |
|--------|------:|
| **Row count** | **31** core · **+33** optional |
| **Risk** | **High** (CT-3) / **Low–Medium** (XR-3b) |
| **Billing review** | **31–64** |
| **Translation (FR)** | **31–64** |
| **Rollback complexity** | **Medium–High** |

### Studies / scope

| Batch | Rows | Focus | Pilot defer? |
|-------|-----:|-------|:------------:|
| XR-3 | 7 | AC / clavicle / scapula | Partial |
| XR-3b | 33 | Extended XR parity | **Yes** |
| CT-3 | 24 | Advanced CT anatomy / trauma-adjacent | **Yes** |

### Exit criteria

- CT-3 scoped to local capability  
- XR-3b only if enterprise parity required  
- Gate W2 Wave 4 sign-off  

---

## 6. Recommended sequence

```text
Preflight + Gate W2 workbook (170 rows)
    ↓
Wave 1 (37) ──staging sign-off──►
Wave 2 (61) ──staging sign-off──►
Wave 3 (41 or pilot subset) ──staging sign-off──►
Wave 4 (31 + optional 33) ──staging sign-off──►
Gate W2 CLOSED (or per-wave production authorization)
    ↓
Phase 2D retirement (separate gate — not in 2E.3)
```

---

## 7. Return summary

| Metric | Value |
|--------|------:|
| **Total enterprise legacy studies** | **267** |
| **Total net-new catalog rows** | **170** (+33 optional) |
| **Expected active catalog size** | **~214** (~247 with 3b) |
| **Wave 1 / 2 / 3 / 4 rows** | **37 / 61 / 41 / 31** |
| **Gate W2** | **OPEN** |
| **Begin implementation** | **NOT SAFE** |

| Verdict | |
|---------|---|
| **2E.3 wave plan** | **SAFE** |
| **Production rollout** | **NOT SAFE** |

---

*See `enterprise-imaging-implementation-roadmap.md` and `enterprise-imaging-gate-w2.md`.*
