import { describe, expect, it } from "vitest";
import {
  ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID,
  calculateAdultNonVerbalPainScore,
  calculateFlaccScore,
  CHRONIC_PAIN_ASSESSMENT_CARD_ID,
  derivePainSeverityBand,
  EDOC13_PAIN_DOCUMENTATION_CARD_IDS,
  PAIN_ESCALATION_EVENT_CARD_ID,
  PAIN_INITIAL_ASSESSMENT_CARD_ID,
  PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID,
  PAIN_REASSESSMENT_CARD_ID,
  PEDIATRIC_PAIN_ASSESSMENT_CARD_ID,
  summarizePainDocumentationPayload,
  validatePainDocumentationPayloadForCard,
} from "./painDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

const INITIAL_BASE = {
  assessmentTime: ISO,
  painScale: "NUMERIC" as const,
  painScore: 5,
  painLocation: "ABDOMEN" as const,
  painQuality: "ACHING" as const,
  painDuration: "NEW" as const,
  painRadiation: "NONE" as const,
  functionalImpact: "MILD" as const,
  providerNotified: false,
};

describe("painDocumentationPayloads (EDOC.13)", () => {
  it("all EDOC.13 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC13_PAIN_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("PAIN_DOCUMENTATION");
    }
  });

  it("initial pain validates", () => {
    expect(
      validatePainDocumentationPayloadForCard(PAIN_INITIAL_ASSESSMENT_CARD_ID, INITIAL_BASE).ok
    ).toBe(true);
  });

  it("reassessment validates", () => {
    expect(
      validatePainDocumentationPayloadForCard(PAIN_REASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        painScale: "NUMERIC",
        painScore: 4,
        previousPainScore: 6,
        painImproved: true,
        functionalImpact: "MILD",
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("post-intervention validates", () => {
    expect(
      validatePainDocumentationPayloadForCard(PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        interventionType: "MEDICATION",
        painScoreBefore: 8,
        painScoreAfter: 4,
        response: "IMPROVED",
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("chronic pain validates", () => {
    expect(
      validatePainDocumentationPayloadForCard(CHRONIC_PAIN_ASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        baselinePainScore: 5,
        currentPainScore: 6,
        painManagementPlanPresent: true,
        opioidTherapyReported: false,
        painInterferesWithSleep: true,
        painInterferesWithMobility: false,
        painInterferesWithADLs: false,
        providerManagingPainKnown: true,
      }).ok
    ).toBe(true);
  });

  it("FLACC score calculation works", () => {
    expect(
      calculateFlaccScore({ face: 1, legs: 1, activity: 1, cry: 0, consolability: 1 })
    ).toBe(4);
  });

  it("non-verbal score calculation works", () => {
    expect(
      calculateAdultNonVerbalPainScore({
        facialExpression: 2,
        activity: 1,
        guarding: 1,
        physiology: 0,
        respiratory: 0,
      })
    ).toBe(4);
  });

  it("severity band works", () => {
    expect(derivePainSeverityBand(0)).toBe("NO_PAIN");
    expect(derivePainSeverityBand(2)).toBe("MILD");
    expect(derivePainSeverityBand(5)).toBe("MODERATE");
    expect(derivePainSeverityBand(9)).toBe("SEVERE");
  });

  it("severe pain requires provider notification", () => {
    const bad = validatePainDocumentationPayloadForCard(PAIN_INITIAL_ASSESSMENT_CARD_ID, {
      ...INITIAL_BASE,
      painScore: 9,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("severe FLACC requires provider notification", () => {
    const bad = validatePainDocumentationPayloadForCard(PEDIATRIC_PAIN_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      face: 2,
      legs: 2,
      activity: 2,
      cry: 1,
      consolability: 1,
      totalScore: 8,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validatePainDocumentationPayloadForCard(PEDIATRIC_PAIN_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      face: 2,
      legs: 2,
      activity: 2,
      cry: 1,
      consolability: 1,
      totalScore: 8,
      providerNotified: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("escalation validates", () => {
    const bad = validatePainDocumentationPayloadForCard(PAIN_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "SEVERE_PAIN",
      providerNotified: false,
      providerNotificationTime: ISO,
      responseReceived: false,
      additionalInterventionOrdered: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validatePainDocumentationPayloadForCard(PAIN_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "SEVERE_PAIN",
      providerNotified: true,
      providerNotificationTime: ISO,
      responseReceived: true,
      additionalInterventionOrdered: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("EN and FR summaries render", () => {
    const en = summarizePainDocumentationPayload(PAIN_INITIAL_ASSESSMENT_CARD_ID, INITIAL_BASE, "en");
    expect(en.some((l) => l.key === "Pain score" && l.value === "5")).toBe(true);
    expect(en.some((l) => l.key === "Severity")).toBe(true);

    const fr = summarizePainDocumentationPayload(PEDIATRIC_PAIN_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      face: 1,
      legs: 1,
      activity: 1,
      cry: 0,
      consolability: 1,
      totalScore: 4,
      providerNotified: false,
    }, "fr");
    expect(fr.some((l) => l.key === "Total FLACC" && l.value === "4")).toBe(true);
  });
});
