# M1.7B — Enterprise Formulary Wave 3 Risk Register

| ID | Risk | Severity | Mitigation | Status |
|----|------|----------|------------|--------|
| W3-R01 | Accidental activation of 116 inactive SKUs | High | Seed forces `isActive=false`, `REVIEW_REQUIRED`, `orderSearchEnabled=false`; no pilot env in Wave 3 flag | Mitigated |
| W3-R02 | Billing charge without manual review | High | Every package gets `MedicationBillingProfile` with `requiresManualReview=true` | Mitigated |
| W3-R03 | Order label "Medication (label unavailable)" | High | M1.7A.4 `resolveMedicationCatalogPrimaryLabel` gate in manifest validation | Mitigated |
| W3-R04 | EN/FR search drift | Medium | Strict `searchTerms` = `buildMedicationSearchTokens().terms`; tagged aliases | Mitigated |
| W3-R05 | DMARD / biologic dispensing without specialty workflow | High | `isDmard` / `isBiologic` flags + `requiresSpecialtyReview`; remain inactive | Open (process) |
| W3-R06 | Controlled substance (lorazepam, methylphenidate, pregabalin schedule V) | High | `isControlled` + schedule metadata; no auto-activation | Open (policy) |
| W3-R07 | Insulin high-alert dosing errors | High | `isInsulin` + `isHighAlert` on insulin SKUs | Mitigated (flags) |
| W3-R08 | Isotretinoin iPLEDGE / pregnancy restrictions | High | `requiresSpecialtyReview` on isotretinoin row | Open (policy) |
| W3-R09 | Duplicate catalog codes vs W1/W2 | Medium | CREATE overlap validation; ENRICH only when explicit `code` | Mitigated |
| W3-R10 | Lithium / valproate / clozapine monitoring | High | High-alert + specialty review flags; inactive until governance | Open (clinical) |
| W3-R11 | Epoetin / darbepoetin policy & cost | Medium | Inactive; pharmacy verification flag | Open (formulary committee) |
| W3-R12 | Stale dist manifest after generator edit | Low | Documented rebuild: generate → `pnpm --filter @medora/shared build` | Mitigated |

## Explicitly deferred (not Wave 3 scope)

- Bulk pilot activation (M1.6H pattern)
- Order-search cutover (M1.5F)
- Production enablement
- Oncology chemo, full HIV ART, C-II opioid expansion
