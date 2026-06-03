# Enterprise Formulary Expansion Roadmap (M1.6A)

**Date:** 2026-06-02  
**Strategy:** **D — Hybrid phased expansion** (curated waves + per-wave M1.5E linkage + selective M1.5G-style activation; no bulk ungoverned import)

**Prerequisite track (complete on Railway staging):** M1.5R → M1.5E → M1.5G validation → M1.5H **STABILIZED**

---

## Principles

1. **Preserve** all `CatalogMedication` rows (soft-deactivate only when retiring pollution).
2. **Canonical chain** for every new enterprise row: concept → product → package → `legacyCatalogMedicationId`.
3. **Quarantine** import artifacts (`19G*`, acet clones, `PRI_ER` noise) — never link to clinical catalogs.
4. **Billing** — apply M1.4B (or wave-specific billing manifest) **before** activation.
5. **Governance** — controlled/high-alert/LASA manifests **before** `isActive=true`.
6. **Search** — legacy catalog IDs remain provider authority until M1.5F sign-off per wave.
7. **No** M1.5F cutover or M1.6 national scope in Waves 1–3.

---

## Wave overview

```mermaid
flowchart LR
  STAB[M1.5H STABILIZED]
  W1[M1.6B Wave 1]
  W2[M1.6C Wave 2]
  W3[M1.6D Wave 3]
  W4[M1.6E Wave 4]
  STAB --> W1 --> W2 --> W3 --> W4
```

| Wave | Phase ID | Focus | Est. medications | Complexity | Risk |
|------|----------|-------|-----------------:|------------|------|
| **1** | **M1.6B** | Anticoagulants, vaccines, chronic core | **45–60** | Medium | **HIGH** |
| **2** | M1.6C | Cardiology, endocrinology, pulmonology | **80–100** | Medium | MEDIUM |
| **3** | M1.6D | Psychiatry, neurology, nephrology, GI | **90–120** | High | HIGH |
| **4** | M1.6E | Oncology, critical care infusion, biologics | **150+** | Very high | **CRITICAL** |

---

## Wave 1 — M1.6B (next phase)

### Scope

| Bucket | Target agents | Est. rows |
|--------|---------------|----------:|
| **Anticoagulants** | Warfarin, enoxaparin, apixaban, rivaroxaban (+ heparin normalize) | **8–12** |
| **Vaccines** | Influenza, Tdap, pneumococcal, hepatitis B, MMR, varicella, HPV | **12–18** |
| **Chronic core** | Atorvastatin, rosuvastatin, sertraline, escitalopram, lisinopril depth, sitagliptin | **20–25** |

### Deliverables (M1.6B implementation — not M1.6A)

- Wave 1 formulary manifest (shared package)
- Catalog seed helper (idempotent upsert)
- Billing manifest extension (HCPCS/NDC/CPT admin for vaccines)
- Governance entries (controlled, high-alert, LASA where applicable)
- M1.5E-style linkage batch for wave codes only
- Staging validation script (search non-inflation, 0 quarantine links)
- Optional: facility pilot activation subset (not full 60)

### Acceptance criteria

| Check | Target |
|-------|--------|
| New catalog codes | Manifest-approved only |
| Quarantine links | **0** |
| M1.5E markers (cumulative) | **192 + wave** |
| Brand alias pairs (Wave 1) | Coumadin, Lovenox, Eliquis searchable |
| M1.4B on new rows | `billingCodeDefault` or package profile |
| M1.5H recheck | **PASS** |

### Dependencies

- [ ] Clinical committee sign-off (anticoag + vaccine list)
- [ ] Apply **M1.4B** remediation on staging for existing 247 rows (recommended)
- [ ] Pharmacy informatics review of vaccine documentation workflow

---

## Wave 2 — Cardiology / Endocrinology / Pulmonology

- Clopidogrel, nitrates, additional BB/CCB SKUs
- Insulin analog normalization, GLP-1/SGLT2 (policy decision)
- Maintenance inhalers (ICS/LABA), ipratropium, tiotropium

**Est. 80–100 rows · Risk MEDIUM**

---

## Wave 3 — Psychiatry / Neurology / Nephrology / GI

- SSRI/SNRI/atypical baseline
- Levetiracetam, phenytoin
- Sevelamer, IV iron, EPO (if nephrology in scope)

**Est. 90–120 rows · Risk HIGH** (controlled psychotropics)

---

## Wave 4 — Oncology / Critical care / Biologics

- Requires **separate oncology governance module** (chemo, biologics, waste, double-check)
- Paralytics, sedatives, blood products policy

**Est. 150+ rows · Risk CRITICAL** — **Future Phase Suggestion — Do Not Implement Now** without module

---

## Cutover sequence (search / activation)

| Step | Action | Phase |
|------|--------|-------|
| 1 | M1.5H STABILIZED on environment | **Done** (staging) |
| 2 | M1.6B catalog + linkage + billing | M1.6B |
| 3 | Wave 1 search alias audit | M1.6B |
| 4 | Optional M1.5G-style pilot (subset) | M1.6B |
| 5 | M1.5F cutover audit per wave | Post-wave |
| 6 | Waves 2–4 | M1.6C–E |

---

## Out of scope (all waves)

- Production deployment (unless explicit ops window)
- Provider search canonical-only cutover (M1.5F)
- Multi-facility / national formulary (Phase 6–7)
- MAR workflow rule changes
- Claim engine changes
