import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

const facilityFixture = {
  name: "Wayne Urgent Care Emergency Room",
  addressLine1: "123 Healthcare Blvd",
  city: "Wayne",
  stateProvince: "NJ",
  postalCode: "07470",
  phone: "(973) 555-0100",
};

const basePatient = {
  firstName: "Jean",
  lastName: "Patient",
  dob: "1990-01-01",
  sex: "M",
} as const;

const baseEncounter = {
  createdAt: "2026-06-23T08:00:00.000Z",
  dischargeSummaryJson: null,
} as const;

describe("dischargeSummary print polish", () => {
  it("centers facility header and keeps Discharge Summary title", () => {
    const html = getDischargePrintHtml({
      patient: basePatient,
      encounter: baseEncounter,
      facility: facilityFixture,
      language: "en",
    });
    expect(html).toContain("text-align:center");
    expect(html).toContain("Wayne Urgent Care Emergency Room");
    expect(html).toContain("123 Healthcare Blvd, Wayne, NJ 07470");
    expect(html).toContain("(973) 555-0100");
    expect(html).toContain("Discharge summary");
    expect(html).not.toContain("printOutput.common.printedAt");
    expect(html).toContain("Document generated on");
  });

  it("shows clean fallback when no structured discharge summary exists", () => {
    const html = getDischargePrintHtml({
      patient: basePatient,
      encounter: baseEncounter,
      facilityName: "Clinic Test",
      language: "en",
    });
    expect(html).toContain("No structured discharge summary has been recorded for this encounter yet.");
    expect(html).not.toContain("printOutput.discharge.noStructuredSummary");
  });
});

describe("provider discharge print access", () => {
  it("EmergencyDispositionPanel renders Print Discharge Summary and reuses printDischarge", () => {
    const source = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(source).toContain('t("emergencyDisposition.printDischargeSummary")');
    expect(source).toContain("printDischarge(");
    expect(source).toContain("handlePrintDischargeSummary");
  });

  it("nursing handoff panel still uses the same printDischarge helper", () => {
    const nursing = readSrc("features/emergency/EmergencyErNursingHandoffPanel.tsx");
    const disposition = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
    expect(nursing).toContain("printDischarge(");
    expect(disposition).toContain("printDischarge(");
    expect(nursing).toContain('t("emergencyErNursingHandoff.printDischargeDoc")');
  });

  it("provider disposition passes facilityName from chart views", () => {
    const chart = readSrc("features/emergency/EmergencyChartView.tsx");
    const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(chart).toMatch(/EmergencyDispositionPanel[\s\S]*facilityName=\{facilityName\}/);
    expect(workspace).toMatch(/EmergencyDispositionPanel[\s\S]*facilityName=\{facilityName\}/);
  });
});
