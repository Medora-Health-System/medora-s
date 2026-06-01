# Medication Governance Risk Register (M1.3A)

**Phase:** M1.3A (design only)  
**Date:** 2026-05-31  
**Supersedes:** M1.1B top-10 list (expanded to 15 for safety program)

---

## Part 10 — Top 15 medication safety risks

| # | Risk | Severity | Mitigation | Phase |
|---|------|----------|------------|-------|
| 1 | **Zero persisted high-alert profiles** while high-risk drugs are orderable | **CRITICAL** | HA manifest + M1.3D backfill; block order search until profile exists (optional gate) | M1.3D |
| 2 | **Controlled flags inconsistent** (diazepam, tramadol, oral lorazepam unflagged) | **CRITICAL** | Clinical controlled manifest + M1.3C classifier sync | M1.3C |
| 3 | **Dual catalog drift** (legacy active, canonical inactive) | **HIGH** | M1.3G consolidation; single source of truth on promotion | M1.3G / M1.6 |
| 4 | **EDOC.8 not routed from safety profile** — manual card selection only | **HIGH** | Profile-driven EDOC policy extension | M1.3F |
| 5 | **LASA only in soft code** — no persisted groups | **HIGH** | M1.3E LASA group + pair tables / seed | M1.3E |
| 6 | **No `CONTROLLED_SUBSTANCE_OVERRIDE` / `HIGH_ALERT_OVERRIDE` audit** | **HIGH** | M1.3F audit enum + PHI-safe metadata | M1.3F |
| 7 | **Warfarin / TPA absent** from catalog | **HIGH** | Formulary gap review; add or document exclusion | M1.3C / clinical |
| 8 | **Alias collisions** (`rsi`, `sédation`) → wrong drug selection | **HIGH** | M1.5 alias governance (parallel track) | M1.5 |
| 9 | **Production safety data unverified** | **HIGH** | Operator read-only audit on production DB | M1.1B ops |
| 10 | **MAR lacks frequency/eMAR schedule** — administration without full schedule context | **HIGH** | M1.3F architecture; defer full eMAR to later phase | M1.3F |
| 11 | **Pharmacy verification not implemented** | **MEDIUM** | `requiresPharmacyVerification` gate in profile; future queue | Post M1.3G |
| 12 | **Free-text route/form** — safety inference errors | **MEDIUM** | M1.2 taxonomy normalization | M1.2 |
| 13 | **Refill count on orders without controlled policy** | **MEDIUM** | Tie `refillCount` to controlled class in M1.3C | M1.3C |
| 14 | **Waste documentation card disabled** (`controlled_substance_waste` future only) | **MEDIUM** | Enable EDOC card + witness in M1.3F | M1.3F |
| 15 | **Global baseline import pollutes search** (`19G1-*` codes) | **MEDIUM** | Activation governance hygiene | M1.3G |

---

## Severity summary

| Severity | Count |
|----------|------:|
| CRITICAL | 2 |
| HIGH | 8 |
| MEDIUM | 5 |
| LOW | 0 |

---

## Design-phase residual risk acceptance

Until M1.3B–G complete, Medora remains:

- **SAFE (conditional)** for Haiti MVP legacy catalog + existing MAR + EDOC.8 infusion documentation.
- **NOT SAFE** for enterprise medication safety governance sign-off or production policy enforcement.
