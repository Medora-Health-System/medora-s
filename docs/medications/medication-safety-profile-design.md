# Medication Safety Profile — Canonical Design (M1.3A)

**Phase:** M1.3A (audit + design only)  
**Date:** 2026-05-31  
**Scope:** `MedicationSafetyProfile` evolution + classifier storage + LASA model

---

## Part 5 — LASA governance design

### 5.1 Current audit

| Item | Status |
|------|--------|
| Schema `lasaGroupId` on `MedicationSafetyProfile` | **SUPPORTED** (0 rows populated locally) |
| Soft LASA pairs in `medicationSafetyWarnings.ts` | **PARTIAL** — basket-level only (morphine/hydromorphone, hydralazine/hydroxyzine) |
| Persisted LASA groups | **NOT IMPLEMENTED** |
| Order-time LASA block | **NOT IMPLEMENTED** |
| EDOC LASA documentation | **MISSING** |

**LASA verdict:** **NOT IMPLEMENTED** (data) / **PARTIAL** (schema + soft warnings)

### 5.2 Recommended LASA architecture

#### LASA group model (new logical entity — design)

```
MedicationLasaGroup
  id              UUID
  code            String unique   e.g. LASA_MORPHINE_HYDROMORPHONE
  displayNameFr   String
  displayNameEn   String
  riskLevel       LOW | MEDIUM | HIGH
  isActive        Boolean
  clinicalSource  String?         ISMP / facility
```

- Concepts link via `MedicationSafetyProfile.lasaGroupId` → `MedicationLasaGroup.code`.
- **Pair warnings** fire when **two distinct concepts** in same encounter order basket share groups that are configured as **pair partners** (`MedicationLasaPair` join: `groupA`, `groupB`, `ruleId`).

#### LASA warning model (runtime)

| Layer | Behavior |
|-------|----------|
| **Soft (MVP)** | Extend `getMedicationSafetyWarnings` to read persisted pairs — keep non-blocking |
| **Order gate (Phase 1+)** | Require acknowledgment + reason code before second LASA partner added |
| **MAR gate (Enterprise)** | Independent double-check when administering LASA partner |

#### LASA audit model

| Event | When |
|-------|------|
| `LASA_WARNING_ACKNOWLEDGED` | User proceeds despite pair warning |
| `LASA_OVERRIDE` | Supervisor override with reason |

Metadata: `lasaGroupId`, `partnerConceptId`, `encounterId`, `orderId` — **no medication names in audit** (use codes only).

### 5.3 Initial LASA pairs (clinical sign-off required)

| Group code | Partner A | Partner B | Severity |
|------------|-----------|-----------|----------|
| LASA_MORPHINE_HYDROMORPHONE | morphine | hydromorphone | HIGH |
| LASA_HYDRALAZINE_HYDROXYZINE | hydralazine | hydroxyzine | MEDIUM |
| LASA_EPINEPHRINE_EPINEPHRINE_NOREPI | epinephrine | norepinephrine | HIGH (look-alike vials) |

---

## Part 6 — Canonical `MedicationSafetyProfile` design

### 6.1 Current schema (baseline)

Existing fields: `isHighAlert`, `highAlertCategories`, `lasaGroupId`, `isControlled`, `controlledSchedule`, `requiresWitness`, `requiresDoubleSign`, `duplicateTherapyClassId`, `interactionGroupIds`, `maxSingleDoseAmount`, `maxSingleDoseUnitId`.

### 6.2 Proposed field catalog

| Field | Definition | Rationale | Governance purpose |
|-------|------------|-----------|-------------------|
| **isControlledSubstance** | Boolean; true if any controlled class ≠ NONE | Single query flag for UI/API | Fast filter; audit classification |
| **controlledSubstanceClass** | Enum: `CONTROLLED_*` (Part 2) | Replaces ambiguous schedule strings in logic | Policy engine input |
| **controlledSchedule** | Retained string snapshot (II–V) | Display / regulatory export | Human-readable label |
| **isHighAlert** | Boolean master HA flag | ISMP institution list | Badges, queues |
| **highAlertClass** | Enum: `HIGH_ALERT_*` (Part 4) | Primary HA category | EDOC card routing |
| **highAlertCategories** | JSON secondary tags | Multi-tag agents (opioid + HA) | Reporting |
| **isLASA** | Boolean; member of any LASA group | Quick filter | LASA workflows |
| **lasaGroupId** | FK/code to `MedicationLasaGroup` | Persisted grouping | Pair detection |
| **requiresDualVerification** | Two licensed staff verify before admin | ISMP HA standard | EDOC.8 alignment |
| **requiresIndependentDoubleCheck** | Checker independent of preparer | Insulin/heparin/pressors | EDOC.8 `independentDoubleCheckPerformed` |
| **requiresWitness** | Second signature on documentation | EDOC witness | Maps to `EncounterClinicalDocumentationEntry` |
| **requiresWasteDocumentation** | Waste must be documented | DEA/facility | EDOC `controlled_substance_waste` card |
| **requiresShiftCount** | Controlled inventory count per shift | Pharmacy ops | Future inventory module |
| **requiresPharmacyVerification** | Pharmacist release before admin | Inpatient safety | Future pharmacy queue |
| **requiresMARVerification** | Nurse verify order vs MAR | eMAR | Future eMAR |
| **requiresOverrideReason** | Structured reason if policy bypassed | Audit | `CONTROLLED_SUBSTANCE_OVERRIDE` / `HIGH_ALERT_OVERRIDE` |
| **requiresCosign** | Second provider cosign on order | High-risk orders | Encounter note cosign pattern |
| **requiresInventoryTracking** | Dose-level inventory decrement | Controlled substances | `InventoryTransaction` linkage |
| **requiresReconciliationReview** | Admission med rec review flag | Patient safety | Home meds / reconciliation phase |

### 6.3 Derivation rules (design)

1. **Classifier manifest** is source of truth (CSV signed by clinical lead).
2. On concept promotion / seed sync, compute profile fields from manifest row.
3. **Do not** auto-derive `requiresShiftCount` for non-controlled.
4. `requiresIndependentDoubleCheck` defaults **true** when `highAlertClass` ∈ {INSULIN, ANTICOAGULANT, VASOPRESSOR, THROMBOLYTIC}.
5. Legacy `CatalogMedication` mirrors: `isControlled`, `controlledSchedule`, `requiresWitness`, `requiresDoubleSign` only (minimal denorm until cutover).

### 6.4 Medication safety classifiers (unified registry)

Store in `packages/shared/src/medication/medicationSafetyClassifiers.ts` (future):

```ts
// Design-only illustration — not implemented in M1.3A
export const CONTROLLED_SUBSTANCE_CLASSES = [ ... ] as const;
export const HIGH_ALERT_CLASSES = [ ... ] as const;
```

Validation at import, seed, and governance promotion boundaries.

### 6.5 Profile cardinality

- **One profile per `MedicationConcept`** (unchanged).
- Products inherit concept profile; product-level overrides **deferred** to enterprise phase (exception table design only).

---

## Part 6 — Data population strategy (future phases)

| Phase | Action |
|-------|--------|
| M1.3B | Shared classifier constants + validation |
| M1.3C | Controlled manifest → profile backfill |
| M1.3D | High-alert manifest → profile backfill |
| M1.3E | LASA groups + pairs |

---

## Sign-off

| Item | M1.3A |
|------|-------|
| Schema migration | **Not authorized** |
| Design | **COMPLETE** |
