# EnterpriseDeploymentReadinessReport — Diagnostic Intelligence (Phase 19)

Structured deployment readiness assessment for Diagnostic Intelligence enterprise certification. Separates **code readiness** (certified in repo) from **deployment** (not performed in Phase 19).

**Report date:** 2026-07-17
**ICD release:** FY2026 (official CDC artifact)
**Phase:** 19 — enterprise certification scaffolding

---

## Executive summary

| Area | Verdict |
|------|---------|
| **Code readiness** | **PASS** |
| **Official ICD certification** | **PASS** (against FY2026 artifact) |
| **Deployment** | **NOT PERFORMED** |
| **Operational configuration** | **NOT VERIFIED** |
| **Legal configuration** | **NOT VERIFIED** |

Phase 19 delivers certifiers, governance hashes, documentation, and JSON summary artifacts. It does **not** deploy to staging or production, configure facility crisis numbers, or satisfy legal review.

---

## Code readiness — PASS

### Template governance

| Check | Result |
|-------|--------|
| Visible templates | 172 |
| Inventoried adaptive templates | 59 |
| Phase 19 new templates | 0 |
| Duplicate template IDs | 0 |
| BATCH29 absent | Confirmed |

### ICD enterprise union

| Check | Result |
|-------|--------|
| Scoped unique billable codes | 26,371 |
| Present in Medora catalog | 26,371 |
| Missing codes | 0 |
| Ownership probes | 13/13 pass |
| Discharge routing probes | 15/15 pass |
| Enterprise search probes | ~70/70 pass |

### Clinical safety scans

| Scan | Result |
|------|--------|
| Record separation (no auto-order in intel) | PASS |
| MDM safety (no LLM generators in intel) | PASS |
| Red-flag advisory-only smoke | PASS |
| Composite guidance module presence | PASS |
| Summary/print adapter files | PASS |
| EN/FR i18n parity (sample namespaces) | PASS |

### Governance

| Check | Result |
|-------|--------|
| Enterprise certifier file count | ≥13 |
| Discharge registry hash EN | `8a5f13e2…` stable |
| Discharge registry hash FR | `dec2ec8b…` stable |

**Evidence paths:**

- `apps/api/prisma/icd/certification-summaries/2026/fy2026-enterprise-*.json`
- `apps/web/src/features/emergency/enterpriseDiagnosticIntelligenceCertification.test.ts`
- `apps/web/src/features/emergency/edDisposition19Y.test.ts`

---

## Deployment — NOT PERFORMED

The following were **not** executed in Phase 19:

- [ ] Staging environment deploy
- [ ] Production environment deploy
- [ ] Post-deploy smoke in live UI
- [ ] Load test under clinic concurrency
- [ ] Monitoring/alerting baseline

**Implication:** Code readiness PASS does not imply production go-live approval.

---

## Operational configuration — NOT VERIFIED

Cannot be confirmed from repository:

- Facility crisis/emergency phone numbers (911 copy in discharge text)
- Behavioral health hold statutes and workflow
- Staff training and template selection policy
- Feature flag rollout plan for condition-family resolver

**Required before Haiti pilot go-live** (see `diagnostic-intelligence-production-readiness-checklist.md`).

---

## Legal configuration — NOT VERIFIED

Cannot be confirmed from repository:

- Discharge suggested text legal review (EN/FR)
- Consent/refusal policy alignment
- Jurisdiction-specific reporting obligations

---

## Data prerequisites for future deploy

When deployment is authorized:

1. Import **official** FY2026 ZIP only:

   ```bash
   pnpm --filter @medora/api icd:import -- \
     --file=apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip \
     --release=2026
   ```

2. **Do not** use `prisma db seed` or DEV-SAMPLE as certification substitute.

3. Re-run enterprise certifier sequence and confirm JSON summaries before promoting build.

4. Run web enterprise test smoke suite.

---

## Rollback strategy (future deploy)

- **Routing regression:** Keep `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER=false`; revert registry/resolver commit.
- **ICD catalog issue:** Re-import official FY2026 artifact; do not partial-edit catalog rows manually.
- **Discharge text regression:** Revert registry change; restore governance hash constants in tests if text revert is complete.

Existing discharge cards retain creation-time snapshots — deploy rollback does not rewrite historical cards.

---

## Known limitations pointer

Full list: `diagnostic-intelligence-known-limitations.md`

Critical pilot items:

- 911 crisis copy localization
- 5150/302 parse-only (no hold engine)
- Legacy/adaptive overlap (~27)
- Condition-family resolver off by default

---

## Sign-off block

| Stakeholder | Code readiness | Deploy approval |
|-------------|----------------|-----------------|
| Engineering | PASS (Phase 19) | Pending staging deploy |
| Clinical content | PASS (certifier probes) | Pending text review |
| Operations | n/a | NOT VERIFIED |
| Legal | n/a | NOT VERIFIED |

**Overall deployment readiness:** **NOT READY FOR PRODUCTION DEPLOY** — code certified; facility ops/legal/deploy steps remain.
