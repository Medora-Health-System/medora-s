# M1.6G.1 — Pilot Activation Fail-Closed Hardening

**Date:** 2026-06-02  
**Phase:** M1.6G.1 implementation  
**Priority:** CRITICAL operational safety

---

## Problem (M1.6G audit finding)

When `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` was omitted, `activateEnterpriseFormularyPilotTrancheA()` defaulted to **all 12** Tranche A medications. That is unsafe for healthcare activation workflows.

```typescript
// OLD (unsafe)
const requestedCodes =
  options.catalogCodes?.map(...).filter(Boolean) ??
  modules.getEnterpriseFormularyPilotTrancheAEligibleCodes(); // all 12
```

---

## New behavior (fail-closed)

If catalog codes are **undefined**, **empty**, **whitespace-only**, **empty CSV**, **duplicate**, **unknown**, **non–Tranche-A**, or **>15**, activation **throws immediately** with `EnterpriseFormularyPilotActivationError`.

- No DB writes
- No activation markers
- No governance note changes
- No partial execution
- Applies to **dry-run and live** activation equally

```typescript
// NEW (fail-closed)
const requestedCodes = validateEnterprisePilotCatalogCodeRequest(options.catalogCodes, {
  trancheByCode: eligibleByCode,
});
```

---

## Validation rules

| Input | Result |
|-------|--------|
| Env var unset (`undefined`) | **FAIL** |
| `catalogCodes: []` | **FAIL** |
| `""`, `"   "`, `",,"` CSV | **FAIL** |
| Unknown code | **FAIL** |
| Duplicate code | **FAIL** |
| >15 codes | **FAIL** |
| Single valid Tranche A code | **PASS** |

---

## Operational examples

### Must FAIL (no codes)

```bash
MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Must PASS (explicit code — use dry-run first in staging)

```bash
MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
MEDORA_ENTERPRISE_PILOT_NOTE="M1.6G.1 validation dry-run" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Remove `MEDORA_ENTERPRISE_PILOT_DRY_RUN=1` only after pharmacy sign-off.

---

## Code locations

| File | Change |
|------|--------|
| `seed-enterprise-formulary-pilot-activation.ts` | `validateEnterprisePilotCatalogCodeRequest`, `parseEnterprisePilotCatalogCodesFromEnv` |
| `seed-catalogs.ts` | Pass through env parse; no silent default |
| `enterprise-formulary-pilot-activation.spec.ts` | Fail-closed test suite |

---

## Rationale

Production medication activation must **fail closed**: missing operator intent must never expand into bulk activation. Explicit catalog codes are mandatory for every pilot run.
