# M1.6F — Enterprise Formulary Pilot Activation Plan

**Phase:** M1.6F controlled pilot  
**Tranche:** A (12 medications)  
**Default state:** Framework only — **no automatic activation**

---

## Objective

Activate a small, safe subset of the enterprise formulary (134 meds) using per-medication governance workflow. **No bulk activation. No provider search cutover (M1.5F deferred).**

---

## Tranche A roster (12)

| # | Catalog code | Generic | Wave |
|---|--------------|---------|------|
| 1 | `AMLODIPINE_5_MG_COMPRIME_ORAL` | Amlodipine | W1 |
| 2 | `LOSARTAN_50` | Losartan | W1 |
| 3 | `LISINOPRIL_10` | Lisinopril | W1 |
| 4 | `METFORMIN_500` | Metformin | W1 |
| 5 | `OMEPRAZOLE_20` | Omeprazole | W1 |
| 6 | `PANTOPRAZOLE_40_MG_COMPRIME_ORAL` | Pantoprazole | W1 |
| 7 | `SIMVASTATIN_20_MG_COMPRIME_ORAL` | Simvastatin | W1 |
| 8 | `HYDROCHLOROTHIAZIDE_25` | Hydrochlorothiazide | W1 |
| 9 | `ATORVASTATIN_20_MG_COMPRIME_ORAL` | Atorvastatin | W1 |
| 10 | `FAMOTIDINE_20_MG_COMPRIME_ORAL` | Famotidine (oral) | W1 |
| 11 | `FINASTERIDE_5_MG_COMPRIME_ORAL` | Finasteride | W1 |
| 12 | `TAMSULOSIN_0.4_MG_COMPRIME_ORAL` | Tamsulosin | W1 |

### Excluded from Tranche A (by design)

- Controlled substances, high-alert, LASA, injectables, insulin, anticoagulants
- Psychotropics, ER critical care, vaccines
- Levothyroxine (high-alert in Wave 1 manifest)
- Wave 2 breadth (defer until Tranche A validated)

---

## Architecture

| Layer | Path |
|-------|------|
| Tranche manifest | `packages/shared/src/medication/enterpriseFormularyPilotTrancheAManifest.ts` |
| Validation + dashboard | `packages/shared/src/medication/enterpriseFormularyPilotValidation.ts` |
| Activation helper | `apps/api/prisma/helpers/seed-enterprise-formulary-pilot-activation.ts` |
| Pilot marker | `ENTERPRISE_M16F_TRANCHE_A_PILOT` |
| Constants | `apps/api/src/medication-master/enterprise-formulary-pilot.constants.ts` |

---

## Activation workflow (per medication)

1. **Eligibility audit** — manifest + DB chain validation (blocking issues abort).
2. **Facility formulary** — create/update `FacilityFormularyItem` for pilot facility.
3. **Activate** — `MedicationConcept` + `MedicationProduct` + default `MedicationPackage` → active.
4. **Governance** — `governanceStatus=ACTIVATION_APPROVED`, append pilot marker + note.
5. **Runtime flags** — `formularyApprovedInactive=true`; **`orderSearchEnabled=false`** (no M1.5F cutover).
6. **Explicitly NOT enabled** — MAR, billing, provider order search.

---

## Manual activation (opt-in only)

```bash
# Dry-run single medication
MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
MEDORA_ENTERPRISE_PILOT_NOTE="Staging pilot — amlodipine" \
MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY="pharmacy-lead" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Remove `MEDORA_ENTERPRISE_PILOT_DRY_RUN=1` only after explicit approval.

**Migration:** NO | **Seed flag:** YES (opt-in)

---

## Staging readiness (2026-06-02)

| Metric | Value |
|--------|------:|
| Tranche A eligible | 12/12 |
| Activation readiness | **100%** |
| Activated on staging | **0** (framework only) |
