import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation immediate witness (EDOC.8B)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const modal = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationWitnessSearchModal.tsx"),
    "utf8"
  );
  const api = readFileSync(join(webSrcRoot, "lib/clinicalDocumentationApi.ts"), "utf8");

  it("hub routes immediate-witness cards through pre-save modal flow", () => {
    expect(hub).toContain("requiresImmediateWitnessCapture");
    expect(hub).toContain("submitClinicalDocumentation");
    expect(hub).toContain("immediateWitnessDraft");
    expect(hub).toContain("createClinicalDocumentationEntryWithWitness");
    expect(hub).toContain('mode={immediateWitnessDraft ? "pre-save" : "existing-entry"}');
  });

  it("witness modal supports pre-save and existing-entry modes", () => {
    expect(modal).toContain('ClinicalDocumentationWitnessModalMode');
    expect(modal).toContain("pre-save");
    expect(modal).toContain("existing-entry");
    expect(modal).toContain("cannotBeAuthor");
    expect(modal).toContain("immediateTitle");
  });

  it("API client exposes createClinicalDocumentationEntryWithWitness", () => {
    expect(api).toContain("createClinicalDocumentationEntryWithWitness");
    expect(api).toContain("/clinical-documentation/with-witness");
  });

  it("cancel immediate witness shows required message", () => {
    expect(hub).toContain("cancelImmediateWitnessDraft");
    expect(hub).toContain("witnessModal.cancelWithoutSave");
  });

  it("existing pending witness flow preserved", () => {
    expect(hub).toContain("witnessClinicalDocumentationEntry");
    expect(hub).toContain("openWitnessModal");
    expect(hub).toContain("finalizeWitness");
  });
});

describe("clinical documentation blood product vital summaries in UI paths (EDOC.7D)", () => {
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

  it("patient summary uses blood product summary helper", () => {
    expect(summaryPanel).toContain("appendBloodProductPatientSummaryLines");
  });

  it("patient chart and print use clinical documentation summaries", () => {
    expect(chartTabs).toContain("selectClinicalDocumentationPayloadSummary");
    expect(printLayout).toContain("selectClinicalDocumentationPayloadSummary");
  });
});
