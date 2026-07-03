import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("Closed encounter chart UI cleanup (MEDUI.EDBOARD.CHART_POLISH)", () => {
  const chartView = readSrc("features/emergency/EmergencyChartView.tsx");

  it("does not render raw encounterChrome.nir key", () => {
    expect(chartView).not.toContain('"encounterChrome.nir"');
    expect(chartView).not.toContain("'encounterChrome.nir'");
  });

  it("does not render raw encounterChrome.ageSex key", () => {
    expect(chartView).not.toContain('"encounterChrome.ageSex"');
    expect(chartView).not.toContain("'encounterChrome.ageSex'");
  });

  it("does not render raw encounterChrome.chiefComplaintShort key", () => {
    expect(chartView).not.toContain('"encounterChrome.chiefComplaintShort"');
    expect(chartView).not.toContain("'encounterChrome.chiefComplaintShort'");
  });

  it("does not render raw encounterChrome.arrival key", () => {
    expect(chartView).not.toContain('"encounterChrome.arrival"');
    expect(chartView).not.toContain("'encounterChrome.arrival'");
  });

  it("does not render raw encounterChrome.room key", () => {
    expect(chartView).not.toContain('"encounterChrome.room"');
    expect(chartView).not.toContain("'encounterChrome.room'");
  });

  it('does not render "Consolidated view of ED workflows" copy', () => {
    expect(chartView).not.toContain("Consolidated view of ED workflows");
  });

  it("header uses valid i18n keys for MRN, age/sex, complaint, arrival, room", () => {
    expect(chartView).toContain('t("printOutput.patientChart.nirMrn")');
    expect(chartView).toContain('t("emergencyTrackboard.ageSexLabel")');
    expect(chartView).toContain('t("emergencyTrackboard.chiefComplaintShort")');
    expect(chartView).toContain('t("emergencyTrackboard.arrivalLabel")');
    expect(chartView).toContain('"printOutput.patientChart.room"');
  });

  it("link to full encounter chart uses concise i18n key", () => {
    expect(chartView).toContain('t("emergencyChartView.linkMedoraEncounterRef")');
    expect(chartView).not.toContain("Open Medora encounter chart (reference)");
  });
});

describe("Closed encounter print buttons (MEDUI.EDBOARD.CLOSED_CHART_PRINT)", () => {
  const closureSurface = readSrc(
    "features/emergency/EmergencyErSummaryClosureSurface.tsx"
  );

  it("closed chart renders Print ER Packet button", () => {
    expect(closureSurface).toContain('t("emergencyErClosure.encounterClosedPrintErPacket")');
  });

  it("existing discharge summary print still renders", () => {
    expect(closureSurface).toContain(
      't("emergencyErClosure.encounterClosedPrintDischargeSummary")'
    );
  });

  it("imports printDischarge for discharge summary print", () => {
    expect(closureSurface).toContain("printDischarge");
  });

  it("closed chart prints use handlePrint and handlePrintDischargeSummary callbacks", () => {
    expect(closureSurface).toContain("handlePrint");
    expect(closureSurface).toContain("handlePrintDischargeSummary");
  });

  it("does not import lifecycle engine", () => {
    expect(closureSurface).not.toContain("edEncounterLifecycle");
    expect(closureSurface).not.toContain("lifecycleEngine");
    expect(closureSurface).not.toContain("LifecycleEngine");
  });
});
