# Controlled Substance Audit — Phase M1.1B

**Program:** Enterprise Medication Governance  
**Phase:** M1.1B (audit only)  
**Date:** 2026-05-31  
**Data source:** Local dev DB — **production NOT VERIFIED**

---

## Scope

Audit catalog presence and governance for representative **opioids** and **benzodiazepines** per M1.1B spec.

**Global catalog flags (local):**

| Metric | Count |
|--------|-------|
| `CatalogMedication.isControlled = true` | **6** |
| `MedicationSafetyProfile.isControlled = true` | **0** |

---

## Substance-level audit

| Substance | Exists in catalog | Controlled flag | DEA schedule | Safety profile |
|-----------|-------------------|-----------------|--------------|----------------|
| **Hydrocodone** | No | — | — | — |
| **Oxycodone** | No | — | — | — |
| **Morphine** | Yes (`MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION`) | Yes | II | No |
| **Hydromorphone** | Yes (`HYDROMORPHONE_2MG_ML_INJECTABLE`) | Yes | II | No |
| **Fentanyl** | Yes (`FENTANYL_50MCG_ML_INJECTABLE`) | Yes | II | No |
| **Codeine** | No | — | — | — |
| **Tramadol** | Yes (oral + injectable) | **No** | — | No |
| **Lorazepam** | Yes (oral + injectable) | **Partial** (injectable only) | IV on injectable only | No |
| **Diazepam** | Yes (oral + injectable) | **No** | — | No |
| **Alprazolam** | No | — | — | — |
| **Clonazepam** | No | — | — | — |

### Row detail (local)

**Morphine / Hydromorphone / Fentanyl** — Haiti ER seed includes `controlled(...)` helper with schedule **II**, witness/double-sign defaults per seed template.

**Tramadol** — Present in Haiti seed as **non-controlled** (`nonEssential`); clinically may require schedule review for Haiti/US policy — **governance gap**.

**Lorazepam** — Oral: not controlled; Injectable (`LORAZEPAM_2MG_ML_INJECTABLE`): controlled schedule **IV**.

**Diazepam** — Both forms: `isControlled: false` despite being essential anxiolytic — **HIGH** gap vs typical Schedule IV benzodiazepine policy.

---

## Coverage calculations

| Metric | Value | Notes |
|--------|-------|-------|
| **Catalog presence** (substances in list) | **6 / 11 = 55%** | Missing: hydrocodone, oxycodone, codeine, alprazolam, clonazepam |
| **Controlled flag when substance exists** (strict: all SKUs) | **3 / 6 = 50%** | Only morphine, hydromorphone, fentanyl fully flagged |
| **Safety profile coverage** | **0 / 6 = 0%** | No `MedicationSafetyProfile` rows for these concepts locally |
| **Schedule populated when controlled** | **5 / 6** flagged rows | Tramadol N/A; lorazepam injectable has IV |

---

## Seed vs database alignment

Haiti seed (`haiti-medications.ts`) documents controlled substances via `controlled(schedule)` spread for ER opioids; tramadol and oral benzodiazepines intentionally or omission-wise lack flags. **Database matches seed intent for tramadol/diazepam** — issue is **policy completeness**, not seed drift.

**Missing substances** are absent from Haiti seed — not a flag bug.

---

## Soft-rule coverage (code-only)

`packages/shared/src/medicationSafetyWarnings.ts` token-matches:

- Opioids: morphine, hydromorphone, fentanyl (not tramadol, hydrocodone, oxycodone)
- Benzos: midazolam, lorazepam (not diazepam, alprazolam, clonazepam)

Warnings are **non-blocking** UI hints — not a substitute for catalog flags.

---

## Severity summary

| Finding | Severity |
|---------|----------|
| 45% of audit list absent from catalog | **HIGH** |
| Tramadol uncontrolled | **MEDIUM** (jurisdiction-dependent) |
| Diazepam / oral lorazepam uncontrolled | **HIGH** |
| Zero safety profiles for controlled concepts | **CRITICAL** for enterprise governance |
| Production not verified | **MEDIUM** |

---

## Part 4 verdict

| Result | **PARTIAL** |
|--------|-------------|
| Rationale | Opioid IV agents largely present and flagged; benzodiazepine/opioid gaps; no safety profiles; 55% catalog presence |

---

## Recommended actions (future phases — not M1.1B)

1. **M1.3** — Clinical sign-off manifest for Haiti controlled list + schedules  
2. Backfill `MedicationSafetyProfile` for controlled concepts  
3. Align oral benzodiazepines and tramadol with policy  
4. Production read-only replay of this table  

---

## References

- Schema: `CatalogMedication.isControlled`, `controlledSchedule`, `requiresWitness`, `requiresDoubleSign`
- Seed: `apps/api/prisma/data/haiti-medications.ts` (`controlled()` helper)
- Safety: `MedicationSafetyProfile` (canonical)
