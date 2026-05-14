# Medora-S — Observation product readiness (Phase 13D)

**Status:** Productization, commercial boundaries, pilot validation, and training guidance.  
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

## 8. Pilot validation checklist (scenarios)

Use during pilot UAT; record pass/fail and screen reference in the pilot log.

| # | Scenario | Pass criteria |
|---|----------|-----------------|
| 1 | Chest pain observation | INPATIENT open on board; LOS visible; no errors on encounter page |
| 2 | Dehydration observation | Same; fluids / orders visible as today |
| 3 | Sepsis watch | Critical result path unchanged; observation ops flags don’t block ER |
| 4 | Transfer holding | `DISPOSITION` phase shows as operational hint only; no auto-transfer |
| 5 | Overnight monitoring | UTC overnight indicator appears when anchor and clock span UTC dates |
| 6 | Reassessment overdue | Chip or timeline line appears per thresholds; no auto-task |
| 7 | Pending results | `resultsPending` surfaces on board when applicable |
| 8 | Discharge-ready observation | `DISCHARGE_READY` visible; discharge still manual |
| 9 | External billing export | Closed INPATIENT: JSON contains `observationStay` with `applicable: true`; CSV opens in existing tools |
| 10 | Chart export | JSON/HTML include observation section when applicable; legacy snapshot without field still opens |
| 11 | ROI export | Fulfilled package using chart snapshot shows same HTML/JSON behavior as chart export path |

**Regression guard:** ER trackboard, billing ledger, ROI approve/deny, and chart snapshot integrity checks still pass (`pnpm run verify:*`, targeted Jest as in `DEPLOYMENT_RUNBOOK.md`).

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
