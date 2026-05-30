import { describe, expect, it } from "vitest";
import {
  calculateMorseFallScore,
  deriveMorseRiskLevel,
  EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS,
  FALL_ESCALATION_EVENT_CARD_ID,
  FALL_EVENT_DOCUMENTATION_CARD_ID,
  FALL_RISK_REASSESSMENT_CARD_ID,
  MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
  MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
  NEAR_FALL_EVENT_CARD_ID,
  POST_FALL_ASSESSMENT_CARD_ID,
  SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  summarizeFallRiskSafetyDocumentationPayload,
  validateFallRiskSafetyDocumentationPayloadForCard,
} from "./fallRiskSafetyDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

const MORSE_BASE = {
  assessmentTime: ISO,
  historyOfFalling: "NO" as const,
  secondaryDiagnosis: "NO" as const,
  ambulatoryAid: "NONE" as const,
  ivTherapy: "NO" as const,
  gait: "NORMAL" as const,
  mentalStatus: "ORIENTED" as const,
  calculatedScore: 0,
  riskLevel: "LOW" as const,
  providerNotified: false,
};

describe("fallRiskSafetyDocumentationPayloads (EDOC.14 fall risk)", () => {
  it("all EDOC.14 fall risk cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC14_FALL_RISK_SAFETY_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("FALL_RISK_AND_SAFETY");
    }
  });

  it("Morse score calculation works", () => {
    expect(
      calculateMorseFallScore({
        historyOfFalling: "YES",
        secondaryDiagnosis: "YES",
        ambulatoryAid: "FURNITURE",
        ivTherapy: "YES",
        gait: "IMPAIRED",
        mentalStatus: "FORGETS_LIMITATIONS",
      })
    ).toBe(125);
  });

  it("Morse risk levels correct", () => {
    expect(deriveMorseRiskLevel(0)).toBe("LOW");
    expect(deriveMorseRiskLevel(24)).toBe("LOW");
    expect(deriveMorseRiskLevel(25)).toBe("MODERATE");
    expect(deriveMorseRiskLevel(44)).toBe("MODERATE");
    expect(deriveMorseRiskLevel(45)).toBe("HIGH");
  });

  it("high Morse score requires provider notification", () => {
    const bad = validateFallRiskSafetyDocumentationPayloadForCard(MORSE_FALL_RISK_ASSESSMENT_CARD_ID, {
      ...MORSE_BASE,
      historyOfFalling: "YES",
      ambulatoryAid: "FURNITURE",
      calculatedScore: 55,
      riskLevel: "HIGH",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateFallRiskSafetyDocumentationPayloadForCard(MORSE_FALL_RISK_ASSESSMENT_CARD_ID, {
      ...MORSE_BASE,
      historyOfFalling: "YES",
      ambulatoryAid: "FURNITURE",
      calculatedScore: 55,
      riskLevel: "HIGH",
      providerNotified: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("reassessment validates", () => {
    expect(
      validateFallRiskSafetyDocumentationPayloadForCard(FALL_RISK_REASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        previousRiskLevel: "MODERATE",
        currentRiskLevel: "HIGH",
        changeDetected: true,
        providerNotified: true,
      }).ok
    ).toBe(true);
  });

  it("safety precautions validate", () => {
    expect(
      validateFallRiskSafetyDocumentationPayloadForCard(SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID, {
        documentationTime: ISO,
        bedAlarmActive: true,
        chairAlarmActive: false,
        nonSlipFootwearApplied: true,
        callLightWithinReach: true,
        bedInLowestPosition: true,
        sideRailsAppropriate: true,
        assistiveDeviceAvailable: true,
        fallRiskBandApplied: true,
        familyEducated: true,
        patientEducated: true,
      }).ok
    ).toBe(true);
  });

  it("mobility validates", () => {
    expect(
      validateFallRiskSafetyDocumentationPayloadForCard(MOBILITY_AMBULATION_ASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        mobilityLevel: "STANDBY_ASSIST",
        ambulationDistance: 50,
        distanceUnit: "FEET",
        assistiveDevice: "WALKER",
        gaitStability: "STABLE",
        toleratedActivity: true,
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("severe gait requires notification", () => {
    const bad = validateFallRiskSafetyDocumentationPayloadForCard(MOBILITY_AMBULATION_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      mobilityLevel: "ONE_PERSON_ASSIST",
      ambulationDistance: 10,
      distanceUnit: "FEET",
      assistiveDevice: "WALKER",
      gaitStability: "SEVERELY_IMPAIRED",
      toleratedActivity: false,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("near-fall validates", () => {
    const bad = validateFallRiskSafetyDocumentationPayloadForCard(NEAR_FALL_EVENT_CARD_ID, {
      eventTime: ISO,
      location: "Bathroom",
      assistedToSafety: true,
      injuryObserved: false,
      providerNotified: false,
      familyNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateFallRiskSafetyDocumentationPayloadForCard(NEAR_FALL_EVENT_CARD_ID, {
      eventTime: ISO,
      location: "Bathroom",
      assistedToSafety: true,
      injuryObserved: false,
      providerNotified: true,
      familyNotified: false,
    });
    expect(ok.ok).toBe(true);
  });

  it("fall event validates", () => {
    const ok = validateFallRiskSafetyDocumentationPayloadForCard(FALL_EVENT_DOCUMENTATION_CARD_ID, {
      eventTime: ISO,
      witnessed: "NO",
      location: "Hallway",
      headStrikeSuspected: false,
      lossOfConsciousness: false,
      injuryObserved: true,
      providerNotified: true,
      providerNotificationTime: ISO,
      familyNotified: false,
      rapidResponseActivated: false,
    });
    expect(ok.ok).toBe(true);
  });

  it("post-fall validates", () => {
    const bad = validateFallRiskSafetyDocumentationPayloadForCard(POST_FALL_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      painPresent: true,
      injuryIdentified: true,
      neurologicStatus: "CHANGED",
      mobilityStatus: "CHANGED",
      vitalSignsObtained: true,
      providerEvaluated: false,
      imagingOrdered: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateFallRiskSafetyDocumentationPayloadForCard(POST_FALL_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      painPresent: true,
      injuryIdentified: true,
      neurologicStatus: "CHANGED",
      mobilityStatus: "CHANGED",
      vitalSignsObtained: true,
      providerEvaluated: true,
      imagingOrdered: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("escalation validates", () => {
    const ok = validateFallRiskSafetyDocumentationPayloadForCard(FALL_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "RECURRENT_FALLS",
      providerNotified: true,
      providerNotificationTime: ISO,
      responseReceived: true,
      additionalInterventionsOrdered: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("EN and FR summaries render", () => {
    const en = summarizeFallRiskSafetyDocumentationPayload(
      MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
      MORSE_BASE,
      "en"
    );
    expect(en.some((l) => l.key === "Morse score" && l.value === "0")).toBe(true);
    expect(en.some((l) => l.key === "Risk level")).toBe(true);

    const fr = summarizeFallRiskSafetyDocumentationPayload(
      NEAR_FALL_EVENT_CARD_ID,
      {
        eventTime: ISO,
        location: "Couloir",
        assistedToSafety: true,
        injuryObserved: false,
        providerNotified: true,
        familyNotified: false,
      },
      "fr"
    );
    expect(fr.some((l) => l.key === "Lieu" && l.value === "Couloir")).toBe(true);
  });
});
