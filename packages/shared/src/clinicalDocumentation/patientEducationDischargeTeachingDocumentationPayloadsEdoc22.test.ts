import { describe, expect, it } from "vitest";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  CAREGIVER_EDUCATION_SESSION_CARD_ID,
  DISCHARGE_INSTRUCTION_REVIEW_CARD_ID,
  DISEASE_SPECIFIC_EDUCATION_CARD_ID,
  EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS,
  EDUCATION_REFUSAL_OR_INABILITY_CARD_ID,
  EQUIPMENT_EDUCATION_CARD_ID,
  FOLLOW_UP_REVIEW_CARD_ID,
  LEARNING_BARRIER_ASSESSMENT_CARD_ID,
  MEDICATION_EDUCATION_REVIEW_CARD_ID,
  PATIENT_EDUCATION_SESSION_CARD_ID,
  TEACH_BACK_VERIFICATION_CARD_ID,
  summarizePatientEducationDischargePayload,
  validatePatientEducationDischargeTeachingDocumentationPayloadForCard,
} from "./patientEducationDischargeTeachingDocumentationPayloads.js";

const ISO = "2026-05-28T14:00:00.000Z";

describe("patientEducationDischargeTeachingDocumentationPayloads (EDOC.22)", () => {
  it("all EDOC.22 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC22_PATIENT_EDUCATION_DISCHARGE_TEACHING_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("PATIENT_EDUCATION_AND_DISCHARGE_TEACHING");
    }
  });

  it("patient education validation", () => {
    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      PATIENT_EDUCATION_SESSION_CARD_ID,
      {
        educationTime: ISO,
        topic: "SAFETY",
        audience: "PATIENT",
        interpreterUsed: "NO",
        educationProvided: "YES",
        understandingDemonstrated: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      PATIENT_EDUCATION_SESSION_CARD_ID,
      {
        educationTime: ISO,
        topic: "OTHER",
        audience: "PATIENT",
        interpreterUsed: "NO",
        educationProvided: "YES",
        understandingDemonstrated: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("caregiver education validation", () => {
    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      CAREGIVER_EDUCATION_SESSION_CARD_ID,
      {
        educationTime: ISO,
        caregiverPresent: "YES",
        caregiverRelationship: "SPOUSE",
        educationTopic: "MEDICATIONS",
        teachBackCompleted: "YES",
        understandingDemonstrated: "YES",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      CAREGIVER_EDUCATION_SESSION_CARD_ID,
      {
        educationTime: ISO,
        caregiverPresent: "NO",
        caregiverRelationship: "SPOUSE",
        educationTopic: "SAFETY",
        teachBackCompleted: "NO",
        understandingDemonstrated: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("medication education validation", () => {
    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      MEDICATION_EDUCATION_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        medicationsReviewed: "YES",
        highRiskMedicationIncluded: "NO",
        sideEffectsReviewed: "YES",
        adherenceDiscussed: "YES",
        teachBackCompleted: "YES",
        understandingDemonstrated: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      MEDICATION_EDUCATION_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        medicationsReviewed: "NO",
        highRiskMedicationIncluded: "NO",
        sideEffectsReviewed: "NO",
        adherenceDiscussed: "NO",
        teachBackCompleted: "NO",
        understandingDemonstrated: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("discharge review validation", () => {
    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      DISCHARGE_INSTRUCTION_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        instructionsReviewed: "YES",
        warningSignsReviewed: "YES",
        activityRestrictionsReviewed: "YES",
        dietInstructionsReviewed: "YES",
        followUpReviewed: "YES",
        teachBackCompleted: "YES",
        understandingDemonstrated: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const partial = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      DISCHARGE_INSTRUCTION_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        instructionsReviewed: "YES",
        warningSignsReviewed: "YES",
        activityRestrictionsReviewed: "YES",
        dietInstructionsReviewed: "YES",
        followUpReviewed: "YES",
        teachBackCompleted: "NO",
        understandingDemonstrated: "PARTIAL",
        providerNotified: "NO",
      }
    );
    expect(partial.ok).toBe(false);
  });

  it("teach-back governance", () => {
    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      TEACH_BACK_VERIFICATION_CARD_ID,
      {
        verificationTime: ISO,
        topicReviewed: "MEDICATIONS",
        teachBackSuccessful: "NO",
        additionalEducationRequired: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      TEACH_BACK_VERIFICATION_CARD_ID,
      {
        verificationTime: ISO,
        topicReviewed: "DISCHARGE",
        teachBackSuccessful: "NO",
        additionalEducationRequired: "YES",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("follow-up governance", () => {
    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      FOLLOW_UP_REVIEW_CARD_ID,
      {
        reviewTime: ISO,
        followUpDiscussed: "YES",
        appointmentNeeded: "YES",
        appointmentScheduled: "NO",
        specialistFollowUpNeeded: "NO",
        transportationConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("equipment education validation", () => {
    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      EQUIPMENT_EDUCATION_CARD_ID,
      {
        educationTime: ISO,
        equipmentType: "OXYGEN",
        demonstrationProvided: "YES",
        returnDemonstrationCompleted: "YES",
        understandingDemonstrated: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("disease-specific education validation", () => {
    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      DISEASE_SPECIFIC_EDUCATION_CARD_ID,
      {
        educationTime: ISO,
        condition: "DIABETES",
        educationProvided: "NO",
        teachBackCompleted: "NO",
        understandingDemonstrated: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("learning barrier validation", () => {
    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      LEARNING_BARRIER_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        barrierPresent: "YES",
        barrierType: "NONE",
        interpreterNeeded: "NO",
        caregiverInvolved: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      LEARNING_BARRIER_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        barrierPresent: "YES",
        barrierType: "LANGUAGE",
        interpreterNeeded: "YES",
        caregiverInvolved: "YES",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("education refusal validation", () => {
    const bad = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      EDUCATION_REFUSAL_OR_INABILITY_CARD_ID,
      {
        documentationTime: ISO,
        reason: "PATIENT_REFUSED",
        additionalAttemptsPlanned: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validatePatientEducationDischargeTeachingDocumentationPayloadForCard(
      EDUCATION_REFUSAL_OR_INABILITY_CARD_ID,
      {
        documentationTime: ISO,
        reason: "LANGUAGE_BARRIER",
        additionalAttemptsPlanned: "YES",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("EN summaries", () => {
    const lines = summarizePatientEducationDischargePayload(
      PATIENT_EDUCATION_SESSION_CARD_ID,
      {
        educationTime: ISO,
        topic: "MEDICATIONS",
        audience: "PATIENT",
        interpreterUsed: "NO",
        educationProvided: "YES",
        understandingDemonstrated: "YES",
        providerNotified: "NO",
      },
      "en"
    );
    expect(lines.some((l) => l.key === "Topic" && l.value === "Medications")).toBe(true);
  });

  it("FR summaries", () => {
    const lines = summarizePatientEducationDischargePayload(
      TEACH_BACK_VERIFICATION_CARD_ID,
      {
        verificationTime: ISO,
        topicReviewed: "FOLLOW_UP",
        teachBackSuccessful: "YES",
        additionalEducationRequired: "NO",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(lines.some((l) => l.key === "Sujet" && l.value === "Suivi")).toBe(true);
  });
});
