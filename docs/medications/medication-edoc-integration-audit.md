# Medication EDOC Integration Audit (M1.3A)

**Phase:** M1.3A (audit + design only)  
**Date:** 2026-05-31  
**EDOC reference:** Phases EDOC.2–EDOC.8 (shipped); EDOC.8A backlog ([`docs/operations/edoc-8a-smart-infusion-governance-backlog.md`](../operations/edoc-8a-smart-infusion-governance-backlog.md))

---

## Part 7 — EDOC governance integration audit

### 7.1 Completed EDOC capabilities (relevant to medications)

| EDOC phase | Capability | Medication relevance |
|------------|------------|---------------------|
| EDOC.2 | `EncounterClinicalDocumentationEntry` append-only | Legal chart for med events |
| EDOC.4 | Witness signature (`ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED`) | Dual verification |
| EDOC.7 | Blood product verification/initiation + witness | Model for med verification |
| EDOC.8 | High-alert infusion verification / initiation / titration | Heparin, insulin, vasopressors, sedatives |
| EDOC.8B | Immediate witness capture (no orphan PENDING) | Same cards — pre-save witness |
| EDOC.9–10 | Sedation, fall risk, belongings witness rules | Adjacent sedation safety |

**Explicit non-scope (EDOC.8 doc):** EDOC.8 is **not** MAR, medication ordering, or pharmacy verification.

### 7.2 Integration matrix (required)

| Medication governance domain | EDOC integration | Current status | Required future behavior |
|-----------------------------|------------------|----------------|------------------------|
| **Dual signatures** | `requiresDoubleSign` on catalog/profile → EDOC witness or encounter note cosign | **PARTIAL** | Map HA/controlled profile flags to witness policy per card |
| **Witness workflows** | `DEFAULT_WITNESS_REQUIRED_CARD_IDS`, facility policy JSON | **SUPPORTED** | Extend policy with `witnessRequiredMedicationClasses[]` |
| **Cosign workflows** | `ENCOUNTER_NOTE_COSIGNED` | **SUPPORTED** (notes) | Optional high-risk **order** cosign — not EDOC |
| **High-risk documentation** | `high_alert_infusion_verification` card | **SUPPORTED** | Bind to `HIGH_ALERT_*` classifiers + infusion admin type |
| **Medication administration documentation** | MAR is separate table; EDOC for structured verification | **PARTIAL** | Cross-link `orderItemId` / `medicationProductId` in EDOC payload when available |
| **Medication waste documentation** | Tag `controlled_substance_waste`; future card in `EDOC_8B_FUTURE_IMMEDIATE_WITNESS_CANDIDATES` | **MISSING** | Enable card when `requiresWasteDocumentation=true` |
| **Controlled-substance documentation** | No dedicated controlled admin card | **MISSING** | Design `controlled_substance_administration` or reuse waste + count EDOC |

### 7.3 Field-level mapping (EDOC.8 ↔ safety profile)

| Safety profile field | EDOC.8 payload field | Notes |
|---------------------|----------------------|-------|
| `requiresIndependentDoubleCheck` | `independentDoubleCheckPerformed` | Verification card |
| `requiresWitness` | Witness capture (8B) | Required before save |
| `highAlertClass` = VASOPRESSOR | `medicationType` pressor | Card validation |
| `highAlertClass` = INSULIN | `medicationType` insulin | Weight-based checks |
| `highAlertClass` = ANTICOAGULANT | `medicationType` anticoagulant | Rate/dose verification |

### 7.4 EDOC.8A backlog (no M1.3A implementation)

Future smart-pump fields (`smartPumpLibraryVerified`, `drugLibraryVersion`, `guardrailOverrideUsed`) — document only; requires separate integration phase.

### 7.5 Audit actions (existing + proposed)

| Action | Status |
|--------|--------|
| `ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED` | **SUPPORTED** |
| `ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED` | **SUPPORTED** |
| `HIGH_ALERT_OVERRIDE` | **MISSING** (proposed M1.3F) |
| `CONTROLLED_SUBSTANCE_OVERRIDE` | **MISSING** (proposed M1.3F) |

PHI-safe metadata pattern: `cardId`, `category`, `conceptCode`, `productCode` — never patient name in override audits.

### 7.6 Facility policy extension (design)

```json
{
  "witnessRequiredMedicationClasses": ["HIGH_ALERT_INSULIN", "HIGH_ALERT_VASOPRESSOR"],
  "controlledWasteWitnessRequired": true,
  "highAlertInfusionTypesRequiringWitness": ["insulin", "vasopressor", "anticoagulant"]
}
```

Stored in `Facility.clinicalDocumentationWitnessPolicyJson` (existing pattern).

---

## Part 7 verdict

| Area | Status |
|------|--------|
| Witness / dual-check for infusion HA | **SUPPORTED** |
| Controlled waste | **MISSING** |
| Profile-driven EDOC routing | **MISSING** |
| MAR/order integration | **PARTIAL** |

---

## Sign-off

| Item | M1.3A |
|------|-------|
| EDOC code changes | **Not authorized** |
| Integration design | **COMPLETE** |
