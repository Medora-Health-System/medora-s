import { describe, expect, it } from "vitest";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS,
  LUMBAR_PUNCTURE_MONITORING_CARD_ID,
  PROCEDURE_TIMEOUT_CARD_ID,
  TNK_ADMINISTRATION_CARD_ID,
  TPA_ADMINISTRATION_CARD_ID,
  isTpaTotalDoseConsistent,
  summarizeProceduralSafetyThrombolyticPayload,
  validateProceduralSafetyThrombolyticPayloadForCard,
} from "./proceduralSafetyThrombolyticPayloads.js";

const ISO = "2026-05-28T14:00:00.000Z";

const TIMEOUT_OK = {
  timeoutTime: ISO,
  procedureType: "CENTRAL_LINE",
  patientIdentityConfirmed: "YES",
  procedureConfirmed: "YES",
  siteConfirmed: "YES",
  consentVerified: "YES",
  allergiesReviewed: "YES",
  anticoagulationReviewed: "NOT_APPLICABLE",
  imagingReviewed: "NOT_APPLICABLE",
  labsReviewed: "NOT_APPLICABLE",
  equipmentAvailable: "YES",
  bloodProductsAvailable: "NOT_APPLICABLE",
  participantsPresent: "YES",
  providerPresent: "YES",
  nursePresent: "YES",
  timeoutCompleted: "YES",
  procedureHeld: "NO",
  providerNotified: "NO",
} as const;

const LP_OK = {
  assessmentTime: ISO,
  postProcedurePosition: "SUPINE",
  neuroStatus: "BASELINE",
  headachePresent: "NO",
  backPainPresent: "NO",
  bleedingPresent: "NO",
  csfLeakConcern: "NO",
  nauseaVomitingPresent: "NO",
  vitalSignsStable: "YES",
  providerNotified: "NO",
} as const;

const TNK_OK = {
  administrationTime: ISO,
  lastKnownWellTime: ISO,
  nihssScore: 8,
  patientWeightKg: 70,
  doseMg: 50,
  doseVerified: "YES",
  ctHeadReviewed: "YES",
  contraindicationChecklistReviewed: "YES",
  providerOrderVerified: "YES",
  neurologyConsulted: "NOT_APPLICABLE",
  bloodPressureWithinParameters: "YES",
  anticoagulantUseReviewed: "YES",
  bleedingRiskReviewed: "YES",
  patientFamilyEducationProvided: "NOT_APPLICABLE",
  medicationAdministered: "YES",
  administrationHeld: "NO",
  providerNotified: "NO",
} as const;

const TPA_OK = {
  administrationTime: ISO,
  lastKnownWellTime: ISO,
  nihssScore: 10,
  patientWeightKg: 80,
  totalDoseMg: 72,
  bolusDoseMg: 7.2,
  infusionDoseMg: 64.8,
  bolusTime: ISO,
  infusionStartTime: ISO,
  doseVerified: "YES",
  ctHeadReviewed: "YES",
  contraindicationChecklistReviewed: "YES",
  providerOrderVerified: "YES",
  neurologyConsulted: "NOT_APPLICABLE",
  bloodPressureWithinParameters: "YES",
  anticoagulantUseReviewed: "YES",
  bleedingRiskReviewed: "YES",
  medicationAdministered: "YES",
  infusionInterrupted: "NO",
  administrationHeld: "NO",
  providerNotified: "NO",
} as const;

describe("proceduralSafetyThrombolyticPayloads (EDOC.23)", () => {
  it("all EDOC.23 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC23_PROCEDURAL_SAFETY_THROMBOLYTIC_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
    }
    expect(getClinicalDocumentationCardById(PROCEDURE_TIMEOUT_CARD_ID)?.category).toBe(
      "PROCEDURE_MONITORING"
    );
    expect(getClinicalDocumentationCardById(TNK_ADMINISTRATION_CARD_ID)?.category).toBe(
      "STROKE_DOCUMENTATION"
    );
  });

  it("procedure timeout validates", () => {
    expect(validateProceduralSafetyThrombolyticPayloadForCard(PROCEDURE_TIMEOUT_CARD_ID, TIMEOUT_OK).ok).toBe(
      true
    );
  });

  it("procedure timeout rejects completed timeout when participants absent", () => {
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(PROCEDURE_TIMEOUT_CARD_ID, {
      ...TIMEOUT_OK,
      participantsPresent: "NO",
      timeoutCompleted: "YES",
    });
    expect(bad.ok).toBe(false);
  });

  it("procedure held requires provider notification", () => {
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(PROCEDURE_TIMEOUT_CARD_ID, {
      ...TIMEOUT_OK,
      timeoutCompleted: "NO",
      procedureHeld: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateProceduralSafetyThrombolyticPayloadForCard(PROCEDURE_TIMEOUT_CARD_ID, {
      ...TIMEOUT_OK,
      timeoutCompleted: "NO",
      procedureHeld: "YES",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("lumbar puncture monitoring validates", () => {
    expect(
      validateProceduralSafetyThrombolyticPayloadForCard(LUMBAR_PUNCTURE_MONITORING_CARD_ID, LP_OK).ok
    ).toBe(true);
  });

  it("lumbar puncture neuro change requires provider notification", () => {
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(LUMBAR_PUNCTURE_MONITORING_CARD_ID, {
      ...LP_OK,
      neuroStatus: "CHANGED",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateProceduralSafetyThrombolyticPayloadForCard(LUMBAR_PUNCTURE_MONITORING_CARD_ID, {
      ...LP_OK,
      neuroStatus: "CHANGED",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("TNK administered requires all verification fields", () => {
    expect(validateProceduralSafetyThrombolyticPayloadForCard(TNK_ADMINISTRATION_CARD_ID, TNK_OK).ok).toBe(
      true
    );
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(TNK_ADMINISTRATION_CARD_ID, {
      ...TNK_OK,
      doseVerified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("TNK held requires hold reason and provider notification", () => {
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(TNK_ADMINISTRATION_CARD_ID, {
      ...TNK_OK,
      medicationAdministered: "NO",
      administrationHeld: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateProceduralSafetyThrombolyticPayloadForCard(TNK_ADMINISTRATION_CARD_ID, {
      ...TNK_OK,
      medicationAdministered: "NO",
      administrationHeld: "YES",
      holdReason: "BP_OUT_OF_RANGE",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("TNK rejects administered when BP outside parameters", () => {
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(TNK_ADMINISTRATION_CARD_ID, {
      ...TNK_OK,
      bloodPressureWithinParameters: "NO",
      medicationAdministered: "YES",
    });
    expect(bad.ok).toBe(false);
  });

  it("tPA total dose must equal bolus + infusion", () => {
    expect(isTpaTotalDoseConsistent(72, 7.2, 64.8)).toBe(true);
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(TPA_ADMINISTRATION_CARD_ID, {
      ...TPA_OK,
      totalDoseMg: 70,
    });
    expect(bad.ok).toBe(false);
  });

  it("tPA administered requires bolus and infusion start times", () => {
    expect(validateProceduralSafetyThrombolyticPayloadForCard(TPA_ADMINISTRATION_CARD_ID, TPA_OK).ok).toBe(
      true
    );
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(TPA_ADMINISTRATION_CARD_ID, {
      ...TPA_OK,
      bolusTime: undefined,
    });
    expect(bad.ok).toBe(false);
  });

  it("tPA interruption requires reason and provider notification", () => {
    const bad = validateProceduralSafetyThrombolyticPayloadForCard(TPA_ADMINISTRATION_CARD_ID, {
      ...TPA_OK,
      infusionInterrupted: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateProceduralSafetyThrombolyticPayloadForCard(TPA_ADMINISTRATION_CARD_ID, {
      ...TPA_OK,
      infusionInterrupted: "YES",
      interruptionReason: "BLEEDING",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("EN summaries", () => {
    const lines = summarizeProceduralSafetyThrombolyticPayload(
      PROCEDURE_TIMEOUT_CARD_ID,
      TIMEOUT_OK,
      "en"
    );
    expect(lines.some((l) => l.key === "Timeout completed")).toBe(true);
    const tnk = summarizeProceduralSafetyThrombolyticPayload(TNK_ADMINISTRATION_CARD_ID, TNK_OK, "en");
    expect(tnk.some((l) => l.key === "TNK administered")).toBe(true);
  });

  it("FR summaries", () => {
    const lines = summarizeProceduralSafetyThrombolyticPayload(
      LUMBAR_PUNCTURE_MONITORING_CARD_ID,
      LP_OK,
      "fr"
    );
    expect(lines.some((l) => l.key === "Statut neuro")).toBe(true);
    const tpa = summarizeProceduralSafetyThrombolyticPayload(TPA_ADMINISTRATION_CARD_ID, TPA_OK, "fr");
    expect(tpa.some((l) => l.key === "tPA administré")).toBe(true);
  });
});
