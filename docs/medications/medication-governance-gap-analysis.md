# Medication Governance Gap Analysis — Phase M1.1A

**Program:** Enterprise Medication Inventory & Architecture Audit  
**Phase:** M1.1A (audit only)  
**Date:** 2026-05-31  
**Companion:** [medication-inventory-architecture-audit.md](./medication-inventory-architecture-audit.md)

---

## Part 7 — Governance gap analysis

Comparison of **current Medora-S medication architecture** vs **desired enterprise governance domains**.

Legend:

| Status | Meaning |
|--------|---------|
| **Supported** | Modeled and used in MVP/runtime path |
| **Partial** | Present but string-based, UI-only, canonical-only, or not wired to orders |
| **Missing** | No durable schema or workflow |
| **Unsafe / ambiguous** | Dual paths or free-text risk |
| **Sign-off required** | Needs clinical/pharmacy governance before automation |

### 7.1 Domain matrix

| Domain | Status | Current implementation | Gap / risk |
|--------|--------|------------------------|------------|
| Medication family/class | **Partial** | `therapeuticClass` string on `CatalogMedication`; `MedicationTherapeuticClass` on concepts | Legacy orders do not use structured class FK; taxonomy not unified |
| Generic/brand relationship | **Partial** | `genericName` + EN display + aliases; no brand FK | Brand vs product strength not formally modeled on legacy |
| Route | **Partial** | Free-text `route` on catalog/order/MAR; `MedicationRoute` on products | IV push vs infusion ambiguity (`catalogClassificationAuditFlags`) |
| Dosage form | **Partial** | String on catalog/product | Not normalized on legacy |
| Strength/concentration | **Partial** | String `strength`; structured `MedicationConcentration` on products | Legacy orders use string only |
| Controlled substance | **Supported** | `isControlled`, schedule, witness/double-sign on catalog; safety profile on concept | Local dev: only **6** controlled catalog rows — coverage likely incomplete |
| High-alert medication | **Partial** | `MedicationSafetyProfile.isHighAlert`; soft rules in `medicationSafetyWarnings.ts`; admin review UI | Local dev: **0** high-alert safety profiles; legacy catalog has no HA flag |
| LASA medication | **Partial** | `lasaGroupId` on safety profile; `LOOK_ALIKE_SOUND_ALIKE` soft warnings | Not enforced at order entry; no LASA group seed |
| Anticoagulant | **Partial** | Soft rule `ANTICOAGULATION_HIGH_ALERT` in shared warnings | Not a structured classifier |
| Insulin | **Partial** | Soft rule `INSULIN_HIGH_ALERT` | Same |
| Opioid | **Partial** | Controlled schedule + soft sedation rules | No opioid-specific class FK |
| Benzodiazepine | **Missing** | — | Only heuristic text rules if any |
| Sedative | **Partial** | `SEDATION_RESPIRATORY_DEPRESSION` category | Heuristic |
| Vasopressor | **Partial** | `VASOPRESSOR_HIGH_ALERT` soft category | Heuristic |
| Antibiotic | **Partial** | Audit hints in `catalogClassificationAuditFlags` | Not antimicrobial stewardship workflow |
| Antipsychotic | **Missing** | — | — |
| Pregnancy/lactation warning | **Missing** | — | **Sign-off required** if added |
| Renal dose warning | **Missing** | — | **Sign-off required** |
| Pediatric safety | **Missing** | — | **Sign-off required** |

### 7.2 Already supported (MVP-safe)

- Stable catalog **codes** and idempotent Haiti seed upsert
- Bilingual **displayNameFr** / **displayNameEn** (with English-primary guard for essentials)
- **Alias** search (`MedicationAlias` + canonical `MedicationSearchAlias`)
- **Controlled** substance flags and witness/double-sign on catalog rows
- **MAR** append-only documentation with route/dose snapshots and infusion phases
- **Pharmacy inventory** and dispense linkage to catalog
- **Facility-scoped** inventory, usage, favorites
- **Canonical** product governance workflow (`governanceStatus`, activation gates for order search)
- **Import/staging** pipelines for ER formulary and controlled catalog (admin-only)

### 7.3 Partially supported (needs program work)

- Enterprise **taxonomy** (concept/product/package) vs legacy **CatalogMedication** dual write
- **High-alert** and **LASA** — schema exists; population and enforcement weak
- **Formulary** — `FacilityFormularyItem` on packages; legacy catalog lacks per-facility formulary flag
- **Order defaults** — `MedicationOrderSetLink` exists; not broadly wired to Haiti MVP orders
- **Search governance** — activation filter hides non-approved products from order search
- **Billing classification** — `administrationType` / `billingClass` with audit flags (read-only Phase 6B)

### 7.4 Missing (enterprise target)

- Structured **sig** (frequency, PRN, duration) on medication orders
- Full **medication reconciliation** module
- **Pharmacy verification** queue before administration
- **Fuzzy** search / misspelling tolerance
- Dedicated **brand name** entity and generic→brand graph
- **Successor/inactive** medication replacement model on legacy catalog
- **Renal/pediatric/pregnancy** clinical decision support
- National **formulary versioning** and diff audit beyond staging tables

### 7.5 Unsafe / ambiguous

| Issue | Severity | Detail |
|-------|----------|--------|
| Dual catalog identity | **HIGH** | Orders use `CatalogMedication`; governance uses `MedicationProduct` — drift if imports promote without legacy link |
| Free-text route/frequency | **HIGH** | Route on order/MAR is string; frequency absent — billing and safety inference fragile |
| Duplicate display groups | **MEDIUM** | Many rows share generic (local: 61 groups) — may be valid multi-strength or true duplicates |
| Missing genericName | **MEDIUM** | 52 local rows without generic — search and safety haystack degraded |
| Safety profile empty | **HIGH** | Zero high-alert profiles locally while UI supports badges — false negative risk |
| Screenshot-driven rebuild | **CRITICAL** | Would discard 263 curated seed rows and stable codes tied to inventory |

### 7.6 Requires future clinical sign-off

- Controlled substance schedule assignments for Haiti formulary
- High-alert medication list (ISMP-aligned) and LASA pairs
- Antimicrobial classification and restriction rules
- Renal/pediatric/pregnancy warning content and when to block vs warn
- Order-search **activation** policy (which products appear for prescribers)
- Retire/replace workflow when renaming or splitting catalog codes

---

## Part 8 — Data quality risk audit

### 8.1 Risk register

| Risk | Severity | Evidence | Mitigation (future phases) |
|------|----------|----------|---------------------------|
| Duplicate medications (same code) | **LOW** | Local: 0 duplicate `code` | Keep upsert-by-code discipline |
| Duplicate strengths/products (same generic, many rows) | **MEDIUM** | 61 duplicate generic groups locally | M1.1B quality audit; distinguish strength variants vs true dupes |
| Free-text routes | **HIGH** | `route` string on catalog/order/MAR | Normalize to `MedicationRoute`; audit flags exist |
| Free-text frequency | **HIGH** | Not structured on orders | M1.2+ order schema design |
| Missing generic names | **MEDIUM** | 52 rows local | Backfill from seed/CSV; block promotion without generic |
| Missing brand names | **LOW** | No brand column by design | Alias + displayNameEn strategy |
| Inconsistent units | **MEDIUM** | `doseUnit`, `billingUnitType` strings | Tie to `MedicationDoseUnit` |
| Unsafe abbreviations | **MEDIUM** | User free-text in `manualLabel`, notes | Order entry guardrails (future) |
| Uncontrolled high-alert entries | **HIGH** | 0 `isHighAlert` safety profiles local | M1.4 governance seed + profile backfill |
| Controlled substances lacking flags | **MEDIUM** | Only 6 controlled locally vs 263 seed | Verify production; align seed `isControlled` |
| Missing audit trail on catalog edits | **MEDIUM** | Only `updatedAt` on catalog | Admin import logs; future catalog audit table |
| Missing inactive/successor model | **MEDIUM** | `isActive` only on legacy; `retiredAt` on concepts | M1.2 taxonomy + retire workflow |
| Facility-specific or PHI-like names | **LOW** | Haiti seed uses generic INN-style names | Governance review on manual imports |
| DB ≠ seed drift | **HIGH** | 299 local catalog vs 263 seed | Production count + import reconciliation |
| Production counts unknown | **MEDIUM** | NOT VERIFIED | Read-only production audit before re-seed |

### 8.2 Data quality summary

| Severity | Count (themes) |
|----------|----------------|
| **CRITICAL** | 1 — abandoning curated catalog for screenshots |
| **HIGH** | 5 — dual identity, free-text route/frequency, HA false negatives, DB drift |
| **MEDIUM** | 7 — duplicates, missing generic, controlled coverage, audit/retire |
| **LOW** | 2 — code uniqueness, brand-by-design |

---

## Part 9 pointer

Recommended phased program: [medication-program-roadmap.md](./medication-program-roadmap.md).

---

## M1.1A conclusions

1. **Do not manually reconstruct** the Haiti medication list from screenshots; **reuse** `HAITI_MEDICATION_CATALOG` and existing DB rows after production verification.
2. **Prioritize** M1.1B data quality on production (counts, duplicates, controlled/HA coverage) before taxonomy expansion.
3. **Treat canonical master** as governance destination, not replacement for legacy until dual-write is explicitly phased in.
