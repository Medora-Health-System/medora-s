# EnterpriseKnownLimitationsReport — Diagnostic Intelligence (Phase 19)

Honest inventory of known limitations at enterprise certification time. No PHI. This document mirrors the machine-readable limitations referenced in Phase 19 certification summaries.

**Report date:** 2026-07-17
**Release:** FY2026
**Template surface:** 172 visible / 59 inventoried adaptive / 0 Phase 19 new

---

## 1. Legacy ↔ adaptive template purpose overlap (~27)

**Status:** Accepted by design
**Impact:** Clinicians may see both a legacy complaint shell and a newer adaptive template for similar presentations (e.g. injury MSK legacy builders vs `*_adult_complaint_v1` adaptive templates).

**Rationale:** Saved historical notes and encounter reachability require legacy template IDs to remain visible. Retiring legacy shells would break reopen/edit flows for existing charts.

**Mitigation:** Prefer adaptive templates for new documentation; legacy IDs documented in template catalog. Enterprise inventory certifies adaptive set only — not full deduplication of legacy overlap.

---

## 2. Condition-family resolver feature flag off by default

**Status:** Known / operational decision pending
**Flag:** `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER = false` (`providerDischargeConditionFamilyFeatureFlag.ts`)

**Impact:** Production discharge routing uses `providerDischargeTemplateRegistry` resolution unless operations explicitly enable the condition-family resolver. Resolver adds ICD-exact tie-breaking and guardrails not yet default-on.

**Mitigation:** Shadow-mode validation tests exist. Enable only after pilot qualification and ops sign-off.

---

## 3. Residual icdExact multi-family claims

**Status:** Deterministically resolved
**Impact:** Some ICD codes map to multiple condition families in definitions. Ambiguity could cause wrong discharge family if tie-break were unstable.

**Resolution order** (`providerDischargeConditionFamilyResolver.ts`):

1. Routing status: **READY** > NEEDS_REVIEW > DEFERRED_SPECIALTY_ONLY > UNSAFE_DO_NOT_MAP
2. Match specificity (dedicated exact owner / override)
3. `icdExactOwnerPriority` when set
4. Stable `family.id` lexicographic tie-break

**Example certified:** `E11.65` → `diabetes_hyperglycemia` / `hyperglycemia_v1` consistently.

---

## 4. US jurisdiction tokens (5150 / 302) — parse-only

**Status:** Documentation recognition only
**Impact:** `behavioralHealthFoundation.ts` detects hold-related tokens in free text for documentation chips. **No** legal hold workflow, timer, or statutory compliance engine is implemented.

**Operational requirement:** Haiti pilot (and any non-US site) must configure hold procedures, documentation, and reporting outside this codebase.

---

## 5. Crisis "911" copy in discharge suggested text

**Status:** Hash-governed; localization deferred
**Impact:** Some psychiatric/behavioral discharge suggested strings reference **911** (US emergency number). EN/FR registry content is hash-pinned in `edDisposition19Y.test.ts`.

**Mitigation for Haiti pilot:** Facility-configurable crisis number substitution is **future work** to avoid mass hash churn in Phase 19. Until then, clinicians may edit suggested text at discharge time.

**Governance hashes (do not change casually):**

- EN: `8a5f13e2f30da5f2ddbb0fa886e110f816477c05260633fb5b674e903d74a932`
- FR: `dec2ec8b4c6b568aa168e97832027f426695a9ec506d482166579d8a6c07cdb8`

---

## 6. Enterprise search certifier — curated probe set (~70)

**Status:** Partial by design
**Impact:** `icd:search:enterprise-diagnostic-intelligence` validates ~70 high-value EN/FR queries across specialties. It does **not** exhaust all search behavior.

**Broader coverage:** Run `pnpm --filter @medora/api icd:search` and `icd:search:uniqueness` for full specialty probe sets.

---

## 7. Template inventory vs legacy probe coverage

**Status:** Scope boundary
**Impact:** `clinical:templates:enterprise-certify` certifies:

- `totalVisibleTemplates = 172`
- `inventoriedAdaptiveTemplates = 59`
- `phase19NewTemplates = 0`

**Not certified per legacy template:** Individual enterprise ICD/search/discharge probes for every legacy complaint shell. Legacy templates remain visible for historical safety, not full enterprise re-probing.

---

## 8. Deferred infrastructure modules (nonblocking)

**Status:** Future phase / facility scope
**Impact:** The following are **not** implemented as first-class persisted workflows. Safe documentation fallbacks exist today:

| Module | Current fallback |
|--------|------------------|
| Longitudinal suicidality (SI) tracking | Encounter-level documentation + discharge precautions |
| Legal hold lifecycle / timers | Parse-only 5150/302 tokens; manual workflow |
| Structured safety-plan records | Discharge suggested text + behavioral templates |
| Fetal monitoring integration | OB templates document monitoring as clinician-entered facts |
| Facility crisis hotline config | Static hash-governed suggested text |

These gaps are **nonblocking** for Phase 19 code certification when advisory documentation paths are safe and record-separation scans pass.

---

## 9. Performance benchmarking

**Status:** Advisory only
**Impact:** No CI-enforced p99 latency gate for ICD search or template resolution. Cold/warm cache behavior not measured in certification pipeline.

See `fy2026-enterprise-performance-summary.json` for documented advisory thresholds.

---

## 10. Ranking edge cases

**Status:** Monitored via ranking certifier
**Impact:** Bilingual queries may rank different top codes for clinically related terms (e.g. EN "delirium" top `F05` vs FR "délirium" top `F10.131` in enterprise search summary). Ranking certifier enforces prefix-in-top-3 for selected probes, not semantic equivalence across locales.

---

## Change control

Update this report when:

- New adaptive templates ship (Phase 20+)
- Condition-family resolver default changes
- Crisis localization or hold infrastructure lands
- Enterprise probe set expands materially

Cross-reference: `diagnostic-intelligence-enterprise-certification.md`, `diagnostic-intelligence-production-readiness-checklist.md`.
