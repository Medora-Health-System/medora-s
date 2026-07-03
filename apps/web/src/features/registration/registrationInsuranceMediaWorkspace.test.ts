import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function readApp(relativePath: string): string {
  return readFileSync(join(webRoot, "../app/app", relativePath), "utf8");
}

describe("MEDUI.REGISTRATION.INSURANCE_AND_DOCUMENT_CENTER", () => {
  const registrationPage = readApp("registration/page.tsx");
  const patientChartPage = readApp("patients/[id]/page.tsx");
  const enMessages = readSrc("i18n/messages/en.ts");
  const frMessages = readSrc("i18n/messages/fr.ts");

  describe("Registration dashboard tiles", () => {
    it("renders Insurance tile with i18n keys", () => {
      expect(registrationPage).toContain('t("registrationHome.cardInsuranceTitle")');
      expect(registrationPage).toContain('t("registrationHome.cardInsuranceHint")');
    });

    it("renders Document Center tile with i18n keys", () => {
      expect(registrationPage).toContain('t("registrationHome.cardDocumentCenterTitle")');
      expect(registrationPage).toContain('t("registrationHome.cardDocumentCenterHint")');
    });

    it("does not render Fracture tile", () => {
      expect(registrationPage).not.toContain("/app/fracture");
      expect(registrationPage).not.toContain("cardFractureHint");
    });

    it("does not contain My Media tile", () => {
      expect(registrationPage).not.toContain("cardMyMediaTitle");
      expect(registrationPage).not.toContain("PatientMyMediaSection");
    });

    it("Insurance tile opens insurance section when patient selected", () => {
      expect(registrationPage).toContain('document.getElementById("registration-insurance-section")');
    });

    it("Document Center tile opens document center section when patient selected", () => {
      expect(registrationPage).toContain('document.getElementById("registration-document-center-section")');
    });

    it("tiles focus search when no patient selected", () => {
      expect(registrationPage).toContain('querySelector<HTMLInputElement>(\'input[type="search"]\')');
    });
  });

  describe("Insurance workspace in registration", () => {
    it("registration page imports insurance panels", () => {
      expect(registrationPage).toContain("PatientPrimaryInsurancePanel");
      expect(registrationPage).toContain("PatientSecondaryInsurancePanel");
    });

    it("registration page has insurance section anchor", () => {
      expect(registrationPage).toContain('id="registration-insurance-section"');
    });

    it("insurance API path is preserved", () => {
      const insurancePanel = readSrc("components/patient-chart/PatientInsuranceCoveragePanel.tsx");
      expect(insurancePanel).toContain("/patients/");
      expect(insurancePanel).toContain("/insurance");
    });
  });

  describe("Clinical chart — read-only insurance", () => {
    it("patient chart does not import editable insurance panels", () => {
      expect(patientChartPage).not.toContain("PatientPrimaryInsurancePanel");
      expect(patientChartPage).not.toContain("PatientSecondaryInsurancePanel");
    });

    it("patient chart renders ChartInsuranceReadOnlySummary", () => {
      expect(patientChartPage).toContain("ChartInsuranceReadOnlySummary");
    });

    it("read-only summary links to registration", () => {
      expect(patientChartPage).toContain("/app/registration?patient=");
      expect(patientChartPage).toContain('t("chartInsuranceSummary.editInRegistration")');
    });

    it("read-only summary uses proper i18n keys", () => {
      expect(patientChartPage).toContain('t("chartInsuranceSummary.heading")');
      expect(patientChartPage).toContain('t("chartInsuranceSummary.primaryLabel")');
      expect(patientChartPage).toContain('t("chartInsuranceSummary.secondaryLabel")');
      expect(patientChartPage).toContain('t("chartInsuranceSummary.noneOnFile")');
    });
  });

  describe("Document Center workspace in registration", () => {
    it("registration page imports RegistrationDocumentCenter", () => {
      expect(registrationPage).toContain("RegistrationDocumentCenter");
    });

    it("registration page has document center section", () => {
      expect(registrationPage).toContain('id="registration-document-center-section"');
    });

    it("document center receives patientId and facilityId", () => {
      expect(registrationPage).toContain("patientId={selectedRegPatient.id}");
      expect(registrationPage).toContain("facilityId={effectiveFacilityId}");
    });
  });

  describe("i18n safety", () => {
    it("EN has Insurance tile keys", () => {
      expect(enMessages).toContain("cardInsuranceTitle");
      expect(enMessages).toContain("cardInsuranceHint");
    });

    it("FR has Insurance tile keys", () => {
      expect(frMessages).toContain("cardInsuranceTitle");
      expect(frMessages).toContain("cardInsuranceHint");
    });

    it("EN has Document Center tile keys", () => {
      expect(enMessages).toContain("cardDocumentCenterTitle");
      expect(enMessages).toContain("cardDocumentCenterHint");
    });

    it("FR has Document Center tile keys", () => {
      expect(frMessages).toContain("cardDocumentCenterTitle");
      expect(frMessages).toContain("cardDocumentCenterHint");
    });

    it("EN has chartInsuranceSummary keys", () => {
      expect(enMessages).toContain("chartInsuranceSummary:");
      expect(enMessages).toContain("editInRegistration");
    });

    it("FR has chartInsuranceSummary keys", () => {
      expect(frMessages).toContain("chartInsuranceSummary:");
      expect(frMessages).toContain("editInRegistration");
    });

    it("no myMedia i18n keys remain", () => {
      expect(enMessages).not.toContain("myMedia:");
      expect(frMessages).not.toContain("myMedia:");
    });
  });

  describe("No clinical workflow regression", () => {
    it("patient chart still has face sheet link", () => {
      expect(patientChartPage).toContain("facesheet");
    });

    it("patient chart still has tabs", () => {
      expect(patientChartPage).toContain("activeTab");
    });

    it("registration page still has patient search", () => {
      expect(registrationPage).toContain("runRegistrationPatientSearch");
    });

    it("registration page still has New patient link", () => {
      expect(registrationPage).toContain("/app/patients?new=1");
    });

    it("registration page still has follow-ups section", () => {
      expect(registrationPage).toContain("followUps");
    });
  });
});
