import { describe, expect, it } from "vitest";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS,
  HEAD_TO_TOE_ASSESSMENT_CARD_ID,
  NURSING_ADMISSION_ASSESSMENT_CARD_ID,
  NURSING_CARE_PLAN_INITIATION_CARD_ID,
  NURSING_CARE_PLAN_UPDATE_CARD_ID,
  NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID,
  NURSING_HANDOFF_SHIFT_REPORT_CARD_ID,
  NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID,
  NURSING_PROBLEM_LIST_CARD_ID,
  NURSING_SHIFT_ASSESSMENT_CARD_ID,
  SYSTEMS_ASSESSMENT_CARD_ID,
  summarizeNursingAdmissionCarePlanPayload,
  validateNursingAdmissionCarePlanDocumentationPayloadForCard,
} from "./nursingAdmissionCarePlanDocumentationPayloads.js";

const ISO = "2026-05-28T14:00:00.000Z";

describe("nursingAdmissionCarePlanDocumentationPayloads (EDOC.19)", () => {
  it("all EDOC.19 nursing cards are AVAILABLE with validators", () => {
    for (const cardId of EDOC19_NURSING_ADMISSION_CARE_PLAN_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("NURSING_ADMISSION_AND_CARE_PLAN");
    }
  });

  it("admission assessment validates", () => {
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_ADMISSION_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        admissionSource: "ED",
        admissionReason: "Chest pain workup",
        baselineMentalStatus: "ALERT_ORIENTED",
        baselineMobility: "INDEPENDENT",
        fallRiskReviewed: "YES",
        skinAssessmentCompleted: "YES",
        painAssessmentCompleted: "YES",
        belongingsReviewed: "YES",
        homeMedicationsReviewed: "YES",
        allergiesReviewed: "YES",
        advanceDirectivesReviewed: "UNKNOWN",
        infectionScreeningCompleted: "YES",
        educationNeedsIdentified: "NO",
        interpreterNeeded: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("admission missing required review reasons fails", () => {
    const bad = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_ADMISSION_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        admissionSource: "ED",
        admissionReason: "Observation admission",
        baselineMentalStatus: "ALERT_ORIENTED",
        baselineMobility: "INDEPENDENT",
        fallRiskReviewed: "NO",
        skinAssessmentCompleted: "YES",
        painAssessmentCompleted: "YES",
        belongingsReviewed: "YES",
        homeMedicationsReviewed: "YES",
        allergiesReviewed: "YES",
        advanceDirectivesReviewed: "UNKNOWN",
        infectionScreeningCompleted: "YES",
        educationNeedsIdentified: "NO",
        interpreterNeeded: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("shift assessment validates", () => {
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_SHIFT_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        shift: "DAY",
        mentalStatus: "ALERT_ORIENTED",
        respiratoryStatus: "STABLE",
        cardiacStatus: "STABLE",
        giStatus: "NORMAL",
        guStatus: "NORMAL",
        skinStatus: "INTACT",
        mobilityStatus: "INDEPENDENT",
        painStatus: "NO_PAIN",
        safetyStatus: "STANDARD",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("shift governance works", () => {
    const bad = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_SHIFT_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        shift: "NIGHT",
        mentalStatus: "ALERT_ORIENTED",
        respiratoryStatus: "DISTRESS",
        cardiacStatus: "STABLE",
        giStatus: "NORMAL",
        guStatus: "NORMAL",
        skinStatus: "INTACT",
        mobilityStatus: "INDEPENDENT",
        painStatus: "NO_PAIN",
        safetyStatus: "STANDARD",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("head-to-toe validates", () => {
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      HEAD_TO_TOE_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        neuro: "WDL",
        respiratory: "WDL",
        cardiac: "WDL",
        gastrointestinal: "WDL",
        genitourinary: "WDL",
        skin: "WDL",
        musculoskeletal: "WDL",
        psychosocial: "WDL",
        abnormalFindingsPresent: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("systems assessment validates", () => {
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(SYSTEMS_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      system: "RESPIRATORY",
      status: "IMPROVED",
      providerNotified: "NO",
    });
    expect(ok.ok).toBe(true);
  });

  it("care plan initiation validates", () => {
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_CARE_PLAN_INITIATION_CARD_ID,
      {
        initiatedAt: ISO,
        primaryNursingProblem: "FALL_RISK",
        goal: "NO_FALLS",
        interventionsPlanned: ["SAFETY_PRECAUTIONS", "EDUCATION"],
        patientParticipated: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("care plan update validates", () => {
    const bad = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_CARE_PLAN_UPDATE_CARD_ID,
      {
        updatedAt: ISO,
        problemAddressed: "Fall risk",
        goalStatus: "IN_PROGRESS",
        interventionStatus: "CONTINUED",
        patientProgress: "WORSENED",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_CARE_PLAN_UPDATE_CARD_ID,
      {
        updatedAt: ISO,
        problemAddressed: "Fall risk",
        goalStatus: "IN_PROGRESS",
        interventionStatus: "CONTINUED",
        patientProgress: "WORSENED",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("goals/outcomes validates", () => {
    const bad = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_PATIENT_GOALS_OUTCOMES_CARD_ID,
      {
        documentedAt: ISO,
        goalType: "MOBILITY",
        goalDescription: "Ambulate 50 feet with walker",
        outcomeStatus: "IN_PROGRESS",
        barrierPresent: "YES",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("problem list validates", () => {
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(NURSING_PROBLEM_LIST_CARD_ID, {
      documentedAt: ISO,
      problem: "PAIN",
      status: "ESCALATED",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("handoff validates", () => {
    const bad = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_HANDOFF_SHIFT_REPORT_CARD_ID,
      {
        handoffTime: ISO,
        handoffType: "HIGH_RISK_HANDOFF",
        receivingRole: "RN",
        highRiskConcernsPresent: "YES",
        openTasksReviewed: "YES",
        medicationConcernsReviewed: "YES",
        fallRiskReviewed: "YES",
        linesTubesDrainsReviewed: "YES",
        pendingLabsImagingReviewed: "YES",
        familyCommunicationNeeds: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("discharge readiness validates", () => {
    const ok = validateNursingAdmissionCarePlanDocumentationPayloadForCard(
      NURSING_DISCHARGE_READINESS_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        vitalSignsStable: "YES",
        painControlled: "YES",
        mobilitySafe: "YES",
        educationCompleted: "YES",
        medicationsReviewed: "YES",
        followUpReviewed: "YES",
        transportationConfirmed: "YES",
        responsibleAdultPresent: "NOT_APPLICABLE",
        barriersPresent: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("EN summaries", () => {
    const lines = summarizeNursingAdmissionCarePlanPayload(
      NURSING_ADMISSION_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        admissionSource: "ED",
        admissionReason: "Abdominal pain",
        baselineMentalStatus: "ALERT_ORIENTED",
        baselineMobility: "INDEPENDENT",
        fallRiskReviewed: "YES",
        skinAssessmentCompleted: "YES",
        painAssessmentCompleted: "YES",
        belongingsReviewed: "YES",
        homeMedicationsReviewed: "YES",
        allergiesReviewed: "YES",
        advanceDirectivesReviewed: "UNKNOWN",
        infectionScreeningCompleted: "YES",
        educationNeedsIdentified: "NO",
        interpreterNeeded: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(lines.some((l) => l.key === "Source")).toBe(true);
    expect(lines.some((l) => l.key === "Reason")).toBe(true);
  });

  it("FR summaries", () => {
    const lines = summarizeNursingAdmissionCarePlanPayload(
      NURSING_SHIFT_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        shift: "DAY",
        mentalStatus: "ALERT_ORIENTED",
        respiratoryStatus: "STABLE",
        cardiacStatus: "STABLE",
        giStatus: "NORMAL",
        guStatus: "NORMAL",
        skinStatus: "INTACT",
        mobilityStatus: "INDEPENDENT",
        painStatus: "NO_PAIN",
        safetyStatus: "STANDARD",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(lines.some((l) => l.key === "Quart")).toBe(true);
    expect(lines.some((l) => l.key === "Médecin avisé")).toBe(true);
  });
});
