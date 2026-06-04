# M1.7C.9 — Enterprise Wave 4 Staging Revalidation

**Phase:** Staging revalidation (audit only — no code/seed/schema changes)  
**Date:** 2026-06-04  
**Branch:** `main` @ `81af4ebf` (M1.7C.8)  
**Environment:** Railway staging (`switchyard.proxy.rlwy.net`)  
**Method:** Independent re-proof from repository + staging DB + seed re-runs

---

## Executive verdict

**SAFE FOR M1.7C.10 CLINICAL REVIEW QUEUE RESOLUTION**

All M1.7C.7 blockers are resolved on staging. Wave 4 seed is stable, idempotent, administration-type synchronized, and inactive. Clinical review queue SKUs remain deferred and inactive.

**Operational note:** First `prisma:seed-catalogs` attempt in this session failed with Prisma `P1017` (server closed connection) during alias upsert mid-catalog pass. Retries completed successfully. Operators running full catalog seed on staging should retry on transient disconnects.

---

## Part 1 — Source validation

### Commits on `main`

| Phase | Commit | Summary |
|-------|--------|---------|
| M1.7C.6 | `73adb7f6` | Administration-type remediation, Ondansetron PUSH protection |
| M1.7C.8 | `81af4ebf` | ENRICH sync, Budesonide catalog resolution, seed wiring |

M1.7C.7 validation report exists locally (`docs/medications/enterprise-formulary-wave4-staging-seed-validation.md`, untracked) — findings superseded by M1.7C.8 + this revalidation.

### Files inspected

| Area | Path |
|------|------|
| Catalog code normalization | `packages/shared/src/medication/wave4CatalogCodeNormalization.ts` |
| Admin remediation + clinical review set | `packages/shared/src/medication/wave4AdministrationTypeRemediation.ts` |
| Manifest validation | `packages/shared/src/medication/enterpriseWave4EdHospitalFormularyValidation.ts` |
| Wave 4 seed helper | `apps/api/prisma/helpers/seed-enterprise-wave4-ed-hospital-formulary.ts` |
| Seed entry hook | `apps/api/prisma/seed-catalogs.ts` |
| Governance marker | `apps/api/src/medication-master/enterprise-wave4-ed-hospital.constants.ts` |
| Seed modules loader | `apps/api/prisma/helpers/enterprise-wave4-ed-hospital-formulary-seed-modules.ts` |
| Tests | `wave4CatalogCodeNormalization.test.ts`, `wave4AdministrationTypeRemediation.test.ts`, `wave4-seed-enrich-sync.spec.ts`, `wave4-administration-type-seed-guard.spec.ts`, `enterprise-wave4-ed-hospital-seed-runtime.spec.ts` |
| MAR regression | `medication-administration-ondansetron.spec.ts`, `medication-administration-hydromorphone.spec.ts`, `marHiddenBillingPayload.test.ts` |

### Confirmations

| Requirement | Present |
|-------------|---------|
| Ondansetron protection (`WAVE4_ONDANSETRON_IV`, PUSH validation) | ✓ |
| Seed guard (`resolveWave4CatalogAdministrationType`) | ✓ |
| Product sync (`syncWave4ProductAdministrationType`, `resolveWave4ProductAdministrationType`) | ✓ |
| Budesonide normalization (`WAVE4_ENRICH_CATALOG_CODE_ALIASES` + tokenization) | ✓ |
| Validation tests | ✓ (shared 1172 + API wave4/enrich specs) |

---

## Part 2 — Build validation

| Command | Result |
|---------|--------|
| `pnpm --filter @medora/shared test` | **PASS** (1172/1172) |
| `pnpm --filter @medora/shared build` | **PASS** |
| `pnpm --filter @medora/api test -- enterprise-wave4` | **PASS** (6/6) |
| `pnpm --filter @medora/api test -- wave4-seed-enrich` | **PASS** (3/3) — supplemental M1.7C.8 |
| `pnpm --filter @medora/api run build` | **PASS** |
| `pnpm verify:web` | **PASS** |

---

## Part 3 — Staging seed re-run

Command (no activation flags):

```bash
DATABASE_URL="<RAILWAY_STAGING_DATABASE_URL>" \
MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Session log

| Attempt | Result | Wave 4 line |
|---------|--------|-------------|
| Run 1 | **FAIL** — `P1017` server closed connection during `medicationAlias.findUnique` (before Wave 4 block) | Not reached |
| Run 2 | **PASS** — exit 0 | `manifest=227, catalogCreated=0, catalogEnriched=227, products=0, billingProfiles=0, wave4MarkersUpdated=0, wave4ReadinessPct=100` |
| Run 3 | **PASS** — exit 0 | Same as run 2 (idempotent) |

### Supplemental Wave 4–only idempotency (same session)

Two consecutive `seedEnterpriseWave4EdHospitalFormulary` invocations:

| Run | productsCreated | packagesCreated | billingProfilesCreated | wave4MarkersUpdated | productAdministrationTypeSynced | conflicts |
|-----|-----------------|-----------------|------------------------|---------------------|--------------------------------|-----------|
| 1 | 0 | 0 | 0 | 0 | 0 | [] |
| 2 | 0 | 0 | 0 | 0 | 0 | [] |

---

## Part 4 — SQL revalidation

| # | Check | Expected | Actual |
|---|-------|----------|--------|
| 1 | Wave 4 product count | 227 | **227** ✓ |
| 2 | Active products | 0 | **0** ✓ |
| 3 | Governance status | REVIEW_REQUIRED only | **227 REVIEW_REQUIRED** ✓ |
| 4 | Administration distribution | See below | **Match** ✓ |
| 5 | Ondansetron | Product PUSH, catalog PUSH | **PUSH / PUSH** ✓ |
| 6 | INHALATION count | 11 | **11** ✓ |
| 7 | Duplicate codes | 0 rows | **0** ✓ |
| — | INJECTION | 0 | **0** ✓ |
| — | SUBCUTANEOUS | 0 | **0** ✓ |
| — | OTHER | 0 | **0** ✓ |

### Administration type distribution (product-level)

| administrationType | count | expected |
|--------------------|------:|---------:|
| IM | 8 | 8 ✓ |
| INFUSION | 114 | 114 ✓ |
| INHALATION | 11 | 11 ✓ |
| ORAL | 20 | 20 ✓ |
| PUSH | 67 | 67 ✓ |
| SQ | 7 | 7 ✓ |
| INJECTION | 0 | 0 ✓ |
| SUBCUTANEOUS | 0 | 0 ✓ |
| OTHER | 0 | 0 ✓ |

### Budesonide (M1.7C.8 fix proof)

| code | administrationType | isActive | Wave 4 marker |
|------|-------------------|----------|---------------|
| `BUDESONIDE_0_5_MG_2_ML_SUSPENSION_POUR_NEBULISATION_INHALEE` | INHALATION | false | present |

Canonical Wave 3 code enriched; no duplicate manifest-token catalog row.

---

## Part 5 — Idempotency audit

**PASS** — After successful seed runs:

- No new products, packages, or billing profiles
- No administration-type re-sync on second pass
- SQL counts unchanged (227 products, distribution stable)
- No product drift (INJECTION/SUBCUTANEOUS/OTHER remain 0)

---

## Part 6 — MAR regression check (code audit only)

| Protection | Evidence | Status |
|------------|----------|--------|
| Ondansetron PUSH | Staging SQL + `validateWave4OndansetronAdministrationType` | ✓ |
| Ondansetron quantity default | `medication-administration-ondansetron.spec.ts` (M1.7B.7E) | ✓ 8/8 pass |
| Hydromorphone no pharmacy block / no forced double RN | `medication-administration-hydromorphone.spec.ts` (M1.7A.9) | ✓ (suite pass) |
| Hidden NDC / billing non-blocking | `marHiddenBillingPayload.test.ts` + Ondansetron specs | ✓ |

No MAR workflow code modified in M1.7C.8.

---

## Part 7 — Clinical review queue validation

Manifest `WAVE4_CLINICAL_REVIEW_REQUIRED_CATALOG_CODES`: **12** SKUs (not 14 — Naloxone/Midazolam intranasal are in **respiratory MAR-blocked** list, not clinical review set).

### Staging state (12 clinical review SKUs)

All **12** rows:

- `isActive = false`
- `governanceStatus = REVIEW_REQUIRED`
- Gate-safe `administrationType` (PUSH for listed paralytics/local anesthetics/vasopressor/glucagon)

### Respiratory MAR-blocked (11 manifest SKUs)

All **11** `INHALATION` products inactive, `orderSearchEnabled` not enabled in governance notes pattern.

### Accidental activation

**0** Wave 4 products with `isActive = true`.

---

## Part 8 — Activation readiness assessment

**Current seed state (all 227):** inactive, `governanceStatus = REVIEW_REQUIRED`, no order search, no billing enablement.

**Forecast at activation gate (manifest + product admin types, consistent with M1.7C.6/M1.7C.8):**

| Bucket | Count | Notes |
|--------|------:|-------|
| **BLOCKED** (MAR gate — INHALATION) | 11 | Nebulizer/intranasal; `ADMINISTRATION_ROUTE_UNSAFE` if MAR enabled |
| **REVIEW_REQUIRED** (clinical review queue) | 12 | RSI paralytics, local anesthetics, phenylephrine, glucagon — defer MAR activation |
| **READY** (gate-safe admin, not in above) | **204** | 227 − 11 − 12; still requires explicit governance activation workflow |

No Wave 4 medication is activated for ordering, billing, or MAR in staging.

---

## Remaining risks

1. **Long `prisma:seed-catalogs` runs** on staging may hit Railway connection timeouts (`P1017`); retry or use Wave 4–only helper for targeted re-seed.
2. **Injectable Ondansetron inactive** on staging limits live MAR UI smoke; unit tests cover M1.7B.7 behavior.
3. **M1.7C.10** must not conflate clinical review queue resolution with Wave 4 bulk activation — 12 + 11 SKUs need explicit pharmacy sign-off paths.
4. **Clinical review count** in runbook said 14; authoritative manifest set is **12** clinical + **11** respiratory blocked.

---

## Migration / activation

| Item | Required |
|------|----------|
| Migration | **NO** |
| Wave 4 activation | **NO** — deferred to post-review phases |
| Production seed | **NO** |

---

## Verdict

**SAFE FOR M1.7C.10 CLINICAL REVIEW QUEUE RESOLUTION**

Evidence: `main` @ M1.7C.8, green builds, 227/227 staging products, zero drift admin types, idempotent seed, Ondansetron PUSH preserved, clinical review SKUs inactive.
