import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  filterImagingResultRows,
  filterLabResultRows,
  getImagingResultsPrintHtml,
  getLabResultsPrintHtml,
  getSingleImagingResultPrintHtml,
  getSingleLabResultPrintHtml,
} from "./resultPrintPacket";
import type { EncounterLabRadRow } from "@/components/encounters/EncounterResultsTab";

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

const patientFixture = {
  firstName: "Jean",
  lastName: "Patient",
  dob: "1990-01-01",
  mrn: "MRN-100",
  sex: "M",
};

const encounterFixture = {
  id: "enc-123",
  createdAt: "2026-06-23T08:00:00.000Z",
  physicianAssigned: { firstName: "Amy", lastName: "Provider" },
};

const labRow: EncounterLabRadRow = {
  order: {
    createdAt: "2026-06-23T08:30:00.000Z",
    createdByDisplay: { name: "Dr Orderer", role: "PROVIDER" },
  },
  item: {
    id: "lab-1",
    catalogItemType: "LAB_TEST",
    status: "RESULTED",
    displayLabelEn: "CBC",
    result: {
      resultText: "Hemoglobin: 12.5 g/dL (ref 12.0-16.0)",
      verifiedAt: "2026-06-23T10:00:00.000Z",
      effectiveResultedAt: "2026-06-23T09:45:00.000Z",
      criticalValue: false,
      enteredByDisplayFr: "Lab Tech One",
      acknowledgedByDisplayFr: "Dr Reviewer",
      acknowledgedByProviderAt: "2026-06-23T10:30:00.000Z",
      resultData: { specimen: "Whole blood" },
    },
  },
  pendingSync: false,
};

const imagingRow: EncounterLabRadRow = {
  order: {
    createdAt: "2026-06-23T08:40:00.000Z",
    orderedByDisplayName: "Dr Rad Orderer",
  },
  item: {
    id: "img-1",
    catalogItemType: "IMAGING_STUDY",
    status: "RESULTED",
    displayLabelEn: "Chest X-ray",
    result: {
      resultText: "Findings: No acute cardiopulmonary process.\n\nImpression: Normal chest radiograph.",
      verifiedAt: "2026-06-23T11:00:00.000Z",
      effectiveFinalizedAt: "2026-06-23T11:00:00.000Z",
      criticalValue: true,
      enteredByDisplayFr: "Dr Radiologist",
      acknowledgedByDisplayFr: "Dr Attending",
    },
  },
  pendingSync: false,
};

const printCtx = {
  patient: patientFixture,
  encounter: encounterFixture,
  facility: facilityFixture,
  language: "en" as const,
};

describe("resultPrintPacket", () => {
  it("filters lab and imaging rows", () => {
    const rows = [labRow, imagingRow];
    expect(filterLabResultRows(rows)).toHaveLength(1);
    expect(filterImagingResultRows(rows)).toHaveLength(1);
  });

  it("bulk lab print HTML includes facility header, patient identifiers, and attribution", () => {
    const html = getLabResultsPrintHtml(printCtx, [labRow, imagingRow]);
    expect(html).toContain("text-align:center");
    expect(html).toContain("Wayne Urgent Care Emergency Room");
    expect(html).toContain("Jean Patient");
    expect(html).toContain("MRN-100");
    expect(html).toContain("Laboratory results report");
    expect(html).toContain("CBC");
    expect(html).toContain("Ordered by");
    expect(html).toContain("Dr Orderer");
    expect(html).toContain("Resulted by");
    expect(html).toContain("Lab Tech One");
    expect(html).toContain("Reviewed by");
    expect(html).toContain("Dr Reviewer");
    expect(html).toContain("Whole blood");
    expect(html).not.toContain("printOutput.results");
    expect(html).toContain("Document generated on");
  });

  it("bulk imaging print HTML includes all imaging reports with attribution and critical flag", () => {
    const html = getImagingResultsPrintHtml(printCtx, [labRow, imagingRow]);
    expect(html).toContain("Imaging results report");
    expect(html).toContain("Chest X-ray");
    expect(html).toContain("Critical");
    expect(html).toContain("Findings");
    expect(html).toContain("Impression");
    expect(html).toContain("Dr Radiologist");
    expect(html).toContain("Dr Attending");
    expect(html).not.toContain("CBC");
  });

  it("single lab print includes one result", () => {
    const html = getSingleLabResultPrintHtml(printCtx, labRow);
    expect(html).toContain("Laboratory result");
    expect(html).toContain("CBC");
    expect(html).not.toContain("Chest X-ray");
  });

  it("single imaging print includes one result", () => {
    const html = getSingleImagingResultPrintHtml(printCtx, imagingRow);
    expect(html).toContain("Imaging result");
    expect(html).toContain("Chest X-ray");
    expect(html).not.toContain("CBC");
  });
});

describe("results print UI wiring", () => {
  it("EncounterResultsTab renders bulk and individual print actions when enabled", () => {
    const source = readSrc("components/encounters/EncounterResultsTab.tsx");
    expect(source).toContain('t("emergencyResultsPanel.printAllLabResults")');
    expect(source).toContain('t("emergencyResultsPanel.printAllImagingResults")');
    expect(source).toContain('t("emergencyResultsPanel.printResult")');
    expect(source).toContain("printLabResults(");
    expect(source).toContain("printImagingResults(");
    expect(source).toContain("printSingleResult(");
    expect(source).toContain("enableResultPrint");
  });

  it("EmergencyResultsPanel enables result print context for ED Results", () => {
    const panel = readSrc("features/emergency/EmergencyResultsPanel.tsx");
    const chart = readSrc("features/emergency/EmergencyChartView.tsx");
    expect(panel).toContain("enableResultPrint");
    expect(chart).toMatch(/EmergencyResultsPanel[\s\S]*facilityName=\{facilityName\}/);
    expect(chart).toContain("encounterMeta=");
  });

  it("result print module does not import lifecycle engine", () => {
    const source = readSrc("features/emergency/resultPrintPacket.ts");
    expect(source).not.toMatch(/from\s+["'].*lifecycle/i);
  });
});
