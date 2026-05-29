import { describe, expect, it } from "vitest";
import { canWitnessClinicalDocumentationEntry } from "./clinicalDocumentationWitnessGovernance.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  BLOOD_PRODUCT_COMPLETION_CARD_ID,
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_REACTION_CARD_ID,
  BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID,
  bloodProductCompletionPayloadSchema,
  bloodProductInitiationPayloadSchema,
  bloodProductReactionPayloadSchema,
  bloodProductReassessmentPayloadSchema,
  bloodProductVerificationPayloadSchema,
  massiveTransfusionProtocolEventPayloadSchema,
  summarizeBloodProductDocumentationPayload,
  validateBloodProductPayloadForCard,
} from "./bloodProductDocumentationPayloads.js";
import {
  CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS,
  validatePayloadForCard,
} from "./observationDocumentationPayloads.js";
import { summarizeClinicalDocumentationPayload } from "./clinicalDocumentationEntry.js";
import { resolveRequiresWitnessSignature as resolveWitness } from "./clinicalDocumentationWitnessPolicy.js";

const NOW = "2026-05-28T14:00:00.000Z";

const VERIFICATION_VALID = {
  verificationTime: NOW,
  productType: "PRBC",
  unitIdentifier: "UNIT-12345",
  patientIdentityVerified: true,
  bloodTypeVerified: true,
  crossmatchVerified: true,
  expirationVerified: true,
  consentVerified: true,
  specialRequirements: "NONE",
};

const INITIATION_VALID = {
  startTime: NOW,
  productType: "FFP",
  unitIdentifier: "UNIT-12345",
  baselineTemperature: "37.0",
  baselineHeartRate: 88,
  baselineRespRate: 18,
  baselineBloodPressure: "118/72",
  baselineSpo2: 97,
  preMedicationAdministered: false,
  providerOrderVerified: true,
  consentVerified: true,
  administrationStarted: true,
};

describe("EDOC.7 blood product documentation payloads", () => {
  it("blood product cards marked AVAILABLE in BLOOD_PRODUCT_DOCUMENTATION category", () => {
    for (const cardId of EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("BLOOD_PRODUCT_DOCUMENTATION");
    }
  });

  it("verification schema accepts valid payload and sets PENDING_WITNESS status", () => {
    expect(bloodProductVerificationPayloadSchema.safeParse(VERIFICATION_VALID).success).toBe(true);
    const result = validateBloodProductPayloadForCard(
      BLOOD_PRODUCT_VERIFICATION_CARD_ID,
      VERIFICATION_VALID
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.verificationStatus).toBe("PENDING_WITNESS");
    }
  });

  it("verification requires witness via default policy", () => {
    expect(resolveWitness(BLOOD_PRODUCT_VERIFICATION_CARD_ID)).toBe(true);
  });

  it("no self-witness for verification entries", () => {
    expect(
      canWitnessClinicalDocumentationEntry(
        {
          authorUserId: "u1",
          requiresWitnessSignature: true,
          witnessedAt: null,
          voidedAt: null,
        },
        "u1",
        ["RN"]
      )
    ).toBe(false);
  });

  it("initiation schema accepts valid payload", () => {
    expect(bloodProductInitiationPayloadSchema.safeParse(INITIATION_VALID).success).toBe(true);
  });

  it("reassessment schema accepts valid payload", () => {
    expect(
      bloodProductReassessmentPayloadSchema.safeParse({
        assessmentTime: NOW,
        temperature: "37.2",
        heartRate: 90,
        respRate: 18,
        bloodPressure: "120/80",
        spo2: 96,
        symptomsPresent: false,
        symptomChecklist: [],
        providerNotified: false,
        continuedAdministration: true,
      }).success
    ).toBe(true);
  });

  it("reaction schema accepts valid payload", () => {
    expect(
      bloodProductReactionPayloadSchema.safeParse({
        reactionTime: NOW,
        reactionType: "FEBRILE",
        symptoms: ["FEVER", "CHILLS"],
        transfusionStopped: true,
        providerNotified: true,
        bloodBankNotified: true,
        reactionWorkupStarted: true,
      }).success
    ).toBe(true);
  });

  it("completion schema accepts valid payload and enriches billing readiness metadata", () => {
    const result = validateBloodProductPayloadForCard(BLOOD_PRODUCT_COMPLETION_CARD_ID, {
      completionTime: NOW,
      productType: "PRBC",
      unitIdentifier: "UNIT-12345",
      volumeInfusedMl: 250,
      transfusionCompleted: true,
      reactionOccurred: false,
      postVitalsReviewed: true,
      providerNotified: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.billingReadinessMetadata).toEqual({
        capturePhase: "EDOC.7",
        claimsGenerationDeferred: true,
        productTypeCapturable: true,
        completionCapturable: true,
        reactionCapturable: false,
      });
    }
  });

  it("MTP schema accepts valid payload", () => {
    expect(
      massiveTransfusionProtocolEventPayloadSchema.safeParse({
        eventTime: NOW,
        eventType: "ACTIVATED",
        initiatedBy: "provider-1",
        reason: "Hemorrhagic shock",
      }).success
    ).toBe(true);
  });

  it("all EDOC.7 card IDs registered in payload validator list", () => {
    for (const cardId of EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS) {
      expect(CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS).toContain(cardId);
    }
  });

  it("validatePayloadForCard routes blood product cards", () => {
    expect(
      validatePayloadForCard(BLOOD_PRODUCT_VERIFICATION_CARD_ID, VERIFICATION_VALID).ok
    ).toBe(true);
    expect(validatePayloadForCard(BLOOD_PRODUCT_INITIATION_CARD_ID, INITIATION_VALID).ok).toBe(
      true
    );
  });

  it("bilingual summaries for verification and completion", () => {
    const en = summarizeBloodProductDocumentationPayload(
      BLOOD_PRODUCT_VERIFICATION_CARD_ID,
      VERIFICATION_VALID,
      "en"
    );
    const fr = summarizeBloodProductDocumentationPayload(
      BLOOD_PRODUCT_VERIFICATION_CARD_ID,
      VERIFICATION_VALID,
      "fr"
    );
    expect(en.some((l) => l.key === "Unit ID" && l.value === "UNIT-12345")).toBe(true);
    expect(fr.some((l) => l.key === "N° unité" && l.value === "UNIT-12345")).toBe(true);

    const legalEn = summarizeClinicalDocumentationPayload(
      BLOOD_PRODUCT_COMPLETION_CARD_ID,
      {
        completionTime: NOW,
        productType: "PLATELETS",
        unitIdentifier: "UNIT-99",
        volumeInfusedMl: 1,
        transfusionCompleted: true,
        reactionOccurred: true,
        postVitalsReviewed: true,
        providerNotified: true,
      },
      "en"
    );
    expect(legalEn.some((l) => l.key === "Reaction occurred")).toBe(true);
  });

  it("initiation and completion witness configurable via facility policy", () => {
    expect(resolveWitness(BLOOD_PRODUCT_INITIATION_CARD_ID)).toBe(false);
    expect(resolveWitness(BLOOD_PRODUCT_COMPLETION_CARD_ID)).toBe(false);
    expect(
      resolveWitness(BLOOD_PRODUCT_INITIATION_CARD_ID, {
        additionalCardIds: [BLOOD_PRODUCT_INITIATION_CARD_ID],
      })
    ).toBe(true);
  });

  it("reaction card allows single signer (no default witness)", () => {
    expect(resolveWitness(BLOOD_PRODUCT_REACTION_CARD_ID)).toBe(false);
    expect(resolveWitness(BLOOD_PRODUCT_REASSESSMENT_CARD_ID)).toBe(false);
    expect(resolveWitness(MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID)).toBe(false);
  });
});
