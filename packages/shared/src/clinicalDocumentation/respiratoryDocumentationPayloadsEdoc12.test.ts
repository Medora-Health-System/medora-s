import { describe, expect, it } from "vitest";
import {
  CPAP_BIPAP_MONITORING_CARD_ID,
  EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS,
  NEBULIZER_REASSESSMENT_CARD_ID,
  OXYGEN_THERAPY_INITIATION_CARD_ID,
  OXYGEN_TITRATION_CARD_ID,
  PEAK_FLOW_DOCUMENTATION_CARD_ID,
  RESP_ASSESSMENT_CARD_ID,
  RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID,
  VENTILATOR_OBSERVATION_CARD_ID,
  summarizeRespiratoryDocumentationPayload,
  validateRespiratoryDocumentationPayloadForCard,
} from "./respiratoryDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

const BASE_ASSESSMENT = {
  assessmentTime: ISO,
  respiratoryRate: 22,
  spo2: 94,
  oxygenDevice: "NASAL_CANNULA" as const,
  oxygenFlowRate: 2,
  workOfBreathing: "MILD_INCREASED" as const,
  breathSounds: "WHEEZING" as const,
  breathSoundsLocation: "BILATERAL" as const,
  cough: "DRY" as const,
  sputumPresent: false,
  accessoryMuscleUse: false,
  retractions: false,
  cyanosis: false,
  patientPosition: "SEMI_FOWLER" as const,
  providerNotified: false,
};

describe("respiratoryDocumentationPayloads (EDOC.12)", () => {
  it("all EDOC.12 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC12_RESPIRATORY_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("RESPIRATORY_DOCUMENTATION");
    }
  });

  it("respiratory assessment validates", () => {
    expect(
      validateRespiratoryDocumentationPayloadForCard(RESP_ASSESSMENT_CARD_ID, BASE_ASSESSMENT).ok
    ).toBe(true);
  });

  it("severe distress requires provider notification", () => {
    const bad = validateRespiratoryDocumentationPayloadForCard(RESP_ASSESSMENT_CARD_ID, {
      ...BASE_ASSESSMENT,
      workOfBreathing: "SEVERE_DISTRESS",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateRespiratoryDocumentationPayloadForCard(RESP_ASSESSMENT_CARD_ID, {
      ...BASE_ASSESSMENT,
      workOfBreathing: "SEVERE_DISTRESS",
      providerNotified: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("oxygen initiation validates", () => {
    expect(
      validateRespiratoryDocumentationPayloadForCard(OXYGEN_THERAPY_INITIATION_CARD_ID, {
        startedAt: ISO,
        oxygenDevice: "NASAL_CANNULA",
        flowRate: 2,
        flowUnit: "LPM",
        spo2Before: 88,
        spo2After: 94,
        reason: "HYPOXIA",
        providerOrderVerified: true,
        patientTolerated: true,
      }).ok
    ).toBe(true);
  });

  it("oxygen titration validates", () => {
    expect(
      validateRespiratoryDocumentationPayloadForCard(OXYGEN_TITRATION_CARD_ID, {
        titrationTime: ISO,
        previousDevice: "NASAL_CANNULA",
        newDevice: "SIMPLE_MASK",
        previousFlowRate: 2,
        newFlowRate: 6,
        flowUnit: "LPM",
        spo2Before: 90,
        spo2After: 96,
        reason: "SPO2_LOW",
        providerNotified: false,
        patientTolerated: true,
      }).ok
    ).toBe(true);
  });

  it("distress titration requires provider notification", () => {
    const bad = validateRespiratoryDocumentationPayloadForCard(OXYGEN_TITRATION_CARD_ID, {
      titrationTime: ISO,
      previousDevice: "NASAL_CANNULA",
      newDevice: "NON_REBREATHER",
      newFlowRate: 15,
      flowUnit: "LPM",
      spo2Before: 85,
      spo2After: 92,
      reason: "RESPIRATORY_DISTRESS",
      providerNotified: false,
      patientTolerated: true,
    });
    expect(bad.ok).toBe(false);
  });

  it("nebulizer reassessment validates", () => {
    expect(
      validateRespiratoryDocumentationPayloadForCard(NEBULIZER_REASSESSMENT_CARD_ID, {
        reassessmentTime: ISO,
        treatmentMedicationReferenced: "ALBUTEROL",
        treatmentDocumentedInMar: true,
        respiratoryRate: 20,
        spo2: 95,
        breathSoundsAfter: "CLEAR",
        workOfBreathingAfter: "NORMAL",
        patientReportsImprovement: true,
        adverseEffectObserved: false,
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("adverse effect requires provider notification", () => {
    const bad = validateRespiratoryDocumentationPayloadForCard(NEBULIZER_REASSESSMENT_CARD_ID, {
      reassessmentTime: ISO,
      treatmentMedicationReferenced: "ALBUTEROL",
      treatmentDocumentedInMar: true,
      respiratoryRate: 24,
      spo2: 90,
      breathSoundsAfter: "WHEEZING",
      workOfBreathingAfter: "MODERATE_INCREASED",
      patientReportsImprovement: false,
      adverseEffectObserved: true,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("CPAP/BiPAP validates", () => {
    expect(
      validateRespiratoryDocumentationPayloadForCard(CPAP_BIPAP_MONITORING_CARD_ID, {
        monitoringTime: ISO,
        mode: "CPAP",
        deviceSettingSummary: "CPAP 8",
        fio2Percent: 40,
        respiratoryRate: 18,
        spo2: 96,
        maskFit: "GOOD",
        skinIntegrity: "INTACT",
        patientTolerance: "TOLERATING",
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("poor tolerance/breakdown requires provider notification", () => {
    const bad = validateRespiratoryDocumentationPayloadForCard(CPAP_BIPAP_MONITORING_CARD_ID, {
      monitoringTime: ISO,
      mode: "BIPAP",
      deviceSettingSummary: "BiPAP 12/6",
      respiratoryRate: 22,
      spo2: 91,
      maskFit: "POOR_TOLERANCE",
      skinIntegrity: "INTACT",
      patientTolerance: "REMOVED_MASK",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
  });

  it("respiratory distress reassessment validates", () => {
    expect(
      validateRespiratoryDocumentationPayloadForCard(RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID, {
        reassessmentTime: ISO,
        respiratoryRate: 32,
        spo2: 86,
        workOfBreathing: "SEVERE_DISTRESS",
        oxygenDevice: "NON_REBREATHER",
        oxygenFlowRate: 15,
        accessoryMuscleUse: true,
        retractions: true,
        mentalStatus: "ANXIOUS",
        interventionPerformed: "OXYGEN_INCREASED",
        providerNotified: true,
        rapidResponseActivated: false,
      }).ok
    ).toBe(true);
  });

  it("ventilator alarm requires alarm description + RT notified", () => {
    const bad = validateRespiratoryDocumentationPayloadForCard(VENTILATOR_OBSERVATION_CARD_ID, {
      observationTime: ISO,
      ventilatorMode: "AC",
      respiratoryRateObserved: 14,
      spo2: 98,
      airwaySecured: true,
      alarmObserved: true,
      rtNotified: false,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateRespiratoryDocumentationPayloadForCard(VENTILATOR_OBSERVATION_CARD_ID, {
      observationTime: ISO,
      ventilatorMode: "AC",
      fio2Percent: 40,
      peep: 5,
      respiratoryRateObserved: 14,
      spo2: 98,
      airwaySecured: true,
      alarmObserved: true,
      alarmDescription: "High pressure alarm",
      rtNotified: true,
      providerNotified: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("peak flow validates", () => {
    expect(
      validateRespiratoryDocumentationPayloadForCard(PEAK_FLOW_DOCUMENTATION_CARD_ID, {
        measuredAt: ISO,
        preTreatmentPeakFlow: 220,
        postTreatmentPeakFlow: 310,
        personalBestKnown: true,
        personalBestValue: 400,
        effortQuality: "GOOD",
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("EN and FR summaries render", () => {
    const en = summarizeRespiratoryDocumentationPayload(RESP_ASSESSMENT_CARD_ID, BASE_ASSESSMENT, "en");
    expect(en.some((l) => l.key === "Respiratory rate" && l.value === "22")).toBe(true);
    expect(en.some((l) => l.key === "SpO₂")).toBe(true);

    const fr = summarizeRespiratoryDocumentationPayload(OXYGEN_TITRATION_CARD_ID, {
      titrationTime: ISO,
      previousDevice: "NASAL_CANNULA",
      newDevice: "SIMPLE_MASK",
      newFlowRate: 6,
      flowUnit: "LPM",
      spo2Before: 90,
      spo2After: 96,
      reason: "SPO2_LOW",
      providerNotified: false,
      patientTolerated: true,
    }, "fr");
    expect(fr.some((l) => l.key === "Ancien → nouveau")).toBe(true);
  });
});
