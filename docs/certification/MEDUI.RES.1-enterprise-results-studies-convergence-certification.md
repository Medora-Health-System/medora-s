# MEDUI.RES.1 — Certification evidence

**Certification id:** MEDUI.RES.1  
**Program:** Enterprise Results & Studies convergence (ED + Inpatient + Laboratory + Radiology)  
**Branch:** `medui-inp2e-res1-enterprise-clinical-convergence`  
**HEAD (main merge-base):** `a20077900` (`Merge pull request #142` — INP.2D)  
**Verdict (local):** **MEDUI.RES.1 CONDITIONAL — NOT CERTIFIED** — automated parser/projection gates pass; live UAT A–O was **not** executed in this pass because API `http://127.0.0.1:3001/health` was unreachable. Not committed / not pushed / no PR / not merged / not deployed.

Prisma / migration / seed: **NONE**. MFA was **not** weakened. No second laboratory engine, radiology engine, Result table, or OrderItem copy was created.

---

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Laboratory result | `Result` (`orderItemId` unique) + `Result.resultText` | ✔ | ✔ parse/recover/authoring serialize | ✔ |
| Radiology result | Same `Result.resultText` | ✔ | ✔ heading recovery + structured entry | ✔ |
| Order / OrderItem | Existing order engine | ✔ | ✖ | ✔ |
| Lab / Radiology worklist | `DepartmentOrderDetail` `PUT /orders/:id/result` | ✔ | ✔ structured entry | ✔ |
| ED Results & Studies | `EmergencyResultsPanel` + `EncounterResultsTab` | ✔ | ✔ one-card (removed compact duplicate rows) | ✔ |
| Inpatient Review Results | Same `EmergencyResultsPanel` | ✔ | ✖ | ✔ |
| Acknowledgement | `POST /orders/:id/result/acknowledge` on `Result` | ✔ | ✖ | ✔ |
| Flags / ranges / units | Shared `labResultReferenceFlag` + recovered analyte rows | ✔ | ✔ smash recovery | ✔ |
| Patient / facility / MRN | Enterprise identity | ✔ | ✖ | ✔ |

---

## Forensic findings (authoritative)

| Question | Answer |
|---|---|
| A. Laboratory SSoT | `Order` → `OrderItem` (`LAB_TEST`) → **`Result`** (`orderItemId` unique). No analyte table. |
| B. Radiology SSoT | Same **`Result.resultText`**. No `RadiologyReport` table. |
| C. Technician write | `PUT /orders/:id/result` from lab/radiology `DepartmentOrderDetail`. |
| D. Persist | `{ resultText, resultData.attachments?, criticalValue? }` upsert on `Result`. |
| E. Analytes / ranges / units / flags | Not stored as columns. Encoded in `resultText`. Display flags from explicit H/L/C **or** reference-range helper (not a second clinical engine). `Result.criticalValue` is **line-level**. |
| F. Prior structured UI | `ClinicalResultViewer` already had an analyte table **if** `parseLabObservationLines` succeeded. |
| G. Flattening | Authoring was a **single textarea**. CMP catalog is one orderable. Smashed blob `Glucose9270–100mg/dL—…` was stored **as typed**. API did not concatenate. |
| H. Chart wall-of-text | Parser required newlines / `Name: value (range)`. Smashed blob → 0 rows → fallback `pre-wrap` of the same string. |
| I/J. Duplicates | **Not duplicate DB rows.** `Result.orderItemId` unique + upsert. Duplicate **cards** were compact latest/priority rows **plus** `EncounterResultsTab` for the same `item.id`. |

---

## Repair (earliest authoritative defect)

1. Recover smashed lab blobs into the existing `Name: value unit (range)` text contract (display + persist on submit).  
2. Recover jammed radiology headings (`Exam Type`, `Contrast`, `Comparison`, `Findings`, `Impression`) by inserting newlines **before** known headings — not by stuffing spaces into a corrupted string.  
3. Lab/radiology worklist authoring serializes structured fields into the same `Result.resultText`.  
4. ED + inpatient Results: **one `OrderItem` → one card** (`data-testid=enterprise-result-card`). Compact duplicate result rows removed; counts remain.

---

## Automated gates

| Suite | Result |
|---|---|
| `packages/shared` `labSmashedAnalyteParse.test.ts` | **6/6 PASS** |
| `clinicalResultNormalize.labFlags.test.ts` | **11/11 PASS** |
| `enterpriseResultsStudiesRes1.test.ts` | **7/7 PASS** |
| `resultPrintPacket.test.ts` | **8/8 PASS** |
| INP.2A chrome / INP.2D Review Orders / Observation workspace | **PASS** (regression, not reopened) |

### Structured CMP proof (unit)

Input: `Glucose9270–100mg/dL—BUN146–20mg/dL—Creatinine0.90.6–1.2mg/dL—Sodium140135–145mEq/L`  
Output rows: Glucose **92** 70–100 mg/dL; BUN **14** 6–20 mg/dL; Creatinine ~**0.9** 0.6–1.2 mg/dL; Sodium **140** 135–145 mEq/L.

### HIGH / LOW proof (unit)

`Potassium: 2.9 mmol/L (3.5–5.0 mmol/L)` → flag **L** (UI **LOW** / **BAS**).  
`Potassium: 5.8 mmol/L (3.5–5.0 mmol/L)` → flag **H** (UI **HIGH** / **ÉLEVÉ**).  
In-range 4.2 → no flag.

### Critical proof (unit + existing authority)

Explicit trailing `C` remains **C** (UI **Critical** / **Critique**). Line-level `Result.criticalValue` chip is unchanged. This pass does **not** invent **CRITICAL LOW** in the browser when only a reference range exists.

### Radiology formatting proof (unit)

Jammed `…2026Exam Type…ContrastComparison…FindingsLower Chest…ImpressionNo acute process.` recovers newline-prefixed sections; Impression body contains `No acute process.` Impression section is visually emphasized in `ClinicalResultViewer`.

### One card / acknowledgement

`EmergencyResultsPanel` no longer renders `CompactResultRow`. Inpatient `case "results"` still mounts the same panel. Acknowledgement remains `POST /orders/:id/result/acknowledge` (result-level, clinician user stamp; viewing ≠ ack; does not mutate `resultText`).

---

## Live UAT A–O

| Gate | Result |
|---|---|
| A–O Submit CMP / flags / ED / inpatient / one card / reload / ack / radiology | **NOT RUN** — API health unreachable |

---

## Remaining Results risks

- Smash recovery is heuristic (value/low split). Unusual analyte concatenations may still fail → narrative fallback.  
- Flags from reference ranges are **display policy**, not stored columns.  
- Timeline may still show order-complete + result events as distinct kinds (`dedupeKey: result:${orderItemId}` already exists on the result event).  
- Live technician round-trip not proven in this pass.

**Recommendation:** Do **not** mark CERTIFIED until live UAT A–O passes on Haiti FR with one OrderItem → one card after reload.
