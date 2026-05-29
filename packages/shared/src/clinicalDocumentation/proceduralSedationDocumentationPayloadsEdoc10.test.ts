import { describe, expect, it } from "vitest";
import {
  calculateSedationRecoveryScore,
  EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS,
  isSedationRecoveryCriteriaMet,
  SEDATION_DISCHARGE_READINESS_CARD_ID,
  SEDATION_INITIATION_CARD_ID,
  SEDATION_MONITORING_CARD_ID,
  SEDATION_PRE_ASSESSMENT_CARD_ID,
  SEDATION_RECOVERY_SCORE_CARD_ID,
  SEDATION_TIMEOUT_CARD_ID,
  requiresImmediateWitnessCaptureForSedationPayload,
  summarizeProceduralSedationDocumentationPayload,
  validateProceduralSedationPayloadForCard,
} from "./proceduralSedationDocumentationPayloads.js";
import { requiresImmediateWitnessCaptureForPayload } from "./clinicalDocumentationImmediateWitnessPolicy.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

const PRE_ASSESSMENT_PAYLOAD = {
  assessedAt: ISO,
  procedurePlanned: "Shoulder reduction",
  providerResponsible: "Dr Smith",
  consentVerified: true,
  allergiesReviewed: true,
  npoStatus: "NPO_CONFIRMED" as const,
  asaClass: "ASA_II" as const,
  mallampatiScore: "CLASS_II" as const,
  airwayAssessment: "NORMAL" as const,
  baselineHeartRate: 80,
  baselineRespRate: 16,
  baselineBloodPressure: "120/80",
  baselineSpo2: 98,
};

const TIMEOUT_PAYLOAD = {
  timeoutTime: ISO,
  correctPatientConfirmed: true,
  correctProcedureConfirmed: true,
  correctSiteConfirmed: true,
  providerPresent: true,
  rnPresent: true,
  monitoringEquipmentAvailable: true,
  suctionAvailable: true,
  oxygenAvailable: true,
  airwayEquipmentAvailable: true,
  reversalAgentsAvailable: true,
  emergencyEquipmentAvailable: true,
  consentVerified: true,
  plannedSedationLevel: "MODERATE" as const,
};

const INITIATION_PAYLOAD = {
  startTime: ISO,
  sedationLevelTarget: "MODERATE" as const,
  oxygenDeliveryMethod: "NASAL_CANNULA" as const,
  monitoringStarted: true,
  cardiacMonitorApplied: true,
  pulseOximetryApplied: true,
  etco2MonitoringApplied: false,
  bloodPressureMonitoringApplied: true,
  ivAccessConfirmed: true,
  baselineHeartRate: 80,
  baselineRespRate: 16,
  baselineBloodPressure: "120/80",
  baselineSpo2: 98,
  medicationAdministrationDocumentedInMar: true,
};

const MONITORING_PAYLOAD = {
  monitoringTime: ISO,
  heartRate: 78,
  respRate: 14,
  bloodPressure: "118/76",
  spo2: 99,
  oxygenDeliveryMethod: "NASAL_CANNULA" as const,
  sedationLevel: "DROWSY_RESPONDS_TO_VOICE" as const,
  airwayStatus: "PATENT" as const,
  interventionRequired: false,
  adverseEventObserved: false,
  providerNotified: false,
};

const RECOVERY_SCORE_COMPONENTS = {
  activity: "MOVES_4_EXTREMITIES" as const,
  respiration: "DEEP_BREATH_COUGH" as const,
  circulation: "BP_WITHIN_20_PERCENT" as const,
  consciousness: "FULLY_AWAKE" as const,
  oxygenSaturation: "MAINTAINS_GREATER_92_ROOM_AIR" as const,
};

describe("proceduralSedationDocumentationPayloads (EDOC.10)", () => {
  it("all EDOC.10 sedation cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("PROCEDURE_MONITORING");
    }
  });

  it("pre-sedation schema validates", () => {
    expect(validateProceduralSedationPayloadForCard(SEDATION_PRE_ASSESSMENT_CARD_ID, PRE_ASSESSMENT_PAYLOAD).ok).toBe(
      true
    );
  });

  it("timeout schema validates and requires critical checks or notes", () => {
    expect(validateProceduralSedationPayloadForCard(SEDATION_TIMEOUT_CARD_ID, TIMEOUT_PAYLOAD).ok).toBe(true);
    const failed = validateProceduralSedationPayloadForCard(SEDATION_TIMEOUT_CARD_ID, {
      ...TIMEOUT_PAYLOAD,
      correctPatientConfirmed: false,
    });
    expect(failed.ok).toBe(false);
    const exception = validateProceduralSedationPayloadForCard(SEDATION_TIMEOUT_CARD_ID, {
      ...TIMEOUT_PAYLOAD,
      correctPatientConfirmed: false,
      notes: "Emergent exception documented.",
    });
    expect(exception.ok).toBe(true);
  });

  it("initiation schema validates", () => {
    expect(validateProceduralSedationPayloadForCard(SEDATION_INITIATION_CARD_ID, INITIATION_PAYLOAD).ok).toBe(true);
  });

  it("monitoring schema validates and requires intervention description when needed", () => {
    expect(validateProceduralSedationPayloadForCard(SEDATION_MONITORING_CARD_ID, MONITORING_PAYLOAD).ok).toBe(true);
    const missing = validateProceduralSedationPayloadForCard(SEDATION_MONITORING_CARD_ID, {
      ...MONITORING_PAYLOAD,
      interventionRequired: true,
    });
    expect(missing.ok).toBe(false);
    const ok = validateProceduralSedationPayloadForCard(SEDATION_MONITORING_CARD_ID, {
      ...MONITORING_PAYLOAD,
      interventionRequired: true,
      interventionDescription: "Jaw thrust",
    });
    expect(ok.ok).toBe(true);
  });

  it("reassessment schema validates", () => {
    const ok = validateProceduralSedationPayloadForCard("sedation_reassessment", {
      reassessmentTime: ISO,
      patientCondition: "STABLE",
      airwayStable: true,
      hemodynamicallyStable: true,
      painControlled: true,
      nauseaVomitingPresent: false,
      providerNotified: false,
      continuedMonitoringRequired: true,
    });
    expect(ok.ok).toBe(true);
  });

  it("recovery score calculates correctly", () => {
    expect(calculateSedationRecoveryScore(RECOVERY_SCORE_COMPONENTS)).toBe(10);
    expect(isSedationRecoveryCriteriaMet(10)).toBe(true);
    expect(isSedationRecoveryCriteriaMet(7)).toBe(false);
  });

  it("recovery score rejects total mismatch", () => {
    const total = calculateSedationRecoveryScore(RECOVERY_SCORE_COMPONENTS);
    const bad = validateProceduralSedationPayloadForCard(SEDATION_RECOVERY_SCORE_CARD_ID, {
      scoredAt: ISO,
      ...RECOVERY_SCORE_COMPONENTS,
      totalScore: total - 1,
      meetsRecoveryCriteria: true,
    });
    expect(bad.ok).toBe(false);
    const ok = validateProceduralSedationPayloadForCard(SEDATION_RECOVERY_SCORE_CARD_ID, {
      scoredAt: ISO,
      ...RECOVERY_SCORE_COMPONENTS,
      totalScore: total,
      meetsRecoveryCriteria: isSedationRecoveryCriteriaMet(total),
    });
    expect(ok.ok).toBe(true);
  });

  it("discharge readiness validates", () => {
    const bad = validateProceduralSedationPayloadForCard(SEDATION_DISCHARGE_READINESS_CARD_ID, {
      assessedAt: ISO,
      recoveryScoreReviewed: true,
      vitalSignsStable: true,
      airwayStable: true,
      mentalStatusAtBaseline: true,
      painControlled: true,
      nauseaControlled: true,
      responsibleAdultPresent: false,
      dischargeInstructionsReviewed: true,
      providerApprovedDischarge: false,
      patientOrRepresentativeUnderstandsInstructions: true,
    });
    expect(bad.ok).toBe(false);
    const ok = validateProceduralSedationPayloadForCard(SEDATION_DISCHARGE_READINESS_CARD_ID, {
      assessedAt: ISO,
      recoveryScoreReviewed: true,
      vitalSignsStable: true,
      airwayStable: true,
      mentalStatusAtBaseline: true,
      painControlled: true,
      nauseaControlled: true,
      responsibleAdultPresent: false,
      dischargeInstructionsReviewed: true,
      providerApprovedDischarge: true,
      patientOrRepresentativeUnderstandsInstructions: true,
      notes: "Patient leaving with EMS escort.",
    });
    expect(ok.ok).toBe(true);
  });

  it("sedation timeout requires immediate witness", () => {
    expect(requiresImmediateWitnessCaptureForSedationPayload(SEDATION_TIMEOUT_CARD_ID, TIMEOUT_PAYLOAD)).toBe(true);
    expect(requiresImmediateWitnessCaptureForPayload(SEDATION_TIMEOUT_CARD_ID, TIMEOUT_PAYLOAD)).toBe(true);
  });

  it("monitoring rows do not require immediate witness", () => {
    expect(requiresImmediateWitnessCaptureForSedationPayload(SEDATION_MONITORING_CARD_ID, MONITORING_PAYLOAD)).toBe(
      false
    );
    expect(requiresImmediateWitnessCaptureForPayload(SEDATION_MONITORING_CARD_ID, MONITORING_PAYLOAD)).toBe(false);
  });

  it("summaries EN/FR include vitals and score", () => {
    const preEn = summarizeProceduralSedationDocumentationPayload(
      SEDATION_PRE_ASSESSMENT_CARD_ID,
      PRE_ASSESSMENT_PAYLOAD,
      "en"
    );
    expect(preEn.some((l) => l.key === "Heart rate")).toBe(true);
    expect(preEn.some((l) => l.value === "98")).toBe(true);
    const preFr = summarizeProceduralSedationDocumentationPayload(
      SEDATION_PRE_ASSESSMENT_CARD_ID,
      PRE_ASSESSMENT_PAYLOAD,
      "fr"
    );
    expect(preFr.some((l) => l.key === "Fréquence cardiaque")).toBe(true);

    const total = calculateSedationRecoveryScore(RECOVERY_SCORE_COMPONENTS);
    const scoreEn = summarizeProceduralSedationDocumentationPayload(
      SEDATION_RECOVERY_SCORE_CARD_ID,
      {
        scoredAt: ISO,
        ...RECOVERY_SCORE_COMPONENTS,
        totalScore: total,
        meetsRecoveryCriteria: true,
      },
      "en"
    );
    expect(scoreEn.some((l) => l.value.includes(String(total)))).toBe(true);
  });
});
