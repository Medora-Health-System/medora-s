# Medora-S — Observation product readiness (Phase 13D–14A)

**Status:** Productization, commercial boundaries, pilot validation (§8 Phase 14A checklist), and training guidance.  
**Depends on:** [OBSERVATION_POSITIONING.md](./OBSERVATION_POSITIONING.md) (13A), [OBSERVATION_OPERATIONAL_WORKFLOW.md](./OBSERVATION_OPERATIONAL_WORKFLOW.md) (13B), [OBSERVATION_BILLING_AND_DOCUMENTATION.md](./OBSERVATION_BILLING_AND_DOCUMENTATION.md) (13C).

This document packages **Observation / short stay** as a coherent Medora capability for **freestanding ER**, **urgent care**, and **short-stay / observation** operations — without claiming full inpatient hospital EMR scope.

---

## 1. Product definition

**Observation & short stay in Medora-S** means:

- ER-adjacent care using the existing **`INPATIENT`** encounter type with product language “observation et court séjour” (UI only; enum unchanged).
- Operational visibility: LOS anchor (`admittedAt` preferred), reassessment hints, boarding/disposition phase hints, pending results, discharge-ready workflow state (see 13B).
- Additive billing and export metadata: `observationStay` in external billing JSON and chart export manifests; patient chart summary fields `observationStaySummary` / `observationOperational` (see 13C).

**It is not:** med-surg census, ICU, DRG inpatient billing, enterprise utilization review, or automated inpatient authorization.

---

## 2. Supported workflows

| Workflow | Where it lives |
|-----------|----------------|
| ER → promote to observation / short stay | ER handoff + admission packet; `/app/hospitalisation` board |
| Observation board (open INPATIENT) | Trackboard filter + `/app/hospitalisation` |
| LOS and overnight / ≥24h hints | Board tiles, encounter detail banner, chart timeline (operational labels) |
| Reassessment / vitals staleness / results pending | Board operational chips; chart timeline for open stays |
| Discharge-oriented documentation | Existing encounter close, discharge summary, provider documentation |
| External billing JSON export | Billing encounter page + daily export; includes `observationStay` (additive) |
| Chart export JSON/HTML | Encounter chart export; optional `observationStay` on stored snapshots; section when applicable |
| ROI / disclosure packages | Same chart export snapshot; inherits manifest when snapshot is attached |

---

## 3. Unsupported workflows (explicit)

| Capability | Status |
|------------|--------|
| Full inpatient med-surg unit management | **Not supported** |
| ICU flows | **Not supported** |
| OR / perioperative | **Not supported** |
| Enterprise bed census / house-wide bed control | **Not supported** |
| DRG-driven inpatient billing | **Not supported** |
| Enterprise utilization review automation | **Not supported** |
| Auto-discharge / auto-transfer from operational flags | **Not supported** (flags are informational) |

---

## 4. Target customers

- **Freestanding emergency departments** needing a bounded observation pathway after ER decision.
- **Urgent care** or hybrid sites using the same encounter model for short monitored stays.
- **Small hospitals / health centers** with observation holding and transfer coordination (not full ward logistics in Medora).

---

## 5. Operational benefits

- Single board and shared workflow enums reduce training surface vs. a second “inpatient product.”
- Handoff-oriented LOS and reassessment visibility support nurse and charge roles without new task engines.
- UTC overnight and ≥24h flags are **conservative operational hints** (see 13B caution on timezone).

---

## 6. Billing & export readiness

- **Truth model:** `observationStay` is **operational duration and flags**, not a claim line generator (see 13C).
- **JSON:** Consumers may read `encounter.observationStay` and `billingReadiness.observationStay` (`medora_observation_stay_summary_v1`).
- **CSV:** Unchanged headers and rows — **backward compatible** with pre–13C parsers.
- **Preview:** Open encounters may set `preview: true` on stay summary; billing staff must not treat preview clocks as final stay end.

---

## 7. Documentation & export readiness

- **Legal narrative** remains in signed documentation and structured summaries; Phase 13C does not fabricate diagnoses or narratives.
- **Chart export HTML** English operational block when `observationStay.applicable` (new manifests); legacy snapshots without the field still render.
- **Patient chart (French UI)** timeline section labels operational indicators explicitly.

---

## 8. Pilot validation checklist (scenarios) — Phase 14A

Use during **freestanding ER / observation pilot UAT**; record pass/fail, actor, date, and screen or export reference in the pilot log.  
**Engineering audit (automated):** `pnpm run verify:api`, `pnpm run verify:web`, `pnpm --filter @medora/web build`, `pnpm --filter @medora/shared test`, plus `DEPLOYMENT_RUNBOOK.md` §2.1 after any deploy touching billing/chart/observation shared code.

| # | Scenario | Pass criteria |
|---|----------|----------------|
| 1 | Chest pain observation | INPATIENT + observation care level; board LOS/chips render; encounter chrome + order template usable; no console errors |
| 2 | Dehydration observation | Same as (1); fluids / CARE orders path unchanged from Orders tab |
| 3 | Sepsis-watch observation | Operational flags + disposition readiness behave; **no** auto-escalation; critical lab path testable via (8) |
| 4 | Transfer holding | `DISPOSITION` shows as **hint only** (board + chrome badges); **no** auto-transfer; handoff rules unchanged for ER→INPATIENT where applicable |
| 5 | Overnight observation | UTC overnight span appears when anchor vs “now” crosses UTC calendar date (conservative hint) |
| 6 | Discharge-ready observation | `DISCHARGE_READY` visible on board/chrome; discharge/close still **manual**; `DispositionReadinessBanner` respected |
| 7 | Pending results blocking disposition | Unresolved LAB/IMAGING order items → `ACTIVE_ORDERS_UNRESOLVED` (or equivalent) blocks `canClose` until resolved/cancelled; banner lists blockers |
| 8 | Critical result unresolved | Critical value unacked → operational chip + export/timeline behavior unchanged; closure policy per existing safety util |
| 9 | Provider reassessment overdue | `lastProviderObservationReassessmentAt` lane overdue; board + header pill can show **provider-specific** overdue when RN lane current |
| 10 | RN reassessment overdue | `lastRnObservationReassessmentAt` lane overdue; board chip **RN obs. overdue**; independent from ER `erNursingReassessmentV1` clock |
| 11 | External billing JSON export | Closed INPATIENT: JSON includes additive `observationStay` / readiness blocks per `OBSERVATION_BILLING_AND_DOCUMENTATION.md`; **CSV column contract unchanged** |
| 12 | Chart export / ROI export | New manifest: observation stay section when applicable; **legacy** snapshot without field still opens; ROI fulfilled package uses same snapshot path as chart export |

**13G regression spot-checks (same session):** observation order template apply; provider + RN **observation reassessment** POST; **quick phrases** insert into note only; **clinical timeline** row for `OBSERVATION_REASSESSMENT_V1`; observation board (`/app/hospitalisation`) chip density readable; **admin system-health** page loads (no crash).

**Regression guard:** ER trackboard list, billing ledger math, ROI approve/deny flows, chart snapshot integrity specs — unchanged from prior phases; see `DEPLOYMENT_RUNBOOK.md` §2.1.

---

## 9. Go-live constraints

- Train staff on **observation vs full inpatient** (see §11); avoid selling Medora as inpatient med-surg.
- Do not promise payer-specific observation coding — Medora surfaces **metadata**; coders remain authoritative.
- Coordinate with compliance on chart export / ROI: new fields on **new** exports change manifest fingerprints vs pre–13C (expected).

---

## 10. Training checklist (completion sign-off)

- [ ] **All clinical roles** — read §11 “Staff explanation” (15 min).
- [ ] **RN** — board filters, reassessment documentation path, vitals entry impact on staleness hint.
- [ ] **Provider** — encounter banner LOS; disposition strings unchanged for persistence.
- [ ] **Billing** — JSON vs CSV; `observationStay` meaning; `preview` flag on open encounters.
- [ ] **Admin / operator** — `DEPLOYMENT_RUNBOOK.md` §2.1 observation export spot-checks post-deploy.

---

## 11. Training guidance — roles

### 11.1 Staff explanation — observation vs full inpatient

**Observation / court séjour dans Medora** = short, discharge-oriented monitored stay tied to the ER pathway, with operational timers and handoff cues. It uses the technical type `INPATIENT` for compatibility but **does not** activate inpatient ward management, DRG engines, or ICU tooling.

**Full inpatient (non couvert comme produit Medora aujourd’hui)** = multi-day med-surg stays, floor census, perioperative suites, and enterprise UR — **hors périmètre**; use paper or another system per pilot scope (`ER_PILOT_SCOPE_AND_CONSTRAINTS.md`).

### 11.2 RN / provider workflow

1. Complete ER care and decision; use existing admission / observation packet where policy requires.  
2. Promote to observation board as today; use board LOS and chips to prioritize reassessment and pending results.  
3. Close encounter and document discharge through existing flows; operational flags do not auto-close.

### 11.3 Billing staff workflow

1. Prefer **JSON** export for systems that can ingest `observationStay`.  
2. Treat **`preview: true`** as non-final duration.  
3. Use **CSV** only where column contracts are frozen; confirm column count unchanged after upgrades.

### 11.4 Admin / operator workflow

- After each relevant deploy, run §2.1 checks in `DEPLOYMENT_RUNBOOK.md`.  
- Log failures in pilot incident log; do not “fix” export JSON by hand in production.

---

## 12. Commercial scope boundaries (summary)

**Medora supports (pilot positioning):** ER, urgent care–style flows where modeled, observation / short stay as documented, freestanding ER operations, and private-office workflows already in scope elsewhere.

**Medora does not yet support:** full inpatient med-surg, ICU, OR/perioperative, enterprise bed census, DRG inpatient billing, enterprise utilization review — **do not implement or sell** without a replanned phase.

---

## 13. Related documents

| Document | Use |
|----------|-----|
| `ER_PILOT_OPERATIONS_SOP.md` | Deploy freeze, roles, change classes |
| `ER_PILOT_SCOPE_AND_CONSTRAINTS.md` | Pilot legal/product boundary |
| `DEPLOYMENT_RUNBOOK.md` §2.1 | Observation export validation after deploy |
| `ER_PILOT_CLINICAL_UX_CHECKLIST.md` | Broader UX checks (add cross-links in binder) |

---

## 14. Migration

**None** for Phase 13D when limited to documentation and UI copy.

---

## 15. Verdict

**SAFE** — documentation and bounded UI copy only; no billing math, schema, routes, or persisted field renames. **SAFE WITH CAUTION** if sales/commercial teams present the product beyond the §12 boundaries without engineering review.

---

## 16. Phase 14A — Verdict (pilot readiness gate)

| Gate | Status (this engineering pass) |
|------|--------------------------------|
| Automated build / unit tests | `verify:api`, `verify:web`, `@medora/web build`, `@medora/shared test` — run green in audit session |
| Manual UAT (§8 checklist) | **Required** — not executed in this pass |
| Schema / billing math | **Unchanged** — no migration |

**Phase 14A engineering verdict:** **SAFE WITH CAUTION** — implementation surface is consistent with runbooks and disposition safety; **PILOT READY** only after pilot lead signs §8 on representative staging data (including exports §2.1).

---

## 17. Migration (Phase 14A)

**None** for Phase 14A when limited to validation documentation and runbook alignment.

---

## 18. Related — Phase 14A audit notes

### 18.1 Files reviewed (engineering audit)

| Area | Path(s) |
|------|---------|
| Pilot / runbook | `docs/OBSERVATION_PRODUCT_READINESS.md`, `docs/OBSERVATION_OPERATIONAL_WORKFLOW.md`, `docs/OBSERVATION_BILLING_AND_DOCUMENTATION.md`, `docs/DEPLOYMENT_RUNBOOK.md` (§2.1) |
| Disposition closure / pending orders | `apps/api/src/encounters/disposition-safety-readiness.util.ts` |
| Encounter detail observation input | `apps/web/app/app/encounters/[id]/page.tsx`, `packages/shared/src/observationOperational.ts` |
| Clinical timeline (observation reassessment) | `apps/web/src/components/clinical/ClinicalTimeline.tsx` (sampled) |

### 18.2 Findings summary

| Topic | Finding |
|-------|---------|
| Bugs found in code (static audit) | **None confirmed** — no code fixes applied in this pass |
| Fixes made | **Documentation:** §8 checklist expansion (14A); §16–18 gate; `OBSERVATION_OPERATIONAL_WORKFLOW.md` §7 encounter-detail row corrected |
| Deferred | Full 12-scenario **manual** UAT; facility timezone vs UTC overnight hint; payer-specific observation coding remains out of product scope (`OBSERVATION_BILLING_AND_DOCUMENTATION.md`) |
| `OBSERVATION_OPERATIONAL_WORKFLOW.md` §7 | Encounter detail uses merged **`trackboardOps` from `GET /encounters/:id`** plus triage timestamps — not a permanently empty aggregate when the API returns operational rows |
