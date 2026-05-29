import { describe, expect, it } from "vitest";
import {
  assertClinicalDocumentationEntryCreateAllowed,
  clinicalDocumentationEntryCreateDtoSchema,
  mapClinicalDocumentationEntryForLegalChart,
} from "./clinicalDocumentationEntry.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  assertRegistryAvailableCardsHavePayloadValidators,
  cardHasRegisteredPayloadValidator,
  listFoundationOnlyCardIds,
} from "./clinicalDocumentationPayloadGovernance.js";
import {
  OBS_AMBULATION_TRIAL_CARD_ID,
  OBS_BOARDING_CARD_ID,
  OBS_DISCHARGE_READINESS_CARD_ID,
  OBS_PO_CHALLENGE_CARD_ID,
  OBS_REASSESSMENT_CARD_ID,
  ambulationTrialPayloadSchema,
  boardingDocumentationPayloadSchema,
  dischargeReadinessPayloadSchema,
  observationReassessmentPayloadSchema,
  poChallengePayloadSchema,
  summarizeObservationDocumentationPayload,
  validatePayloadForCard,
} from "./observationDocumentationPayloads.js";

const poValid = {
  startTime: "2026-05-28T14:00:00.000Z",
  substance: "Clear liquids",
  amount: "240 mL",
  tolerated: "YES" as const,
  nausea: false,
  vomiting: false,
  abdominalPain: false,
  result: "PASSED" as const,
};

const ambValid = {
  assistanceLevel: "STANDBY" as const,
  distance: 50,
  distanceUnit: "FEET" as const,
  gaitSteady: true,
  dizziness: false,
  shortnessOfBreath: false,
  pain: false,
  oxygenDesaturation: false,
  result: "PASSED" as const,
};

describe("observationDocumentationPayloads (EDOC.3)", () => {
  it("PO Challenge validator accepts valid payload and rejects invalid result", () => {
    expect(poChallengePayloadSchema.safeParse(poValid).success).toBe(true);
    expect(
      poChallengePayloadSchema.safeParse({ ...poValid, result: "INVALID" }).success
    ).toBe(false);
  });

  it("Ambulation validator accepts valid payload", () => {
    expect(ambulationTrialPayloadSchema.safeParse(ambValid).success).toBe(true);
  });

  it("Observation reassessment validator accepts valid payload", () => {
    expect(
      observationReassessmentPayloadSchema.safeParse({
        reassessmentTime: "2026-05-28T15:00:00.000Z",
        patientCondition: "IMPROVED",
        vitalsReviewed: true,
        pendingResults: false,
        providerNotified: true,
        painScore: 3,
      }).success
    ).toBe(true);
  });

  it("Boarding validator accepts valid payload", () => {
    expect(
      boardingDocumentationPayloadSchema.safeParse({
        boardingReason: "ED capacity",
        location: "Hall B",
        safetyCheckCompleted: true,
        comfortMeasuresOffered: true,
        nutritionOffered: false,
        toiletingOffered: true,
        providerUpdated: false,
      }).success
    ).toBe(true);
  });

  it("Discharge readiness validator accepts valid payload", () => {
    expect(
      dischargeReadinessPayloadSchema.safeParse({
        instructionsReviewed: true,
        medicationsReviewed: true,
        followUpReviewed: true,
        returnPrecautionsReviewed: true,
        transportationConfirmed: true,
        patientVerbalizedUnderstanding: true,
        barriersIdentified: false,
      }).success
    ).toBe(true);
  });

  it("AVAILABLE observation cards all have validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const id of [
      OBS_PO_CHALLENGE_CARD_ID,
      OBS_AMBULATION_TRIAL_CARD_ID,
      OBS_REASSESSMENT_CARD_ID,
      OBS_BOARDING_CARD_ID,
      OBS_DISCHARGE_READINESS_CARD_ID,
    ]) {
      expect(getClinicalDocumentationCardById(id)?.implementationStatus).toBe("AVAILABLE");
      expect(cardHasRegisteredPayloadValidator(id)).toBe(true);
    }
  });

  it("foundation-only cards cannot save", () => {
    const foundationId = listFoundationOnlyCardIds()[0];
    const card = getClinicalDocumentationCardById(foundationId)!;
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse({
      category: card.category,
      cardId: foundationId,
      payloadJson: poValid,
    });
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).toThrow(/not available for save/);
  });

  it("generates French payload summaries per card", () => {
    const poSummary = summarizeObservationDocumentationPayload(OBS_PO_CHALLENGE_CARD_ID, poValid, "fr");
    expect(poSummary.some((l) => l.key === "Résultat" && l.value === "Réussi")).toBe(true);
    expect(poSummary.some((l) => l.key === "Substance")).toBe(true);

    const ambSummary = summarizeObservationDocumentationPayload(
      OBS_AMBULATION_TRIAL_CARD_ID,
      ambValid,
      "fr"
    );
    expect(ambSummary.some((l) => l.key === "Distance")).toBe(true);

    const reassessSummary = summarizeObservationDocumentationPayload(
      OBS_REASSESSMENT_CARD_ID,
      {
      reassessmentTime: "2026-05-28T15:00:00.000Z",
      patientCondition: "WORSENED",
      vitalsReviewed: true,
      pendingResults: true,
      providerNotified: true,
      },
      "fr"
    );
    expect(reassessSummary.some((l) => l.key === "Médecin avisé")).toBe(true);

    const legal = mapClinicalDocumentationEntryForLegalChart({
      id: "e1",
      encounterId: "enc1",
      category: "OBSERVATION_DOCUMENTATION",
      cardId: OBS_PO_CHALLENGE_CARD_ID,
      authorDisplayNameSnapshot: "RN",
      authorRoleSnapshot: "Infirmier(ère)",
      createdAt: "2026-05-28T12:00:00.000Z",
      payloadJson: poValid,
      voidedAt: null,
    });
    expect(legal.payloadJson.substance).toBe("Clear liquids");
    expect(legal.payloadSummary.length).toBeGreaterThan(0);
  });

  it("rejects invalid payload via validatePayloadForCard", () => {
    const bad = validatePayloadForCard(OBS_PO_CHALLENGE_CARD_ID, { result: "PASSED" });
    expect(bad.ok).toBe(false);
  });
});
