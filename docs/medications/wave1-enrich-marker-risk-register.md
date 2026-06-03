# M1.6B.2 — Wave 1 ENRICH marker risk register

**Environment:** Railway staging  
**Audit date:** 2026-06-02

## Risk summary

| ID | Risk | Severity | Likelihood | Mitigation |
|----|------|----------|------------|------------|
| R-M16B2-01 | Wave 1 billing gate bypass on 9 ENRICH rows | **High** | **Certain** if those products activated | Marker remediation (M1.6B.3) before 45-row pilot |
| R-M16B2-02 | Split pilot cohort (36 gated / 9 ungated) | **High** | **Certain** without scope doc | Pilot manifest = marker products only |
| R-M16B2-03 | M15E search exception on inactive linkage | **Medium** | **Possible** | Do not use M15E linkage search bypass for Wave 1 pilot activation |
| R-M16B2-04 | `wave1ReadinessPct=0` false negative | **Low** | **Certain** on seed log | Ignore metric; use DB marker + billing audit |
| R-M16B2-05 | Lisinopril missing `prinivil` alias | **Low** | **Low** | M1.6C alias expansion; non-blocking for generic search |
| R-M16B2-06 | Illustrative staging NDC/HCPCS | **Medium** | **N/A** | Replace before production billing |

---

## R-M16B2-01 — Billing gate bypass

**Description:** `enterprise-wave1-billing-gate.util.ts` returns `{ allowed: true }` when `governanceNotes` lacks `ENTERPRISE_M16B_WAVE1_FORMULARY`.

**Affected medications (9):**

1. `AMLODIPINE_5_MG_COMPRIME_ORAL`
2. `CARVEDILOL_6.25_MG_COMPRIME_ORAL`
3. `HYDROCHLOROTHIAZIDE_25`
4. `LEVOTHYROXINE_50_MCG_COMPRIME_ORAL`
5. `LISINOPRIL_10`
6. `LOSARTAN_50`
7. `OMEPRAZOLE_20`
8. `PANTOPRAZOLE_40_MG_COMPRIME_ORAL`
9. `SIMVASTATIN_20_MG_COMPRIME_ORAL`

**Impact:** Activation could enable order search/billing path without Wave 1 hard billing validation despite having Wave 1 billing **data**.

**Status:** Open — requires M1.6B.3 or scoped pilot exclusion.

---

## R-M16B2-02 — Inconsistent enforcement cohort

**Description:** Operations may assume 45 manifest rows ≡ 45 gated products. Only 36 are gated.

**Impact:** Audit/compliance drift; uneven clinician experience if mixed activation.

**Status:** Open — document pilot scope as 36 until remediation.

---

## R-M16B2-03 — M15E linkage search behavior

**Description:** Products retain `HAITI_M15E_CANONICAL_LINKAGE_ONLY` in `governanceNotes`. Provider search filter may treat linkage-only Haiti rows differently (`linkageOnlyHaitiM15e`).

**Impact:** Search visibility may not match post-activation expectations for pilot.

**Status:** Monitor during pilot; out of scope for marker-only fix.

---

## R-M16B2-04 — Seed readiness telemetry

**Description:** Post-seed `wave1ReadinessPct=0` due to stale in-memory `hasBillingProfile` check (separate audit).

**Impact:** False operational alarm; does not reflect DB state.

**Status:** Documented; fix in future seed patch (not M1.6B.3 blocker).

---

## R-M16B2-05 — Partial brand alias coverage

**Description:** Staging aliases seeded for primary brands; some secondary brands from manifest not confirmed (e.g. `prinivil` on lisinopril).

**Impact:** Secondary brand search miss.

**Status:** Defer to M1.6C.

---

## R-M16B2-06 — Placeholder billing codes

**Description:** Wave 1 manifest uses illustrative `J3490` / `906xx` / placeholder NDC pattern on staging.

**Impact:** Production claim/revenue risk if activated without licensed code set.

**Status:** Expected for staging pilot planning only.

---

## Decision matrix

| Pilot scope | Billing data ready? | Marker gate? | Recommendation |
|-------------|---------------------|--------------|----------------|
| 45 manifest rows | Yes (9+36) | 36 only | **NOT SAFE** |
| 36 marker rows | Yes | Yes | **SAFE (scoped)** |
| 9 missing-marker only | Yes | **Bypass** | **UNSAFE** for Wave 1 pilot |

---

## Sign-off criteria (post M1.6B.3)

- [ ] All 45 manifest catalog codes have product with `ENTERPRISE_M16B_WAVE1_FORMULARY`
- [ ] `missing_marker_with_billing` count = 0 on staging
- [ ] Re-run activation dry-check: billing gate applies to all 45
- [ ] Pilot manifest updated to full 45
