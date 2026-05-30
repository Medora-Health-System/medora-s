import { describe, expect, it } from "vitest";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  calculateRenalNetBalance,
  calculateRenalWeightChange,
  CRRT_MONITORING_REFERENCE_CARD_ID,
  DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID,
  DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
  EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS,
  FLUID_RESTRICTION_MONITORING_CARD_ID,
  HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID,
  isRenalValueWithinTolerance,
  PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID,
  RENAL_ESCALATION_EVENT_CARD_ID,
  RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
  RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID,
  URINE_OUTPUT_CONCERN_CARD_ID,
  summarizeDialysisRenalFluidPayload,
  validateDialysisRenalFluidManagementDocumentationPayloadForCard,
} from "./dialysisRenalFluidManagementDocumentationPayloads.js";

const ISO = "2026-05-28T14:00:00.000Z";

describe("dialysisRenalFluidManagementDocumentationPayloads (EDOC.21)", () => {
  it("all EDOC.21 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC21_DIALYSIS_RENAL_FLUID_MANAGEMENT_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("DIALYSIS_RENAL_FLUID_MANAGEMENT");
    }
  });

  it("dialysis access validation", () => {
    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        accessType: "TUNNELED_CATHETER",
        accessLocation: "LEFT_CHEST",
        thrillPresent: "NOT_APPLICABLE",
        bruitPresent: "NOT_APPLICABLE",
        siteStatus: "NORMAL",
        dressingStatus: "CLEAN_DRY_INTACT",
        infectionConcern: "NO",
        bleedingConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("AV fistula/graft thrill/bruit governance", () => {
    const badThrill = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        accessType: "AV_FISTULA",
        accessLocation: "LEFT_ARM",
        thrillPresent: "NOT_APPLICABLE",
        bruitPresent: "YES",
        siteStatus: "NORMAL",
        dressingStatus: "NOT_APPLICABLE",
        infectionConcern: "NO",
        bleedingConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(badThrill.ok).toBe(false);

    const badAbsent = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        accessType: "AV_GRAFT",
        accessLocation: "RIGHT_ARM",
        thrillPresent: "NO",
        bruitPresent: "YES",
        siteStatus: "NORMAL",
        dressingStatus: "NOT_APPLICABLE",
        infectionConcern: "NO",
        bleedingConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(badAbsent.ok).toBe(false);
  });

  it("rejects UNKNOWN for thrillPresent (YES/NO/NA only per spec)", () => {
    const bad = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        accessType: "TUNNELED_CATHETER",
        accessLocation: "LEFT_CHEST",
        thrillPresent: "UNKNOWN",
        bruitPresent: "NOT_APPLICABLE",
        siteStatus: "NORMAL",
        dressingStatus: "CLEAN_DRY_INTACT",
        infectionConcern: "NO",
        bleedingConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("hemodialysis monitoring validation", () => {
    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID,
      {
        documentationTime: ISO,
        dialysisStatus: "COMPLETED",
        estimatedFluidRemovedMl: 1500,
        bloodPressureConcern: "NO",
        crampingReported: "NO",
        accessIssueObserved: "NO",
        dialysisNurseNotified: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const held = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      HEMODIALYSIS_MONITORING_REFERENCE_CARD_ID,
      {
        documentationTime: ISO,
        dialysisStatus: "HELD",
        bloodPressureConcern: "NO",
        crampingReported: "NO",
        accessIssueObserved: "NO",
        dialysisNurseNotified: "NOT_APPLICABLE",
        providerNotified: "NO",
      }
    );
    expect(held.ok).toBe(false);
  });

  it("peritoneal dialysis validation", () => {
    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID,
      {
        documentationTime: ISO,
        pdStatus: "COMPLETED",
        effluentAppearance: "CLEAR",
        abdominalPain: "NO",
        exitSiteConcern: "NO",
        exchangeCompleted: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const cloudy = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      PERITONEAL_DIALYSIS_MONITORING_REFERENCE_CARD_ID,
      {
        documentationTime: ISO,
        pdStatus: "IN_PROGRESS",
        effluentAppearance: "CLOUDY",
        abdominalPain: "NO",
        exitSiteConcern: "NO",
        exchangeCompleted: "YES",
        providerNotified: "NO",
      }
    );
    expect(cloudy.ok).toBe(false);
  });

  it("CRRT validation", () => {
    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      CRRT_MONITORING_REFERENCE_CARD_ID,
      {
        documentationTime: ISO,
        crrtStatus: "IN_PROGRESS",
        accessStatus: "PATENT",
        filterConcern: "NO",
        hemodynamicInstability: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const paused = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      CRRT_MONITORING_REFERENCE_CARD_ID,
      {
        documentationTime: ISO,
        crrtStatus: "PAUSED",
        accessStatus: "PATENT",
        filterConcern: "NO",
        hemodynamicInstability: "NO",
        providerNotified: "NO",
      }
    );
    expect(paused.ok).toBe(false);
  });

  it("renal net balance calculation", () => {
    expect(calculateRenalNetBalance(2000, 1500)).toBe(500);
    expect(isRenalValueWithinTolerance(500.005, 500)).toBe(true);
  });

  it("renal I&O mismatch rejected", () => {
    const bad = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        reviewPeriod: "SHIFT",
        totalIntakeMl: 2000,
        totalOutputMl: 1500,
        netBalanceMl: 400,
        fluidBalanceConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        reviewPeriod: "TWENTY_FOUR_HOUR",
        totalIntakeMl: 2000,
        totalOutputMl: 1500,
        netBalanceMl: 500,
        fluidBalanceConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("fluid restriction validation", () => {
    const bad = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      FLUID_RESTRICTION_MONITORING_CARD_ID,
      {
        documentationTime: ISO,
        fluidRestrictionOrdered: "YES",
        patientEducationProvided: "YES",
        complianceConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("weight change calculation", () => {
    expect(calculateRenalWeightChange(72.5, 71.0)).toBe(1.5);
  });

  it("weight change mismatch rejected", () => {
    const bad = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      DAILY_WEIGHT_EDEMA_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        weightKg: 72.5,
        previousWeightKg: 71.0,
        weightChangeKg: 2.0,
        edemaPresent: "NO",
        edemaLocation: "NONE",
        edemaSeverity: "NONE",
        fluidOverloadConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("urine output concern validates", () => {
    const bad = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      URINE_OUTPUT_CONCERN_CARD_ID,
      {
        assessmentTime: ISO,
        concernType: "OLIGURIA",
        foleyPresent: "YES",
        bladderScanPerformed: "NOT_APPLICABLE",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      URINE_OUTPUT_CONCERN_CARD_ID,
      {
        assessmentTime: ISO,
        concernType: "OLIGURIA",
        urineOutputMl: 200,
        timePeriodHours: 8,
        foleyPresent: "YES",
        bladderScanPerformed: "NOT_APPLICABLE",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("renal medication safety governance", () => {
    const bad = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        renalFunctionConcern: "NO",
        nephrotoxicMedicationConcern: "YES",
        doseAdjustmentConcern: "NO",
        contrastExposureConcern: "NO",
        pharmacyNotified: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      RENAL_MEDICATION_SAFETY_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        renalFunctionConcern: "NO",
        nephrotoxicMedicationConcern: "YES",
        doseAdjustmentConcern: "NO",
        contrastExposureConcern: "NO",
        pharmacyNotified: "YES",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("renal escalation validates", () => {
    const bad = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      RENAL_ESCALATION_EVENT_CARD_ID,
      {
        eventTime: ISO,
        reason: "FLUID_OVERLOAD",
        providerNotified: "NO",
        providerNotificationTime: ISO,
        nephrologyNotified: "NOT_APPLICABLE",
        responseReceived: "NO",
        rapidResponseActivated: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validateDialysisRenalFluidManagementDocumentationPayloadForCard(
      RENAL_ESCALATION_EVENT_CARD_ID,
      {
        eventTime: ISO,
        reason: "LOW_URINE_OUTPUT",
        providerNotified: "YES",
        providerNotificationTime: ISO,
        nephrologyNotified: "YES",
        responseReceived: "NO",
        rapidResponseActivated: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("EN summaries", () => {
    const access = summarizeDialysisRenalFluidPayload(
      DIALYSIS_ACCESS_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        accessType: "AV_FISTULA",
        accessLocation: "LEFT_ARM",
        thrillPresent: "YES",
        bruitPresent: "YES",
        siteStatus: "NORMAL",
        dressingStatus: "NOT_APPLICABLE",
        infectionConcern: "NO",
        bleedingConcern: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(access.some((l) => l.key === "Access type" && l.value === "AV fistula")).toBe(true);
  });

  it("FR summaries", () => {
    const io = summarizeDialysisRenalFluidPayload(
      RENAL_INTAKE_OUTPUT_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        reviewPeriod: "SHIFT",
        totalIntakeMl: 1800,
        totalOutputMl: 1200,
        netBalanceMl: 600,
        fluidBalanceConcern: "NO",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(io.some((l) => l.key === "Bilan net" && l.value === "600 mL")).toBe(true);
  });
});
