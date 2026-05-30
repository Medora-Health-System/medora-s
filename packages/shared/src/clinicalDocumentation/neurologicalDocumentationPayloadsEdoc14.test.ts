import { describe, expect, it } from "vitest";
import {
  calculateGcsTotal,
  deriveGcsSeverityBand,
  deriveNihssSeverity,
  EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS,
  EDOC_14B_FUTURE_NEURO_ICU_MONITORING,
  GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
  hasClinicallySignificantGcsDecline,
  hasAcuteSpeechDeterioration,
  hasFixedPupilDocumented,
  requiresNeurologicalReassessmentProviderNotification,
  NEUROLOGICAL_ESCALATION_EVENT_CARD_ID,
  NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
  NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
  NEUROLOGICAL_REASSESSMENT_CARD_ID,
  NIHSS_ASSESSMENT_CARD_ID,
  SEIZURE_EVENT_DOCUMENTATION_CARD_ID,
  STROKE_ALERT_EVENT_CARD_ID,
  summarizeNeurologicalDocumentationPayload,
  validateNeurologicalDocumentationPayloadForCard,
} from "./neurologicalDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

const STRUCTURED_PUPILS = {
  leftPupilSizeMm: 3,
  rightPupilSizeMm: 3,
  leftPupilReaction: "BRISK" as const,
  rightPupilReaction: "BRISK" as const,
};

const INITIAL_BASE = {
  assessmentTime: ISO,
  orientationPerson: true,
  orientationPlace: true,
  orientationTime: true,
  orientationSituation: true,
  speechStatus: "CLEAR" as const,
  facialSymmetry: "SYMMETRIC" as const,
  leftArmStrength: "5/5" as const,
  rightArmStrength: "5/5" as const,
  leftLegStrength: "5/5" as const,
  rightLegStrength: "5/5" as const,
  sensationStatus: "INTACT" as const,
  ...STRUCTURED_PUPILS,
};

const REASSESSMENT_BASE = {
  assessmentTime: ISO,
  mentalStatus: "ALERT" as const,
  orientationChanged: false,
  motorChanged: false,
  sensoryChanged: false,
  speechChanged: false,
  priorSpeechStatus: "CLEAR" as const,
  speechStatus: "CLEAR" as const,
  pupilChanged: false,
  ...STRUCTURED_PUPILS,
  newDeficit: false,
  newUnilateralWeakness: false,
  providerNotified: false,
};

const NIHSS_ZERO = {
  levelOfConsciousness: 0,
  locQuestions: 0,
  locCommands: 0,
  bestGaze: 0,
  visualFields: 0,
  facialPalsy: 0,
  motorArmLeft: 0,
  motorArmRight: 0,
  motorLegLeft: 0,
  motorLegRight: 0,
  limbAtaxia: 0,
  sensory: 0,
  bestLanguage: 0,
  dysarthria: 0,
  extinctionInattention: 0,
};

const POST_TPA_BASE = {
  administrationTime: ISO,
  monitoringInterval: "15_MIN" as const,
  neuroStatus: "STABLE" as const,
  systolicBp: 130,
  diastolicBp: 85,
  bleedingSigns: false,
  neurologicalWorsening: false,
  providerNotified: false,
};

describe("neurologicalDocumentationPayloads (EDOC.14)", () => {
  it("all EDOC.14 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC14_NEUROLOGICAL_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("NEUROLOGICAL_DOCUMENTATION");
    }
  });

  it("documents EDOC.14B future neuro ICU monitoring marker", () => {
    expect(EDOC_14B_FUTURE_NEURO_ICU_MONITORING).toBe("EDOC.14B");
  });

  it("initial assessment validates structured pupils and motor enum", () => {
    expect(
      validateNeurologicalDocumentationPayloadForCard(
        NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
        INITIAL_BASE
      ).ok
    ).toBe(true);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID, {
        ...INITIAL_BASE,
        leftArmStrength: "UTA",
      }).ok
    ).toBe(true);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID, {
        ...INITIAL_BASE,
        leftPupilSizeMm: 10,
        rightPupilSizeMm: 10,
      }).ok
    ).toBe(true);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID, {
        ...INITIAL_BASE,
        leftPupilSizeMm: 11,
      }).ok
    ).toBe(false);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID, {
        ...INITIAL_BASE,
        leftPupilReaction: "INVALID",
      }).ok
    ).toBe(false);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID, {
        ...INITIAL_BASE,
        leftArmStrength: 5,
      }).ok
    ).toBe(false);
  });

  it("reassessment validates structured pupils and provider governance", () => {
    expect(
      validateNeurologicalDocumentationPayloadForCard(
        NEUROLOGICAL_REASSESSMENT_CARD_ID,
        REASSESSMENT_BASE
      ).ok
    ).toBe(true);

    const bad = validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_REASSESSMENT_CARD_ID, {
      ...REASSESSMENT_BASE,
      newDeficit: true,
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);

    const ok = validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_REASSESSMENT_CARD_ID, {
      ...REASSESSMENT_BASE,
      newDeficit: true,
      providerNotified: true,
      providerNotificationTime: ISO,
    });
    expect(ok.ok).toBe(true);
  });

  it("reassessment governance: fixed pupil, unilateral weakness, speech deterioration", () => {
    expect(hasFixedPupilDocumented({ leftPupilReaction: "FIXED", rightPupilReaction: "BRISK" })).toBe(
      true
    );
    expect(
      hasAcuteSpeechDeterioration({ priorSpeechStatus: "CLEAR", speechStatus: "SLURRED" })
    ).toBe(true);
    expect(
      requiresNeurologicalReassessmentProviderNotification({
        ...REASSESSMENT_BASE,
        newUnilateralWeakness: true,
      })
    ).toBe(true);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_REASSESSMENT_CARD_ID, {
        ...REASSESSMENT_BASE,
        leftPupilReaction: "FIXED",
        providerNotified: false,
      }).ok
    ).toBe(false);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_REASSESSMENT_CARD_ID, {
        ...REASSESSMENT_BASE,
        leftPupilReaction: "FIXED",
        providerNotified: true,
      }).ok
    ).toBe(false);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_REASSESSMENT_CARD_ID, {
        ...REASSESSMENT_BASE,
        newUnilateralWeakness: true,
        providerNotified: false,
      }).ok
    ).toBe(false);

    expect(
      validateNeurologicalDocumentationPayloadForCard(NEUROLOGICAL_REASSESSMENT_CARD_ID, {
        ...REASSESSMENT_BASE,
        priorSpeechStatus: "CLEAR",
        speechStatus: "APHASIC",
        providerNotified: true,
        providerNotificationTime: ISO,
      }).ok
    ).toBe(true);
  });

  it("hasClinicallySignificantGcsDecline and GCS drop governance work", () => {
    expect(hasClinicallySignificantGcsDecline(15, 15)).toBe(false);
    expect(hasClinicallySignificantGcsDecline(15, 13)).toBe(true);
    expect(hasClinicallySignificantGcsDecline(undefined, 10)).toBe(false);

    expect(calculateGcsTotal({ eyeOpening: 4, verbalResponse: 5, motorResponse: 6 })).toBe(15);
    expect(deriveGcsSeverityBand(15)).toBe("MILD");

    const bad = validateNeurologicalDocumentationPayloadForCard(
      GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        eyeOpening: 3,
        verbalResponse: 4,
        motorResponse: 5,
        calculatedTotal: 12,
        severity: "MODERATE",
        priorGcsTotal: 15,
        providerNotified: false,
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("stroke alert activated requires activationTime, lastKnownWell, neurologyNotified", () => {
    const badMissingActivation = validateNeurologicalDocumentationPayloadForCard(
      STROKE_ALERT_EVENT_CARD_ID,
      {
        lastKnownWell: ISO,
        symptomOnsetTime: ISO,
        strokeAlertActivated: true,
        provider: "Dr Smith",
        neurologyNotified: true,
        ctOrdered: true,
        thrombolyticCandidate: false,
      }
    );
    expect(badMissingActivation.ok).toBe(false);

    const ok = validateNeurologicalDocumentationPayloadForCard(STROKE_ALERT_EVENT_CARD_ID, {
      lastKnownWell: ISO,
      symptomOnsetTime: ISO,
      strokeAlertActivated: true,
      activationTime: ISO,
      provider: "Dr Smith",
      neurologyNotified: true,
      ctOrdered: true,
      thrombolyticCandidate: false,
    });
    expect(ok.ok).toBe(true);

    const inactiveOk = validateNeurologicalDocumentationPayloadForCard(STROKE_ALERT_EVENT_CARD_ID, {
      lastKnownWell: ISO,
      symptomOnsetTime: ISO,
      strokeAlertActivated: false,
      provider: "Dr Smith",
      neurologyNotified: false,
      ctOrdered: false,
      thrombolyticCandidate: false,
    });
    expect(inactiveOk.ok).toBe(true);
  });

  it("NIHSS total mismatch is rejected and recomputation is authoritative", () => {
    const bad = validateNeurologicalDocumentationPayloadForCard(NIHSS_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      ...NIHSS_ZERO,
      motorArmLeft: 4,
      calculatedTotal: 99,
      severity: "SEVERE",
      providerNotified: false,
    });
    expect(bad.ok).toBe(false);

    const ok = validateNeurologicalDocumentationPayloadForCard(NIHSS_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      ...NIHSS_ZERO,
      motorArmLeft: 4,
      calculatedTotal: 4,
      severity: "MINOR",
      providerNotified: false,
    });
    expect(ok.ok).toBe(true);

    expect(deriveNihssSeverity(18)).toBe("MODERATE_SEVERE");
  });

  it("post-thrombolytic requires monitoringInterval", () => {
    expect(
      validateNeurologicalDocumentationPayloadForCard(
        NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
        POST_TPA_BASE
      ).ok
    ).toBe(true);

    expect(
      validateNeurologicalDocumentationPayloadForCard(
        NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
        {
          ...POST_TPA_BASE,
          monitoringInterval: "INVALID",
        }
      ).ok
    ).toBe(false);

    const bad = validateNeurologicalDocumentationPayloadForCard(
      NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
      {
        ...POST_TPA_BASE,
        bleedingSigns: true,
        providerNotified: false,
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("seizure event validates benzodiazepine and rescue medication fields", () => {
    const ok = validateNeurologicalDocumentationPayloadForCard(SEIZURE_EVENT_DOCUMENTATION_CARD_ID, {
      witnessed: true,
      startTime: ISO,
      endTime: ISO,
      durationMinutes: 3,
      seizureType: "FOCAL",
      auraPresent: false,
      incontinence: false,
      injury: false,
      postictalState: "MILD",
      benzodiazepineAdministered: true,
      rescueMedicationGiven: false,
      providerNotified: true,
      providerNotificationTime: ISO,
    });
    expect(ok.ok).toBe(true);
  });

  it("escalation requires structured pupils when pupilChange is true", () => {
    const bad = validateNeurologicalDocumentationPayloadForCard(
      NEUROLOGICAL_ESCALATION_EVENT_CARD_ID,
      {
        eventTime: ISO,
        newDeficit: true,
        mentalStatusDecline: false,
        gcsDrop: false,
        pupilChange: true,
        strokeSymptoms: false,
        providerNotified: true,
        providerNotificationTime: ISO,
      }
    );
    expect(bad.ok).toBe(false);

    const ok = validateNeurologicalDocumentationPayloadForCard(
      NEUROLOGICAL_ESCALATION_EVENT_CARD_ID,
      {
        eventTime: ISO,
        newDeficit: true,
        mentalStatusDecline: false,
        gcsDrop: false,
        pupilChange: true,
        ...STRUCTURED_PUPILS,
        strokeSymptoms: false,
        providerNotified: true,
        providerNotificationTime: ISO,
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("legal summaries include high-value items only", () => {
    const gcs = summarizeNeurologicalDocumentationPayload(
      GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        eyeOpening: 4,
        verbalResponse: 5,
        motorResponse: 6,
        calculatedTotal: 15,
        severity: "MILD",
        providerNotified: true,
        providerNotificationTime: ISO,
      },
      "en"
    );
    expect(gcs.some((l) => l.key === "GCS total" && l.value === "15")).toBe(true);
    expect(gcs.some((l) => l.key === "GCS severity")).toBe(true);
    expect(gcs.some((l) => l.key === "Provider notification")).toBe(true);
    expect(gcs.some((l) => l.key === "Eye opening")).toBe(false);

    const nihss = summarizeNeurologicalDocumentationPayload(
      NIHSS_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        ...NIHSS_ZERO,
        calculatedTotal: 0,
        severity: "NO_STROKE",
        providerNotified: false,
      },
      "en"
    );
    expect(nihss.some((l) => l.key === "NIHSS total")).toBe(true);
    expect(nihss.some((l) => l.key === "NIHSS severity")).toBe(true);
    expect(nihss.some((l) => l.key === "Level of consciousness")).toBe(false);

    const stroke = summarizeNeurologicalDocumentationPayload(
      STROKE_ALERT_EVENT_CARD_ID,
      {
        lastKnownWell: ISO,
        symptomOnsetTime: ISO,
        strokeAlertActivated: true,
        activationTime: ISO,
        provider: "Dr Smith",
        neurologyNotified: true,
        ctOrdered: true,
        thrombolyticCandidate: false,
      },
      "en"
    );
    expect(stroke.some((l) => l.key === "Stroke alert activated")).toBe(true);
    expect(stroke.some((l) => l.key === "Provider notification")).toBe(true);
    expect(stroke.some((l) => l.key === "Provider" && l.value === "Dr Smith")).toBe(false);

    const seizure = summarizeNeurologicalDocumentationPayload(
      SEIZURE_EVENT_DOCUMENTATION_CARD_ID,
      {
        witnessed: true,
        startTime: ISO,
        endTime: ISO,
        durationMinutes: 5,
        seizureType: "FOCAL",
        auraPresent: false,
        incontinence: false,
        injury: false,
        postictalState: "MILD",
        benzodiazepineAdministered: true,
        rescueMedicationGiven: false,
        providerNotified: true,
        providerNotificationTime: ISO,
      },
      "en"
    );
    expect(seizure.some((l) => l.key === "Seizure duration" && l.value === "5 min")).toBe(true);
    expect(seizure.some((l) => l.key === "Provider notification")).toBe(true);
    expect(seizure.some((l) => l.key === "Witnessed")).toBe(false);

    const initial = summarizeNeurologicalDocumentationPayload(
      NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
      INITIAL_BASE,
      "en"
    );
    expect(initial.some((l) => l.key === "Speech")).toBe(false);
    expect(initial.some((l) => l.key === "Motor")).toBe(false);
  });
});
