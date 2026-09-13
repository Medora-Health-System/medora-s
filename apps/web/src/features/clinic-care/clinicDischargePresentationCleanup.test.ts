import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src/features/clinic-care");
const header = readFileSync(join(root, "ClinicCareAmbulatoryPatientHeader.tsx"), "utf8");
const panels = readFileSync(join(root, "ClinicCareAmbulatoryWorkspacePanels.tsx"), "utf8");
const discharge = readFileSync(join(root, "ClinicCareAmbulatoryDischargeWorkflow.tsx"), "utf8");

describe("Clinic discharge presentation cleanup", () => {
  it("uses compact physician labels in EN/ES/FR and omits workflow state from the patient identity line", () => {
    expect(header).toContain('if (language === "es") return "Médico"');
    expect(header).toContain('if (language === "fr") return "Médecin"');
    expect(header).toContain('return "Physician"');
    expect(header).not.toContain('t("clinicCareD4c5b.header.status")');
    expect(header).not.toContain('{workflowStateLabel}');
  });

  it("removes the redundant follow-up completion hint for every locale", () => {
    expect(panels).not.toContain('t("clinicCareD4c5b.followUp.completeHint")');
  });

  it("removes discharge explanatory copy while retaining the functional headings and engine", () => {
    expect(discharge).not.toContain('t("clinicCareD4c7.checkout.subtitle")');
    expect(discharge).not.toContain('t("clinicCareD4c7.discharge.sharedEngineHint")');
    expect(discharge).not.toContain('t("clinicCareD4c7a.discharge.singleEngineHint")');
    expect(discharge).toContain('t("clinicCareD4c7.checkout.title")');
    expect(discharge).toContain("<ProviderDischargeDocumentationSection");
  });

  it("shows the public-health block only in the French product locale", () => {
    expect(discharge).toContain('language === "fr" ? (');
    expect(discharge).toContain('data-testid="clinic-care-d4c7-public-health-links"');
    expect(discharge).toContain('t("clinicCareD4c7.publicHealth.vaccinations")');
    expect(discharge).toContain('t("clinicCareD4c7.publicHealth.diseaseReports")');
    expect(discharge).toContain('t("clinicCareD4c7.pharmacy.openEnterprise")');
  });
});
