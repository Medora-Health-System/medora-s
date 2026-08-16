import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D5A3_CERTIFICATION_ID,
  enterpriseDentalEncounterWorkspacePath,
  isDentalEncounterProjection,
  mergeDentalServiceLineIntoNursingAssessment,
  buildDentalServiceLineTag,
  resolveEnterprisePatientEncounterIndexHref,
  shouldShowEnterpriseReopenAction,
} from "@medora/shared";

describe("MEDUI.D5A.3 dental encounter workspace (web)", () => {
  it("wires canonical dental encounter route", () => {
    const page = readFileSync(
      resolve(__dirname, "../../../app/app/dental/encounters/[encounterId]/page.tsx"),
      "utf8"
    );
    expect(page).toContain("EnterpriseDentalEncounterWorkspace");
    expect(enterpriseDentalEncounterWorkspacePath("abc")).toBe("/app/dental/encounters/abc");
  });

  it("workspace reuses enterprise engines and forbids Dental* forks", () => {
    const ws = readFileSync(resolve(__dirname, "./EnterpriseDentalEncounterWorkspace.tsx"), "utf8");
    expect(ws).toContain("EnterpriseClosedEncounterViewer");
    expect(ws).toContain("EnterpriseDentalClinicalEvaluationPanel");
    expect(ws).toContain("EnterpriseDentalEncounterOverviewPanel");
    expect(ws).toContain("EnterpriseDentalPeriodontalChartPanel");
    expect(ws).toContain("EnterpriseDentalTreatmentPlanPanel");
    expect(ws).toContain("EnterpriseDentalProceduresPanel");
    expect(ws).not.toContain("ClinicCareAmbulatoryMedicalEvaluationPanel");
    expect(ws).toContain("ClinicCareAmbulatoryPrescriptionPanel");
    expect(ws).toContain("EncounterDiagnosticsPanel");
    expect(ws).toContain("EmergencyErOrdersPanel");
    expect(ws).toContain("EmergencyErNotesPanel");
    expect(ws).toContain("EnterpriseDentalMedicalHistoryPanel");
    expect(ws).toContain("RegistrationDocumentCenter");
    expect(ws).not.toContain("MedicationAdministrationTab");
    expect(ws).not.toContain("PlaceholderCard");
    expect(ws).not.toMatch(/\bclass\s+DentalPatient\b/);
    expect(ws).not.toMatch(/\bDentalPrescription\b/);
    expect(ws).not.toMatch(/\bDentalFollowUp\b/);
  });

  it("OPEN dental routes to dental workspace; CLOSED to enterprise record", () => {
    expect(
      resolveEnterprisePatientEncounterIndexHref({
        id: "d1",
        status: "OPEN",
        type: "OUTPATIENT",
        careSetting: "DENTAL",
      })
    ).toBe("/app/dental/encounters/d1");
    expect(
      resolveEnterprisePatientEncounterIndexHref({
        id: "d1",
        status: "CLOSED",
        type: "OUTPATIENT",
        careSetting: "DENTAL",
      })
    ).toBe("/app/encounters/d1");
  });

  it("clinic and ED encounters are not dental projections", () => {
    expect(isDentalEncounterProjection({ type: "OUTPATIENT" })).toBe(false);
    expect(isDentalEncounterProjection({ type: "EMERGENCY" })).toBe(false);
    expect(
      isDentalEncounterProjection({
        type: "OUTPATIENT",
        nursingAssessment: mergeDentalServiceLineIntoNursingAssessment(
          null,
          buildDentalServiceLineTag()
        ),
      })
    ).toBe(true);
  });

  it("reopen remains Admin-only", () => {
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["ADMIN"] })).toBe(true);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["PROVIDER"] })).toBe(
      false
    );
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["RN"] })).toBe(false);
  });

  it("FR/EN dentalCareD5a3 keys exist", () => {
    const fr = readFileSync(resolve(__dirname, "../../i18n/messages/fr.ts"), "utf8");
    const en = readFileSync(resolve(__dirname, "../../i18n/messages/en.ts"), "utf8");
    for (const src of [fr, en]) {
      expect(src).toContain("dentalCareD5a3:");
      expect(src).toContain("sections:");
    }
    expect(fr).toContain("Évaluation dentaire");
    expect(en).toContain("Dental evaluation");
    expect(en).toContain("Medical history");
    expect(D5A3_CERTIFICATION_ID).toBe("MEDUI.D5A.3");
  });

  it("dashboard uses dental worklist API and D4C.10D claim-or-start", () => {
    const dash = readFileSync(resolve(__dirname, "./DentalCareDashboardView.tsx"), "utf8");
    expect(dash).toContain("/dental-care/worklist");
    expect(dash).toContain("claim-or-start");
    expect(dash).toContain("enterpriseDentalEncounterWorkspacePath");
  });
});
