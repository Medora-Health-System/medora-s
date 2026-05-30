import { describe, expect, it } from "vitest";
import {
  AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID,
  BEHAVIORAL_ESCALATION_EVENT_CARD_ID,
  BEHAVIORAL_OBSERVATION_CARD_ID,
  EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS,
  ENVIRONMENTAL_SAFETY_CHECK_CARD_ID,
  ELOPEMENT_MONITORING_CARD_ID,
  ELOPEMENT_RISK_ASSESSMENT_CARD_ID,
  ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID,
  SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  SUICIDE_RISK_MONITORING_CARD_ID,
  summarizeBehavioralHealthSafetyDocumentationPayload,
  validateBehavioralHealthSafetyDocumentationPayloadForCard,
} from "./behavioralHealthSafetyDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

describe("behavioralHealthSafetyDocumentationPayloads (EDOC.16)", () => {
  it("all EDOC.16 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC16_BEHAVIORAL_HEALTH_SAFETY_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("BEHAVIORAL_HEALTH_DOCUMENTATION");
    }
  });

  it("suicide precautions validates", () => {
    expect(
      validateBehavioralHealthSafetyDocumentationPayloadForCard(SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID, {
        documentationTime: ISO,
        precautionLevel: "STANDARD",
        patientChangedIntoSafeAttire: true,
        belongingsRemovedOrSecured: true,
        roomSafetyCompleted: true,
        ligatureRiskReduced: true,
        sharpsRemoved: true,
        providerNotified: false,
        familyNotified: false,
      }).ok
    ).toBe(true);
  });

  it("suicide risk monitoring validates", () => {
    expect(
      validateBehavioralHealthSafetyDocumentationPayloadForCard(SUICIDE_RISK_MONITORING_CARD_ID, {
        monitoringTime: ISO,
        riskLevel: "LOW",
        currentSuicidalIdeation: "DENIES",
        planReported: "NO",
        intentReported: "NO",
        meansAccessConcern: "NO",
        observationLevel: "STANDARD",
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("high or imminent suicide risk requires provider notification", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(SUICIDE_RISK_MONITORING_CARD_ID, {
      monitoringTime: ISO,
      riskLevel: "IMMINENT",
      currentSuicidalIdeation: "PASSIVE",
      planReported: "YES",
      intentReported: "YES",
      meansAccessConcern: "YES",
      observationLevel: "ONE_TO_ONE",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("active suicidal ideation requires provider notification", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(SUICIDE_RISK_MONITORING_CARD_ID, {
      monitoringTime: ISO,
      riskLevel: "MODERATE",
      currentSuicidalIdeation: "ACTIVE",
      planReported: "YES",
      intentReported: "NO",
      meansAccessConcern: "UNKNOWN",
      observationLevel: "CLOSE_OBSERVATION",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("elopement high risk requires provider notification", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(ELOPEMENT_RISK_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      riskLevel: "HIGH",
      confusedOrDisoriented: true,
      attemptedToLeave: true,
      verbalizedIntentToLeave: true,
      requiresSecureArea: true,
      providerNotified: false,
      familyNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("missing patient location requires provider and security notification", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(ELOPEMENT_MONITORING_CARD_ID, {
      monitoringTime: ISO,
      patientLocationConfirmed: false,
      patientInAssignedArea: false,
      doorExitRiskObserved: true,
      redirectionRequired: true,
      securityNotified: false,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateBehavioralHealthSafetyDocumentationPayloadForCard(ELOPEMENT_MONITORING_CARD_ID, {
      monitoringTime: ISO,
      patientLocationConfirmed: false,
      patientInAssignedArea: false,
      doorExitRiskObserved: true,
      redirectionRequired: true,
      securityNotified: true,
      providerNotified: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("behavioral threat requires provider notification", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(BEHAVIORAL_OBSERVATION_CARD_ID, {
      observationTime: ISO,
      behavior: "COMBATIVE",
      cooperative: false,
      threatToSelf: true,
      threatToOthers: false,
      redirectionEffective: false,
      deEscalationUsed: true,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("violence and high agitation governance works", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(
      AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        agitationLevel: "SEVERE",
        violenceRisk: "HIGH",
        verbalThreats: true,
        physicalAggression: true,
        propertyDestruction: false,
        weaponConcern: true,
        securityNotified: false,
        providerNotified: false,
      }
    );
    expect(bad.ok).toBe(false);
    const ok = validateBehavioralHealthSafetyDocumentationPayloadForCard(
      AGITATION_VIOLENCE_RISK_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        agitationLevel: "SEVERE",
        violenceRisk: "HIGH",
        verbalThreats: true,
        physicalAggression: true,
        propertyDestruction: false,
        weaponConcern: true,
        securityNotified: true,
        providerNotified: true,
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("1:1 unsafe or not visible requires provider notification", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(ONE_TO_ONE_OBSERVATION_CHECK_CARD_ID, {
      checkTime: ISO,
      observerRole: "SITTER",
      patientVisible: false,
      patientSafe: true,
      behaviorObserved: "ANXIOUS",
      needsAddressed: true,
      handoffCompleted: false,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("environmental issue requires description", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(ENVIRONMENTAL_SAFETY_CHECK_CARD_ID, {
      checkTime: ISO,
      roomClearedOfHazards: false,
      ligatureRiskChecked: true,
      sharpsRemoved: true,
      cordsSecured: true,
      belongingsSecured: true,
      bathroomChecked: true,
      staffAwareOfPrecautions: true,
      issuesFound: true,
      providerNotified: true,
    });
    expect(bad.ok).toBe(false);
  });

  it("escalation event requires provider notification time", () => {
    const bad = validateBehavioralHealthSafetyDocumentationPayloadForCard(BEHAVIORAL_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "VIOLENCE_THREAT",
      providerNotified: false,
      providerNotificationTime: ISO,
      securityNotified: false,
      familyNotified: false,
      intervention: "SECURITY_ASSISTANCE",
      restraintDocumentationReferenced: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateBehavioralHealthSafetyDocumentationPayloadForCard(BEHAVIORAL_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "VIOLENCE_THREAT",
      providerNotified: true,
      providerNotificationTime: ISO,
      securityNotified: true,
      familyNotified: false,
      intervention: "SECURITY_ASSISTANCE",
      restraintDocumentationReferenced: false,
    });
    expect(ok.ok).toBe(true);
  });

  it("EN and FR summaries render", () => {
    const en = summarizeBehavioralHealthSafetyDocumentationPayload(
      SUICIDE_PRECAUTIONS_DOCUMENTATION_CARD_ID,
      {
        documentationTime: ISO,
        precautionLevel: "ONE_TO_ONE",
        patientChangedIntoSafeAttire: true,
        belongingsRemovedOrSecured: true,
        roomSafetyCompleted: true,
        ligatureRiskReduced: true,
        sharpsRemoved: true,
        providerNotified: true,
        familyNotified: false,
      },
      "en"
    );
    expect(en.some((l) => l.key === "Precaution level")).toBe(true);

    const fr = summarizeBehavioralHealthSafetyDocumentationPayload(
      BEHAVIORAL_ESCALATION_EVENT_CARD_ID,
      {
        eventTime: ISO,
        reason: "SUICIDE_RISK_INCREASED",
        providerNotified: true,
        providerNotificationTime: ISO,
        securityNotified: false,
        familyNotified: true,
        intervention: "OBSERVATION_LEVEL_INCREASED",
        restraintDocumentationReferenced: false,
      },
      "fr"
    );
    expect(fr.some((l) => l.key === "Motif")).toBe(true);
  });
});
