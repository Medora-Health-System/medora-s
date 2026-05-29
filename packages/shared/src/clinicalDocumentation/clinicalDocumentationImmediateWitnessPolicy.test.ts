import { describe, expect, it } from "vitest";
import {
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_REACTION_CARD_ID,
  BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  summarizeBloodProductDocumentationPayload,
} from "./bloodProductDocumentationPayloads.js";
import { EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS } from "./observationDocumentationPayloads.js";
import { EDOC4_STROKE_DOCUMENTATION_CARD_IDS } from "./strokeDocumentationPayloads.js";
import { EDOC5_INTAKE_OUTPUT_CARD_IDS } from "./intakeOutputDocumentationPayloads.js";
import { HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID } from "./highAlertInfusionDocumentationPayloads.js";
import { RESTRAINT_INITIATION_CARD_ID } from "./restraintDocumentationPayloads.js";
import {
  BELONGINGS_TRANSFER_SECURITY_CARD_ID,
  VALUABLES_INVENTORY_CARD_ID,
} from "./belongingsValuablesDocumentationPayloads.js";
import {
  requiresImmediateWitnessCapture,
  requiresImmediateWitnessCaptureForPayload,
} from "./clinicalDocumentationImmediateWitnessPolicy.js";

describe("EDOC.8B immediate witness capture policy", () => {
  it("requires immediate witness for high-risk cards", () => {
    expect(requiresImmediateWitnessCapture(BLOOD_PRODUCT_VERIFICATION_CARD_ID)).toBe(true);
    expect(requiresImmediateWitnessCapture(BLOOD_PRODUCT_INITIATION_CARD_ID)).toBe(true);
    expect(requiresImmediateWitnessCapture(RESTRAINT_INITIATION_CARD_ID)).toBe(true);
    expect(requiresImmediateWitnessCapture(HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID)).toBe(true);
  });

  it("does not require immediate witness for low-risk cards", () => {
    expect(requiresImmediateWitnessCapture(BLOOD_PRODUCT_REACTION_CARD_ID)).toBe(false);
    expect(requiresImmediateWitnessCapture(BLOOD_PRODUCT_REASSESSMENT_CARD_ID)).toBe(false);
    expect(requiresImmediateWitnessCapture(BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID)).toBe(false);
    for (const cardId of EDOC5_INTAKE_OUTPUT_CARD_IDS) {
      expect(requiresImmediateWitnessCapture(cardId)).toBe(false);
    }
    for (const cardId of EDOC4_STROKE_DOCUMENTATION_CARD_IDS) {
      expect(requiresImmediateWitnessCapture(cardId)).toBe(false);
    }
    for (const cardId of EDOC3_OBSERVATION_DOCUMENTATION_CARD_IDS) {
      expect(requiresImmediateWitnessCapture(cardId)).toBe(false);
    }
    expect(requiresImmediateWitnessCapture(BELONGINGS_TRANSFER_SECURITY_CARD_ID)).toBe(true);
    expect(requiresImmediateWitnessCapture(VALUABLES_INVENTORY_CARD_ID)).toBe(false);
  });

  it("EDOC.9 payload-aware immediate witness for valuables secured", () => {
    expect(
      requiresImmediateWitnessCaptureForPayload(VALUABLES_INVENTORY_CARD_ID, {
        documentedAt: "2026-05-28T12:00:00.000Z",
        cashPresent: false,
        jewelryPresent: false,
        electronicsPresent: false,
        walletOrPursePresent: false,
        keysPresent: false,
        identificationPresent: false,
        patientDeclinedValuablesInventory: false,
        valuablesSecured: false,
      })
    ).toBe(false);
    expect(
      requiresImmediateWitnessCaptureForPayload(VALUABLES_INVENTORY_CARD_ID, {
        documentedAt: "2026-05-28T12:00:00.000Z",
        cashPresent: false,
        jewelryPresent: false,
        electronicsPresent: false,
        walletOrPursePresent: false,
        keysPresent: false,
        identificationPresent: false,
        patientDeclinedValuablesInventory: false,
        valuablesSecured: true,
        securityBagIdentifier: "SEC-1",
      })
    ).toBe(true);
  });
});

describe("EDOC.7D blood product vital legal summaries", () => {
  const PRE_ASSESSMENT = {
    assessmentTime: "2026-05-28T12:00:00.000Z",
    productType: "PRBC",
    unitIdentifier: "U-1",
    unitVolumeMl: 250,
    baselineTemperature: "37.0",
    baselineHeartRate: 80,
    baselineRespRate: 16,
    baselineBloodPressure: "120/80",
    baselineSpo2: 98,
    patientIdentityVerified: true,
    consentVerified: true,
    symptomsPresent: false,
    symptomChecklist: [],
  };

  const REASSESSMENT = {
    assessmentTime: "2026-05-28T12:15:00.000Z",
    temperature: "37.1",
    heartRate: 82,
    respRate: 16,
    bloodPressure: "118/76",
    spo2: 97,
    symptomsPresent: false,
    symptomChecklist: [],
    providerNotified: false,
    continuedAdministration: true,
  };

  it("pre-assessment EN summary includes baseline vitals", () => {
    const lines = summarizeBloodProductDocumentationPayload(
      BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
      PRE_ASSESSMENT,
      "en"
    );
    expect(lines.some((l) => l.key === "Baseline temperature" && l.value === "37.0")).toBe(true);
    expect(lines.some((l) => l.key === "Heart rate" && l.value === "80")).toBe(true);
    expect(lines.some((l) => l.key === "Respiratory rate" && l.value === "16")).toBe(true);
    expect(lines.some((l) => l.key === "Blood pressure" && l.value === "120/80")).toBe(true);
    expect(lines.some((l) => l.key === "SpO₂" && l.value === "98")).toBe(true);
  });

  it("pre-assessment FR summary includes baseline vitals", () => {
    const lines = summarizeBloodProductDocumentationPayload(
      BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
      PRE_ASSESSMENT,
      "fr"
    );
    expect(lines.some((l) => l.key === "Température initiale" && l.value === "37.0")).toBe(true);
    expect(lines.some((l) => l.key === "Fréquence cardiaque" && l.value === "80")).toBe(true);
    expect(lines.some((l) => l.key === "Fréquence respiratoire" && l.value === "16")).toBe(true);
    expect(lines.some((l) => l.key === "Tension artérielle" && l.value === "120/80")).toBe(true);
  });

  it("reassessment EN summary includes 15-minute vitals", () => {
    const lines = summarizeBloodProductDocumentationPayload(
      BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
      REASSESSMENT,
      "en"
    );
    expect(lines.some((l) => l.key === "Temperature" && l.value === "37.1")).toBe(true);
    expect(lines.some((l) => l.key === "Heart rate" && l.value === "82")).toBe(true);
    expect(lines.some((l) => l.key === "Respiratory rate" && l.value === "16")).toBe(true);
    expect(lines.some((l) => l.key === "Blood pressure" && l.value === "118/76")).toBe(true);
    expect(lines.some((l) => l.key === "SpO₂" && l.value === "97")).toBe(true);
    expect(lines.some((l) => l.key === "Provider notified")).toBe(true);
  });

  it("reassessment FR summary includes 15-minute vitals", () => {
    const lines = summarizeBloodProductDocumentationPayload(
      BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
      REASSESSMENT,
      "fr"
    );
    expect(lines.some((l) => l.key === "Température" && l.value === "37.1")).toBe(true);
    expect(lines.some((l) => l.key === "Fréquence cardiaque" && l.value === "82")).toBe(true);
    expect(lines.some((l) => l.key === "Fréquence respiratoire" && l.value === "16")).toBe(true);
    expect(lines.some((l) => l.key === "Tension artérielle" && l.value === "118/76")).toBe(true);
  });
});
