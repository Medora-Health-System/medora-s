import { describe, expect, it } from "vitest";
import {
  calculateGcsScore,
  calculateNihssChange,
  deriveGcsSeverity,
  detectNihssWorsening,
  EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS,
  FREQUENT_NEURO_REASSESSMENT_CARD_ID,
  GLASGOW_COMA_SCALE_CARD_ID,
  MOTOR_STRENGTH_ASSESSMENT_CARD_ID,
  NEURO_CHECKS_CARD_ID,
  NEURO_ESCALATION_EVENT_CARD_ID,
  NIHSS_REASSESSMENT_CARD_ID,
  POST_THROMBOLYTIC_MONITORING_CARD_ID,
  PUPILLARY_ASSESSMENT_CARD_ID,
  summarizeStrokeNeuroReassessmentPayload,
  validateStrokeNeuroReassessmentPayloadForCard,
} from "./strokeNeuroReassessmentDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

const NIHSS_ITEMS = {
  levelOfConsciousness: 0,
  locQuestions: 0,
  locCommands: 0,
  bestGaze: 0,
  visualFields: 0,
  facialPalsy: 0,
  motorArmLeft: 0,
  motorArmRight: 1,
  motorLegLeft: 0,
  motorLegRight: 0,
  limbAtaxia: 0,
  sensory: 0,
  bestLanguage: 0,
  dysarthria: 0,
  extinctionInattention: 0,
};

describe("strokeNeuroReassessmentDocumentationPayloads (EDOC.11)", () => {
  it("all EDOC.11 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC11_STROKE_NEURO_REASSESSMENT_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("STROKE_DOCUMENTATION");
    }
  });

  it("NIHSS reassessment validates with change tracking", () => {
    const ok = validateStrokeNeuroReassessmentPayloadForCard(NIHSS_REASSESSMENT_CARD_ID, {
      assessedAt: ISO,
      ...NIHSS_ITEMS,
      totalScore: 1,
      previousScore: 0,
      scoreChange: 1,
      worseningDetected: true,
      providerNotified: true,
      providerNotificationTime: ISO,
    });
    expect(ok.ok).toBe(true);
  });

  it("NIHSS change and worsening helpers work", () => {
    expect(calculateNihssChange(5, 3)).toBe(2);
    expect(detectNihssWorsening(5, 3)).toBe(true);
    expect(detectNihssWorsening(3, 5)).toBe(false);
  });

  it("GCS score calculation and severity bands", () => {
    expect(calculateGcsScore({ eye: 4, verbal: 5, motor: 6 })).toBe(15);
    expect(deriveGcsSeverity(15)).toBe("MILD");
    expect(deriveGcsSeverity(10)).toBe("MODERATE");
    expect(deriveGcsSeverity(7)).toBe("SEVERE");
  });

  it("GCS mismatch rejected", () => {
    const bad = validateStrokeNeuroReassessmentPayloadForCard(GLASGOW_COMA_SCALE_CARD_ID, {
      assessmentTime: ISO,
      eye: 4,
      verbal: 5,
      motor: 6,
      totalScore: 10,
      severityBand: "MILD",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateStrokeNeuroReassessmentPayloadForCard(GLASGOW_COMA_SCALE_CARD_ID, {
      assessmentTime: ISO,
      eye: 4,
      verbal: 5,
      motor: 6,
      totalScore: 15,
      severityBand: "MILD",
      providerNotified: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("neuro checks validate", () => {
    expect(
      validateStrokeNeuroReassessmentPayloadForCard(NEURO_CHECKS_CARD_ID, {
        assessmentTime: ISO,
        levelOfConsciousness: "ALERT",
        orientation: "X4",
        speech: "NORMAL",
        sensation: "INTACT",
        facialDroop: "NONE",
        seizureActivityObserved: false,
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("pupillary assessment validates", () => {
    expect(
      validateStrokeNeuroReassessmentPayloadForCard(PUPILLARY_ASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        leftPupilSize: 3,
        rightPupilSize: 4,
        leftReaction: "BRISK",
        rightReaction: "SLUGGISH",
        anisocoriaPresent: true,
        providerNotified: true,
      }).ok
    ).toBe(true);
  });

  it("motor strength validates", () => {
    expect(
      validateStrokeNeuroReassessmentPayloadForCard(MOTOR_STRENGTH_ASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        lue: 5,
        rue: 4,
        lle: 5,
        rle: 5,
        pronatorDrift: "NONE",
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("escalation validates and requires provider notification", () => {
    const bad = validateStrokeNeuroReassessmentPayloadForCard(NEURO_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "GCS_DECLINE",
      providerNotified: false,
      providerNotificationTime: ISO,
      responseReceived: false,
      rapidResponseActivated: false,
      strokeAlertActivated: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateStrokeNeuroReassessmentPayloadForCard(NEURO_ESCALATION_EVENT_CARD_ID, {
      eventTime: ISO,
      reason: "GCS_DECLINE",
      providerNotified: true,
      providerNotificationTime: ISO,
      responseReceived: true,
      rapidResponseActivated: true,
      strokeAlertActivated: false,
    });
    expect(ok.ok).toBe(true);
  });

  it("post-thrombolytic monitoring validates bleeding governance", () => {
    const bad = validateStrokeNeuroReassessmentPayloadForCard(POST_THROMBOLYTIC_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      therapy: "TPA",
      bloodPressure: "140/90",
      heartRate: 88,
      neuroStatusStable: false,
      bleedingObserved: true,
      headachePresent: true,
      bpWithinParameters: "NO",
      neuroChangePresent: "YES",
      bleedingConcern: "YES",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);
    const ok = validateStrokeNeuroReassessmentPayloadForCard(POST_THROMBOLYTIC_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      therapy: "TNK",
      bloodPressure: "118/76",
      heartRate: 78,
      neuroStatusStable: true,
      bleedingObserved: false,
      headachePresent: false,
      bpWithinParameters: "YES",
      neuroChangePresent: "NO",
      bleedingConcern: "NO",
      providerNotified: false,
    });
    expect(ok.ok).toBe(true);
  });

  it("frequent reassessment validates", () => {
    expect(
      validateStrokeNeuroReassessmentPayloadForCard(FREQUENT_NEURO_REASSESSMENT_CARD_ID, {
        assessmentTime: ISO,
        frequency: "Q15",
        neuroStatus: "UNCHANGED",
        providerNotified: false,
      }).ok
    ).toBe(true);
  });

  it("EN and FR summaries include key facts", () => {
    const en = summarizeStrokeNeuroReassessmentPayload(NIHSS_REASSESSMENT_CARD_ID, {
      assessedAt: ISO,
      ...NIHSS_ITEMS,
      totalScore: 1,
      previousScore: 0,
      scoreChange: 1,
      worseningDetected: true,
      providerNotified: true,
      providerNotificationTime: ISO,
    }, "en");
    expect(en.some((l) => l.key === "NIHSS total" && l.value === "1")).toBe(true);
    expect(en.some((l) => l.key === "Previous score")).toBe(true);

    const fr = summarizeStrokeNeuroReassessmentPayload(GLASGOW_COMA_SCALE_CARD_ID, {
      assessmentTime: ISO,
      eye: 4,
      verbal: 5,
      motor: 6,
      totalScore: 15,
      severityBand: "MILD",
      providerNotified: true,
    }, "fr");
    expect(fr.some((l) => l.key === "Score total" && l.value === "15")).toBe(true);
    expect(fr.some((l) => l.key === "Sévérité")).toBe(true);
  });
});
