import { describe, expect, it } from "vitest";
import {
  CENTRAL_LINE_ASSESSMENT_CARD_ID,
  CHEST_TUBE_MONITORING_CARD_ID,
  EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS,
  ENDOTRACHEAL_TUBE_MONITORING_CARD_ID,
  EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID,
  FOLEY_CATHETER_MONITORING_CARD_ID,
  NG_OG_TUBE_MONITORING_CARD_ID,
  PERIPHERAL_IV_ASSESSMENT_CARD_ID,
  PICC_MIDLINE_ASSESSMENT_CARD_ID,
  SURGICAL_DRAIN_MONITORING_CARD_ID,
  TRACHEOSTOMY_MONITORING_CARD_ID,
  summarizeDeviceLineTubeDrainMonitoringPayload,
  validateDeviceLineTubeDrainMonitoringPayloadForCard,
} from "./deviceLineTubeDrainMonitoringDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import { assertRegistryAvailableCardsHavePayloadValidators } from "./clinicalDocumentationPayloadGovernance.js";

const ISO = "2026-05-28T12:00:00.000Z";

const IV_BASE = {
  assessmentTime: ISO,
  siteLocation: "Left forearm",
  gauge: "20G",
  status: "PATENT" as const,
  bloodReturnPresent: "YES" as const,
  flushesWithoutResistance: "YES" as const,
  dressingStatus: "CLEAN_DRY_INTACT" as const,
  painPresent: "NO" as const,
  swellingPresent: "NO" as const,
  providerNotified: "NO" as const,
};

describe("deviceLineTubeDrainMonitoringDocumentationPayloads (EDOC.17)", () => {
  it("all EDOC.17 device cards are AVAILABLE with validators", () => {
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    for (const cardId of EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.category).toBe("DEVICE_LINE_TUBE_DRAIN_MONITORING");
    }
  });

  it("peripheral IV validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      PERIPHERAL_IV_ASSESSMENT_CARD_ID,
      IV_BASE
    );
    expect(ok.ok).toBe(true);
  });

  it("central line validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      CENTRAL_LINE_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        lineType: "CVC",
        siteStatus: "NORMAL",
        dressingStatus: "CLEAN_DRY_INTACT",
        securementIntact: "YES",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("PICC/midline validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      PICC_MIDLINE_ASSESSMENT_CARD_ID,
      {
        assessmentTime: ISO,
        deviceType: "PICC",
        siteStatus: "NORMAL",
        bloodReturnPresent: "YES",
        flushesWithoutResistance: "YES",
        infectionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("Foley validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      FOLEY_CATHETER_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        indicationPresent: "YES",
        catheterSecure: "YES",
        urineFlowPresent: "YES",
        urineAppearance: "YELLOW",
        catheterCareCompleted: "YES",
        obstructionConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("external urinary validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        deviceType: "PUREWICK",
        deviceIntact: "YES",
        skinIntegrity: "INTACT",
        functioningProperly: "YES",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("NG/OG validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(NG_OG_TUBE_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      tubeType: "NG",
      placementVerified: "YES",
      markingAtNares: "22 cm",
      suctionActive: "NO",
      drainagePresent: "YES",
      drainageAppearance: "GREEN",
      providerNotified: "NO",
    });
    expect(ok.ok).toBe(true);
  });

  it("chest tube validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(CHEST_TUBE_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      tubeLocation: "LEFT",
      suctionActive: "YES",
      waterSealPresent: "YES",
      airLeakPresent: "NO",
      drainageAmount: 50,
      drainageAppearance: "SEROSANGUINOUS",
      tubeSecure: "YES",
      providerNotified: "NO",
    });
    expect(ok.ok).toBe(true);
  });

  it("surgical drain validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      SURGICAL_DRAIN_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        drainType: "JP",
        drainageAmount: 30,
        drainageAppearance: "SEROUS",
        drainCompressed: "YES",
        siteStatus: "NORMAL",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("ETT validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      ENDOTRACHEAL_TUBE_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        tubePosition: 22,
        positionUnit: "CM",
        securementIntact: "YES",
        oralCareCompleted: "YES",
        airwayPatent: "YES",
        displacementConcern: "NO",
        providerNotified: "NO",
      }
    );
    expect(ok.ok).toBe(true);
  });

  it("tracheostomy validates", () => {
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(TRACHEOSTOMY_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      trachType: "CUFFED",
      siteStatus: "NORMAL",
      innerCannulaChecked: "YES",
      airwayPatent: "YES",
      dislodgementConcern: "NO",
      providerNotified: "NO",
    });
    expect(ok.ok).toBe(true);
  });

  it("governance: infiltrated IV requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(PERIPHERAL_IV_ASSESSMENT_CARD_ID, {
      ...IV_BASE,
      status: "INFILTRATED",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
    const ok = validateDeviceLineTubeDrainMonitoringPayloadForCard(PERIPHERAL_IV_ASSESSMENT_CARD_ID, {
      ...IV_BASE,
      status: "INFILTRATED",
      providerNotified: "YES",
    });
    expect(ok.ok).toBe(true);
  });

  it("governance: central line infection concern requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(CENTRAL_LINE_ASSESSMENT_CARD_ID, {
      assessmentTime: ISO,
      lineType: "CVC",
      siteStatus: "REDNESS",
      dressingStatus: "CLEAN_DRY_INTACT",
      securementIntact: "YES",
      infectionConcern: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("governance: Foley obstruction requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(FOLEY_CATHETER_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      indicationPresent: "YES",
      catheterSecure: "YES",
      urineFlowPresent: "NO",
      urineAppearance: "CLOUDY",
      catheterCareCompleted: "YES",
      obstructionConcern: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("governance: skin breakdown requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        deviceType: "PUREWICK",
        deviceIntact: "YES",
        skinIntegrity: "BREAKDOWN",
        functioningProperly: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("governance: NG placement not verified requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(NG_OG_TUBE_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      tubeType: "NG",
      placementVerified: "NO",
      markingAtNares: "22 cm",
      suctionActive: "NO",
      drainagePresent: "NO",
      drainageAppearance: "CLEAR",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("governance: chest tube air leak requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(CHEST_TUBE_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      tubeLocation: "RIGHT",
      suctionActive: "YES",
      waterSealPresent: "YES",
      airLeakPresent: "YES",
      drainageAmount: 100,
      drainageAppearance: "BLOODY",
      tubeSecure: "YES",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("governance: ETT displacement requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(
      ENDOTRACHEAL_TUBE_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        tubePosition: 20,
        positionUnit: "CM",
        securementIntact: "NO",
        oralCareCompleted: "YES",
        airwayPatent: "YES",
        displacementConcern: "YES",
        providerNotified: "NO",
      }
    );
    expect(bad.ok).toBe(false);
  });

  it("governance: tracheostomy non-patent airway requires provider notification", () => {
    const bad = validateDeviceLineTubeDrainMonitoringPayloadForCard(TRACHEOSTOMY_MONITORING_CARD_ID, {
      assessmentTime: ISO,
      trachType: "CUFFED",
      siteStatus: "NORMAL",
      innerCannulaChecked: "YES",
      airwayPatent: "NO",
      dislodgementConcern: "NO",
      providerNotified: "NO",
    });
    expect(bad.ok).toBe(false);
  });

  it("EN summaries render", () => {
    const lines = summarizeDeviceLineTubeDrainMonitoringPayload(
      PERIPHERAL_IV_ASSESSMENT_CARD_ID,
      IV_BASE,
      "en"
    );
    expect(lines.some((l) => l.key === "Site" && l.value === "Left forearm")).toBe(true);
    expect(lines.some((l) => l.key === "Status" && l.value === "Patent")).toBe(true);
  });

  it("FR summaries render", () => {
    const lines = summarizeDeviceLineTubeDrainMonitoringPayload(
      FOLEY_CATHETER_MONITORING_CARD_ID,
      {
        assessmentTime: ISO,
        indicationPresent: "YES",
        catheterSecure: "YES",
        urineFlowPresent: "YES",
        urineAppearance: "YELLOW",
        catheterCareCompleted: "YES",
        obstructionConcern: "NO",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(lines.some((l) => l.key === "Aspect" && l.value === "Jaune")).toBe(true);
    expect(lines.some((l) => l.key === "Écoulement urinaire")).toBe(true);
  });
});
