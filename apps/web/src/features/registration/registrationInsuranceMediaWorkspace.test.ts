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

describe("MEDUI.REGISTRATION.INSURANCE_AND_MEDIA_WORKSPACE", () => {
  const registrationPage = readApp("registration/page.tsx");
  const patientChartPage = readApp("patients/[id]/page.tsx");

  // --- i18n keys ---
  const enMessages = readSrc("i18n/messages/en.ts");
  const frMessages = readSrc("i18n/messages/fr.ts");

  describe("Registration dashboard tiles", () => {
    it("renders Insurance tile with i18n keys", () => {
      expect(registrationPage).toContain('t("registrationHome.cardInsuranceTitle")');
      expect(registrationPage).toContain('t("registrationHome.cardInsuranceHint")');
    });

    it("renders My Media tile with i18n keys", () => {
      expect(registrationPage).toContain('t("registrationHome.cardMyMediaTitle")');
      expect(registrationPage).toContain('t("registrationHome.cardMyMediaHint")');
    });

    it("does not render Fracture tile", () => {
      expect(registrationPage).not.toContain("/app/fracture");
      expect(registrationPage).not.toContain('t("nav.fracture")');
      expect(registrationPage).not.toContain("cardFractureHint");
    });
  });

  describe("Insurance workspace (inline in registration)", () => {
    it("registration page imports insurance panels", () => {
      expect(registrationPage).toContain("PatientPrimaryInsurancePanel");
      expect(registrationPage).toContain("PatientSecondaryInsurancePanel");
    });

    it("registration page has insurance section anchor", () => {
      expect(registrationPage).toContain('id="registration-insurance-section"');
    });

    it("insurance saved data still loads correctly (API path preserved)", () => {
      const insurancePanel = readSrc("components/patient-chart/PatientInsuranceCoveragePanel.tsx");
      expect(insurancePanel).toContain("/patients/");
      expect(insurancePanel).toContain("/insurance");
    });
  });

  describe("Clinical chart cleanup — read-only insurance", () => {
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

  describe("My Media workspace", () => {
    it("registration page imports PatientMyMediaSection", () => {
      expect(registrationPage).toContain("PatientMyMediaSection");
    });

    it("registration page has media section anchor", () => {
      expect(registrationPage).toContain('id="registration-media-section"');
    });

    it("My Media component uses proper i18n keys", () => {
      const mediaSection = readSrc("components/patient-chart/PatientMyMediaSection.tsx");
      expect(mediaSection).toContain('t("myMedia.uploadHeading")');
      expect(mediaSection).toContain('t("myMedia.documentTypeLabel")');
      expect(mediaSection).toContain('t("myMedia.listHeading")');
      expect(mediaSection).toContain('t("myMedia.emptyList")');
      expect(mediaSection).toContain('t("myMedia.colType")');
      expect(mediaSection).toContain('t("myMedia.colFileName")');
      expect(mediaSection).toContain('t("myMedia.colUploadedBy")');
      expect(mediaSection).toContain('t("myMedia.colUploadedAt")');
    });

    it("My Media component shows document type options", () => {
      const mediaSection = readSrc("components/patient-chart/PatientMyMediaSection.tsx");
      expect(mediaSection).toContain("INSURANCE_CARD_FRONT");
      expect(mediaSection).toContain("INSURANCE_CARD_BACK");
      expect(mediaSection).toContain("PATIENT_ID");
      expect(mediaSection).toContain("CONSENT_FORM");
      expect(mediaSection).toContain("REFERRAL_PAPER");
      expect(mediaSection).toContain("OTHER_REGISTRATION");
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

    it("EN has My Media tile keys", () => {
      expect(enMessages).toContain("cardMyMediaTitle");
      expect(enMessages).toContain("cardMyMediaHint");
    });

    it("FR has My Media tile keys", () => {
      expect(frMessages).toContain("cardMyMediaTitle");
      expect(frMessages).toContain("cardMyMediaHint");
    });

    it("EN has myMedia namespace keys", () => {
      expect(enMessages).toContain("myMedia:");
      expect(enMessages).toContain("uploadHeading");
      expect(enMessages).toContain("documentTypeLabel");
      expect(enMessages).toContain("typeInsuranceCardFront");
      expect(enMessages).toContain("typePatientId");
      expect(enMessages).toContain("listHeading");
      expect(enMessages).toContain("emptyList");
    });

    it("FR has myMedia namespace keys", () => {
      expect(frMessages).toContain("myMedia:");
      expect(frMessages).toContain("uploadHeading");
      expect(frMessages).toContain("documentTypeLabel");
      expect(frMessages).toContain("typeInsuranceCardFront");
      expect(frMessages).toContain("typePatientId");
      expect(frMessages).toContain("listHeading");
      expect(frMessages).toContain("emptyList");
    });

    it("EN has chartInsuranceSummary keys", () => {
      expect(enMessages).toContain("chartInsuranceSummary:");
      expect(enMessages).toContain("editInRegistration");
      expect(enMessages).toContain("noneOnFile");
    });

    it("FR has chartInsuranceSummary keys", () => {
      expect(frMessages).toContain("chartInsuranceSummary:");
      expect(frMessages).toContain("editInRegistration");
      expect(frMessages).toContain("noneOnFile");
    });

    it("registration page does not contain raw i18n keys (no unresolved t() calls with missing keys)", () => {
      expect(registrationPage).not.toContain("cardFractureHint");
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
