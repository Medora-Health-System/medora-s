# Canonical Medication Stabilization — Risk Register (M1.5H)

**Date:** 2026-06-02  
**Status:** Open — architecture **NOT STABILIZED**  
**Owner:** Medication architecture / pharmacy informatics

---

## Risk scoring

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | Patient safety or wrong-drug selection; block go-live |
| **HIGH** | Data integrity / billing / governance gap; block enterprise expansion |
| **MEDIUM** | Workflow friction or incomplete coverage |
| **LOW** | Documentation / performance tuning |

---

## Open risks

| ID | Risk | Severity | Likelihood | Mitigation | Owner phase |
|----|------|----------|------------|------------|-------------|
| R-H1 | **64** acetaminophen `19G1-ACET` products linked to Haiti `CatalogMedication` via `legacyCatalogMedicationId` | **CRITICAL** | Observed (local DB) | Unlink FKs; run M1.5E clean chains only; never link quarantine targets | M1.5B + M1.5E |
| R-H2 | **73** active `19G1-ACET-*` **catalog** rows appear in provider search (acetaminophen query returns clone codes) | **CRITICAL** | Observed | Deactivate/archive catalog rows; do not map to clinical orders | M1.5B remediation |
| R-H3 | M1.5E backfill not executed on audited environment (0 `HAITI_M15E_CANONICAL_LINKAGE_ONLY`, 64 wrong links vs 192 expected) | **HIGH** | Observed | Run optional seed flag on staging; validate integrity ≥75% | M1.5E |
| R-H4 | Canonical search cutover would expose 1k+ inactive noise products | **CRITICAL** | High if cutover | Keep legacy-authoritative search (M1.5F); Strategy D phased rollout | M1.5F |
| R-H5 | Warfarin / Coumadin absent from Haiti formulary catalog | **HIGH** | Confirmed (0 catalog rows) | Add formulary rows + governance manifest alignment or document intentional omission | Formulary |
| R-H6 | Enoxaparin / Lovenox absent | **HIGH** | Confirmed | Same as R-H5 | Formulary |
| R-H7 | 55 `MANUAL_REVIEW` linkage rows (opioids, LASA, controlled, alias collisions) | **HIGH** | Manifest | Pharmacy + medical director sign-off per row before activation | M1.5D/E/G |
| R-H8 | Ceftriaxone / Rocephin: manifest **MANUAL_REVIEW** — pilot excludes auto-activation | **MEDIUM** | By design | Manual governance review before T1 pilot expansion | M1.5G |
| R-H9 | Sparse `MedicationSafetyProfile` on Haiti concepts post-linkage | **MEDIUM** | Likely post-M1.5E | Run M1.3 governance seeds on new concept IDs | M1.3 |
| R-H10 | Shared clinical alias collisions (rsi, sedation, acetaminophen, ativan, …) | **MEDIUM** | Manifest | Keep `MANUAL_REVIEW`; avoid alias bridge without dedupe | M1.5D |
| R-H11 | Vaccine coverage gaps in Haiti 247-code set | **MEDIUM** | Formulary audit | Track in M1.6A enterprise expansion scope | M1.6A |
| R-H12 | Production M1.4B NDC/HCPCS seed not verified on clinic DB | **MEDIUM** | Unknown prod | Run billing mapping validation on staging before pilot billing smoke | M1.4B |
| R-H13 | M1.5G pilot not yet run in any facility | **MEDIUM** | Pre-pilot | Staged pilot + rollback drill | M1.5G |
| R-H14 | Provider search gate bypass if M1.5E marker removed without controlled activation | **HIGH** | Low if disciplined | Activation validator + pilot scope only | M1.5G |
| R-H15 | Acetaminophen lifecycle e2e test flake | **LOW** | CI | Known flake; not a production blocker | CI |

---

## Closed / contained risks (M1.5D–G)

| ID | Risk | Control |
|----|------|---------|
| C-1 | Duplicate manifest catalog codes | M1.5D validation — 0 blocking duplicates |
| C-2 | Quarantine activation of acet/insulin clones | `isQuarantinedCanonicalProduct` + pilot validator |
| C-3 | Enterprise bulk activation | Out of scope; pilot cap 38 auto-eligible |
| C-4 | Billing engine regression from M1.5D–G | No billing code changes in phase |
| C-5 | MAR workflow rule changes | None in M1.5D–G |
| C-6 | Broken package/product FK chains | 0 orphans on local DB |

---

## Risk heat map (go-live)

```
                    Impact →
              Low    Medium    High    Critical
Likelihood
  High          -      R-H10   R-H3    R-H1,R-H2,R-H4
  Medium        R-H15  R-H8    R-H5-7  -
  Low           -      R-H11   R-H14   -
```

---

## Review cadence

- **Weekly** during Haiti pilot: linkage integrity %, search alias matrix, pilot activation count.
- **Gate review** before M1.6A: all CRITICAL = mitigated or accepted with signed waiver.
