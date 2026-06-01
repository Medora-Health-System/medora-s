# High-Alert Medication Governance — Audit & Design (M1.3A)

**Phase:** M1.3A (audit + design only)  
**Date:** 2026-05-31  
**Prerequisites:** [medication-safety-governance-audit.md](./medication-safety-governance-audit.md) (M1.1B)

---

## Part 3 — High-alert medication audit (current state)

### 3.1 Substance / class coverage (M1.1B local DB + seed)

| Agent / class | Catalog exists | `isHighAlert` (profile) | Soft warnings | EDOC support |
|---------------|----------------|-------------------------|---------------|--------------|
| Insulin | Yes (3 SKUs) | No | `INSULIN_HIGH_ALERT` | EDOC.8 infusion (type-level) |
| Heparin | Yes | No | `ANTICOAGULATION_HIGH_ALERT` | EDOC.8 high-alert infusion verification |
| Warfarin | **No** | — | Token only | — |
| Norepinephrine | Yes | No | `VASOPRESSOR_HIGH_ALERT` | EDOC.8 |
| Epinephrine | Yes (`ADRENALINE_*`) | No | Vasopressor tokens | EDOC.8 |
| Vasopressin | Yes | No | Vasopressor | EDOC.8 |
| Amiodarone | Yes | No | — | Partial (antiarrhythmic not in EDOC type list) |
| Ketamine | Yes | No | Sedation rules | Procedural sedation EDOC |
| Propofol | Yes | No | Sedation rules | EDOC.8 / sedation |
| TPA / thrombolytic | **No** | — | — | — |
| Chemotherapy | **Limited** | No | — | Future card (`chemotherapy_verification` in EDOC backlog) |

### 3.2 Schema & infrastructure

| Capability | Status | Detail |
|------------|--------|--------|
| Schema `isHighAlert` | **SUPPORTED** | `MedicationSafetyProfile.isHighAlert` |
| `highAlertCategories` JSON | **SUPPORTED** | Unused locally (0 populated) |
| Catalog HA flag | **MISSING** | No column on `CatalogMedication` |
| Warning support | **PARTIAL** | `getMedicationSafetyWarnings()` — heuristic, non-blocking |
| Search badges | **PARTIAL** | `CatalogSearchItemDto` high-alert slot; needs profile data |
| Audit support | **MISSING** | No `HIGH_ALERT_OVERRIDE` action |
| Admin review queue | **SUPPORTED** | `HighRiskMedicationReviewService` (import/governance, not ISMP list) |

**Part 3 summary:** Schema **SUPPORTED**; operational governance **MISSING** / **PARTIAL**.

---

## Part 4 — High-alert classifier design

### 4.1 Design principles

1. **ISMP-aligned categories** for Haiti ER MVP subset — not full hospital formulary.
2. `highAlertClass` is a **single primary** classifier per concept; `highAlertCategories` JSON may hold secondary tags.
3. High-alert does not automatically mean controlled — orthogonal classifiers (see [medication-safety-profile-design.md](./medication-safety-profile-design.md)).
4. EDOC.8 **high_alert_infusion_verification** binds to classifier groups: insulin, anticoagulant IV, vasopressor, sedative infusion types.

### 4.2 Classifier specification

| Code | Definition | Example agents (Haiti seed) | Governance rules |
|------|------------|----------------------------|------------------|
| **HIGH_ALERT_NONE** | Standard medication | Most oral chronic meds | Standard activation |
| **HIGH_ALERT_INSULIN** | All insulin products | Regular, NPH, 70/30 | Independent double-check before admin; EDOC infusion verification when IV policy applies; MAR dose unit mandatory |
| **HIGH_ALERT_ANTICOAGULANT** | Anticoagulants | Heparin (warfarin TBD) | Lab linkage encouraged (INR); soft warnings; future warfarin add |
| **HIGH_ALERT_OPIOID** | Opioid analgesics | Morphine, hydromorphone, fentanyl | Often paired with `CONTROLLED_SCHEDULE_II`; respiratory depression warnings |
| **HIGH_ALERT_BENZODIAZEPINE** | Benzodiazepines | Lorazepam, diazepam | Sedation stacking checks with opioids |
| **HIGH_ALERT_SEDATIVE** | General anesthetics / deep sedation | Propofol, ketamine, midazolam | EDOC procedural sedation + EDOC.8 where infusion |
| **HIGH_ALERT_PARALYTIC** | NMBAs | Rocuronium, succinylcholine (soft tokens) | RSI documentation alignment; paralytic verification future card |
| **HIGH_ALERT_VASOPRESSOR** | Pressors / inotropes | Norepinephrine, epinephrine, phenylephrine, vasopressin, dopamine | EDOC.8 verification; pump rate documentation |
| **HIGH_ALERT_ANTIARRHYTHMIC** | High-risk arrhythmia drugs | Amiodarone | Monitoring documentation; QT policy future |
| **HIGH_ALERT_THROMBOLYTIC** | Thrombolytics | TPA (alteplase) — **not in catalog** | Time-critical protocol; future formulary |
| **HIGH_ALERT_CHEMOTHERAPY** | Cytotoxic / biologic | Not in Haiti MVP | Future phase; double verification |
| **HIGH_ALERT_OTHER** | Facility-defined | — | Requires `governanceNotes` + clinical sign-off |

### 4.3 Co-classification matrix (recommended)

| Agent | Controlled class (M1.3) | High-alert class |
|-------|-------------------------|------------------|
| Morphine IV | SCHEDULE_II | OPIOID |
| Fentanyl IV | SCHEDULE_II | OPIOID |
| Hydromorphone | SCHEDULE_II | OPIOID |
| Lorazepam oral | SCHEDULE_IV | BENZODIAZEPINE |
| Lorazepam IV | SCHEDULE_IV | BENZODIAZEPINE |
| Diazepam | SCHEDULE_IV | BENZODIAZEPINE |
| Insulin | NONE | INSULIN |
| Heparin | NONE* | ANTICOAGULANT |
| Norepinephrine | NONE | VASOPRESSOR |
| Propofol | NONE | SEDATIVE |
| Ketamine | NONE | SEDATIVE |

\*Heparin controlled status jurisdiction-specific — default NONE with anticoagulant HA.

### 4.4 Coverage targets (post M1.3D)

| Metric | M1.1B actual | M1.3D target |
|--------|--------------|--------------|
| HA catalog agents with profile `isHighAlert=true` | 0% | **≥95%** of signed manifest |
| EDOC.8 type mapping | Partial | **100%** of manifest infusion/pressor types |

---

## Part 5 pointer — LASA

LASA design: [medication-safety-profile-design.md](./medication-safety-profile-design.md) § LASA.

---

## Sign-off

| Item | M1.3A |
|------|-------|
| Implementation | **Not authorized** |
| Design status | **COMPLETE** |
