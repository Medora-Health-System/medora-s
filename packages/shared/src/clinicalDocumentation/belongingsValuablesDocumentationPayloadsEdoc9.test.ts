import { describe, expect, it } from "vitest";
import {
  BELONGINGS_ALTERED_PATIENT_CARD_ID,
  BELONGINGS_INVENTORY_CARD_ID,
  BELONGINGS_RETURN_PATIENT_CARD_ID,
  BELONGINGS_TRANSFER_SECURITY_CARD_ID,
  EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS,
  VALUABLES_INVENTORY_CARD_ID,
  detectSensitiveIdentifierInText,
  requiresImmediateWitnessCaptureForBelongingsPayload,
  summarizeBelongingsValuablesDocumentationPayload,
  validateBelongingsValuablesPayloadForCard,
} from "./belongingsValuablesDocumentationPayloads.js";
import {
  requiresImmediateWitnessCaptureForPayload,
} from "./clinicalDocumentationImmediateWitnessPolicy.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

describe("belongingsValuablesDocumentationPayloads (EDOC.9)", () => {
  it("all EDOC.9 belongings cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("BELONGINGS_VALUABLES_DOCUMENTATION");
    }
  });

  it("basic belongings inventory validates", () => {
    const result = validateBelongingsValuablesPayloadForCard(BELONGINGS_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      patientAbleToParticipate: true,
      clothingItems: ["Coat"],
      personalItems: [],
      assistiveDevices: [],
      medicationsBroughtFromHome: false,
      belongingsKeptWithPatient: true,
      belongingsBagged: false,
    });
    expect(result.ok).toBe(true);
  });

  it("bagged belongings require bag ID", () => {
    const missing = validateBelongingsValuablesPayloadForCard(BELONGINGS_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      patientAbleToParticipate: true,
      clothingItems: [],
      personalItems: [],
      assistiveDevices: [],
      medicationsBroughtFromHome: false,
      belongingsKeptWithPatient: false,
      belongingsBagged: true,
    });
    expect(missing.ok).toBe(false);
    const ok = validateBelongingsValuablesPayloadForCard(BELONGINGS_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      patientAbleToParticipate: true,
      clothingItems: [],
      personalItems: [],
      assistiveDevices: [],
      medicationsBroughtFromHome: false,
      belongingsKeptWithPatient: false,
      belongingsBagged: true,
      bagIdentifier: "BAG-001",
    });
    expect(ok.ok).toBe(true);
  });

  it("valuables secured requires security bag ID", () => {
    const missing = validateBelongingsValuablesPayloadForCard(VALUABLES_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      cashPresent: false,
      jewelryPresent: false,
      electronicsPresent: false,
      walletOrPursePresent: false,
      keysPresent: false,
      identificationPresent: false,
      patientDeclinedValuablesInventory: false,
      valuablesSecured: true,
    });
    expect(missing.ok).toBe(false);
    const ok = validateBelongingsValuablesPayloadForCard(VALUABLES_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      cashPresent: false,
      jewelryPresent: false,
      electronicsPresent: false,
      walletOrPursePresent: false,
      keysPresent: false,
      identificationPresent: false,
      patientDeclinedValuablesInventory: false,
      valuablesSecured: true,
      securityBagIdentifier: "SEC-BAG-9",
    });
    expect(ok.ok).toBe(true);
  });

  it("cash present requires cash amount", () => {
    const missing = validateBelongingsValuablesPayloadForCard(VALUABLES_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      cashPresent: true,
      jewelryPresent: false,
      electronicsPresent: false,
      walletOrPursePresent: false,
      keysPresent: false,
      identificationPresent: false,
      patientDeclinedValuablesInventory: false,
      valuablesSecured: false,
    });
    expect(missing.ok).toBe(false);
    const ok = validateBelongingsValuablesPayloadForCard(VALUABLES_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      cashPresent: true,
      cashAmount: "~$40",
      jewelryPresent: false,
      electronicsPresent: false,
      walletOrPursePresent: false,
      keysPresent: false,
      identificationPresent: false,
      patientDeclinedValuablesInventory: false,
      valuablesSecured: false,
    });
    expect(ok.ok).toBe(true);
  });

  it("security transfer requires immediate witness", () => {
    const payload = {
      transferredAt: ISO,
      bagIdentifier: "BAG-SEC",
      transferredByUserAcknowledged: true,
      receivedBySecurityName: "Security Desk",
      storageLocation: "SECURITY",
    };
    expect(requiresImmediateWitnessCaptureForBelongingsPayload(BELONGINGS_TRANSFER_SECURITY_CARD_ID, payload)).toBe(
      true
    );
    expect(
      requiresImmediateWitnessCaptureForPayload(BELONGINGS_TRANSFER_SECURITY_CARD_ID, payload)
    ).toBe(true);
  });

  it("altered patient requires immediate witness", () => {
    const payload = {
      documentedAt: ISO,
      patientCondition: "UNCONSCIOUS",
      belongingsInventoriedByTwoStaff: true,
      bagIdentifier: "BAG-ALT",
      valuablesPresent: false,
      securityNotified: true,
      familyNotified: false,
    };
    expect(requiresImmediateWitnessCaptureForBelongingsPayload(BELONGINGS_ALTERED_PATIENT_CARD_ID, payload)).toBe(
      true
    );
  });

  it("patient unable to sign return requires immediate witness", () => {
    const payload = {
      returnedAt: ISO,
      bagIdentifier: "BAG-RET",
      patientReceived: true,
      patientUnableToSign: true,
      discrepancyReported: false,
    };
    expect(requiresImmediateWitnessCaptureForBelongingsPayload(BELONGINGS_RETURN_PATIENT_CARD_ID, payload)).toBe(
      true
    );
  });

  it("discrepancy requires description", () => {
    const missing = validateBelongingsValuablesPayloadForCard(BELONGINGS_RETURN_PATIENT_CARD_ID, {
      returnedAt: ISO,
      bagIdentifier: "BAG-RET",
      patientReceived: true,
      patientUnableToSign: false,
      discrepancyReported: true,
    });
    expect(missing.ok).toBe(false);
    const ok = validateBelongingsValuablesPayloadForCard(BELONGINGS_RETURN_PATIENT_CARD_ID, {
      returnedAt: ISO,
      bagIdentifier: "BAG-RET",
      patientReceived: true,
      patientUnableToSign: false,
      discrepancyReported: true,
      discrepancyDescription: "Missing wallet",
    });
    expect(ok.ok).toBe(true);
    expect(
      requiresImmediateWitnessCaptureForBelongingsPayload(BELONGINGS_RETURN_PATIENT_CARD_ID, ok.data!)
    ).toBe(true);
  });

  it("rejects sensitive data patterns", () => {
    const bad = validateBelongingsValuablesPayloadForCard(BELONGINGS_INVENTORY_CARD_ID, {
      documentedAt: ISO,
      patientAbleToParticipate: true,
      clothingItems: [],
      personalItems: [],
      assistiveDevices: [],
      medicationsBroughtFromHome: false,
      belongingsKeptWithPatient: true,
      belongingsBagged: false,
      notes: "card 4111 1111 1111 1111",
    });
    expect(bad.ok).toBe(false);
    expect(detectSensitiveIdentifierInText("123-45-6789")).toBeTruthy();
  });

  describe("sensitive identifier scanner (EDOC.9A)", () => {
    it("rejects labeled undashed SSN patterns", () => {
      for (const text of [
        "SSN 123456789",
        "ssn 123456789",
        "Social Security Number 123456789",
        "social security #123456789",
      ]) {
        expect(detectSensitiveIdentifierInText(text)).toBe("SSN pattern not allowed");
      }
      const bad = validateBelongingsValuablesPayloadForCard(BELONGINGS_INVENTORY_CARD_ID, {
        documentedAt: ISO,
        patientAbleToParticipate: true,
        clothingItems: [],
        personalItems: [],
        assistiveDevices: [],
        medicationsBroughtFromHome: false,
        belongingsKeptWithPatient: true,
        belongingsBagged: false,
        notes: "SSN 123456789",
      });
      expect(bad.ok).toBe(false);
      if (!bad.ok) {
        expect(bad.message).toBe("SSN pattern not allowed");
      }
    });

    it("allows operational identifiers (false-positive guard)", () => {
      for (const text of [
        "BAG-001",
        "SR-2026-001",
        "+1 214 555 1212",
        "PRBC-00012",
        "2026-09-01T14:30:00Z",
        "2026-09-01T14:30:00-05:00",
      ]) {
        expect(detectSensitiveIdentifierInText(text)).toBeNull();
      }
    });
  });

  it("summaries EN/FR render correct labels without cash amount detail", () => {
    const payload = {
      documentedAt: ISO,
      cashPresent: true,
      cashAmount: "$200",
      jewelryPresent: true,
      electronicsPresent: false,
      walletOrPursePresent: true,
      keysPresent: true,
      identificationPresent: true,
      patientDeclinedValuablesInventory: false,
      valuablesSecured: true,
      securityBagIdentifier: "SEC-1",
    };
    const en = summarizeBelongingsValuablesDocumentationPayload(VALUABLES_INVENTORY_CARD_ID, payload, "en");
    const fr = summarizeBelongingsValuablesDocumentationPayload(VALUABLES_INVENTORY_CARD_ID, payload, "fr");
    expect(en.some((l) => l.key === "Cash present")).toBe(true);
    expect(fr.some((l) => l.key === "Argent présent")).toBe(true);
    expect(en.some((l) => l.value === "$200")).toBe(false);
    expect(JSON.stringify(payload)).toContain("$200");
  });
});
