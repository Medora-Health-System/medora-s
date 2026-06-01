# Medication Safety Governance Audit — Phase M1.1B

**Program:** Enterprise Medication Governance  
**Phase:** M1.1B (audit only)  
**Date:** 2026-05-31  
**Data source:** Local dev DB — **production NOT VERIFIED**

Covers **Part 5 (high-alert)**, **Part 6 (LASA)**, and safety-related **Part 10** domains.

---

## Part 5 — High-alert medication coverage

### 5.1 Substance audit (local catalog)

| Medication | Exists | Catalog HA flag | `MedicationSafetyProfile` | `isHighAlert` | Warning metadata |
|------------|--------|-----------------|---------------------------|---------------|------------------|
| **Insulin** | Yes (3 SKUs) | No | Yes (concept linked) | **false** | Soft `INSULIN_HIGH_ALERT` in shared warnings |
| **Heparin** | Yes | No | No | — | Soft `ANTICOAGULATION_HIGH_ALERT` |
| **Warfarin** | **No** | — | — | — | Token in soft rules only |
| **TPA** (alteplase) | **No** | — | — | — | — |
| **Norepinephrine** | Yes | No | No | — | Soft `VASOPRESSOR_HIGH_ALERT` |
| **Epinephrine** | Yes (`ADRENALINE_*`) | No | No | — | Vasopressor tokens |
| **Propofol** | Yes | No | No | — | Soft `HIGH_RISK` / propofol tokens |
| **Ketamine** | Yes | No | No | — | Soft sedation rules |
| **Amiodarone** | Yes | No | No | — | — |
| **Vasopressin** | Yes | No | No | — | Soft vasopressor |

### 5.2 Coverage

| Metric | Value |
|--------|-------|
| Catalog presence (9 of 10 named agents; excludes TPA) | **90%** |
| `MedicationSafetyProfile.isHighAlert = true` | **0%** (0 rows) |
| `highAlertCategories` JSON populated | **0%** |
| Blocking governance at order entry | **Not implemented** |

### 5.3 UI / workflow (code audit)

| Mechanism | Status |
|-----------|--------|
| `MedicationCanonicalBadges` high-alert chip | **Implemented** (requires profile data) |
| `ClinicalDocumentationHighAlertInfusionForm` | **Implemented** (witness notices) |
| `HighRiskMedicationReviewService` | **Implemented** (admin queue) |
| `getMedicationSafetyWarnings()` | **Implemented** (soft, non-blocking) |

**Gap:** UI and rules exist; **database flags empty** → badges/warnings rely on heuristics only.

### 5.4 Part 5 verdict

| Result | **FAIL** |
|--------|----------|
| Rationale | 90% catalog presence but **0%** high-alert profile coverage |

---

## Part 6 — LASA (look-alike / sound-alike)

### 6.1 Schema support

| Feature | Supported? |
|---------|------------|
| `MedicationSafetyProfile.lasaGroupId` | **Yes** (nullable string) |
| Soft LASA pairs in code | **Yes** — `LASA_PAIRS` in `medicationSafetyWarnings.ts` (e.g. morphine/hydromorphone, hydralazine/hydroxyzine) |
| LASA search filter | **No** |
| LASA seed data | **No** |

### 6.2 Data (local)

| Metric | Value |
|--------|-------|
| Rows with `lasaGroupId` not null | **0** |
| Examples | — |

### 6.3 Implementation status

| Layer | Status |
|-------|--------|
| Schema | **PASS** |
| Runtime soft warnings (sibling basket) | **PARTIAL** |
| Persisted LASA groups | **NOT IMPLEMENTED** |
| Catalog LASA flag | **NOT IMPLEMENTED** |

### 6.4 Part 6 verdict

| Result | **NOT IMPLEMENTED** (data) / **PARTIAL** (schema + soft UI) |

---

## Part 10 — Safety-related governance domains

| Domain | Status | Evidence |
|--------|--------|----------|
| High-alert | **MISSING** | 0 profiles flagged |
| LASA | **MISSING** | 0 `lasaGroupId` |
| Anticoagulant class | **PARTIAL** | Heparin in catalog; warfarin absent; soft tokens only |
| Insulin class | **PARTIAL** | 3 insulin SKUs; no HA profile |
| Opioid class | **PARTIAL** | See [medication-controlled-substance-audit.md](./medication-controlled-substance-audit.md) |
| Benzodiazepine class | **PARTIAL** | Lorazepam/diazepam present; inconsistent control |
| Vasopressor class | **PARTIAL** | Norepinephrine, vasopressin, adrenaline in catalog; soft warnings |
| Antibiotic class | **PARTIAL** | `catalogClassificationAuditFlags` antibiotic hints — audit-only |
| Sedative | **PARTIAL** | Propofol/ketamine soft rules |

---

## Cross-cutting safety risks

1. **False negative high-alert** — clinicians see no HA badge for insulin/heparin/vasopressors. (**CRITICAL**)
2. **Warfarin absent** — anticoagulant high-alert token never matches catalog. (**HIGH**)
3. **Dual-layer drift** — 676 inactive products vs 299 active legacy rows. (**HIGH**)
4. **Alias collisions** — `rsi`, `sédation` shared across drugs. (**HIGH** for wrong-pick)

---

## Part 5–6 combined readiness

| Area | Score (0–100) | See |
|------|---------------|-----|
| Safety Governance Readiness | **12** | [medication-production-readiness.md](./medication-production-readiness.md) |

---

## Future phase mapping

| Gap | Phase |
|-----|-------|
| High-alert profile seed + backfill | **M1.4** |
| LASA group assignment | **M1.4** (with clinical sign-off) |
| Controlled schedules | **M1.3** |
| Search alias disambiguation | **M1.5** |
