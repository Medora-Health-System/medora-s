# Phase 19 — Diagnostic Intelligence Enterprise Certification

Practical reference for certifying Medora-S **Diagnostic Intelligence**: adaptive complaint templates (BATCH22–28 + injury adaptive), legacy complaint shells, shared clinical foundations, documentation engines, discharge condition families, and FY2026 ICD-10-CM ownership/routing/search.

**Scope:** Code-complete enterprise certification scaffolding (Phase 19). **Not** a production deployment record. Operational and legal readiness are tracked separately in `diagnostic-intelligence-production-readiness-checklist.md`.

---

## Architecture overview

Diagnostic Intelligence is a **documentation-advisory** layer. It helps clinicians document ED encounters with click-to-insert complaint intelligence, red-flag prompts, composite discharge guidance, and ICD-aware discharge templates. It does **not** autonomously diagnose, order medications, place procedures, or submit consults.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Provider documentation workspace (172 visible templates)               │
│  ├─ Legacy complaint shells (preserved for saved-note reachability)     │
│  └─ Adaptive specialty templates (BATCH22–28 + injury MSK adaptive)   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 Complaint intelligence    Red-flag engines      Composite discharge
 (click-to-insert chips)   (advisory prompts)    guidance composers
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
              Discharge condition families + template registry
              (ICD routing → suggested discharge text EN/FR)
                                │
                                ▼
              Enterprise ICD certifiers (coverage, ownership,
              routing, search ranking/uniqueness)
```

### Template layers

| Layer | Count (Phase 19) | Location / notes |
|-------|------------------|------------------|
| **Total visible templates** | **172** | `PROVIDER_DOCUMENTATION_TEMPLATES` in `apps/web/src/lib/providerDocumentationModel.ts` |
| **Inventoried adaptive templates** | **59** | Injury MSK adaptive (29) + BATCH22–28 specialty (30) — see `enterprise-template-inventory-data.ts` |
| **Phase 19 new templates** | **0** | Governance gate: `PHASE_19_NEW_TEMPLATE_IDS` must stay empty |
| **Legacy complaint shells** | remainder of 172 | Preserved for historical note compatibility; overlap with adaptive purpose is intentional (~27 pairs) |

**Adaptive batches:**

- **Injury MSK adaptive** — back/neck/shoulder/knee/ankle/hip/hand, fall, head injury, laceration, bites, fracture/dislocation/sprain, tendon/ligament, crush/amputation/FB, burn, penetrating/blast, spine, head/facial, eye (29 templates).
- **BATCH22** (Phase 12 ENT) — ear/vertigo, epistaxis, throat/airway (3).
- **BATCH23** (Phase 13 soft tissue/wound infection) — STI, abscess, high-risk wound (3).
- **BATCH24** (Phase 14 dermatology) — rash, allergic/inflammatory, vesicular/bullous, dermatologic emergency (4).
- **BATCH25** (Phase 15 environmental) — heat, cold, submersion/electrical/lightning, altitude/diving/radiation (4).
- **BATCH26** (Phase 16 toxicology) — ingestion/overdose, intoxication/withdrawal, inhaled/industrial, envenomation (4).
- **BATCH27** (Phase 17 OB/GYN urology) — early/late pregnancy, hypertensive/postpartum, gynecologic, renal/urinary, scrotal/penile (6).
- **BATCH28** (Phase 18 psychiatric/behavioral) — suicide/self-harm, psychosis/mania, depression/anxiety/trauma, delirium/catatonia/cognitive change, pediatric developmental/behavioral, capacity/refusal/safety disposition (6).

### Shared foundations

Reusable clinical scaffolding modules (not complaint-specific engines):

| Module | Purpose |
|--------|---------|
| `behavioralHealthFoundation.ts` | Legal-status token parsing (5150/302 recognition only) |
| `dermatologyMorphologyFoundation.ts` | Standard dermatologic morphology terms |
| `environmentalExposureFoundation.ts` | Environmental exposure documentation scaffolding |
| `glasgowComaScaleFoundation.ts` | GCS structured documentation |
| `ocularExamFoundation.ts` | Ocular exam documentation scaffolding |
| `reproductiveGuFoundation.ts` | Reproductive/GU documentation scaffolding |
| `spineAsiaIsncsciFoundation.ts` | Spine ASIA/ISNCSCI documentation scaffolding |
| `toxicExposureFoundation.ts` | Toxic exposure documentation scaffolding |

### Engines (representative)

Each specialty phase adds `*ClinicalIntelligence.ts` modules and often a matching `*RedFlagEngine.ts`. Engines emit **click-to-insert chips** and **advisory red-flag categories/prompts** only. Gold-standard builders live in `*IntelGoldStandard.ts` files under `apps/web/src/lib/`.

Master enterprise index: `apps/api/prisma/icd/enterprise-diagnostic-intelligence-registry.ts` — 17 specialty phases, scope selectors, ownership priority, certifier paths, summary file names.

### Discharge families

- **Definitions:** `providerDischargeConditionFamilies.ts` (+ domain extensions).
- **Resolver:** `providerDischargeConditionFamilyResolver.ts` — gated by `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER` (default **off**; registry resolution remains production path when flag is off).
- **Template registry:** `providerDischargeTemplateRegistry.ts` — all suggested discharge text (EN/FR); hash-governed.
- **Enterprise prefix map:** `enterprise-discharge-routing-map.ts` — consolidated ICD prefix → discharge family routing for certifiers.

### ICD certifiers

Two tiers:

1. **Per-specialty** — `icd:coverage:*` and `icd:routing:*` for each of 17 phases (plus `icd:search` / `icd:search:uniqueness` globally).
2. **Enterprise rollup** — union coverage, cross-specialty ownership, discharge routing probes, curated search probes (~70), template inventory, clinical governance scans.

---

## Official ICD-10-CM source (FY2026)

**Production certification must use the official CDC/NCHS artifact only.**

| Field | Value |
|-------|-------|
| **Canonical cache path** | `apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip` |
| **Release** | **FY2026** (effective 2025-10-01) |
| **Manifest** | `apps/api/prisma/icd/icd10-cm-release-manifest.ts` → `ICD10_CM_FY2026_MANIFEST` |
| **Expected billable rows** | 74,719 (official order file) |
| **Enterprise scoped union** | 26,371 unique billable codes across 17 specialties |

### DEV-SAMPLE prohibition

`FY2026-MEDORA-DEV-SAMPLE` exists for local demo only. Validators reject it unless `--allow-dev-sample` is passed. **Never** use DEV-SAMPLE for enterprise certification, production import, or readiness sign-off.

```bash
# Validate official artifact (no DB writes)
pnpm --filter @medora/api icd:validate -- \
  --file=apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip \
  --release=2026
```

Import (operator command, not seed):

```bash
pnpm --filter @medora/api icd:import -- \
  --file=apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip \
  --release=2026
```

---

## Certification commands

Run from repo root. Add `--write-reports` where supported to refresh JSON under `apps/api/prisma/icd/certification-summaries/2026/`.

### Enterprise rollup (Phase 19)

```bash
OFFICIAL=apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip

pnpm --filter @medora/api icd:coverage:enterprise-diagnostic-intelligence -- \
  --file=$OFFICIAL --release=2026 --write-reports

pnpm --filter @medora/api icd:ownership:enterprise-diagnostic-intelligence -- \
  --file=$OFFICIAL --release=2026 --write-reports

pnpm --filter @medora/api icd:routing:enterprise-diagnostic-intelligence -- \
  --file=$OFFICIAL --release=2026 --write-reports

pnpm --filter @medora/api icd:search:enterprise-diagnostic-intelligence --write-reports
pnpm --filter @medora/api icd:search:enterprise-ranking --write-reports
pnpm --filter @medora/api icd:search:enterprise-uniqueness --write-reports

pnpm --filter @medora/api clinical:templates:enterprise-certify --write-reports
pnpm --filter @medora/api clinical:composite-guidance:enterprise-certify
pnpm --filter @medora/api clinical:discharge:enterprise-certify --write-reports
pnpm --filter @medora/api clinical:mdm:enterprise-certify
pnpm --filter @medora/api clinical:record-separation:enterprise-certify
pnpm --filter @medora/api clinical:i18n:enterprise-certify
pnpm --filter @medora/api clinical:summary-print:enterprise-certify
pnpm --filter @medora/api clinical:governance:enterprise-reconcile --write-reports
```

### Per-specialty ICD certifiers (Phase 5–18)

Each specialty has paired coverage and routing scripts. Example pattern:

```bash
pnpm --filter @medora/api icd:coverage:psychiatric-behavioral
pnpm --filter @medora/api icd:routing:psychiatric-behavioral
```

Full list from `apps/api/package.json`:

| Coverage | Routing |
|----------|---------|
| `icd:coverage` (tendon/ligament) | `icd:routing` |
| `icd:coverage:crush-amp-fb` | `icd:routing:crush-amp-fb` |
| `icd:coverage:burns` | `icd:routing:burns` |
| `icd:coverage:penetrating-trauma` | `icd:routing:penetrating-trauma` |
| `icd:coverage:human-bite` | `icd:routing:human-bite` |
| `icd:coverage:bites-contaminated-wounds` | `icd:routing:bites-contaminated-wounds` |
| `icd:coverage:blast-polytrauma` | `icd:routing:blast-polytrauma` |
| `icd:coverage:spine-back` | `icd:routing:spine-back` |
| `icd:coverage:head-facial-trauma` | `icd:routing:head-facial-trauma` |
| `icd:coverage:eye-emergencies` | `icd:routing:eye-emergencies` |
| `icd:coverage:ent-emergencies` | `icd:routing:ent-emergencies` |
| `icd:coverage:soft-tissue-wound-infections` | `icd:routing:soft-tissue-wound-infections` |
| `icd:coverage:dermatology` | `icd:routing:dermatology` |
| `icd:coverage:environmental-exposure` | `icd:routing:environmental-exposure` |
| `icd:coverage:toxicology-envenomation` | `icd:routing:toxicology-envenomation` |
| `icd:coverage:obgyn-urology` | `icd:routing:obgyn-urology` |
| `icd:coverage:psychiatric-behavioral` | `icd:routing:psychiatric-behavioral` |

Global search (broader than enterprise curated probe set):

```bash
pnpm --filter @medora/api icd:search
pnpm --filter @medora/api icd:search:uniqueness
```

### Web test smoke (enterprise)

```bash
pnpm --filter @medora/web exec vitest run \
  src/features/emergency/enterpriseDiagnosticIntelligenceCertification.test.ts \
  src/features/emergency/enterpriseCompositeGuidanceCertification.test.ts \
  src/features/emergency/providerDischargeEnterpriseCertification.test.ts
```

---

## Ownership model and routing priority

### ICD primary ownership (enterprise union)

When a billable code appears in multiple specialty scopes, **first match in `ENTERPRISE_OWNERSHIP_PRIORITY` wins**:

1. `toxicology_envenomation`
2. `soft_tissue_wound_infections`
3. `human_bite_high_risk_wound`
4. `bites_contaminated_wounds`
5. `blast_polytrauma`
6. `penetrating_trauma`
7. `burn`
8. `crush_amputation_foreign_body`
9. `tendon_ligament`
10. `head_facial_trauma`
11. `spine_back`
12. `eye_emergencies`
13. `ent_emergencies`
14. `dermatology`
15. `environmental_exposure`
16. `obgyn_urology`
17. `psychiatric_behavioral`

Certified by `icd:ownership:enterprise-diagnostic-intelligence` (13 regression probes, e.g. Fournier → soft tissue, N20 → OB/uro, F05 → psych delirium, T58 → tox before env).

### Discharge template resolution (production registry)

`resolveProviderDischargeTemplateForDiagnosis` priority:

1. **Explicit code** (`icdExact`)
2. **Family prefix** (`icdFamily` — longest matching prefix)
3. **Keyword / symptom label** (`keyword` — longest token match in display name)
4. **Generic** fallback template

Documented shorthand: **explicit code > family > alias > keyword > symptom > generic**, where *alias* maps to prefix/family routing entries and *symptom* maps to keyword-style symptom templates (e.g. `*_symptoms_v1` entries in the registry).

### Condition-family resolver (feature-flagged)

When `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER=true`:

1. **icdExact** — with deterministic tie-break: **READY > specificity > icdExactOwnerPriority > family id**
2. **icdPrefix** — longest prefix wins
3. **keyword** — longest keyword wins (never overrides an existing ICD match)
4. **generic**

Default production: flag is **false**; registry path above remains authoritative unless operations explicitly enable the resolver.

---

## Search ranking and uniqueness

| Mode | Script | Probe count | Purpose |
|------|--------|-------------|---------|
| **Search** | `icd:search:enterprise-diagnostic-intelligence` | ~70 curated EN/FR queries | Top-result presence, prefix/description checks across enterprise specialties |
| **Ranking** | `icd:search:enterprise-ranking` | 10 queries | Expected ICD prefix appears in top 3 |
| **Uniqueness** | `icd:search:enterprise-uniqueness` | 10 queries | No duplicate ICD codes in result pages |
| **Broad coverage** | `icd:search` | full specialty probe sets | Superset validation beyond enterprise curated set |

Artifacts: `fy2026-enterprise-search-summary.json`, `fy2026-enterprise-search-ranking-summary.json`, `fy2026-enterprise-search-uniqueness-summary.json`.

---

## Template governance (Phase 19)

- **No new visible templates** in Phase 19 (`phase19NewTemplates: 0`).
- Template inventory certifies the **59 adaptive specialty templates** and asserts `totalVisibleTemplates: 172`.
- Duplicate template IDs in catalog → certifier failure.
- Every inventoried adaptive ID must appear in complaint-intelligence source files.
- **Not every legacy template** has a dedicated enterprise ICD/search probe; legacy shells remain for reachability, not full enterprise re-certification per template.

---

## Red-flag, discharge, and composite guidance behavior

### Red-flag engines

- **Advisory only** — return `{ categories, prompts }`; no order payloads, no auto-diagnosis.
- Specialty engines: e.g. `psychiatricBehavioralRedFlagEngine`, `softTissueWoundInfectionRedFlagEngine`, `entEmergencyRedFlagEngine`, `environmentalExposureRedFlagEngine`, `obGynUrologyRedFlagEngine`, `dermatologicEmergencyRedFlagEngine`, `toxicologyToxidromeRedFlagEngine`, spine/head/eye trauma engines.
- Validated in `enterpriseDiagnosticIntelligenceCertification.test.ts` (no `createOrder` / medication order strings in JSON output).

### Discharge

- Suggested text centralized in `providerDischargeTemplateRegistry.ts` (not React components).
- **98** unique discharge families in enterprise prefix map; **≥30** minimum gate in discharge certifier.
- Composite composers (e.g. `psychiatricBehavioralCompositeDischargeGuidance`, `obGynUrologyCompositeDischargeGuidance`) deduplicate return precautions when multiple diagnoses co-present.
- Card materialization preserves **creation-time identity**: `resolvedDiagnosisCodeAtCreation`, `resolvedDiagnosisLabelAtCreation`, `resolvedTemplateIdAtCreation`, `cardTemplateSyncVersion`.

### Composite guidance

- `clinical:composite-guidance:enterprise-certify` checks required intel modules, duplicate-key guards, and gold-standard module presence.
- Composers must not emit forbidden auto-MDM phrases (`medically cleared`, `troponin negative`, `pe ruled out`, etc.).

---

## Medication / procedure / order / consult separation

`clinical:record-separation:enterprise-certify` scans clinical intelligence modules for forbidden auto-order patterns (`createOrder`, `postOrder`, `submitOrder`, `/api/orders`, etc.). **Pass** means intelligence layers suggest documentation only; clinicians place orders through normal order workflows.

Similarly, `clinical:mdm:enterprise-certify` forbids LLM/AI MDM generators in production intel modules.

---

## Localization (EN / FR)

- Product UI: **French** for end users (see workspace rules).
- Discharge suggested text: **bilingual** EN/FR bodies in registry; hash-governed separately per locale.
- Complaint intel namespaces: paired `*.en.ts` / `*.fr.ts` under `apps/web/src/i18n/messages/`; `clinical:i18n:enterprise-certify` checks key parity for Phase 14/16/17/18 sample namespaces.
- Governance snapshot hashes (`edDisposition19Y.test.ts`):
  - **EN:** `8a5f13e2f30da5f2ddbb0fa886e110f816477c05260633fb5b674e903d74a932`
  - **FR:** `dec2ec8b4c6b568aa168e97832027f426695a9ec506d482166579d8a6c07cdb8`

Update these constants **intentionally** when registry governance content changes.

---

## Summary / print

`clinical:summary-print:enterprise-certify` verifies presence of:

- `EmergencyClinicalDataSummary.tsx`
- `encounterClinicalRecordAdapter.ts`
- `providerDischargeDocumentationSummary.ts`
- `edClinicalDataSummaryProjection.test.ts`
- `DischargePrintLayout.tsx`

Print/summary adapters project encounter documentation and discharge cards without bypassing locale or governance metadata rules.

---

## Historical safety

- Legacy complaint templates **remain visible** so saved notes and historical encounters stay reachable.
- Discharge cards store immutable creation snapshot fields; template sync version tracks registry drift.
- Condition-family resolver is **additive** and off by default to avoid silent routing changes on existing production charts.
- Residual multi-family `icdExact` claims resolve **deterministically** (READY > specificity > priority > id) — see `providerDischargeConditionFamilyResolver.ts`.

---

## How to add a new specialty safely

1. **Phase gate** — confirm specialty belongs in current clinic MVP phase; avoid speculative national/enterprise scope.
2. **Scope module** — add `icd10-<specialty>-scope.ts` with explicit billable selector.
3. **Registry entry** — append to `ENTERPRISE_SPECIALTY_PHASES` with coverage/routing script IDs and summary file names.
4. **Adaptive templates** — add BATCH IDs to complaint intelligence + `enterprise-template-inventory-data.ts`; update `TOTAL_VISIBLE_TEMPLATES` only with governance review.
5. **Engines** — clinical intelligence + red-flag engine; gold-standard builder; EN/FR i18n parity.
6. **Discharge** — condition families + registry templates + prefix entries in `enterprise-discharge-routing-map.ts`.
7. **Certifiers** — add `icd:coverage:<specialty>` and `icd:routing:<specialty>` scripts; run specialty trio (coverage, routing, search) then enterprise rollup.
8. **Tests** — add `*EnterpriseClinicalContent.test.ts` and extend enterprise certification tests.
9. **Reconcile** — `clinical:governance:enterprise-reconcile --write-reports`.

---

## How to add an alias, discharge family, or change ownership

### Alias / keyword routing

Add entries to `diagnosisMappings.keyword` or `icdFamily` on the target template in `providerDischargeTemplateRegistry.ts`. Prefer longest, most specific tokens. Re-run discharge enterprise certifier and update governance hashes if suggested text changes.

### New discharge family

1. Define family in `providerDischargeConditionFamilies.ts` (or domain extensions).
2. Add template + suggested text to registry.
3. Add prefix map entry to `enterprise-discharge-routing-map.ts`.
4. Run `clinical:discharge:enterprise-certify --write-reports` and `icd:routing:enterprise-diagnostic-intelligence --write-reports`.

### Ownership change

1. Adjust specialty scope selector (which codes belong to which phase).
2. If cross-specialty conflict, update `ENTERPRISE_OWNERSHIP_PRIORITY` order **only** with clinical review.
3. Re-run affected specialty certifiers + `icd:ownership:enterprise-diagnostic-intelligence` + enterprise coverage reconciliation.

---

## Updating to a future ICD release

1. Obtain new official CDC/NCHS Code Descriptions ZIP (never DEV-SAMPLE).
2. Add manifest entry in `icd10-cm-release-manifest.ts` with verified SHA256 checksums.
3. Cache artifact under `apps/api/prisma/data/icd10-releases/.cache/`.
4. `icd:validate` → `icd:import` against staging DB.
5. Update scope selectors if code set deltas require it.
6. Re-run **all** specialty and enterprise certifiers with `--write-reports`.
7. Refresh governance hashes and web tests that pin ICD-dependent probes.

---

## Rerunning enterprise certification (full sequence)

```bash
OFFICIAL=apps/api/prisma/data/icd10-releases/.cache/icd10cm-Code-Descriptions-2026.zip

# 1. Validate official data
pnpm --filter @medora/api icd:validate -- --file=$OFFICIAL --release=2026

# 2. Enterprise ICD rollup
pnpm --filter @medora/api icd:coverage:enterprise-diagnostic-intelligence -- --file=$OFFICIAL --release=2026 --write-reports
pnpm --filter @medora/api icd:ownership:enterprise-diagnostic-intelligence -- --file=$OFFICIAL --release=2026 --write-reports
pnpm --filter @medora/api icd:routing:enterprise-diagnostic-intelligence -- --file=$OFFICIAL --release=2026 --write-reports
pnpm --filter @medora/api icd:search:enterprise-diagnostic-intelligence --write-reports
pnpm --filter @medora/api icd:search:enterprise-ranking --write-reports
pnpm --filter @medora/api icd:search:enterprise-uniqueness --write-reports

# 3. Clinical governance
pnpm --filter @medora/api clinical:templates:enterprise-certify --write-reports
pnpm --filter @medora/api clinical:composite-guidance:enterprise-certify
pnpm --filter @medora/api clinical:discharge:enterprise-certify --write-reports
pnpm --filter @medora/api clinical:mdm:enterprise-certify
pnpm --filter @medora/api clinical:record-separation:enterprise-certify
pnpm --filter @medora/api clinical:i18n:enterprise-certify
pnpm --filter @medora/api clinical:summary-print:enterprise-certify
pnpm --filter @medora/api clinical:governance:enterprise-reconcile --write-reports

# 4. Web tests
pnpm --filter @medora/web exec vitest run src/features/emergency/enterpriseDiagnosticIntelligenceCertification.test.ts
```

Expect exit code **0** on every command. Any exit code **2** indicates certifier failure — inspect JSON `failures` arrays.

---

## Interpreting certification artifacts

Artifacts live under `apps/api/prisma/icd/certification-summaries/2026/fy2026-enterprise-*.json`.

| File | Key fields | Pass criteria |
|------|------------|---------------|
| `fy2026-enterprise-coverage-summary.json` | `enterprise.scopedUniqueBillable`, `missingCodes`, `specialtyScopedCounts` | `certification.pass: true`; 26,371 codes present in Medora |
| `fy2026-enterprise-ownership-summary.json` | `probeResults`, `conflictingPrimaryOwners` | All probes `pass: true` |
| `fy2026-enterprise-routing-summary.json` | `uniqueDischargeFamilyCount`, `probeResults` | 15/15 probes pass; ≥98 families |
| `fy2026-enterprise-search-summary.json` | `queryCount` (~70), per-query `pass` | `pass: true` |
| `fy2026-enterprise-search-ranking-summary.json` | `rankings[].expectedPrefixInTop3` | All true |
| `fy2026-enterprise-search-uniqueness-summary.json` | `duplicateIcdCodes` | 0 duplicates |
| `fy2026-enterprise-template-inventory.json` | `totalVisibleTemplates`, `phase19NewTemplates` | 172 visible; 0 new; no missing catalog entries |
| `fy2026-enterprise-template-certification-summary.json` | `inventorySha256`, `failures` | `pass: true` |
| `fy2026-enterprise-governance-summary.json` | `certifierFileHashes`, `releaseSummaryFileCount` | Certifier scaffolding present |
| `fy2026-enterprise-icd-scope-summary.json` | Per-phase scoped counts | Reconciles with specialty summaries |
| `fy2026-enterprise-specialty-reconciliation-summary.json` | Cross-specialty claim checks | No orphan claims |
| `fy2026-enterprise-red-flag-summary.json` | Advisory-only smoke metrics | See stub notes |
| `fy2026-enterprise-composite-guidance-summary.json` | Module/gold-standard checks | Composite certifier pass |
| `fy2026-enterprise-discharge-governance-summary.json` | Discharge family/module gates | Discharge certifier pass |
| `fy2026-enterprise-mdm-safety-summary.json` | Forbidden generator scan | 0 unsupported generators |
| `fy2026-enterprise-record-separation-summary.json` | Auto-order violation scan | 0 violations |
| `fy2026-enterprise-localization-summary.json` | EN/FR key parity pairs | 0 parity failures |
| `fy2026-enterprise-summary-print-summary.json` | Required adapter files | All present |
| `fy2026-enterprise-performance-summary.json` | Advisory latency notes | See performance stub |
| `fy2026-enterprise-test-matrix.json` | Test file inventory | Reference index |

---

## Known limitations

See `diagnostic-intelligence-known-limitations.md` for the full honest inventory. Summary:

- Legacy ↔ adaptive template purpose overlap (~27) — both visible by design for historical reachability.
- Condition-family resolver feature flag may be off by default.
- Residual `icdExact` multi-family claims resolved deterministically (READY > specificity > priority > id).
- US jurisdiction tokens (5150/302) parse-only; facility-configurable holds required operationally.
- Crisis "911" copy in some discharge text (hash-governed; facility localization needed for Haiti pilot).
- Enterprise search certifier uses curated probe set (~70) plus full `icd:search` for broader coverage.
- Template inventory certifies adaptive specialty set + `totalVisible=172`; not every legacy template has a dedicated enterprise probe.
- Deferred infrastructure modules (longitudinal SI, hold lifecycle, safety-plan records, fetal monitoring, etc.) are nonblocking when safe fallbacks exist.

---

## Future modules (nonblocking)

These are **not** Phase 19 certification blockers when documentation fallbacks exist:

- Longitudinal suicidality tracking infrastructure
- Legal hold lifecycle / hold timer workflows
- Structured safety-plan record entities
- Fetal monitoring device integration
- Facility-configurable crisis hotline substitution (replace hash-governed 911 copy)
- Full condition-family resolver production rollout (requires ops flag + pilot)

Label out-of-phase expansions per `phase-lock.mdc` before implementation.

---

## Related documents

- `diagnostic-intelligence-production-readiness-checklist.md` — deployment vs code-complete gates
- `diagnostic-intelligence-known-limitations.md` — EnterpriseKnownLimitationsReport
- `diagnostic-intelligence-deployment-readiness.md` — EnterpriseDeploymentReadinessReport
