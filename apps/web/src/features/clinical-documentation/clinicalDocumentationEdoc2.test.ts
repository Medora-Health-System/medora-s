import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("EDOC.2 clinical documentation persistence UI", () => {
  const hubSource = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const panelSource = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyNursingReassessmentPanel.tsx"),
    "utf8"
  );
  const apiSource = readFileSync(join(webSrcRoot, "lib/clinicalDocumentationApi.ts"), "utf8");
  const chartTabsSource = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartClinicalTabs.tsx"),
    "utf8"
  );
  const printSource = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartPrintLayout.tsx"),
    "utf8"
  );
  const summarySource = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyVisitSummaryPanel.tsx"),
    "utf8"
  );
  const erNotesSource = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyErNotesPanel.tsx"),
    "utf8"
  );

  it("hub loads and displays saved entries", () => {
    expect(hubSource).toContain("clinical-documentation-saved-entries");
    expect(hubSource).toContain("fetchClinicalDocumentationEntries");
    expect(hubSource).toContain("clinical-documentation-saved-entry");
    expect(hubSource).toContain("entry.authorDisplayName");
    expect(hubSource).toContain("entry.authorRoleTitle");
  });

  it("panel passes encounter and facility for persistence", () => {
    expect(panelSource).toContain("encounterId={encounterId}");
    expect(panelSource).toContain("facilityId={facilityId}");
  });

  it("API client targets EDOC.2 routes", () => {
    expect(apiSource).toContain("/clinical-documentation");
    expect(apiSource).toContain("createClinicalDocumentationEntry");
  });

  it("foundation-only cards stay disabled for save", () => {
    expect(hubSource).toContain('c.implementationStatus !== "AVAILABLE"');
    expect(hubSource).toContain("not-allowed");
  });

  it("legal chart surfaces include clinical documentation entries", () => {
    expect(chartTabsSource).toContain("clinicalDocumentationEntries");
    expect(printSource).toContain("clinicalDocumentationEntries");
    expect(summarySource).toContain("clinicalDocumentationEntries");
  });

  it("MEDNOTE panel unchanged", () => {
    expect(erNotesSource).toContain("encounterNotesApi");
    expect(erNotesSource).not.toContain("clinicalDocumentationApi");
  });
});
