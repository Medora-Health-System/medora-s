import { describe, expect, it } from "vitest";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";
import {
  EDOC4_STROKE_DOCUMENTATION_CARD_IDS,
  STROKE_NIHSS_CARD_ID,
  STROKE_SWALLOW_SCREEN_CARD_ID,
  calculateAbcd2Total,
  calculateNihssTotal,
  deriveCincinnatiResult,
  deriveVanResult,
  summarizeStrokeDocumentationPayload,
  validateStrokePayloadForCard,
} from "./strokeDocumentationPayloads.js";
import { summarizeClinicalDocumentationPayload } from "./clinicalDocumentationEntry.js";

const NIHSS_VALID = {
  assessedAt: "2026-05-28T14:00:00.000Z",
  levelOfConsciousness: 0,
  locQuestions: 1,
  locCommands: 0,
  bestGaze: 0,
  visualFields: 0,
  facialPalsy: 1,
  motorArmLeft: 2,
  motorArmRight: 0,
  motorLegLeft: 1,
  motorLegRight: 0,
  limbAtaxia: 0,
  sensory: 0,
  bestLanguage: 0,
  dysarthria: 0,
  extinctionInattention: 0,
  totalScore: 5,
};

describe("strokeDocumentationPayloads (EDOC.4 stroke suite)", () => {
  it("stroke cards marked AVAILABLE with validators", () => {
    for (const id of EDOC4_STROKE_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(id);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("STROKE_DOCUMENTATION");
    }
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
  });

  it("foundation-only stroke cards cannot save", () => {
    expect(getClinicalDocumentationCardById("stroke_tnk")?.implementationStatus).toBe("FOUNDATION_ONLY");
    expect(validateStrokePayloadForCard("stroke_tnk", { x: 1 }).ok).toBe(false);
  });

  it("NIHSS accepts valid payload and rejects invalid ranges", () => {
    expect(validateStrokePayloadForCard(STROKE_NIHSS_CARD_ID, NIHSS_VALID).ok).toBe(true);
    expect(
      validateStrokePayloadForCard(STROKE_NIHSS_CARD_ID, { ...NIHSS_VALID, motorArmLeft: 9 }).ok
    ).toBe(false);
  });

  it("NIHSS total must equal calculated total", () => {
    const calculated = calculateNihssTotal(NIHSS_VALID);
    expect(calculated).toBe(5);
    expect(
      validateStrokePayloadForCard(STROKE_NIHSS_CARD_ID, { ...NIHSS_VALID, totalScore: 99 }).ok
    ).toBe(false);
    expect(
      validateStrokePayloadForCard(STROKE_NIHSS_CARD_ID, {
        ...NIHSS_VALID,
        unableToAssessReason: "Sedated",
        totalScore: 0,
      }).ok
    ).toBe(true);
  });

  it("ABCD2 calculator and total validation", () => {
    const payload = {
      assessedAt: "2026-05-28T14:00:00.000Z",
      age60OrOlder: true,
      bloodPressureElevated: true,
      clinicalFeature: "UNILATERAL_WEAKNESS" as const,
      duration: "GREATER_EQUAL_60_MIN" as const,
      diabetes: false,
      totalScore: 6,
    };
    expect(calculateAbcd2Total(payload)).toBe(6);
    expect(validateStrokePayloadForCard("stroke_abcd2", { ...payload, totalScore: 3 }).ok).toBe(
      false
    );
  });

  it("Cincinnati result derived correctly", () => {
    expect(
      deriveCincinnatiResult({
        facialDroop: "NORMAL",
        armDrift: "NORMAL",
        speech: "NORMAL",
      })
    ).toBe("NEGATIVE");
    expect(
      deriveCincinnatiResult({
        facialDroop: "ABNORMAL",
        armDrift: "NORMAL",
        speech: "NORMAL",
      })
    ).toBe("POSITIVE");
    expect(
      deriveCincinnatiResult({
        facialDroop: "UNABLE_TO_ASSESS",
        armDrift: "NORMAL",
        speech: "NORMAL",
      })
    ).toBe("INCOMPLETE");
  });

  it("VAN result derived correctly", () => {
    expect(
      deriveVanResult({
        armWeaknessPresent: true,
        visualDisturbance: true,
        aphasia: false,
        neglect: false,
      })
    ).toBe("POSITIVE");
    expect(
      deriveVanResult({
        armWeaknessPresent: false,
        visualDisturbance: false,
        aphasia: false,
        neglect: false,
      })
    ).toBe("NEGATIVE");
    expect(
      deriveVanResult({
        armWeaknessPresent: false,
        visualDisturbance: true,
        aphasia: false,
        neglect: false,
      })
    ).toBe("INCOMPLETE");
  });

  it("Swallow failed requires NPO or notes", () => {
    expect(
      validateStrokePayloadForCard(STROKE_SWALLOW_SCREEN_CARD_ID, {
        screenedAt: "2026-05-28T14:00:00.000Z",
        alertEnoughForScreen: true,
        facialDroopOrWeakness: false,
        speechDifficulty: false,
        coughOrWetVoice: false,
        failedWaterTrial: true,
        result: "FAILED",
        npoRecommended: false,
        providerNotified: false,
      }).ok
    ).toBe(false);
    expect(
      validateStrokePayloadForCard(STROKE_SWALLOW_SCREEN_CARD_ID, {
        screenedAt: "2026-05-28T14:00:00.000Z",
        alertEnoughForScreen: true,
        facialDroopOrWeakness: false,
        speechDifficulty: false,
        coughOrWetVoice: false,
        failedWaterTrial: true,
        result: "FAILED",
        npoRecommended: true,
        providerNotified: true,
      }).ok
    ).toBe(true);
  });

  it("Neuro check change requires provider notification or note", () => {
    expect(
      validateStrokePayloadForCard("stroke_neuro_checks", {
        assessedAt: "2026-05-28T14:00:00.000Z",
        levelOfConsciousness: "Alert",
        orientation: "x3",
        pupils: "PERRLA",
        gripLeft: "5/5",
        gripRight: "5/5",
        motorLeft: "5/5",
        motorRight: "4/5",
        sensation: "Intact",
        speech: "Clear",
        changesFromPrior: "YES",
        providerNotified: false,
      }).ok
    ).toBe(false);
  });

  it("payload summaries render stroke key facts", () => {
    const nihssSummary = summarizeStrokeDocumentationPayload(STROKE_NIHSS_CARD_ID, NIHSS_VALID);
    expect(nihssSummary.some((l) => l.key === "Score NIHSS total" && l.value === "5")).toBe(true);
    const legal = summarizeClinicalDocumentationPayload(STROKE_NIHSS_CARD_ID, NIHSS_VALID);
    expect(legal.some((l) => l.key === "Score NIHSS total")).toBe(true);
  });
});
