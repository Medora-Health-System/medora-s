import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "app/app/patients");
const list = readFileSync(join(root, "page.tsx"), "utf8");
const detail = readFileSync(join(root, "[id]/page.tsx"), "utf8");
const shell = readFileSync(join(process.cwd(), "src/components/patient-chart/EnterprisePatientMedicalRecord.tsx"), "utf8");
const summary = readFileSync(join(process.cwd(), "src/components/patient-chart/PatientSummaryTab.tsx"), "utf8");

describe("Patient module summary-only contract", () => {
  it("does not create encounters from patient search", () => {
    expect(list).not.toContain("CreateConsultationModal");
    expect(list).not.toContain("setConsultationTarget");
  });

  it("does not expose encounter/documentation tabs or mutation actions in patient detail", () => {
    for (const forbidden of [
      "PatientQuickActions",
      "PatientConsultationsTab",
      "PatientVaccinationsTab",
      "PatientOrdersTabContent",
      "PatientResultsTabContent",
      "PatientImagingTabContent",
      "PatientMedicationsTabContent",
      "AddDiagnosisModal",
      "CreateFollowUpModal",
      "pendingOpenCreateEncounter",
    ]) expect(detail).not.toContain(forbidden);
  });

  it("keeps patient summary, profile editing, insurance and print chart", () => {
    expect(detail).toContain("PatientSummaryTab");
    expect(detail).toContain("ChartInsuranceReadOnlySummary");
    expect(detail).toContain("/profile");
    expect(detail).toContain("getPatientChartPrintHtml");
    expect(detail).toContain("printPatientChart");
  });

  it("removes legacy longitudinal/audit header chrome and print disclaimer", () => {
    expect(shell).not.toContain("/app/admin/audit");
    expect(shell).not.toContain("enterprisePatientMedicalRecordD4c8c.subtitle");
    expect(summary).not.toContain("summaryPrintPatientChartPreviewHint");
  });
});
