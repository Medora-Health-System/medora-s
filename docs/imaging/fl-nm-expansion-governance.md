# Fluoroscopy & Nuclear Medicine Expansion Governance (Phase 2E.2E)

**Phase:** 2E.2E — audit + design only  
**Date:** 2026-06-01  
**Prerequisites:** 2E.1–2E.2D complete; Gate W1 closed; 3C-B1 classifier backfill complete  

**Authority:** `enterprise-imaging-expansion-inventory.md`, `legacy-vs-medora-coverage.md`, `imaging-classifier-manifest.md` (ICM-1.0)  

---

## 1. Executive summary

| Family | Legacy studies | New catalog rows | Medora catalog today |
|--------|---------------:|-----------------:|---------------------|
| **Fluoroscopy (FL)** | 4 | **4** | **0** FL rows |
| **Nuclear medicine (NM)** | 5 | **5** | **0** NM rows |
| **Total** | **9** | **9** | Entire modalities absent |

`MODALITY_FL` and `MODALITY_NM` are **seeded** in ICM-1.0; Haiti 44 catalog has **no** FL/NM orderables.

---

## 2. Part 1 — FL / NM inventory

### 2.1 Combined disposition (9 studies)

| Category | FL | NM | Total |
|----------|---:|---:|------:|
| **EXISTS_IN_MEDORA** | 0 | 0 | **0** |
| **PARTIAL_MATCH** | 0 | 0 | **0** |
| **MISSING** | 4 | 5 | **9** |
| **ALIAS** | 0 | 0 | **0** |
| **SUCCESSOR** | 0 | 0 | **0** |
| **MANUAL_REVIEW** | 0 | 0 | **0** |
| **Total** | **4** | **5** | **9** |

| Phase 3A tier | FL | NM |
|---------------|---:|---:|
| FULL | 0 | 0 |
| PARTIAL | 0 | 0 |
| MISSING | 4 | 5 |

*No study-level MANUAL_REVIEW — pilot scope is a **batch** gate (Haiti may defer FL-1 / NM-1 entirely).*

### 2.2 Fluoroscopy — full legacy register (4)

| # | Legacy study | Phase 3A | 2E.2E disposition | Proposed code |
|---|--------------|----------|-------------------|---------------|
| 1 | Line Placement Fluoro | MISSING | **MISSING** | `FL_LINE_PLACEMENT` |
| 2 | Lumbar Puncture wo Fluoro | MISSING | **MISSING** | `FL_LUMBAR_PUNCTURE` |
| 3 | Swallow Esophagram | MISSING | **MISSING** | `FL_ESOPHAGRAM` |
| 4 | Tube Placement Fluoroscopy | MISSING | **MISSING** | `FL_TUBE_PLACEMENT` |

### 2.3 Nuclear medicine — full legacy register (5)

| # | Legacy study | Phase 3A | 2E.2E disposition | Proposed code |
|---|--------------|----------|-------------------|---------------|
| 1 | Gallbladder Emptying Study RP | MISSING | **MISSING** | `NM_GB_EMPTYING` |
| 2 | HIDA Scan | MISSING | **MISSING** | `NM_HIDA` |
| 3 | Lung Scan Perfusion/Ventilation RP | MISSING | **MISSING** | `NM_VQ_COMBINED` |
| 4 | VQ Scan Perfusion | MISSING | **MISSING** | `NM_VQ_PERFUSION` |
| 5 | VQ Scan Ventilation | MISSING | **MISSING** | `NM_VQ_VENTILATION` |

---

## 3. Part 4 — Duplicate governance

### 3.1 Verification checklist

| Check | Result |
|-------|--------|
| No duplicate FL codes | **PASS** — 4 unique |
| No duplicate NM codes | **PASS** — 5 unique |
| No retirement conflicts | **PASS** — no FL/NM predecessors in Haiti 44 |
| No successor violations | **PASS** — none |
| NM HIDA vs GB emptying | **PASS** — distinct protocols on `BODY_REGION_HEPATOBILIARY` |
| NM VQ perfusion / ventilation / combined | **PASS** — distinct protocol classifiers |

### 3.2 Duplicate-risk matrix

| ID | Risk | Mitigation |
|----|------|------------|
| N1 | `NM_HIDA` vs `NM_GB_EMPTYING` | Different `protocolClassifierId` |
| N2 | `NM_VQ_*` three-way collision | One code per protocol; combined row for RP legacy |
| F1 | `FL_LINE_PLACEMENT` vs `FL_TUBE_PLACEMENT` | Distinct protocols + body regions |
| F2 | Esophagram vs upper GI US | `MODALITY_FL` vs `MODALITY_US` |

### 3.3 ICM body-region note (esophagram)

Enterprise sample used `BODY_REGION_ESOPHAGUS` / `PROTOCOL_FL_SWALLOW` — **not** in ICM-1.0 manifest. Design uses **`BODY_REGION_ABDOMEN`** + **`PROTOCOL_FL_ESOPHAGRAM`** (approved). Gate W2 may ratify a future `BODY_REGION_ESOPHAGUS` seed without changing catalog code `FL_ESOPHAGRAM`.

---

## 4. Modality introduction strategy

| Modality | Strategy |
|----------|----------|
| **FL** | All **KEEP DISTINCT** — greenfield `MODALITY_FL` rows |
| **NM** | All **KEEP DISTINCT** — greenfield `MODALITY_NM` rows |

No ALIAS or SUCCESSOR among legacy FL/NM studies.

---

## 5. Part 6 — Implementation readiness

| Gate | Status |
|------|--------|
| Gate W1 | **CLOSED** |
| Gate W2 (FL/NM slice) | **OPEN** |
| ICM `MODALITY_FL` / `MODALITY_NM` | **Seeded** |
| Haiti pilot FL/NM capability | **UNCONFIRMED** |
| French labels (9 rows) | **NOT READY** |
| Licensed CPT | **NOT READY** |

| Scope | Verdict |
|-------|---------|
| **2E.2E design** | **SAFE** |
| **2E.2E implementation** | **NOT SAFE** |

### Blockers

1. Gate W2 workbook slice + **pilot scope** sign-off (FL/NM may be excluded in Haiti MVP)  
2. French `displayNameFr` for 9 rows  
3. Staging catalog seed + classifier FK backfill on new rows  
4. Billing / CPT review (all 9 rows `PENDING_CPT_REVIEW`)  
5. Radiology workflow validation (NM/FL often hospital-referral — confirm clinic ordering path)  
6. Search alias authoring *(out of design scope)*  

---

## 6. Cross-references

| Document | Role |
|----------|------|
| `fl-nm-expansion-candidate-list.md` | Full 9-row matrices |
| `fl-nm-expansion-batch-plan.md` | FL-1 / NM-1 batches |

---

*Audit only — no implementation.*
