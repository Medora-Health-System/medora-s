import { describe, expect, it } from "vitest";
import {
  calculateBradenScore,
  deriveBradenRiskLevel,
  EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS,
  BRADEN_RISK_ASSESSMENT_CARD_ID,
  MASD_ASSESSMENT_CARD_ID,
  OSTOMY_ASSESSMENT_CARD_ID,
  PRESSURE_INJURY_ASSESSMENT_CARD_ID,
  PRESSURE_INJURY_REASSESSMENT_CARD_ID,
  SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
  SKIN_TEAR_ASSESSMENT_CARD_ID,
  SURGICAL_WOUND_ASSESSMENT_CARD_ID,
  TRAUMATIC_WOUND_ASSESSMENT_CARD_ID,
  WOUND_PHOTO_REFERENCE_CARD_ID,
  WOUND_REASSESSMENT_CARD_ID,
  WOUND_TREATMENT_DOCUMENTATION_CARD_ID,
  summarizeSkinWoundPressureInjuryPayload,
  validateSkinWoundPressureInjuryDocumentationPayloadForCard,
} from "./skinWoundPressureInjuryDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T14:00:00.000Z";

describe("skinWoundPressureInjuryDocumentationPayloads (EDOC.20)", () => {
  it("all EDOC.20 cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC20_SKIN_WOUND_PRESSURE_INJURY_DOCUMENTATION_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("SKIN_WOUND_PRESSURE_INJURY");
    }
  });

  it("skin integrity validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        skinStatus: "INTACT",
        pressureInjuryPresent: "NO",
        woundPresent: "NO",
        skinTearPresent: "NO",
        masdPresent: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        skinStatus: "BREAKDOWN_PRESENT",
        pressureInjuryPresent: "NO",
        woundPresent: "NO",
        skinTearPresent: "NO",
        masdPresent: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("Braden scoring calculation", () => {
    expect(
      calculateBradenScore({
        sensoryPerception: 4,
        moisture: 4,
        activity: 4,
        mobility: 4,
        nutrition: 4,
        frictionShear: 3,
      })
    ).toBe(23);
    expect(
      calculateBradenScore({
        sensoryPerception: 1,
        moisture: 1,
        activity: 1,
        mobility: 1,
        nutrition: 1,
        frictionShear: 1,
      })
    ).toBe(6);
  });

  it("Braden risk derivation", () => {
    expect(deriveBradenRiskLevel(9)).toBe("VERY_HIGH");
    expect(deriveBradenRiskLevel(10)).toBe("HIGH");
    expect(deriveBradenRiskLevel(13)).toBe("MODERATE");
    expect(deriveBradenRiskLevel(15)).toBe("MILD");
    expect(deriveBradenRiskLevel(23)).toBe("MINIMAL");
  });

  it("Braden validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      BRADEN_RISK_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        sensoryPerception: 4,
        moisture: 4,
        activity: 4,
        mobility: 4,
        nutrition: 4,
        frictionShear: 3,
        totalScore: 23,
        riskLevel: "MINIMAL",
        preventionPlanReviewed: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      BRADEN_RISK_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        sensoryPerception: 1,
        moisture: 1,
        activity: 1,
        mobility: 1,
        nutrition: 1,
        frictionShear: 1,
        totalScore: 10,
        riskLevel: "VERY_HIGH",
        preventionPlanReviewed: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("pressure injury validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      PRESSURE_INJURY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        location: "SACRUM",
        stage: "STAGE_2",
        drainagePresent: "NO",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("pressure injury governance", () => {
    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      PRESSURE_INJURY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        location: "SACRUM",
        stage: "STAGE_3",
        drainagePresent: "YES",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const infection = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      PRESSURE_INJURY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        location: "HEEL_LEFT",
        stage: "STAGE_1",
        drainagePresent: "NO",
        infectionConcern: "YES",
        providerNotified: "NO",
      }
    );
    expect(infection.ok).toBe(false);
  });

  it("pressure injury reassessment governance", () => {
    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      PRESSURE_INJURY_REASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        existingPressureInjuryLocation: "Sacrum",
        status: "WORSENED",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("surgical wound validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      SURGICAL_WOUND_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        incisionType: "SUTURES",
        approximation: "WELL_APPROXIMATED",
        drainage: "SEROUS",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const dehisced = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      SURGICAL_WOUND_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        incisionType: "STAPLES",
        approximation: "DEHISCED",
        drainage: "PURULENT",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(dehisced.ok).toBe(false);
  });

  it("traumatic wound validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      TRAUMATIC_WOUND_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        woundType: "LACERATION",
        drainage: "NONE",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      TRAUMATIC_WOUND_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        woundType: "BITE",
        drainage: "PURULENT",
        infectionConcern: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("skin tear validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      SKIN_TEAR_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        tearCategory: "CATEGORY_1",
        bleedingPresent: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      SKIN_TEAR_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        tearCategory: "CATEGORY_3",
        bleedingPresent: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("MASD validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(MASD_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      source: "INCONTINENCE",
      severity: "MILD",
      providerNotified: "NO",
    });
    expect(ok.ok).toBe(true);

    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(MASD_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      source: "PERISTOMAL",
      severity: "SEVERE",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("ostomy validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(OSTOMY_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      ostomyType: "COLOSTOMY",
      stomaAppearance: "PINK",
      outputPresent: "YES",
      skinIntact: "YES",
      providerNotified: "NO",
    });
    expect(ok.ok).toBe(true);

    const dusky = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      OSTOMY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        ostomyType: "ILEOSTOMY",
        stomaAppearance: "DUSKY",
        outputPresent: "YES",
        skinIntact: "YES",
        providerNotified: "NO",
      }
    );
    expect(dusky.ok).toBe(false);

    const breakdown = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      OSTOMY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        ostomyType: "UROSTOMY",
        stomaAppearance: "PINK",
        outputPresent: "YES",
        skinIntact: "NO",
        providerNotified: "NO",
      }
    );
    expect(breakdown.ok).toBe(false);
  });

  it("wound treatment validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      WOUND_TREATMENT_DOCUMENTATION_CARD_ID,
      {
        treatmentTime: ISO,
        treatmentType: "DRESSING_CHANGE",
        tolerated: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("wound photo reference validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      WOUND_PHOTO_REFERENCE_CARD_ID,
      {
        documentedAt: ISO,
        photoObtained: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      WOUND_PHOTO_REFERENCE_CARD_ID,
      {
        documentedAt: ISO,
        photoObtained: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);

    const withRef = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      WOUND_PHOTO_REFERENCE_CARD_ID,
      {
        documentedAt: ISO,
        photoObtained: "YES",
        photoReferenceId: "IMG-2026-001",
        patientConsentVerified: "YES",
        providerNotified: "NO",
      }
    );
    expect(withRef.ok).toBe(true);
  });

  it("wound reassessment validation", () => {
    const ok = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      WOUND_REASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        status: "IMPROVED",
        drainageChanged: "NO",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);

    const bad = validateSkinWoundPressureInjuryDocumentationPayloadForCard(
      WOUND_REASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        status: "WORSENED",
        drainageChanged: "YES",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("EN summaries", () => {
    const braden = summarizeSkinWoundPressureInjuryPayload(
      BRADEN_RISK_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        sensoryPerception: 4,
        moisture: 4,
        activity: 4,
        mobility: 4,
        nutrition: 4,
        frictionShear: 3,
        totalScore: 23,
        riskLevel: "MINIMAL",
        preventionPlanReviewed: "YES",
        providerNotified: "NO",
      },
      "en"
    );
    expect(braden.some((l) => l.key === "Score" && l.value === "23")).toBe(true);
    expect(braden.some((l) => l.key === "Risk level" && l.value === "Minimal risk")).toBe(true);

    const pi = summarizeSkinWoundPressureInjuryPayload(
      PRESSURE_INJURY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        location: "SACRUM",
        stage: "STAGE_2",
        drainagePresent: "NO",
        infectionConcern: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(pi.some((l) => l.key === "Location" && l.value === "Sacrum")).toBe(true);
  });

  it("FR summaries", () => {
    const skin = summarizeSkinWoundPressureInjuryPayload(
      SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        skinStatus: "INTACT",
        pressureInjuryPresent: "YES",
        woundPresent: "NO",
        skinTearPresent: "NO",
        masdPresent: "NO",
        providerNotified: "YES",
      },
      "fr"
    );
    expect(skin.some((l) => l.key === "Statut cutané" && l.value === "Intègre")).toBe(true);
    expect(skin.some((l) => l.key === "Lésion de pression présente" && l.value === "Oui")).toBe(true);

    const braden = summarizeSkinWoundPressureInjuryPayload(
      BRADEN_RISK_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        sensoryPerception: 1,
        moisture: 1,
        activity: 1,
        mobility: 1,
        nutrition: 1,
        frictionShear: 1,
        totalScore: 6,
        riskLevel: "VERY_HIGH",
        preventionPlanReviewed: "YES",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(braden.some((l) => l.key === "Niveau de risque" && l.value === "Risque très élevé")).toBe(true);
  });
});
