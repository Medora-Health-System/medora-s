import { describe, expect, it } from "vitest";
import {
  ADVANCED_DOCUMENTED_PROCEDURE_TYPES,
  chestTubeProcedureDocumentDtoSchema,
  intubationProcedureDocumentDtoSchema,
  lumbarPunctureProcedureDocumentDtoSchema,
} from "@medora/shared";

describe("encounterProcedureAdvanced schemas", () => {
  it("includes eight advanced procedure types", () => {
    expect(ADVANCED_DOCUMENTED_PROCEDURE_TYPES).toHaveLength(8);
  });

  it("validates a minimal chest tube payload", () => {
    const parsed = chestTubeProcedureDocumentDtoSchema.safeParse({
      procedureType: "CHEST_TUBE",
      side: "LEFT",
      indication: "PNEUMOTHORAX",
      urgency: "EMERGENT",
      consent: "IMPLIED_EMERGENCY",
      sterilePrep: true,
      anesthesia: "LOCAL_INFILTRATION",
      tubeSize: "FR_32",
      insertionSite: "MID_AXILLARY",
      technique: "SELDINGER",
      confirmationMethod: "CXR",
      drainageType: "AIR",
      estimatedOutput: "MINIMAL",
      postProcedureStatus: "STABLE",
      toleratedWell: true,
      followUpImagingOrdered: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("validates intubation with RSI approach", () => {
    const parsed = intubationProcedureDocumentDtoSchema.safeParse({
      procedureType: "INTUBATION",
      indication: "RESPIRATORY_FAILURE",
      approach: "RSI",
      preoxygenation: true,
      airwayAssessment: "FAVORABLE",
      bladeDevice: "VIDEO",
      tubeSize: "7_5",
      attempts: "1",
      successfulAttemptNumber: "1",
      confirmationMethod: "ETCO2",
      postIntubationStatus: "STABLE",
      ventilatorInitiated: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("requires OTHER detail for lumbar puncture level", () => {
    const parsed = lumbarPunctureProcedureDocumentDtoSchema.safeParse({
      procedureType: "LUMBAR_PUNCTURE",
      indication: "MENINGITIS",
      consent: "OBTAINED",
      level: "OTHER",
      position: "LATERAL",
      openingPressure: "ELEVATED",
      csfAppearance: "CLEAR",
      tubesCollected: "4",
      toleratedWell: true,
    });
    expect(parsed.success).toBe(false);
  });
});
