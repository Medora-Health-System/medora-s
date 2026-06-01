# MRI / MRA Expansion Batch Plan (Phase 2E.2C)

**Phase:** 2E.2C  
**Date:** 2026-06-01  
**Reference:** `mri-mra-expansion-candidate-list.md`  

---

## 1. Batch overview

| Batch | MRI | MRA | Total rows | Risk | MR legacy | MR Gate W2 | Billing review | Complexity |
|-------|----:|----:|-----------:|------|----------:|-----------:|---------------:|------------|
| **MRI-1** Core | 11 | 0 | 11 | **High** | 0 | 1 ack | 11 | **M** |
| **MRI-2** Advanced | 14 | 0 | 14 | **Medium** | 0 | 3 ack | 14 | **M** |
| **MRA-1** | 0 | 5 | 5 | **Medium** | 0 | 1 ack | 5 | **S–M** |
| **Tuple pass** | 0 | 0 | 0 | **Low** | 0 | 1 ack | 0 | **S** |
| **Total** | **25** | **5** | **30** | | **0** | **5 ack** | **30** | |

**Complexity:** **S** = small (≤5 rows, single domain) · **M** = medium (6–14 rows or contrast splits) · **L** = large (not used)

**Manual-review count:** **0** legacy studies blocking implementation · **5** Gate W2 acknowledgements (non-blocking)

---

## 2. Batch MRI-1 — Core MRI (11 rows)

### 2.1 Candidates

Brain contrast (2) + cervical / lumbar / thoracic spine contrast splits (9).

### 2.2 Risk: **High**

Contrast CPT coupling; must not write contrast FK to `MRI_SPINE`.

### 2.3 Manual-review / billing

| Type | Count |
|------|------:|
| Blocking MR | 0 |
| Gate W2 ack (`MRI_SPINE` null preserved) | 1 |
| Billing review rows | 11 |

### 2.4 Implementation complexity: **M**

- Seed 11 rows + 7 classifier domains each  
- FK backfill script (post-seed)  
- Alias pass for legacy contrast strings  
- Regression: verify `MRI_BRAIN` / `MRI_SPINE` unchanged  

---

## 3. Batch MRI-2 — Advanced MRI (14 rows)

### 3.1 Candidates

MSK (hip, knee, UE, LE), pelvis, sella, cholangiogram (protocol-driven).

### 3.2 Risk: **Medium**

Lower volume; knee contrast defaulted to WITHOUT.

### 3.3 Manual-review / billing

| Type | Count |
|------|------:|
| Blocking MR | 0 |
| Gate W2 ack (knee contrast, pelvis limited, pilot deferral) | 3 |
| Billing review rows | 14 |

### 3.4 Implementation complexity: **M**

- 14 rows; 1 protocol classifier row (`MRI_CHOLANGIOGRAM`)  
- Optional pilot subset (defer sella, cholangiogram, bilateral hip) reduces to **S** if scoped  

---

## 4. Batch MRA-1 — MRA expansion (5 rows)

### 4.1 Candidates

All five MISSING legacy MRA studies — **KEEP DISTINCT**.

### 4.2 Risk: **Medium**

New `MODALITY_MRA` in order UI; no retirement conflict.

### 4.3 Manual-review / billing

| Type | Count |
|------|------:|
| Blocking MR | 0 |
| Gate W2 ack (pilot may defer entire batch) | 1 |
| Billing review rows | 5 |

### 4.4 Implementation complexity: **S–M**

- Only 5 rows but new modality family in catalog filters/search  
- Full deferral = **S** (no work)  

---

## 5. Tuple pass (parallel, 0 rows)

| Legacy | Action |
|--------|--------|
| MRI Head/Brain Limited | `MRI_BRAIN` tuple + alias |
| MRI Head w&wo wo phase | Alias → `MRI_BRAIN` |

**Complexity:** **S** · **Gate W2 ack:** 1

---

## 6. Recommended sequence

```text
Tuple pass (0 rows)
    ↓
MRI-1 (11) — core brain + spine contrast
    ↓
MRI-2 (14) — advanced MSK + specialty
    ↓
MRA-1 (5) — optional per Haiti pilot
```

---

## 7. Gate W2 checklist

- [ ] Workbook CSV slice per batch  
- [ ] `MRI_SPINE` B1B null preserved  
- [ ] No `CT_HEAD` / predecessor violations (N/A for MRI/MRA)  
- [ ] ICM-1.0 tuple validation  
- [ ] French labels  
- [ ] Staging seed + classifier FK backfill  
- [ ] Pilot scope sign-off (MRA deferral)  

---

## 8. Return summary

| Metric | Value |
|--------|------:|
| Total MRI legacy studies | **27** |
| Total MRA legacy studies | **5** |
| Total new MRI candidates | **25** |
| Total new MRA candidates | **5** |
| Batch MRI-1 / MRI-2 / MRA-1 | **11** / **14** / **5** |
| Manual-review blocking count | **0** |
| Gate W2 acknowledgement count | **5** |
| Billing-review rows | **30** |

| Verdict | |
|---------|---|
| **2E.2C design** | **SAFE** |
| **2E.2C implementation** | **NOT SAFE** |

### Blockers

1. Gate W2 not closed for MRI/MRA slice  
2. French `displayNameFr` not authored  
3. Staging seed + FK backfill not executed  
4. Billing/CPT review pending (all 30 rows)  
5. Haiti pilot scope for MRA-1 / MRI-2 deferrals  
6. Search alias workflow (governance: no search *changes* in design, but aliases required before UX)  

---

*Audit only — no implementation.*
