import { describe, expect, it } from "vitest";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  RESTRAINT_DISCONTINUATION_CARD_ID,
  RESTRAINT_FACE_TO_FACE_CARD_ID,
  RESTRAINT_INITIATION_CARD_ID,
  RESTRAINT_REASSESSMENT_CARD_ID,
  RESTRAINT_RENEWAL_CARD_ID,
  restraintDiscontinuationPayloadSchema,
  restraintFaceToFacePayloadSchema,
  restraintInitiationPayloadSchema,
  restraintReassessmentPayloadSchema,
  restraintRenewalPayloadSchema,
  summarizeRestraintDocumentationPayload,
  validateRestraintPayloadForCard,
} from "./restraintDocumentationPayloads.js";
import {
  CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS,
  validatePayloadForCard,
} from "./observationDocumentationPayloads.js";
import { summarizeClinicalDocumentationPayload } from "./clinicalDocumentationEntry.js";
import { listFoundationOnlyCardIds } from "./clinicalDocumentationPayloadGovernance.js";

const NOW = "2026-05-28T12:00:00.000Z";

const INITIATION_VALID = {
  assessmentTime: NOW,
  restraintType: "BEHAVIORAL",
  reasonForRestraint: "VIOLENT_BEHAVIOR",
  alternativesAttempted: ["VERBAL_DEESCALATION", "REORIENTATION"],
  continuedNeed: true,
  injuryPresent: false,
  circulationAssessment: "NORMAL",
  mentalStatusAssessment: "Agitated, redirectable.",
  physicianOrderVerified: true,
  orderingProviderId: "provider-1",
};

describe("EDOC.6 restraint documentation payloads", () => {
  it("restraint cards marked AVAILABLE in RESTRAINT_DOCUMENTATION category", () => {
    for (const cardId of EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("RESTRAINT_DOCUMENTATION");
    }
  });

  it("initiation schema accepts valid payload and enriches billing readiness metadata", () => {
    const result = validateRestraintPayloadForCard(RESTRAINT_INITIATION_CARD_ID, INITIATION_VALID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.billingReadinessMetadata).toEqual({
        capturePhase: "EDOC.6",
        claimsGenerationDeferred: true,
        restraintEventCapturable: true,
      });
    }
  });

  it("face-to-face schema accepts valid payload", () => {
    expect(
      restraintFaceToFacePayloadSchema.safeParse({
        evaluationTime: NOW,
        behaviorAssessment: "Patient remains agitated.",
        dangerToSelf: true,
        dangerToOthers: true,
        continuedNeedForRestraint: true,
        medicalConditionAssessment: "Stable vitals.",
        behavioralConditionAssessment: "Ongoing aggression.",
        providerEvaluatorId: "provider-2",
      }).success
    ).toBe(true);
  });

  it("reassessment schema accepts valid payload", () => {
    expect(
      restraintReassessmentPayloadSchema.safeParse({
        assessmentTime: NOW,
        airway: "NORMAL",
        circulation: "NORMAL",
        skinIntegrity: "NORMAL",
        nutritionNeedsMet: true,
        hydrationNeedsMet: true,
        eliminationNeedsMet: true,
        rangeOfMotionPerformed: true,
        continuedNeed: true,
        patientResponse: "Calmer than prior assessment.",
      }).success
    ).toBe(true);
  });

  it("renewal schema accepts valid payload", () => {
    expect(
      restraintRenewalPayloadSchema.safeParse({
        renewalTime: NOW,
        orderingProviderId: "provider-1",
        continuedNeed: true,
        renewalReason: "Continued danger to staff.",
      }).success
    ).toBe(true);
  });

  it("discontinuation schema accepts valid payload", () => {
    expect(
      restraintDiscontinuationPayloadSchema.safeParse({
        discontinuedTime: NOW,
        criteriaMet: ["CALM", "FOLLOWS_COMMANDS"],
        conditionAtDiscontinuation: "Calm and cooperative.",
      }).success
    ).toBe(true);
  });

  it("rejects invalid initiation without alternatives", () => {
    expect(
      validateRestraintPayloadForCard(RESTRAINT_INITIATION_CARD_ID, {
        ...INITIATION_VALID,
        alternativesAttempted: [],
      }).ok
    ).toBe(false);
  });

  it("available restraint cards have validators", () => {
    for (const cardId of EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS) {
      expect(CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS).toContain(cardId);
    }
  });

  it("foundation-only cards cannot save", () => {
    for (const cardId of listFoundationOnlyCardIds().slice(0, 3)) {
      expect(validatePayloadForCard(cardId, INITIATION_VALID).ok).toBe(false);
    }
  });

  it("payload summaries render restraint key facts", () => {
    const summary = summarizeRestraintDocumentationPayload(
      RESTRAINT_INITIATION_CARD_ID,
      INITIATION_VALID,
      "fr"
    );
    expect(summary.some((l) => l.key === "Type" && l.value === "Comportementale")).toBe(true);
    expect(summary.some((l) => l.key === "Motif")).toBe(true);

    const legal = summarizeClinicalDocumentationPayload(
      RESTRAINT_INITIATION_CARD_ID,
      INITIATION_VALID,
      "fr"
    );
    expect(legal.some((l) => l.key === "Type")).toBe(true);
  });

  it("all five card ids are distinct and registered", () => {
    expect(new Set(EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS).size).toBe(5);
    expect(EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS).toContain(RESTRAINT_FACE_TO_FACE_CARD_ID);
    expect(EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS).toContain(RESTRAINT_RENEWAL_CARD_ID);
    expect(EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS).toContain(RESTRAINT_DISCONTINUATION_CARD_ID);
    expect(EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS).toContain(RESTRAINT_REASSESSMENT_CARD_ID);
  });
});
