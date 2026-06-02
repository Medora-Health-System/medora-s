# M1.6B.3 — Wave 1 ENRICH marker remediation

## Objective

Ensure all 45 Enterprise Wave 1 formulary products carry the `ENTERPRISE_M16B_WAVE1_FORMULARY` governance marker so the M1.6B activation billing gate applies consistently. No new medications, activation, billing engine changes, or provider search cutover.

## Root cause (M1.6B.2)

`seed-enterprise-wave1-formulary.ts` treated **ENRICH + already linked** (`product.legacyCatalogMedicationId === catalogId`) as a no-op: it incremented `alreadyLinked` only and never updated `governanceNotes`. Nine chronic-care products reused from M1.5E had billing profiles but lacked the Wave 1 marker:

| Catalog code |
|--------------|
| `AMLODIPINE_5_MG_COMPRIME_ORAL` |
| `CARVEDILOL_6.25_MG_COMPRIME_ORAL` |
| `HYDROCHLOROTHIAZIDE_25` |
| `LEVOTHYROXINE_50_MCG_COMPRIME_ORAL` |
| `LISINOPRIL_10` |
| `LOSARTAN_50` |
| `OMEPRAZOLE_20` |
| `PANTOPRAZOLE_40_MG_COMPRIME_ORAL` |
| `SIMVASTATIN_20_MG_COMPRIME_ORAL` |

**Impact:** `evaluateEnterpriseWave1ActivationBillingGate` returns `allowed: true` when the marker is absent, so those nine products bypassed Wave 1 billing review at activation time despite having `MedicationBillingProfile` rows.

## Fix

1. **`mergeEnterpriseWave1GovernanceNotes`** (`enterprise-wave1.constants.ts`) — idempotently appends the M1.6B prefix and `ENTERPRISE_M16B_WAVE1_FORMULARY` while preserving existing lines (including `HAITI_M15E_CANONICAL_LINKAGE_ONLY`).
2. **`seed-enterprise-wave1-formulary.ts`** — in the ENRICH `alreadyLinked` branch, merge and persist notes when changed; increment `wave1GovernanceNotesUpdated`. CREATE and relink paths use the same merge helper.
3. **`seed-catalogs.ts`** — log `wave1MarkersUpdated` from `wave1GovernanceNotesUpdated`.

## Out of scope

- New formulary rows or billing manifest entries
- Product activation (`isActive` remains false)
- Governance rule or billing engine changes
- Provider search cutover

## Tests

- `apps/api/src/medication-master/enterprise-wave1-marker-remediation.spec.ts` — merge idempotency, gate with/without marker, seed mock for nine ENRICH rows
- Existing `enterprise-wave1-billing-gate.util.spec.ts` — unchanged CREATE/gate behavior

## Expected staging outcome (post re-seed)

| Metric | Before M1.6B.3 | After M1.6B.3 |
|--------|----------------|---------------|
| Products with `ENTERPRISE_M16B_WAVE1_FORMULARY` in `governanceNotes` | 36 | **45** |
| ENRICH rows with billing profile but no marker | 9 | **0** |
| `MedicationBillingProfile` for Wave 1 manifest codes | 45 | **45** (unchanged) |

Full Wave 1 pilot readiness: **SAFE (conditional)** once staging counts match the “after” column and activation remains gated.
