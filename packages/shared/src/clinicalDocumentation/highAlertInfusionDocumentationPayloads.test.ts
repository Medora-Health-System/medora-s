import { describe, expect, it } from "vitest";
import { canWitnessClinicalDocumentationEntry } from "./clinicalDocumentationWitnessGovernance.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS,
  HIGH_ALERT_INFUSION_COMPLETION_CARD_ID,
  HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
  HIGH_ALERT_INFUSION_TITRATION_CARD_ID,
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
  highAlertInfusionCompletionPayloadSchema,
  highAlertInfusionInitiationPayloadSchema,
  highAlertInfusionTitrationPayloadSchema,
  highAlertInfusionVerificationPayloadSchema,
  resolveRequiresWitnessSignatureForClinicalDocumentationEntry,
  summarizeHighAlertInfusionDocumentationPayload,
  validateHighAlertInfusionPayloadForCard,
} from "./highAlertInfusionDocumentationPayloads.js";
import {
  CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS,
  validatePayloadForCard,
} from "./observationDocumentationPayloads.js";
import { summarizeClinicalDocumentationPayload } from "./clinicalDocumentationEntry.js";
import { resolveRequiresWitnessSignature } from "./clinicalDocumentationWitnessPolicy.js";

const NOW = "2026-05-28T14:00:00.000Z";

const VERIFICATION_VALID = {
  verificationTime: NOW,
  medicationType: "HEPARIN",
  medicationName: "Heparin drip",
  concentration: "25,000 units / 500 mL",
  orderedRate: "18 units/kg/hr",
  orderedDose: "1300 units/hr",
  weightBasedCalculationVerified: true,
  pumpProgrammingVerified: true,
  lineTracingVerified: true,
  patientVerified: true,
  providerOrderVerified: true,
  independentDoubleCheckPerformed: true,
};

describe("EDOC.8 high-alert infusion documentation payloads", () => {
  it("high-alert infusion cards marked AVAILABLE in HIGH_ALERT_INFUSION_DOCUMENTATION category", () => {
    for (const cardId of EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("HIGH_ALERT_INFUSION_DOCUMENTATION");
    }
  });

  it("verification schema accepts valid payload and sets PENDING_WITNESS status", () => {
    expect(highAlertInfusionVerificationPayloadSchema.safeParse(VERIFICATION_VALID).success).toBe(
      true
    );
    const result = validateHighAlertInfusionPayloadForCard(
      HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
      VERIFICATION_VALID
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.verificationStatus).toBe("PENDING_WITNESS");
    }
  });

  it("verification requires witness via default policy", () => {
    expect(resolveRequiresWitnessSignature(HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID)).toBe(true);
  });

  it("no self-witness for verification entries", () => {
    expect(
      canWitnessClinicalDocumentationEntry(
        {
          authorUserId: "u1",
          requiresWitnessSignature: true,
          witnessedAt: null,
          voidedAt: null,
        },
        "u1",
        ["RN"]
      )
    ).toBe(false);
  });

  it("initiation schema accepts valid payload", () => {
    expect(
      highAlertInfusionInitiationPayloadSchema.safeParse({
        startTime: NOW,
        medicationType: "INSULIN",
        medicationName: "Regular insulin",
        orderedRate: "2 units/hr",
        programmedRate: "2 units/hr",
        route: "IV",
        baselineHeartRate: 88,
        baselineBloodPressure: "118/72",
        baselineRespRate: 18,
        baselineSpo2: 97,
        providerOrderVerified: true,
        administrationStarted: true,
      }).success
    ).toBe(true);
  });

  it("titration schema accepts valid payload", () => {
    expect(
      highAlertInfusionTitrationPayloadSchema.safeParse({
        titrationTime: NOW,
        medicationType: "VASOPRESSOR",
        previousRate: "5 mcg/min",
        newRate: "10 mcg/min",
        reasonForChange: "CLINICAL_RESPONSE",
        providerAware: true,
        secondCheckerRequired: false,
      }).success
    ).toBe(true);
  });

  it("titration witness when secondCheckerRequired is true", () => {
    expect(
      resolveRequiresWitnessSignatureForClinicalDocumentationEntry(
        HIGH_ALERT_INFUSION_TITRATION_CARD_ID,
        {
          titrationTime: NOW,
          medicationType: "HEPARIN",
          previousRate: "10",
          newRate: "12",
          reasonForChange: "PROTOCOL",
          providerAware: true,
          secondCheckerRequired: true,
        },
        null
      )
    ).toBe(true);
  });

  it("titration witness when facility policy lists medication type", () => {
    expect(
      resolveRequiresWitnessSignatureForClinicalDocumentationEntry(
        HIGH_ALERT_INFUSION_TITRATION_CARD_ID,
        {
          titrationTime: NOW,
          medicationType: "INSULIN",
          previousRate: "2",
          newRate: "3",
          reasonForChange: "PROVIDER_ORDER",
          providerAware: true,
          secondCheckerRequired: false,
        },
        { witnessRequiredTitrationMedicationTypes: ["INSULIN", "HEPARIN"] }
      )
    ).toBe(true);
  });

  it("completion schema enriches billing readiness metadata", () => {
    const result = validateHighAlertInfusionPayloadForCard(
      HIGH_ALERT_INFUSION_COMPLETION_CARD_ID,
      {
        completionTime: NOW,
        medicationType: "SEDATIVE",
        finalRate: "4 mg/hr",
        completedAsOrdered: true,
        adverseEventOccurred: true,
        providerNotified: true,
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.billingReadinessMetadata).toEqual({
        capturePhase: "EDOC.8",
        claimsGenerationDeferred: true,
        medicationTypeCapturable: true,
        completionCapturable: true,
        adverseEventCapturable: true,
      });
    }
  });

  it("all EDOC.8 card IDs registered in payload validator list", () => {
    for (const cardId of EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS) {
      expect(CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS).toContain(cardId);
    }
  });

  it("bilingual summaries for verification", () => {
    const en = summarizeHighAlertInfusionDocumentationPayload(
      HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
      VERIFICATION_VALID,
      "en"
    );
    const fr = summarizeHighAlertInfusionDocumentationPayload(
      HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
      VERIFICATION_VALID,
      "fr"
    );
    expect(en.some((l) => l.key === "Medication" && l.value === "Heparin drip")).toBe(true);
    expect(fr.some((l) => l.key === "Médicament" && l.value === "Heparin drip")).toBe(true);
    const legal = summarizeClinicalDocumentationPayload(
      HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
      {
        startTime: NOW,
        medicationType: "PCA",
        medicationName: "Morphine PCA",
        orderedRate: "1 mg/hr",
        programmedRate: "1 mg/hr",
        route: "PCA",
        baselineHeartRate: 72,
        baselineBloodPressure: "110/70",
        baselineRespRate: 14,
        baselineSpo2: 99,
        providerOrderVerified: true,
        administrationStarted: true,
      },
      "en"
    );
    expect(legal.some((l) => l.key === "Route" && l.value === "PCA")).toBe(true);
  });

  it("validatePayloadForCard routes high-alert infusion cards", () => {
    expect(
      validatePayloadForCard(HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID, VERIFICATION_VALID).ok
    ).toBe(true);
  });

  it("initiation not in default witness list (facility configurable)", () => {
    expect(resolveRequiresWitnessSignature(HIGH_ALERT_INFUSION_INITIATION_CARD_ID)).toBe(false);
  });
});
