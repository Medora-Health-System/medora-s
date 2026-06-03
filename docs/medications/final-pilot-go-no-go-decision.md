# M1.6H — Final Enterprise Pilot Go / No-Go Decision

**Date:** 2026-06-03  
**Phase:** M1.6H final activation readiness (audit + decision only)  
**Environment audited:** Railway staging (`switchyard.proxy.rlwy.net`)

---

## Executive decision

| Decision | Value |
|----------|-------|
| **Final verdict** | **GO — FIRST STAGING PILOT ACTIVATION APPROVED** |
| **Production pilot planning** | **CONDITIONAL GO** — after staging single-med UAT + pharmacy sign-off |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |
| **Migration required** | **NO** |
| **Seed required (ops only)** | **YES** — activation/rollback via `prisma:seed-catalogs` flags |

**No CRITICAL risks remain** when runbook controls are followed (fail-closed catalog codes, rollback wired, staging repaired).

---

## Part 1 — Final staging state audit (Railway, read-only SQL)

| Metric | Expected | Actual | Status |
|--------|--------|--------|--------|
| Enterprise Wave 1 markers | 45 | **45** | PASS |
| Enterprise Wave 2 markers | 89 | **89** | PASS |
| Total enterprise markers | 134 | **134** | PASS |
| Tranche A products present | 12 | **12** | PASS |
| Pilot markers (`ENTERPRISE_M16F_TRANCHE_A_PILOT`) | 0 | **0** | PASS |
| Active enterprise products | 0 | **0** | PASS |
| Enterprise `orderSearchEnabled=true` (runtime JSON) | 0 | **0** | PASS |
| Enterprise `billingEnabled=true` (runtime JSON) | 0 | **0** | PASS |
| Enterprise billing profiles | 134 | **134** | PASS |
| Billing `requiresManualReview=true` | 134 | **134** | PASS |
| Billing `requiresManualReview=false` | 0 | **0** | PASS |
| Enterprise catalogs with aliases | 134 | **134** | PASS |

**Amlodipine spot check:** `isActive=false`, `governanceStatus=REVIEW_REQUIRED`, no pilot marker, `orderSearchEnabled=false` in runtime block.

**Note:** A global count of `orderSearchEnabled=true` across *all* `MedicationProduct` rows may include non-enterprise Haiti canonical rows (29 observed). **Enterprise-scoped count is 0** — correct for this pilot.

---

## Part 2 — Activation path recheck (code + tests)

| Check | Result |
|-------|--------|
| Single-med dry-run | **PASS** — `MEDORA_ENTERPRISE_PILOT_DRY_RUN=1` |
| Single-med live activation | **PASS** — validated in M1.6H drill; staging currently 0 active |
| Already-active re-run idempotent | **PASS** — `alreadyActivated` counter; no duplicate writes |
| No activation without explicit catalog code | **PASS** — M1.6G.1 fail-closed |
| Duplicate codes rejected | **PASS** — unit tests |
| Non–Tranche-A code rejected | **PASS** — unit tests |
| Cannot activate more than requested | **PASS** — explicit code list only; bulk >15 refused |

**Test evidence:** `enterprise-formulary-pilot-activation.spec.ts` — 19 tests passing.

---

## Part 3 — Rollback path recheck (code + tests + staging drill)

| Check | Result |
|-------|--------|
| Rollback dry-run | **PASS** — M1.6H.1 wired; staging drill |
| Rollback live | **PASS** — staging repair completed |
| Removes pilot marker | **PASS** |
| `isActive=false` | **PASS** |
| `governanceStatus=REVIEW_REQUIRED` | **PASS** |
| Clears runtime activation payload | **PASS** — `stripRuntimeActivationBlock` + merge |
| Idempotent second rollback | **PASS** — unit test |
| Fail-closed wrong code with markers remain | **PASS** — throws `EnterpriseFormularyPilotActivationError` |

---

## Part 4 — Billing go/no-go

| Check | Result |
|-------|--------|
| Billing profiles exist (134) | **PASS** |
| Manual review remains true (134/134) | **PASS** |
| `billingEnabled` false on enterprise products | **PASS** |
| Activation does not enable billing | **PASS** — seed sets `billingEnabled: false` |
| No charge/claims path in pilot seed | **PASS** — no billing engine changes |

**Billing decision:** **GO**

---

## Part 5 — Governance go/no-go

| Check | Result |
|-------|--------|
| Controlled / high-alert / psych excluded from Tranche A | **PASS** — manifest classification |
| Tranche A = 12 low-risk chronic oral (Wave 1) | **PASS** |
| Safety profiles on chain | **PASS** — validation blocks missing chain |
| Pilot note supported | **PASS** — `MEDORA_ENTERPRISE_PILOT_NOTE` |
| `activatedBy` in note | **PASS** — `MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY` (operational **required**; not code-enforced) |
| Audit documentation | **PASS** — runbooks + this decision doc |

**Governance decision:** **GO (conditional)** — operator must set `MEDORA_ENTERPRISE_PILOT_NOTE` and `MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY` on every live run.

---

## Part 6 — Search go/no-go

| Check | Result |
|-------|--------|
| Provider search cutover deferred (M1.5F) | **PASS** |
| Enterprise `orderSearchEnabled=false` | **PASS** (0 enterprise rows true) |
| Non-pilot products unchanged by pilot seed | **PASS** — explicit catalog codes only |
| Aliases stable (134 enterprise) | **PASS** |
| No duplicate search row creation in pilot path | **PASS** — activation does not insert aliases |

**Search decision:** **GO**

---

## Part 7 — Operational go/no-go

| Check | Result |
|-------|--------|
| Railway backup / snapshot before live ops | **CONDITIONAL** — operator must confirm Railway backup or manual snapshot |
| Dry-run before live activation | **PASS** — documented mandatory |
| One medication at a time | **PASS** — single code in env |
| Explicit catalog code required | **PASS** — fail-closed |
| Pharmacy sign-off | **CONDITIONAL** — human gate before live |
| Rollback command documented | **PASS** — `final-pilot-rollback-runbook.md` |
| Post-activation / post-rollback SQL | **PASS** — in runbooks |
| Operator identity | **CONDITIONAL** — `MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY` required in runbook |

**Operational decision:** **GO (conditional)**

---

## Part 8 — Final risk register summary

See `final-pilot-risk-register.md`. **No open CRITICAL** risks when M1.6G.1 + M1.6H.1 controls and runbook are used.

---

## Part 9 — First medication & command sequence

**Recommended first medication:** `AMLODIPINE_5_MG_COMPRIME_ORAL` (lowest-complexity Tranche A antihypertensive; validated in drills).

### Staging activation (after pharmacy sign-off)

```bash
# 1) Dry-run
DATABASE_URL="<railway-staging-url>" \
MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
MEDORA_ENTERPRISE_PILOT_NOTE="M1.6H staging pilot — amlodipine dry-run" \
MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY="<operator-id>" \
pnpm --filter @medora/api run prisma:seed-catalogs

# 2) Live (only if dry-run requested=1, activated=1, SQL pre-check OK)
DATABASE_URL="<railway-staging-url>" \
MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
MEDORA_ENTERPRISE_PILOT_NOTE="M1.6H staging pilot — amlodipine live" \
MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY="<operator-id>" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

### Rollback (if needed)

See `final-pilot-rollback-runbook.md`.

---

## Conditional requirements (must all be true for live staging activation)

1. Pharmacy / clinical lead sign-off recorded.
2. `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` set to **one** Tranche A code.
3. Dry-run completed immediately before live run.
4. `MEDORA_ENTERPRISE_PILOT_NOTE` and `MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY` set.
5. Post-activation SQL verification passes.
6. **Do not** enable `MEDORA_ENTERPRISE_PILOT_ROLLBACK` and activation flags together.
7. **Do not** bulk-activate; **do not** enable billing or provider search.

---

## Build validation (2026-06-03)

| Command | Result |
|---------|--------|
| `pnpm --filter @medora/api exec prisma validate` | PASS |
| `pnpm --filter @medora/api run build` | PASS |
| `pnpm verify:web` | PASS |

---

## Sign-off

| Role | Staging first pilot | Production planning |
|------|---------------------|---------------------|
| Engineering | **GO** | **Conditional** after staging UAT |
| Pharmacy / clinical | **Pending sign-off** | **Not yet** |
