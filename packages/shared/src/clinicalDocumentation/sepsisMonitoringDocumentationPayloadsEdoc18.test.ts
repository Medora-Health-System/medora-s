import { describe, expect, it } from "vitest";
import {
  ANTIBIOTIC_TIMING_REFERENCE_CARD_ID,
  BLOOD_CULTURE_DOCUMENTATION_CARD_ID,
  calculateQsofaScore,
  calculateSirsCriteriaCount,
  deriveQsofaPositive,
  deriveSepsisScreenPositive,
  deriveSirsPositive,
  EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS,
  FLUID_RESUSCITATION_MONITORING_CARD_ID,
  LACTATE_MONITORING_CARD_ID,
  QSOFA_ASSESSMENT_CARD_ID,
  SEPSIS_BUNDLE_TRACKING_CARD_ID,
  SEPSIS_ESCALATION_EVENT_CARD_ID,
  SEPSIS_SCREENING_CARD_ID,
  SEPTIC_SHOCK_REASSESSMENT_CARD_ID,
  SIRS_ASSESSMENT_CARD_ID,
  SUSPECTED_INFECTION_ASSESSMENT_CARD_ID,
  summarizeSepsisMonitoringDocumentationPayload,
  validateSepsisMonitoringDocumentationPayloadForCard,
} from "./sepsisMonitoringDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

describe("sepsisMonitoringDocumentationPayloads (EDOC.18)", () => {
  it("all EDOC.18 sepsis cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC18_SEPSIS_MONITORING_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("SEPSIS_MONITORING_DOCUMENTATION");
    }
  });

  it("sepsis screening validates", () => {
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(SEPSIS_SCREENING_CARD_ID, {
      screeningTime: ISO,
      suspectedInfection: "NO",
      temperatureAbnormal: "NO",
      heartRateAbnormal: "NO",
      respiratoryRateAbnormal: "NO",
      wbcAbnormalOrUnknown: "NO",
      alteredMentalStatus: "NO",
      hypotensionPresent: "NO",
      lactateConcern: "NO",
      screenPositive: "NO",
      providerNotified: "NO",
    });
    expect(ok.ok).toBe(true);
  });

  it("screen positive requires provider notification and time", () => {
    const bad = validateSepsisMonitoringDocumentationPayloadForCard(SEPSIS_SCREENING_CARD_ID, {
      screeningTime: ISO,
      suspectedInfection: "YES",
      temperatureAbnormal: "YES",
      heartRateAbnormal: "YES",
      respiratoryRateAbnormal: "NO",
      wbcAbnormalOrUnknown: "NO",
      alteredMentalStatus: "NO",
      hypotensionPresent: "NO",
      lactateConcern: "NO",
      screenPositive: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(SEPSIS_SCREENING_CARD_ID, {
      screeningTime: ISO,
      suspectedInfection: "YES",
      temperatureAbnormal: "YES",
      heartRateAbnormal: "YES",
      respiratoryRateAbnormal: "NO",
      wbcAbnormalOrUnknown: "NO",
      alteredMentalStatus: "NO",
      hypotensionPresent: "NO",
      lactateConcern: "NO",
      screenPositive: "YES",
      providerNotified: "YES",
      providerNotificationTime: ISO,
    });
    expect(ok.ok).toBe(true);
  });

  it("SIRS count calculation works", () => {
    expect(
      calculateSirsCriteriaCount({
        temperatureCriteriaMet: "YES",
        heartRateCriteriaMet: "YES",
        respiratoryCriteriaMet: "NO",
        wbcCriteriaMet: "UNKNOWN",
      })
    ).toBe(2);
    expect(deriveSirsPositive(2)).toBe("YES");
    expect(deriveSirsPositive(1)).toBe("NO");
  });

  it("SIRS mismatch rejected", () => {
    const bad = validateSepsisMonitoringDocumentationPayloadForCard(SIRS_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      temperatureCriteriaMet: "YES",
      heartRateCriteriaMet: "YES",
      respiratoryCriteriaMet: "NO",
      wbcCriteriaMet: "NO",
      criteriaCount: 1,
      sirsPositive: "YES",
      providerNotified: "YES",
    });
    expect(bad.ok).toBe(false);
  });

  it("qSOFA score calculation works", () => {
    expect(
      calculateQsofaScore({
        respiratoryRateHigh: "YES",
        alteredMentation: "YES",
        systolicBpLow: "NO",
      })
    ).toBe(2);
    expect(deriveQsofaPositive(2)).toBe("YES");
  });

  it("qSOFA mismatch rejected", () => {
    const bad = validateSepsisMonitoringDocumentationPayloadForCard(QSOFA_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      respiratoryRateHigh: "YES",
      alteredMentation: "YES",
      systolicBpLow: "NO",
      score: 1,
      qsofaPositive: "YES",
      providerNotified: "YES",
    });
    expect(bad.ok).toBe(false);
  });

  it("suspected infection validates with provider notification", () => {
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(
      SUSPECTED_INFECTION_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        suspectedSource: "URINARY",
        infectionSignsPresent: "YES",
        culturesConsidered: "YES",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("bundle variance requires reason", () => {
    const bad = validateSepsisMonitoringDocumentationPayloadForCard(SEPSIS_BUNDLE_TRACKING_CARD_ID, {
      bundleStartTime: ISO,
      bundleType: "THREE_HOUR",
      lactateOrderedOrResulted: "YES",
      bloodCulturesBeforeAntibiotics: "YES",
      antibioticsDocumentedInMar: "YES",
      fluidsOrderedOrStarted: "YES",
      vasopressorsOrderedOrStarted: "NOT_APPLICABLE",
      providerNotified: "YES",
      bundleVariancePresent: "YES",
    });
    expect(bad.ok).toBe(false);
  });

  it("lactate >=2 requires provider notification", () => {
    const bad = validateSepsisMonitoringDocumentationPayloadForCard(LACTATE_MONITORING_CARD_ID, {
      documentedAt: ISO,
      lactateValue: 2.5,
      lactateUnit: "MMOL_L",
      lactateResultAvailable: "YES",
      repeatLactateNeeded: "NO",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("lactate >=4 repeat governance works", () => {
    const bad = validateSepsisMonitoringDocumentationPayloadForCard(LACTATE_MONITORING_CARD_ID, {
      documentedAt: ISO,
      lactateValue: 4.2,
      lactateUnit: "MMOL_L",
      lactateResultAvailable: "YES",
      repeatLactateNeeded: "NO",
      providerNotified: "YES",
    });
    expect(bad.ok).toBe(false);
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(LACTATE_MONITORING_CARD_ID, {
      documentedAt: ISO,
      lactateValue: 4.2,
      lactateUnit: "MMOL_L",
      lactateResultAvailable: "YES",
      repeatLactateNeeded: "YES",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("blood culture collection validates", () => {
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(
      BLOOD_CULTURE_DOCUMENTATION_CARD_ID,
      {
        documentedAt: ISO,
        culturesCollected: "YES",
        collectionTime: ISO,
        numberOfSets: 2,
        collectedBeforeAntibiotics: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("antibiotic MAR reference validates", () => {
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(
      ANTIBIOTIC_TIMING_REFERENCE_CARD_ID,
      {
        documentedAt: ISO,
        antibioticsDocumentedInMar: "YES",
        firstAntibioticTime: ISO,
        providerNotified: "NO",
        delayOrVariancePresent: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("fluid resuscitation validates", () => {
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(
      FLUID_RESUSCITATION_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        fluidBolusOrderedOrStarted: "YES",
        fluidType: "NORMAL_SALINE",
        volumeMl: 1000,
        thirtyMlPerKgTargetConsidered: "YES",
        bloodPressureResponse: "IMPROVED",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("septic shock reassessment validates", () => {
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(
      SEPTIC_SHOCK_REASSESSMENT_CARD_ID,
      {
        reassessmentTime: ISO,
        hypotensionPersistent: "YES",
        lactateFourOrGreater: "YES",
        vasopressorsStartedOrOrdered: "YES",
        mentalStatusChanged: "NO",
        urineOutputConcern: "YES",
        providerAtBedside: "YES",
        providerNotified: "YES",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("sepsis escalation validates", () => {
    const ok = validateSepsisMonitoringDocumentationPayloadForCard(SEPSIS_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "LACTATE_ELEVATED",
      providerNotified: "YES",
      providerNotificationTime: ISO,
      responseReceived: "YES",
      rapidResponseActivated: "NO",
    });
    expect(ok.ok).toBe(true);
  });

  it("deriveSepsisScreenPositive is screening support only", () => {
    expect(
      deriveSepsisScreenPositive({
        suspectedInfection: "YES",
        temperatureAbnormal: "YES",
        heartRateAbnormal: "YES",
        respiratoryRateAbnormal: "NO",
        wbcAbnormalOrUnknown: "NO",
        alteredMentalStatus: "NO",
        hypotensionPresent: "NO",
        lactateConcern: "NO",
      })
    ).toBe("YES");
  });

  it("EN summaries render", () => {
    const lines = summarizeSepsisMonitoringDocumentationPayload(
      QSOFA_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        respiratoryRateHigh: "YES",
        alteredMentation: "YES",
        systolicBpLow: "NO",
        score: 2,
        qsofaPositive: "YES",
        providerNotified: "YES",
      },
      "en"
    );
    expect(lines.some((l) => l.key === "Score" && l.value === "2")).toBe(true);
  });

  it("FR summaries render", () => {
    const lines = summarizeSepsisMonitoringDocumentationPayload(
      SEPSIS_SCREENING_CARD_ID,
      {
        screeningTime: ISO,
        suspectedInfection: "YES",
        temperatureAbnormal: "NO",
        heartRateAbnormal: "NO",
        respiratoryRateAbnormal: "NO",
        wbcAbnormalOrUnknown: "NO",
        alteredMentalStatus: "NO",
        hypotensionPresent: "NO",
        lactateConcern: "NO",
        screenPositive: "YES",
        providerNotified: "YES",
        providerNotificationTime: ISO,
      },
      "fr"
    );
    expect(lines.some((l) => l.key === "Dépistage positif")).toBe(true);
  });
});
