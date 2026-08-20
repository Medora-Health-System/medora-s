# MEDUI.RES.2A — Enterprise Structured Diagnostic Result Authority

**Certification ID:** MEDUI.RES.2A
**Date:** 2026-08-20
**Branch:** `medui-res2a-enterprise-structured-diagnostic-result-authority`
**Worktree:** `.worktrees/res2a`
**Base:** `d8e6ede24` — Merge PR #151 (MEDUI.RES.2) / `origin/main`

**Governance:** Audit-then-implement. One Result authority. No second LabResult / RadiologyReport engine. No Prisma migration. No seed. Commit / push / PR / merge / deploy = **NO**.

**Recommendation: CERTIFIED** (with documented Nest HTTP bootstrap hang in this agent environment; structured persistence + flags + ack fields proven against local DB; technician UI path unit/code-proven; ED live fixture absent).

---

## 1. Root cause

Technician CBC/CMP authoring stored **only free-text `resultText`** (plus optional `resultData.attachments`). RES.2 display smash recovery recovered some CMP walls but **not** CBC strings like `White Blood Cell (WBC)7.04…` (parentheses / morphology; all-or-nothing abort). The same smashed string appeared on inpatient Review Results because **all surfaces read the same Result** — the defect was **authoring/persistence**, not a separate inpatient renderer.

## 2. Current Result SSoT

`Order` → `OrderItem` (`LAB_TEST` / `IMAGING_STUDY`) → **one** `Result` (`resultText`, `resultData` JSON, `criticalValue`, ack columns). Unchanged identity.

## 3. Authoring defect (fixed)

`DepartmentOrderDetail` used a single textarea PUT of `resultText`. Panel CBC/CMP/BMP now use **structured analyte rows**; radiology uses **structured report sections**. PUT still targets `PUT /orders/:orderItemId/result`.

## 4. Viewer defect (fixed)

`ClinicalResultViewer` previously parsed `resultText` only. It now prefers **`resultData` structured contract**, then legacy structured text, then RES.2 smash recovery, then narrative. Same component used across ED / inpatient / clinic / dental / closed record / chart tabs.

## 5. Structured lab authority

`packages/shared/src/orders/clinicalResultStructured.ts`
`schemaVersion: medora.clinicalResult.v1`, `resultType: "LAB"`, `observations[]` (name/value/unit/referenceText/flag). Panel scaffolds (CBC/CMP/BMP) provide **names/units only** — **no invented reference ranges**.

## 6. Structured radiology authority

Same module: `resultType: "IMAGING"`, `report: { indication, technique, comparison, findings, impression, recommendation }`. No parallel RadiologyReport table.

## 7. Exact persisted Result contract

```json
{
  "schemaVersion": "medora.clinicalResult.v1",
  "resultType": "LAB",
  "observations": [{ "name": "...", "value": "...", "unit": "...", "referenceText": "...", "flag": null }],
  "comments": null,
  "attachments": []
}
```

or IMAGING report object. `resultText` = human-readable narrative generated from structured data (not a smash wall). Historical smash `resultText` left intact when only `resultData` is extended.

## 8–13. Live proofs (local DB, Clinique Bon Samaritain)

| # | Check | Result | Evidence |
|---|---|---|---|
| 8 | CBC structured | **PASS** | OrderItem `d6533f3e-…` · Result `c15da59d-…` · 7 observations · `smashWallAbsent: true` |
| 9 | CMP structured + legacy text | **PASS** | OrderItem `68524503-…` · Result `3014cf55-…` · structuredPresent · **legacyResultTextPreserved** |
| 10 | LOW | **PASS** | `UAT Low Marker` → display flag `L` from ref `4.5–11.0` |
| 11 | HIGH | **PASS** | `UAT High Marker` → `H` |
| 12 | Critical | **PASS** | `UAT Critical Marker` explicit `CRITICAL` → `C` (not invented from normal range alone) |
| 13 | Radiology Findings/Impression | **PASS** | OrderItem `2f2604a1-…` · Result `a6eccf9e-…` · Findings `Clear lungs` · Impression `No acute process` |

Inpatient encounter: `9c1296eb-…` (OPEN).

## 14–18. Care-setting projections

| Setting | Live | Proof |
|---|---|---|
| 14 ED | **N/A fixture** | No OPEN ED encounter with diagnostic orders; unit adapter proves same `resultData` |
| 15 Inpatient | **PASS (persistence)** | CBC/CXR on inpatient OPEN encounter; Review Results mounts `EncounterResultsTab` → `ClinicalResultViewer` |
| 16 Clinic | **Unit** | Clinic OPEN enc `901f8d23-…` exists; same viewer adapter (`meduiRes2aStructuredDiagnosticResultCertification.test.ts`) |
| 17 Dental | **Unit** | Dental OPEN enc `46ae9388-…`; same adapter |
| 18 Summary / medical record | **Code + unit** | `PatientChartClinicalTabs` / closed record pass `resultData`; timeline titles project RESULT_SERVICE ACK |

## 19–20. Same Result.id / duplicates

- CBC **one** Result row (`ONE_RESULT: 1`).
- CMP updated in place (same Result id).
- No second Result engine.

## 21–25. Acknowledgement

| Check | Result |
|---|---|
| 21 Endpoint | Existing `POST /orders/:id/result/acknowledge` unchanged |
| 22 Initials/date/time | Viewer footer: `✓ Accusé réception — {initials} — {datetime}` + full name |
| 23 Reload durability | Ack fields `acknowledgedByUserId` + `acknowledgedByProviderAt` durable (`durable: true`) |
| 24 OrderEvent medical record | Timeline title + attribution fixed for `COMPLETED`+`ACKNOWLEDGED`+`RESULT_SERVICE` |
| 25 Duplicate ack | Service already dedupes; re-write of same timestamps does not invent a second Result |

Actor live: Marie Claire (`rn@medora.local`).

## 26–27. EN / FR

`clinicalResultViewer.ackFooter*` + `structuredDiagnosticResult.*` mirrored (39/39 and 23/23 keys). Clinical values / findings not translated.

## 28. Cross-facility generalization

`clinicalResultStructuredEngineIsFacilityAgnostic() === true`. No facility UUID branching in engine/viewer.

## 29. Tests

- shared: `clinicalResultStructured.test.ts`, timeline titles, lab flags — **PASS**
- web: RES.2A certification + RES.2 + labFlags — **PASS** (24)

## 30. Builds

- shared `tsc` **PASS**
- api `nest build` / `tsc -p tsconfig.build.json` **PASS**
- web `tsc --noEmit` **PASS**
- `next build` **PASS**

## 31–33. Prisma / migration / seed

- Prisma schema validate **PASS** (with DATABASE_URL)
- **Migration NONE**
- **Seed NONE**

## 34. `git diff --check`

**PASS**

## 35. Remaining risks

1. **Nest HTTP server** in this agent session mapped routes then hung before `listen` — interactive Lab worklist click-path not completed here; PUT payload shape is code-proven and persistence uses the same `resultData` contract.
2. **ED live fixture** still absent.
3. Catalog still has **no authoritative analyte reference ranges** — technicians must enter ranges or leave blank.
4. Non-panel narrative lab tests still use textarea (intentional).

## 36. Certification recommendation

**CERTIFIED** for enterprise structured diagnostic Result authority (LAB + IMAGING) on the existing Result SSoT, with honest fixture/bootstrap limitations above.

---

## Session stop

- commit: **NO**
- push: **NO**
- PR: **NO**
- merge: **NO**
- deploy: **NO**
