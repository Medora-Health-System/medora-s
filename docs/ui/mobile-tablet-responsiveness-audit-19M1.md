# Mobile / Tablet Responsiveness Audit — Phase 19M.1

**Date:** 2026-05-18  
**Scope:** Audit only (no layout fixes in this phase)  
**Context:** Medora-S live in a freestanding ER; clinicians use phones, tablets, laptops, desktops, and hospital workstations.

---

## 1. Executive summary

Medora-S is **desktop-first**. The authenticated app shell always renders a fixed-width sidebar (244px expanded / 72px collapsed) with **no mobile drawer, hamburger menu, or breakpoint-based shell collapse**. This single architectural choice amplifies every downstream layout issue on phones and narrow tablets.

Within clinical workflows, patterns are **mixed**:

| Area | Mobile readiness | Notes |
|------|------------------|-------|
| App shell / navigation | **Poor** | Permanent sidebar consumes 20–65% of phone width |
| ED active workspace dashboard | **Poor** | 10-column section tile grid at all widths |
| Provider documentation | **Poor** | Fixed 2-column grid + sticky preview; no `wideLayout` breakpoint |
| Pharmacy worklist | **Poor** | 13-column table, no horizontal scroll wrapper |
| Diagnosis list (consult) | **High risk** | 4-column table inside `overflow: hidden` |
| ED disposition / triage / nursing reassessment | **Good** | `matchMedia("(min-width: 960px)")` stack pattern |
| Lab / radiology worklists | **Good** | MedoraCard rows + `MedoraCardActionsMediaStyle` @640px |
| ICD-10 entry panel | **Good** | Single-column, full-width inputs |
| Nursing discharge execution | **Good** | Single-column form layout |
| Print / ER closure | **Medium** | Buttons wrap; print is secondary on phone but reachable |

**Bottom line:** Phone use is possible for some flows but **not reliably safe** for high-frequency ED tasks (trackboard scan, provider documentation, disposition review, pharmacy queue) without horizontal scrolling, clipped controls, or unusably narrow content columns.

**Recommended first fix phase:** **19M.2 App shell / mobile navigation** — unlocks all other surfaces.

---

## 2. Risk ranking

### Critical — can block clinical action

| ID | Finding | Surfaces |
|----|---------|----------|
| C1 | Permanent expanded sidebar (~244px) + 24px main padding leaves ~80–120px content on 360px phones | All authenticated pages |
| C2 | `ProviderDocumentationWorkspace` always uses 2-column grid (`260–320px` preview column); no stack below any breakpoint | Provider MSE / documentation |
| C3 | Pharmacy worklist 13-column `<table>` with no `overflow-x-auto` wrapper | Pharmacy queue |
| C4 | `EmergencyActiveWorkspaceView` 10-column dashboard tiles (`repeat(10, 1fr)`) — section nav unreadable on phone | ED active chart |

### High — wrong workflow / missed documentation

| ID | Finding | Surfaces |
|----|---------|----------|
| H1 | `EncounterDiagnosticsPanel` diagnosis table wrapped in `overflow: hidden` — clips reorder + labels | Dx list in chart |
| H2 | `MedoraCompactPatientCardRow` tile row min-widths (room, LOS, personnel, actions) exceed phone width on ED trackboard | ED trackboard |
| H3 | `EmergencyErOrdersPanel` tables use `minWidth: 640–720` without consistent scroll container | ED orders in chart/workspace |
| H4 | App header: logo + facility select + user menu in rigid row; facility names truncate aggressively | All pages |
| H5 | Vitals 2-column grid uses `minmax(520px, …)` tracks with breakpoint at 1024px — gap 1024–1036px can overflow | ED active workspace header vitals |

### Medium — annoying but recoverable

| ID | Finding | Surfaces |
|----|---------|----------|
| M1 | Clinical trackboard filter bar uses fixed-width selects (124–140px) in horizontal row | Clinical trackboard |
| M2 | Provider documentation sticky action header consumes vertical space on short viewports | Provider documentation |
| M3 | Lab/radiology operational toolbar: 8 filter checkboxes — tall wrap on mobile | Lab/rad worklists |
| M4 | MSPP header ministry title overlay competes with controls on narrow screens | MSPP routes |
| M5 | Reorder buttons in diagnosis table ~28px tap height (below 44px guideline) | Dx list |
| M6 | MDM template checklist `maxHeight: 280` — usable but dense on phone | Provider documentation |
| M7 | `EmergencyChartView` missing `MedoraCardActionsMediaStyle` (inconsistent vs active workspace) | ED chart |

### Low — cosmetic / minor

| ID | Finding | Surfaces |
|----|---------|----------|
| L1 | `whiteSpace: nowrap` on trackboard refresh / LOS / personnel labels | ED trackboard |
| L2 | Offline runtime banner fixed top may overlap header | Global |
| L3 | French clinical labels in cards generally wrap; occasional ellipsis on long personnel names | Trackboard |
| L4 | Root `viewport` export minimal (themeColor only) | Global |

---

## 3. Findings by surface

### 3.1 App shell / navigation

**Files:** `apps/web/src/components/app-shell/AppShell.tsx`, `apps/web/app/app/layout.tsx`, `sidebarNavConfig.ts`

| Breakpoint | Issue |
|------------|-------|
| 360–430px | Sidebar + padding leave minimal content width; no overlay/drawer |
| 768px | Sidebar still full width; tablet portrait feels cramped |
| 1024px+ | Acceptable |

**Risky patterns:**
- `SIDEBAR_WIDTH_EXPANDED = 244`, `flexShrink: 0` on `<aside>`
- Body layout: permanent `display: flex` row (no `@media` collapse)
- Main `padding: 24` fixed at all widths
- Header `px-6`, `justify-between`, `shrink-0` logo and user menu
- **No** hamburger / drawer / `matchMedia` in shell (grep: zero matches)

**No-code recommendations:**
- Default sidebar collapsed on `<768px` via `localStorage` seed (interim until 19M.2)
- Document for staff: prefer tablet landscape or desktop for documentation/disposition

**Fix phase:** **19M.2**

---

### 3.2 ED trackboard

**Files:** `EmergencyTrackboardView.tsx`, `MedoraCompactPatientCardRow.tsx`, `app/app/emergency/trackboard/page.tsx`

| Breakpoint | Issue |
|------------|-------|
| 360–430px | Tile row (LOS + room + personnel + actions) likely overflows horizontally |
| 768px | Usable with wrap but dense; action buttons may wrap to second line |
| 1024px+ | Good (operational density appropriate) |

**Risky patterns:**
- `MedoraCompactPatientCardRow`: secondary row `minWidth` 72–132px blocks
- ED trackboard adds LOS block (~80px), personnel (~132px), up to 5 action buttons
- `whiteSpace: nowrap` on personnel lines (ellipsis helps but hides info)
- Does not mount `MedoraCardActionsMediaStyle` (uses compact row, not full MedoraCard actions rail)

**Fix phase:** **19M.3**

---

### 3.3 Active ED chart

**Files:** `EmergencyChartView.tsx`, `EmergencyActiveWorkspaceView.tsx`, `EmergencyWorkspaceClinicalStrip.tsx`, `EmergencyErOrdersPanel.tsx`

| Component | 360px | 768px | 1024px+ |
|-----------|-------|-------|---------|
| Chart header patient card | Wraps but tight | OK | OK |
| Active workspace 10-tile nav | **Unusable** | Cramped | OK |
| Vitals inline 2-col (active only) | Stacks @1024 | Overflow gap 1024–1036 | OK |
| Section content (triage, MSE, etc.) | Shell squeeze | Mixed | OK |
| Orders tables | Horizontal overflow | Scroll likely | OK |

**Good:** `EmergencyChartView` uses vertical section navigation (links/tabs), not 10-col grid.

**Fix phase:** **19M.4**

---

### 3.4 Provider documentation

**Files:** `ProviderDocumentationWorkspace.tsx`, `ProviderDocumentationTemplateDropdown.tsx`, `EmergencyProviderMsePanel.tsx`

| Breakpoint | Issue |
|------------|-------|
| 360–768px | **Critical:** 2-column grid squeezes form; sticky preview column always present |
| 768–960px | Still 2-column — preview competes with form |
| 960px+ | Acceptable (similar width to disposition wide layout) |

**Risky patterns:**
```tsx
gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)"
position: sticky on preview <aside>
```
- Sticky action header (`zIndex: 40`) with many buttons
- MDM multi-select panel: `maxHeight: 280`, `overflowY: auto` — OK
- Dictation targets / textareas: `width: 100%` within column — OK once column is wide enough

**Contrast (good pattern to copy):** `EmergencyDispositionPanel.tsx`, `EmergencyTriagePanel.tsx`, `EmergencyNursingReassessmentPanel.tsx`, legacy `EmergencyProviderMsePanel.tsx` `<details>` path — all use `wideLayout` @960px.

**Fix phase:** **19M.5**

---

### 3.5 ED disposition / discharge

**Files:** `EmergencyDispositionPanel.tsx`, `ProviderDischargeDocumentationSection.tsx`, `NursingDischargeExecutionSection.tsx`

| Component | Mobile | Notes |
|-----------|--------|-------|
| `EmergencyDispositionPanel` | **Good** | Stacks form + preview below 960px |
| `ProviderDischargeDocumentationSection` | **Good** | Single column, wrapping chips |
| `NursingDischargeExecutionSection` | **Good** | Full-width inputs, checkbox lists |

**Residual risk:** On phones, shell sidebar still reduces usable width for long discharge text entry.

**Fix phase:** **19M.6** (polish only; core pattern exists)

---

### 3.6 Diagnosis search

**Files:** `Icd10DiagnosisEntryPanel.tsx`, `EncounterDiagnosticsPanel.tsx`

| Component | Mobile | Notes |
|-----------|--------|-------|
| `Icd10DiagnosisEntryPanel` | **Good** | Column stack, full-width search |
| `EncounterDiagnosticsPanel` | **High risk** | Table + `overflow: hidden` on wrapper |

**French labels:** Search/display uses i18n; long French diagnosis labels in table may truncate without horizontal scroll.

**Fix phase:** **19M.4** (chart-adjacent) or **19M.6**

---

### 3.7 Print / export

**Files:** `EmergencyErSummaryClosureSurface.tsx`, `erPrintPacket.ts`, `MedicationPrintButton.tsx`

- Print / end-encounter buttons use `flexWrap: "wrap"` — reachable on mobile
- Print opens new window / `window.print()` — works on mobile browsers but UX is secondary
- No fixed-width blocking print controls identified

**Fix phase:** **19M.7** (low priority)

---

### 3.8 Pharmacy / lab / radiology worklists

| Module | File | Mobile | Notes |
|--------|------|--------|-------|
| Pharmacy | `pharmacy-worklist/page.tsx` | **Critical** | 13-col + 7-col tables |
| Lab | `lab-worklist/page.tsx` | **Good** | MedoraCard list |
| Radiology | `rad-worklist/page.tsx` | **Good** | MedoraCard list |
| Shared | `LabRadiologyWorklistOperationalToolbar.tsx` | Medium | Many checkboxes |
| Detail | `DepartmentOrderDetail.tsx` | Good | Stacked sections, modals `maxWidth: 480` |

**Fix phase:** **19M.7**

---

## 4. Code audit — risky pattern inventory

### Fixed / minimum widths (sample)

| File | Pattern | Severity |
|------|---------|----------|
| `AppShell.tsx` | Sidebar 244px / 72px | Critical |
| `ProviderDocumentationWorkspace.tsx` | Grid `minmax(260px, 320px)` | Critical |
| `EmergencyActiveWorkspaceView.tsx` | `repeat(10, minmax(0, 1fr))` | Critical |
| `EmergencyActiveWorkspaceView.tsx` | Vitals `minmax(520px, …) minmax(500px, …)` | High |
| `EmergencyErOrdersPanel.tsx` | Table `minWidth: 720`, `640` | High |
| `EncounterDiagnosticsPanel.tsx` | Table 4-col, wrapper `overflow: hidden` | High |
| `MedoraCompactPatientCardRow.tsx` | Tile `minWidth` 72–132 | High |
| `pharmacy-worklist/page.tsx` | 13-column table | Critical |
| `OpenEncountersTable.tsx` | `minWidth: 640` | Medium |
| `patients/page.tsx` | `minWidth: 720` | Medium |

### Responsive patterns present (reuse)

| Pattern | Files |
|---------|-------|
| `matchMedia("(min-width: 960px)")` + stack | `EmergencyDispositionPanel`, `EmergencyTriagePanel`, `EmergencyNursingReassessmentPanel`, `EmergencyProviderMsePanel` (legacy) |
| `@media (min-width: 640px)` actions rail | `MedoraCardActions.tsx` + `MedoraCardActionsMediaStyle` |
| Vitals stack @1024px | `EmergencyActiveWorkspaceView` inline CSS |
| Modal `width: 100%`, `maxWidth: 460–560` | Disposition cancel dialog, quick vitals, department detail |

### Absent patterns (gaps)

- No shell-level `@media` breakpoints
- No `grid-cols-1` Tailwind fallbacks (most layouts use inline styles, not Tailwind grid)
- No table → card transformation on mobile (except lab/rad worklists)
- No touch-target size enforcement (many icon buttons 36–40px)

---

## 5. Recommended fix phases

| Phase | Focus | Primary files | Depends on |
|-------|-------|---------------|------------|
| **19M.2** | App shell / mobile navigation | `AppShell.tsx`, `layout.tsx` | — |
| **19M.3** | ED trackboard | `EmergencyTrackboardView.tsx`, `MedoraCompactPatientCardRow.tsx` | 19M.2 |
| **19M.4** | ED chart layout | `EmergencyActiveWorkspaceView.tsx`, `EmergencyChartView.tsx`, `EncounterDiagnosticsPanel.tsx` | 19M.2 |
| **19M.5** | Provider documentation | `ProviderDocumentationWorkspace.tsx` | 19M.2 |
| **19M.6** | Disposition/discharge polish | Minor tweaks only; core stack exists | 19M.2 |
| **19M.7** | Ancillary modules | `pharmacy-worklist/page.tsx`, filters | 19M.2 |
| **19M.8** | Regression tests | Source-level responsive anchors, optional Playwright later | After 19M.2–7 |

---

## 6. No-code-change recommendations (immediate)

1. **Staff guidance:** Use laptop/desktop or tablet landscape for provider documentation, disposition signing, and pharmacy queue until 19M.2–5 ship.
2. **Sidebar:** Train users to collapse sidebar (72px) on smaller screens; consider default-collapsed on first visit for narrow viewports (future 19M.2).
3. **Active ED workspace:** Prefer `EmergencyChartView` vertical nav over active workspace dashboard tiles on tablet if both are available.
4. **Pharmacy:** Avoid phone for queue management; use desktop until table → card migration.
5. **QA checklist:** Run manual matrix below before each fix phase merges.

---

## 7. Manual QA testing matrix

| Surface | iPhone Safari (390) | Android Chrome (360) | iPad Safari (768 portrait) | Desktop Chrome (1280) | Hospital WS (1920) |
|---------|---------------------|----------------------|----------------------------|----------------------|---------------------|
| Login / shell nav | ☐ | ☐ | ☐ | ☐ | ☐ |
| ED trackboard open patient | ☐ | ☐ | ☐ | ☐ | ☐ |
| Triage complete | ☐ | ☐ | ☐ | ☐ | ☐ |
| Provider MSE + MDM apply | ☐ | ☐ | ☐ | ☐ | ☐ |
| Add diagnosis (ICD search) | ☐ | ☐ | ☐ | ☐ | ☐ |
| Disposition + discharge docs | ☐ | ☐ | ☐ | ☐ | ☐ |
| Nursing discharge execution | ☐ | ☐ | ☐ | ☐ | ☐ |
| Print ER packet | ☐ | ☐ | ☐ | ☐ | ☐ |
| Lab worklist action | ☐ | ☐ | ☐ | ☐ | ☐ |
| Pharmacy dispense queue | ☐ | ☐ | ☐ | ☐ | ☐ |
| Language switch FR | ☐ | ☐ | ☐ | ☐ | ☐ |
| Facility switch | ☐ | ☐ | ☐ | ☐ | ☐ |

**Pass criteria per cell:** No horizontal page scroll for critical actions; primary action button visible without scrolling; tap targets ≥44px where feasible; no clipped save/sign/apply buttons.

---

## 8. Implementation order recommendation

1. **19M.2 App shell** — drawer/off-canvas sidebar, responsive header, reduced main padding on mobile. *Unblocks everything.*
2. **19M.5 Provider documentation** — add `wideLayout` to `ProviderDocumentationWorkspace` (highest documentation risk, high daily use).
3. **19M.4 ED chart** — fix 10-column dashboard; diagnosis table scroll; orders table wrappers.
4. **19M.3 ED trackboard** — relax compact row min-widths; stack tiles on narrow.
5. **19M.7 Pharmacy worklist** — card layout or scroll wrapper (critical but lower traffic than chart).
6. **19M.6 Disposition polish** — touch targets, sticky footer spacing.
7. **19M.8 Regression tests** — extend `mobileTabletResponsivenessAudit19M1.test.ts`; consider Playwright smoke later.

---

## 9. Appendix — file index

| Surface | Primary files |
|---------|---------------|
| Shell | `src/components/app-shell/AppShell.tsx` |
| ED trackboard | `src/features/emergency/EmergencyTrackboardView.tsx` |
| ED chart | `src/features/emergency/EmergencyChartView.tsx` |
| ED active workspace | `src/features/emergency/EmergencyActiveWorkspaceView.tsx` |
| Provider docs | `src/components/encounters/ProviderDocumentationWorkspace.tsx` |
| MDM templates | `src/components/encounters/ProviderDocumentationTemplateDropdown.tsx` |
| Disposition | `src/features/emergency/EmergencyDispositionPanel.tsx` |
| Discharge docs | `src/features/emergency/ProviderDischargeDocumentationSection.tsx` |
| Nursing discharge | `src/features/emergency/NursingDischargeExecutionSection.tsx` |
| Diagnosis entry | `src/components/diagnosis/Icd10DiagnosisEntryPanel.tsx` |
| Diagnosis list | `src/components/encounters/EncounterDiagnosticsPanel.tsx` |
| Print/closure | `src/features/emergency/EmergencyErSummaryClosureSurface.tsx` |
| Pharmacy | `app/app/pharmacy-worklist/page.tsx` |
| Lab / Rad | `app/app/lab-worklist/page.tsx`, `app/app/rad-worklist/page.tsx` |
| Shared card row | `src/components/medora-card/MedoraCompactPatientCardRow.tsx` |
| Shared card actions | `src/components/medora-card/MedoraCardActions.tsx` |

---

*Phase 19M.1 — audit complete. No clinical logic, save behavior, API, or template changes in this phase.*
