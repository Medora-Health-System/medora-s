# M1.7A.2 — Medication Localization Wave Readiness

---

## Readiness gates by phase

| Phase | Localization gate | Strict aliases | Strict searchTerms |
|-------|-------------------|----------------|-------------------|
| M1.7A.2 | Contract + builders shipped | — | — |
| Wave 1 / 2 (existing) | `validateEnterpriseFormularyLocalizationBatch` legacy | No | No |
| **M1.7B Wave 3** | `validateEnterpriseWaveFormularyLocalizationReady` | **Yes** | **Yes** |
| M1.7C Wave 4 | Same as Wave 3 | **Yes** | **Yes** |
| M1.7D Wave 5 | Same as Wave 3 | **Yes** | **Yes** |
| M1.7E | DB localization separation (planned) | Yes | Per-locale search columns |

---

## Wave 3 implementation checklist (M1.7B — not started)

1. Each manifest row is a `MedicationLocalizationContract` with tagged aliases.  
2. `searchTerms = buildMedicationSearchTermsArray(row)`.  
3. Run `validateEnterpriseWaveFormularyLocalizationReady(manifest)` in CI — **must pass**.  
4. Seed helper uses `buildMedicationSearchTokens().combined` for `CatalogMedication.searchText`.  
5. Seed helper sets `MedicationAlias.language` from contract (never hard-code all `en`).  
6. No `displayNameEn` copied from `displayNameFr` unless INN-identical without French markers.  

---

## Impact on projected inventory

| Milestone | Rows | Localization debt if gate skipped |
|-----------|-----:|-----------------------------------|
| Today | ~325 | Medium (mixed `searchText`) |
| + Wave 3 | +120 | **Prevented** by M1.7A.2 |
| + Waves 4–5 | +470 | **Prevented** |

---

## SAFE / NOT SAFE

| State | Verdict |
|-------|---------|
| Current 134 enterprise + Haiti | **SAFE** (legacy validated) |
| Wave 3 without this contract | **NOT SAFE** |
| Wave 3 with M1.7A.2 gate | **SAFE** (when CI green) |

---

## Migration / seed

| Question | Answer |
|----------|--------|
| Migration required? | **NO** (M1.7A.2) |
| Seed required? | **NO** (M1.7A.2) |
| Seed required for Wave 3? | **YES** (later, separate phase) |

---

## Related docs

- `medication-localization-audit.md` (M1.7A.1)  
- `medication-localization-target-architecture.md`  
- `medication-localization-roadmap.md`  
