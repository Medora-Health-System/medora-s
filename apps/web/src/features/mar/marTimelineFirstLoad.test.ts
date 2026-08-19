import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isMarShiftTimelineFirstPaintAuthority,
  marShiftTimelineHasVisibleMedicationCell,
  shouldDeferMarAllergyEncounterFetch,
  shouldDeferMarCorrectionHistoryLoad,
  shouldSkipStandaloneInitialMarLoad,
} from "./marTimelineFirstLoad";

const webSrc = join(import.meta.dirname, "../..");
function readSrc(rel: string): string {
  return readFileSync(join(webSrc, rel), "utf8");
}

describe("MEDUI.INP.2E.1 MAR timeline-first load policy", () => {
  it("treats FacilityMarShiftTimeline as first-paint authority when unified timeline is on", () => {
    expect(
      isMarShiftTimelineFirstPaintAuthority({
        showFacilityMarShiftTimeline: true,
        marTabShowLegacySections: false,
      })
    ).toBe(true);
    expect(
      isMarShiftTimelineFirstPaintAuthority({
        showFacilityMarShiftTimeline: false,
        marTabShowLegacySections: false,
      })
    ).toBe(false);
  });

  it("skips standalone initial load only for timeline-first without shared clinical cache", () => {
    expect(
      shouldSkipStandaloneInitialMarLoad({
        showFacilityMarShiftTimeline: true,
        marTabShowLegacySections: false,
        useSharedClinicalData: false,
      })
    ).toBe(true);
    expect(
      shouldSkipStandaloneInitialMarLoad({
        showFacilityMarShiftTimeline: true,
        marTabShowLegacySections: false,
        useSharedClinicalData: true,
      })
    ).toBe(false);
    expect(
      shouldSkipStandaloneInitialMarLoad({
        showFacilityMarShiftTimeline: false,
        marTabShowLegacySections: false,
        useSharedClinicalData: false,
      })
    ).toBe(false);
    expect(
      shouldSkipStandaloneInitialMarLoad({
        showFacilityMarShiftTimeline: true,
        marTabShowLegacySections: true,
        useSharedClinicalData: false,
      })
    ).toBe(false);
  });

  it("defers correction history until correction UI or legacy history list", () => {
    expect(
      shouldDeferMarCorrectionHistoryLoad({
        marTabShowLegacySections: false,
        correctionUiOpen: false,
      })
    ).toBe(true);
    expect(
      shouldDeferMarCorrectionHistoryLoad({
        marTabShowLegacySections: false,
        correctionUiOpen: true,
      })
    ).toBe(false);
    expect(
      shouldDeferMarCorrectionHistoryLoad({
        marTabShowLegacySections: true,
        correctionUiOpen: false,
      })
    ).toBe(false);
  });

  it("defers encounter allergy GET on timeline-first when no parent source", () => {
    expect(
      shouldDeferMarAllergyEncounterFetch({
        hasEncounterAllergySource: false,
        skipStandaloneInitialMarLoad: true,
      })
    ).toBe(true);
    expect(
      shouldDeferMarAllergyEncounterFetch({
        hasEncounterAllergySource: true,
        skipStandaloneInitialMarLoad: true,
      })
    ).toBe(true);
    expect(
      shouldDeferMarAllergyEncounterFetch({
        hasEncounterAllergySource: false,
        skipStandaloneInitialMarLoad: false,
      })
    ).toBe(false);
  });

  it("detects a visible medication cell from timeline payload", () => {
    expect(marShiftTimelineHasVisibleMedicationCell({ rows: [] })).toBe(false);
    expect(
      marShiftTimelineHasVisibleMedicationCell({
        rows: [{ cells: [{ items: [{ orderItemId: "x" }] }] }],
      })
    ).toBe(true);
  });

  it("inpatient MAR mounts the shift timeline before clinical-ops", () => {
    const panel = readSrc("features/inpatient-workspace/InpatientWorkspacePanel.tsx");
    const medsIdx = panel.indexOf('case "medications"');
    const tabIdx = panel.indexOf("<MedicationAdministrationTab", medsIdx);
    const opsIdx = panel.indexOf("<InpatientClinicalOpsPanel", medsIdx);
    expect(medsIdx).toBeGreaterThan(-1);
    expect(tabIdx).toBeGreaterThan(medsIdx);
    expect(opsIdx).toBeGreaterThan(tabIdx);
    expect(panel).toContain("loadEnabled={marClinicalOpsEnabled}");
    expect(panel).toContain("setMarClinicalOpsEnabled(true)");
  });

  it("does not execute loadAllStandalone on initial timeline-first mount", () => {
    const mar = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("shouldSkipStandaloneInitialMarLoad");
    expect(mar).toContain("ensureStandaloneMarBundle");
    expect(mar).toContain("ensureMarAllergyContext");
    expect(mar).toContain("if (useSharedClinicalData) return");
    expect(mar).toContain("void loadAllStandalone()");
    expect(mar).toContain("if (skipStandaloneInitialMarLoad)");
    expect(mar).toContain("shouldDeferMarCorrectionHistoryLoad");
    expect(mar).toContain("shouldDeferMarAllergyEncounterFetch");
  });

  it("does not wrap inpatient workspace in EncounterClinicalDataProvider", () => {
    const view = readSrc("features/inpatient-workspace/InpatientActiveWorkspaceView.tsx");
    const panel = readSrc("features/inpatient-workspace/InpatientWorkspacePanel.tsx");
    expect(view).not.toContain("EncounterClinicalDataProvider");
    expect(panel).not.toContain("EncounterClinicalDataProvider");
  });

  it("preserves loadAllStandalone for non-timeline and shared-cache contexts", () => {
    const mar = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("await loadAllStandalone()");
    expect(mar).toContain("useSharedClinicalData");
    expect(mar).not.toContain("isRoutineMarDueAdministerShortcut");
  });

  it("renders vitals banner after the timeline and reuses workspace vitals when provided", () => {
    const mar = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    const timelineIdx = mar.indexOf('data-testid="mar-workspace-timeline"');
    const vitalsIdx = mar.indexOf("<ClinicalLatestVitalsBanner");
    expect(timelineIdx).toBeGreaterThan(-1);
    expect(vitalsIdx).toBeGreaterThan(timelineIdx);
    expect(mar).toContain("latestEntry={latestVitalsEntry}");
    const banner = readSrc("components/clinical/ClinicalLatestVitalsBanner.tsx");
    expect(banner).toContain("fetchLatestVitalsHistoryEntry");
    expect(banner).toContain("latestEntry");
    expect(banner).toContain("fetchEnabled");
  });

  it("does not restore the DUE/OVERDUE administer shortcut", () => {
    const actions = readSrc("features/mar/marShiftTimelineActions.ts");
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(actions).not.toContain("isRoutineMarDueAdministerShortcut");
    expect(drawer).not.toContain("isRoutineMarDueAdministerShortcut");
  });

  it("updates section query with history.replaceState instead of App Router RSC", () => {
    const helper = readSrc("features/inpatient-workspace/inpatientWorkspaceSectionQuery.ts");
    const view = readSrc("features/inpatient-workspace/InpatientActiveWorkspaceView.tsx");
    expect(helper).toContain("window.history.replaceState");
    expect(view).toContain("replaceInpatientWorkspaceSectionQuery");
    expect(view).toContain('if (resolved === "medications") marOpenPerfMark("mar-click")');
    const selectIdx = view.indexOf("const selectSection = useCallback");
    const selectBlock = view.slice(selectIdx, selectIdx + 900);
    expect(selectBlock).toContain("replaceInpatientWorkspaceSectionQuery(resolved)");
    expect(selectBlock).not.toContain("router.replace");
  });

  it("does not re-sync section from stale App Router searchParams after replaceState", () => {
    const view = readSrc("features/inpatient-workspace/InpatientActiveWorkspaceView.tsx");
    expect(view).toContain('addEventListener("popstate"');
    expect(view).not.toContain("[searchParams, resolveAllowedSection]");
  });

  it("hydrates stored shift before the first timeline request", () => {
    const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain("initialMarShiftTimelineShiftCode");
    expect(timeline).toContain("useState<MarShiftTimelineShiftCode>(() =>");
  });

  it("loads correction history when timeline correction UI opens", () => {
    const mar = readSrc("components/encounters/MedicationAdministrationTab.tsx");
    const drawer = readSrc("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(mar).toContain("timelineCorrectionUiOpen");
    expect(mar).toContain("Boolean(adminTimeModalRow) || timelineCorrectionUiOpen");
    expect(drawer).toContain("MarAdministrationRowCorrectionControls");
    expect(drawer).toContain("onCorrectionUiOpenChange");
  });
});
