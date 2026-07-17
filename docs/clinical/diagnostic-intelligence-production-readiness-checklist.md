# Phase 19 — Diagnostic Intelligence Production Readiness Checklist

Checklist for promoting **Diagnostic Intelligence enterprise certification** from code-complete to clinic-operational. Phase 19 certifies **code and official ICD data alignment** only; it does **not** deploy or legally configure a facility.

Legend:

- **[x]** — verifiable from repo / CI in Phase 19
- **[ ]** — not complete or not verifiable from repo alone
- **NO** — explicitly out of scope for Phase 19 (cannot sign off from repository)

---

## Readiness dimensions

| Dimension | Status | Notes |
|-----------|--------|-------|
| **Code-complete** | **[x]** | Enterprise certifiers, registry, 172 visible templates, 17 specialty phases, governance scaffolding |
| **Test-complete** | **[x]** | Enterprise web certification tests + per-specialty `*EnterpriseClinicalContent.test.ts` suites; `edDisposition19Y` hash gates |
| **Official-data certified** | **[x]** | FY2026 CDC artifact; enterprise coverage 26,371/26,371 present; ownership/routing/search probes pass |
| **Operationally configured** | **NO** | Crisis numbers, hold statutes, facility hotlines — not verifiable from repo |
| **Legally configured** | **NO** | Consent, hold law, chart retention policy — facility/legal counsel |
| **Deployment verified** | **NO** | Phase 19 does not deploy |
| **Post-deployment monitored** | **NO** | No production telemetry baseline in Phase 19 |

---

## Code-complete [x]

- [x] 172 visible provider documentation templates (`ENTERPRISE_DIAGNOSTIC_GOVERNANCE_COUNTS.visibleTemplates`)
- [x] 59 inventoried adaptive templates (injury + BATCH22–28)
- [x] 0 Phase 19 new templates (`phase19NewTemplates: 0`)
- [x] 17 specialty phases in `enterprise-diagnostic-intelligence-registry.ts`
- [x] Enterprise certifier scripts in `apps/api/package.json` (coverage, ownership, routing, search, clinical governance)
- [x] Discharge registry centralized; EN/FR governance hashes pinned in `edDisposition19Y.test.ts`
- [x] Record-separation scan (no auto-order APIs in clinical intelligence)
- [x] MDM safety scan (no LLM auto-generators in production intel modules)

---

## Test-complete [x]

- [x] `enterpriseDiagnosticIntelligenceCertification.test.ts` — template counts, ownership regressions, red-flag advisory smoke, immutability
- [x] `enterpriseCompositeGuidanceCertification.test.ts` — multi-diagnosis deduplication
- [x] `providerDischargeEnterpriseCertification.test.ts` — discharge routing governance
- [x] Per-specialty enterprise clinical content tests (17 injury/specialty suites under `apps/web/src/features/emergency/`)
- [x] Full matrix indexed in `fy2026-enterprise-test-matrix.json`

**Run:**

```bash
pnpm --filter @medora/web exec vitest run \
  src/features/emergency/enterpriseDiagnosticIntelligenceCertification.test.ts \
  src/features/emergency/enterpriseCompositeGuidanceCertification.test.ts \
  src/features/emergency/providerDischargeEnterpriseCertification.test.ts
```

Optional broader sweep:

```bash
pnpm --filter @medora/web exec vitest run src/features/emergency/*Enterprise*.test.ts
```

---

## Official-data certified [x]

Prerequisites:

- Official artifact at `apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip`
- **Never** certify against `FY2026-MEDORA-DEV-SAMPLE`

- [x] `icd:validate` passes against FY2026 manifest checksums
- [x] `fy2026-enterprise-coverage-summary.json` → `certification.pass: true`, `missingCodes: []`
- [x] `fy2026-enterprise-ownership-summary.json` → 13/13 probes pass
- [x] `fy2026-enterprise-routing-summary.json` → 15/15 probes pass
- [x] Enterprise search/ranking/uniqueness summaries → `pass: true`

**Smoke commands:**

```bash
OFFICIAL=apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip

pnpm --filter @medora/api icd:validate -- --file=$OFFICIAL --release=2026

pnpm --filter @medora/api icd:coverage:enterprise-diagnostic-intelligence -- \
  --file=$OFFICIAL --release=2026 --write-reports

pnpm --filter @medora/api icd:ownership:enterprise-diagnostic-intelligence -- \
  --file=$OFFICIAL --release=2026 --write-reports

pnpm --filter @medora/api icd:routing:enterprise-diagnostic-intelligence -- \
  --file=$OFFICIAL --release=2026 --write-reports

pnpm --filter @medora/api icd:search:enterprise-diagnostic-intelligence --write-reports
```

---

## Operationally configured — NO (not verifiable from repo)

Facility must configure before Haiti pilot go-live:

- [ ] Crisis/emergency phone numbers localized (replace hash-governed **911** references where inappropriate)
- [ ] Behavioral health hold workflow (5150/302 tokens are **parse-only** in code)
- [ ] Staff training on adaptive vs legacy template selection
- [ ] Decision on `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER` rollout (default **off**)

**Cannot mark complete from repository alone.**

---

## Legally configured — NO (not verifiable from repo)

- [ ] Facility legal review of discharge suggested text (EN/FR)
- [ ] Consent/refusal documentation policy alignment
- [ ] Jurisdiction-specific hold and reporting requirements

**Cannot mark complete from repository alone.**

---

## Deployment verified — NO (Phase 19 does not deploy)

Phase 19 produces certification artifacts and documentation only.

- [ ] Staging deploy with official ICD catalog imported
- [ ] Smoke test in staging UI (template pick, discharge card materialization, print layout)
- [ ] Production deploy checklist (separate ops runbook)

---

## Post-deployment monitored — NO

- [ ] Error rate / latency baseline for ICD search
- [ ] Discharge template resolution audit sampling
- [ ] Clinician feedback loop on adaptive templates

---

## Explicit non-requirements for Phase 19 certification

| Item | Phase 19 stance |
|------|-----------------|
| **Database seed** | **NO** — enterprise certifiers read catalog + static analysis; do not require `prisma db seed` |
| **New migration** | **NO** — Phase 19 certification does not introduce schema changes |
| **DEV-SAMPLE ICD** | **Prohibited** for certification (`--allow-dev-sample` is local demo only) |

---

## Rollback notes

If a certification regression is discovered **after** merge but **before** deploy:

1. Revert the offending commit(s) affecting registry, scope selectors, or certifier probes.
2. Re-run enterprise certifier sequence (see `diagnostic-intelligence-enterprise-certification.md`).
3. Confirm `fy2026-enterprise-*-summary.json` artifacts return to `pass: true`.
4. Confirm EN/FR governance hashes in `edDisposition19Y.test.ts` — update hash constants **only** if discharge text change was intentional.

If deployed to staging with bad routing:

1. Disable `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER` if enabled (revert to registry path).
2. Do **not** drop ICD catalog tables; re-import official FY2026 ZIP if catalog corruption suspected.
3. Discharge cards already materialized retain creation snapshots — no automatic rewrite.

---

## Sign-off template

| Role | Code / tests / ICD | Ops / legal / deploy |
|------|--------------------|----------------------|
| Engineering | [x] Phase 19 complete | [ ] staging verified |
| Clinical content | [x] certifier probes | [ ] discharge text reviewed |
| Facility ops | n/a | [ ] crisis numbers + holds |
| Legal | n/a | [ ] jurisdiction review |

For deployment readiness narrative, see `diagnostic-intelligence-deployment-readiness.md`.

For honest scope limits, see `diagnostic-intelligence-known-limitations.md`.
