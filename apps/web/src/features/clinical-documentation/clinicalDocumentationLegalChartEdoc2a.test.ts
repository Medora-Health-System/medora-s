import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("EDOC.2A legal chart surfaces (clinical documentation)", () => {
  const summaryPanel = readFileSync(
    join(webSrcRoot, "features/emergency/EmergencyVisitSummaryPanel.tsx"),
    "utf8"
  );
  const chartTabs = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartClinicalTabs.tsx"),
    "utf8"
  );
  const printLayout = readFileSync(
    join(webSrcRoot, "components/patient-chart/PatientChartPrintLayout.tsx"),
    "utf8"
  );
  const chartApi = readFileSync(join(webSrcRoot, "lib/chartApi.ts"), "utf8");
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );

  it("encounter summary shows structured documentation section with metadata and payload lines", () => {
    expect(summaryPanel).toContain("clinicalDocumentation.summarySectionTitle");
    expect(summaryPanel).toContain("entry.cardTitleEn");
    expect(summaryPanel).toContain("entry.cardTitleFr");
    expect(summaryPanel).toContain("entry.authorDisplayName");
    expect(summaryPanel).toContain("entry.authorRoleTitle");
    expect(summaryPanel).toContain("entry.createdAt");
    expect(summaryPanel).toContain("selectClinicalDocumentationPayloadSummary");
    expect(summaryPanel).toContain("line.key");
    expect(summaryPanel).toContain("line.value");
    expect(summaryPanel).not.toContain("preview-only");
  });

  it("patient chart tabs and print layout render clinical documentation entries", () => {
    expect(chartTabs).toContain("clinicalDocumentation.chartSectionTitle");
    expect(chartTabs).toContain("clinicalDocumentationEntries");
    expect(chartTabs).toContain("selectClinicalDocumentationPayloadSummary");
    expect(printLayout).toContain('pc("clinicalDocumentation")');
    expect(printLayout).toContain("selectClinicalDocumentationPayloadSummary");
    expect(printLayout).toContain("line.key");
    expect(printLayout).toContain("line.value");
  });

  it("chart API type includes full payloadJson and bilingual summaries for legal record", () => {
    expect(chartApi).toContain("clinicalDocumentationEntries");
    expect(chartApi).toContain("payloadJson: Record<string, unknown>");
    expect(chartApi).toContain("payloadSummaryEn");
    expect(chartApi).toContain("payloadSummaryFr");
  });

  it("hub displays saved entries with author, role, time, and localized summary lines", () => {
    expect(hub).toContain("clinicalDocumentation.savedEntriesTitle");
    expect(hub).toContain("selectClinicalDocumentationPayloadSummary");
    expect(hub).toContain("entry.authorDisplayName");
    expect(hub).toContain("entry.authorRoleTitle");
  });
});
