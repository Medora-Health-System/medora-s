# Cross-Device QA Checklist — Phase 19M.8

**Date:** 2026-05-18  
**Scope:** Manual QA + operational readiness after 19M.1–19M.7 mobile/tablet layout initiative  
**Product language:** French UI for end users; this checklist may be used by QA/dev in English.

---

## 1. Executive Summary

### What 19M.1–19M.7 achieved

| Phase | Focus | Outcome |
|-------|--------|---------|
| **19M.1** | Audit | Identified critical mobile gaps (shell, trackboard, chart nav, provider docs, pharmacy table) |
| **19M.2** | App shell | Mobile drawer navigation; desktop sidebar only at `≥1024px`; responsive main padding |
| **19M.3** | ED trackboard | Stacked patient cards on phone; 2-column tablet grid; dense desktop rows preserved |
| **19M.4** | ED chart / active workspace | Horizontal chip nav below desktop; section jump nav on chart view; 10-tile grid desktop-only |
| **19M.5** | Provider documentation | Stacked editor + collapsible summary on mobile/tablet; touch-friendly MDM controls |
| **19M.6** | Disposition / discharge | Single-column mobile stack; collapsible preview; nursing + shared planning full width |
| **19M.7** | Ancillary worklists | Pharmacy queue → MedoraCard (no 13-col table); lab/rad touch + tablet grid polish |

**Net effect:** High-frequency ED and ancillary queue workflows are **usable on phone and tablet** for review, navigation, and many documentation actions. Desktop dense workflows are **preserved** at `≥1024px`.

### Remaining known limitations

See **Section 5**. Summary: diagnosis list table clipping, ED orders table horizontal scroll on narrow viewports, legacy `/app/pharmacy` hub tables, triage/nursing reassessment still on 960px `wideLayout` (functional stack, not unified helper), MSPP/ministry layouts, prolonged multi-panel charting still desktop-preferred.

### Supported device classes

| Class | Width (typical) | Intended use |
|-------|-----------------|--------------|
| Phone portrait | 360–430px | Quick review, queue triage, light charting, navigation |
| Phone landscape | 667–932px | Improved forms; still prefer tablet for long documentation |
| Tablet portrait | 768–834px | Active documentation, disposition, worklists (2-col cards where enabled) |
| Tablet landscape | 1024–1194px | Near-desktop charting; sidebar visible |
| Small laptop | 1024–1280px | Full clinical workflow |
| Hospital workstation | 1280–1920px | Primary production target |
| Large desktop | 1920px+ | Trackboard density, multi-panel review |

---

## 2. Supported Device Targets

Manual QA should include real or emulated:

- [ ] **iPhone Safari** (390×844 or 393×852)
- [ ] **Android Chrome** (360×800 or 412×915)
- [ ] **iPad Safari portrait** (768×1024)
- [ ] **iPad landscape / tablet landscape** (1024×768)
- [ ] **Small Windows laptop** (1280×800)
- [ ] **Hospital workstation** (1920×1080)
- [ ] **Large desktop monitor** (2560×1440)

**Pass criteria (global):** No horizontal **page** scroll for primary workflow; critical actions visible without hunting; save/sign/apply reachable; status readable as text (not color-only); tap targets ≥44px on changed mobile controls.

---

## 3. Core Clinical Workflow QA Matrix

Format: **PASS / FAIL** — Expected behavior — **Risk**

### Authentication & shell

| Workflow | PASS | FAIL | Expected behavior | Risk |
|----------|:----:|:----:|-------------------|------|
| Login | ☐ | ☐ | Form full width; submit reachable; no clipped fields | Medium |
| App shell navigation | ☐ | ☐ | Phone: hamburger opens drawer; nav closes on link/Escape/backdrop; desktop: sidebar visible | **Critical** |
| Facility switch | ☐ | ☐ | Selector usable on mobile header; no overlap with menu | High |
| Language switching EN/FR | ☐ | ☐ | Locale toggle reachable; UI strings match selected locale on chrome | Medium |
| Drawer / sidebar behavior | ☐ | ☐ | No permanent sidebar on `<1024px`; main content full width | **Critical** |

### Emergency department

| Workflow | PASS | FAIL | Expected behavior | Risk |
|----------|:----:|:----:|-------------------|------|
| ED trackboard | ☐ | ☐ | Phone: stacked cards; patient/room/ESI/status visible; open chart action reachable | **Critical** |
| Open patient chart | ☐ | ☐ | From trackboard or search; chart loads without horizontal page overflow | **Critical** |
| ED active workspace section nav | ☐ | ☐ | Phone/tablet: horizontal chip rail; desktop: 10-tile grid | High |
| ED chart view section jump | ☐ | ☐ | Mobile jump nav present; sections reachable | Medium |
| Provider documentation | ☐ | ☐ | Mobile: single column; summary collapsible below; save/autosave visible | **Critical** |
| MDM workflow | ☐ | ☐ | Template dropdown scrollable; apply/cancel touch-safe; multiselect intact | High |
| Diagnosis search (ICD entry) | ☐ | ☐ | Search full width; results readable | Medium |
| Diagnosis list (chart table) | ☐ | ☐ | Reorder/labels not clipped; scroll or stack acceptable | **High** |
| Disposition / discharge | ☐ | ☐ | Mobile: stacked; preview accordion; shared precautions once at bottom | **Critical** |
| Nursing discharge execution | ☐ | ☐ | Fields stack on phone; execution save reachable | High |
| Print / export actions | ☐ | ☐ | Print/end-encounter buttons wrap; modal usable on phone | Medium |
| Triage panel | ☐ | ☐ | Stacks below 960px; required fields reachable | Medium |
| Nursing reassessment | ☐ | ☐ | Stacks below 960px; save reachable | Medium |

### Ancillary

| Workflow | PASS | FAIL | Expected behavior | Risk |
|----------|:----:|:----:|-------------------|------|
| Pharmacy worklist (`/app/pharmacy-worklist`) | ☐ | ☐ | MedoraCard rows; workflow + dispense actions reachable | **Critical** |
| Lab worklist | ☐ | ☐ | Cards wrap; filters stack; ack/start/complete reachable (role-gated) | High |
| Radiology worklist | ☐ | ☐ | Same as lab; workflow buttons reachable | High |
| Department order detail | ☐ | ☐ | Stacked sections; modals fit viewport | Medium |

### Cross-cutting UX

| Workflow | PASS | FAIL | Expected behavior | Risk |
|----------|:----:|:----:|-------------------|------|
| Mobile keyboard behavior | ☐ | ☐ | Inputs not hidden behind keyboard; focused field scrolls into view | High |
| Orientation change | ☐ | ☐ | Layout adapts without stuck drawer or lost scroll position | Medium |
| Scroll behavior | ☐ | ☐ | Single primary scroll; no nested scroll traps on disposition/docs | High |
| Sticky header behavior | ☐ | ☐ | Provider doc sticky header does not permanently hide content on short viewports | Medium |

---

## 4. Critical Safety Checks

| Check | PASS | FAIL | Notes |
|-------|:----:|:----:|-------|
| Wrong-patient navigation risk | ☐ | ☐ | Patient name + NIR visible on trackboard cards and chart header before documenting |
| Hidden save buttons | ☐ | ☐ | Disposition save, provider doc save, nursing execution save visible without horizontal scroll |
| Hidden disposition controls | ☐ | ☐ | Discharge mode, provider cards, preview toggle reachable on phone |
| Mobile overflow clipping clinical data | ☐ | ☐ | No `overflow:hidden` hiding required fields without card equivalent |
| Accidental button overlap | ☐ | ☐ | Action rails wrap; no stacked invisible hit areas |
| Touch-target safety (≥44px) | ☐ | ☐ | Shell menu, worklist actions, disposition saves on mobile/tablet |
| Chart scrolling continuity | ☐ | ☐ | Long sections scroll smoothly; jump nav still usable mid-scroll |

---

## 5. Remaining Known Gaps

Document **genuine** limitations not fully addressed in 19M.2–19M.7:

| Gap | Surfaces | Severity | Notes |
|-----|----------|----------|-------|
| Diagnosis list table + `overflow: hidden` | `EncounterDiagnosticsPanel` | **High** | 4-column table may clip reorder/labels on narrow widths |
| ED orders tables (wide min-width) | `EmergencyErOrdersPanel` | **Medium** | Parent has `overflow-x-auto`; horizontal scroll inside panel, not ideal on phone |
| Legacy pharmacy hub tables | `/app/pharmacy` (non-worklist) | **Low** | Canonical queue is `/app/pharmacy-worklist` (card layout) |
| Triage / nursing reassessment 960px pattern | `EmergencyTriagePanel`, `EmergencyNursingReassessmentPanel` | **Low** | Stack works; not migrated to shared 19M layout helpers |
| Vitals two-column grid edge case | `EmergencyActiveWorkspaceView` | **Low** | Stacks at 1024px; narrow gap 1024–1036px may still feel tight |
| Lab/rad operational filter density | `LabRadiologyWorklistOperationalToolbar` | **Low** | Many checkboxes wrap tall on phone; filters remain usable |
| MSPP / ministry header density | MSPP routes | **Low** | Out of 19M ER scope |
| Open encounters / patient list tables | Trackboard-adjacent lists | **Medium** | Some tables retain fixed min-widths |
| No automated browser E2E | CI | **Info** | 19M.8 uses source-level regression anchors only |

---

## 6. Recommended Production Device Policy

| Role / task | Phone | Tablet | Desktop / WS |
|-------------|-------|--------|----------------|
| Quick patient lookup, queue glance | ✅ Acceptable | ✅ Preferred | ✅ |
| ED trackboard scan | ✅ Acceptable | ✅ Preferred | ✅ Primary |
| Provider documentation (full note) | ⚠️ Light edits only | ✅ Preferred | ✅ Primary |
| MDM template apply | ⚠️ Possible | ✅ Preferred | ✅ |
| Disposition + discharge documentation | ⚠️ Review / short edits | ✅ Preferred | ✅ Primary |
| Pharmacy dispense queue | ✅ Acceptable | ✅ Preferred | ✅ Primary |
| Lab / radiology queue actions | ✅ Acceptable | ✅ Preferred | ✅ |
| Print ER packet | ⚠️ Secondary UX | ✅ | ✅ Primary |
| Prolonged charting / billing review | ❌ Not recommended | ⚠️ Possible | ✅ Primary |

**Operational guidance for Haiti pilot clinic:**

1. Deploy with **tablet or laptop as default** for physicians and nurses doing full encounters.
2. Phones are suitable for **trackboard**, **worklist ack**, and **quick chart review** after 19M.2–19M.7.
3. Train staff to use **hamburger menu** on phone; sidebar is not permanent below 1024px.
4. Prefer **`/app/pharmacy-worklist`** over legacy pharmacy hub for queue management.
5. Run this checklist on **one phone + one tablet + one desktop** before each production deploy touching `apps/web`.

---

## 7. Regression protection (automated)

Source-level anchors live in:

- `apps/web/src/lib/mobileTabletResponsivenessAudit19M1.test.ts`
- `apps/web/src/lib/AppShellMobileNav19M2.test.ts`
- `apps/web/src/lib/erTrackboardResponsiveLayout19M3.test.ts`
- `apps/web/src/lib/emergencyChartResponsiveLayout19M4.test.ts`
- `apps/web/src/lib/providerDocumentationWorkspaceLayout19M5.test.ts`
- `apps/web/src/lib/edDispositionResponsiveLayout19M6.test.ts`
- `apps/web/src/lib/ancillaryResponsiveLayout19M7.test.ts`
- `apps/web/src/lib/crossDeviceRegression19M8.test.ts` (cross-phase rollup)

Run: `pnpm --filter @medora/web test`

---

## 8. Sign-off template

| Environment | Tester | Date | Phone | Tablet | Desktop | Blockers |
|-------------|--------|------|-------|--------|---------|----------|
| Staging | | | ☐ | ☐ | ☐ | |
| Production pilot | | | ☐ | ☐ | ☐ | |

**Approved for pilot mobile/tablet use:** ☐ Yes ☐ No — Notes: _______________
