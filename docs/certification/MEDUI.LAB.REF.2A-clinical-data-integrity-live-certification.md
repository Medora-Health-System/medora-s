# MEDUI.LAB.REF.2A — Clinical Data Integrity + Live Certification

**Branch:** `medui-lab-enterprise-reference-interval-authority`
**Worktree:** `.worktrees/labref`
**HEAD (branch tip at cut):** `253cb8541` — Phase 1–2A work **uncommitted**
**Merge-base (main):** `77508bc5d27f`
**Migration:** `20261113120000_lab_enterprise_reference_interval_authority`
**Live API:** `http://127.0.0.1:3011` (labref Nest)
**Date:** 2026-08-21
**Live UAT script:** `apps/api/scripts/lab-ref-phase2a-live-uat.ts`

**Scope:** integrity + UAT certification only. No new laboratory UI. No new clinical concepts. No five-column template change.

---

## 1. Curated inventory

| Metric | Count |
|--------|------:|
| CURATED_ROWS | **294** |
| SOURCE_MATCHED | **PASS** (Mayo spot-checks + Phase 2 suite; 0 mismatches) |
| SOURCE_MISMATCH | **0** |
| OVERLAPPING_INTERVALS | **0** |
| UNRESOLVED_BANDS | **15** documented |

---

## 2–6. Integrity (unchanged — still PASS)

- Overlap audit: 0 pairs
- Units: no silent ×10³/µL↔×10⁹/L or mmol↔mEq
- CBC Sysmex method match / mismatch / facility override
- Not-established infant BMP + bili 0–6d unresolved
- BMP/CMP shared `CanonicalLabAnalyte.id` for Na/K/Cl/HCO3/Glu/BUN/Creat/Ca

---

## 7. Live patient-resolution UAT (labref Nest :3011)

Authoring path: `GET /lab-reference/panels/:panelCode/observations` — same endpoint wired by `DepartmentOrderDetail` → five-column `StructuredDiagnosticResultEditor`.

| Case | Result |
|------|--------|
| A adult male CBC | **PASS** — HGB 13.2–16.6 g/dL CANONICAL (`MAYO.CBC.9109.HGB.M.11`), 14 analytes |
| B adult female CBC | **PASS** — HGB 11.6–15.0 |
| C pediatric CBC | **PASS** — HGB 11.5–14.3 (age 8) |
| D pediatric BMP | **PASS** — Na 135–145 mmol/L |
| E not-established | **PASS** — infant Na UNRESOLVED (empty range) |
| F facility override | **PASS** — Facility A Na FACILITY 130–140; Facility B CANONICAL 135–145; override deleted after run |

Non-PHI disposable patient `UAT Labref2a` used for Result persist; cleaned up after run.

**Browser click-through on :3002:** still serves **main** checkout — not required for engine proof once HTTP hydrate (authoring SSoT) + Result snapshot proven on labref Nest.

---

## 8–9. H/L + Critical

| Check | Result |
|-------|--------|
| exact low/high | normal (null) |
| below / above | L / H |
| LabCriticalValuePolicy count | **0** |
| extreme value criticalStatus | **null**; `Result.criticalValue` stayed **false** |

---

## 10. Historical Result snapshot stop-gate

| Field | Captured |
|-------|----------|
| Result.id | `aaa915e5-0a32-48d1-af97-63cd53a3a7e1` (cleaned up after proof) |
| OrderItem.id | `b80a1a2d-d50c-42cd-82b5-9539bab860c0` |
| canonical analyte ID | `0b1c4617-b137-4878-a053-30f47d892ae1` (HEMOGLOBIN) |
| value / unit | `10.0` / `g/dL` |
| referenceSnapshot | low **13.2**, intervalId `4374d2e6-81aa-4892-8b6f-41432f5b5e17`, locked |
| H/L | LOW |
| After local registry mutate + reload | **unchanged** (`durabilityAfterRegistryEdit: true`) |
| Registry restored | **yes**; disposable Patient/Encounter/Order/Item/Result **deleted** |

---

## 11. Facility override

Disposable Facility A override created/deleted in live UAT. No production UUID embedded in seed product code.

---

## 12. One-engine projection

`ClinicalResultViewer` does not call lab-reference resolver. Lab / ED / IP / Clinic / closed-record surfaces reuse it. Dental: **NOT AVAILABLE** (no fixture). Print: via shared observation fields (no care-setting recompute).

---

## 13–14. Migration / seed / gates

| Gate | Result |
|------|--------|
| Migration sequential | **PASS** after `20261112120000_…` |
| prisma validate | **PASS** |
| Seed ×2 | 30 / 83 / 3 / 38 / **294** / critical **0** |
| shared labReference tests | **PASS** |
| API lab-reference + integrity | **PASS** |
| RES.2 / 2A / 2A.1 | **PASS** |
| Nest build / web tsc / Next build | **PASS** |
| git diff --check | **PASS** |
| Live UAT script `allPass` | **PASS** |
| Clinic D4C.7C worklist page assertions | pre-existing FAIL (thin wrapper) — unrelated |

---

## Remaining risks

- Interactive browser on main :3002 is not labref UI (use :3011 API + labref worktree for engine).
- Neonatal total bilirubin still intentionally unresolved (no age-in-hours model).
- Clinic D4C.7C certification file stale vs worklist refactor.

---

## CERTIFICATION STATUS

### **CERTIFIED**

**STOP:** no commit / push / PR / production migration / deploy performed.
