import { describe, expect, it } from "vitest";
import {
  BALLOON_VOLUME_UI_VALUES,
  CATHETER_SIZE_UI_VALUES,
  FOLEY_INDICATION_UI_VALUES,
  LACERATION_ANESTHESIA_UI_VALUES,
  LACERATION_SITE_UI_VALUES,
  LACERATION_SUTURES_UI_VALUES,
  LACERATION_WOUND_LENGTH_UI_VALUES,
  URINE_APPEARANCE_FOLEY_UI_VALUES,
} from "@medora/shared";
import {
  ER_PROCEDURE_ADVANCED,
  ER_PROCEDURE_BASIC_NON_LACERATION,
  ER_PROCEDURE_COMING_SOON_TILES,
  ER_PROCEDURE_NURSING_ASSIST_TILES,
  ER_PROCEDURE_NURSING_PRIMARY_TILES,
  ER_PROCEDURE_PROVIDER_TILES,
  isNursingAssistStep,
  nursingAssistStepFor,
} from "./erProcedureLauncherCatalog";
import { isAdvancedProcedureType } from "./ProcedureDocumentAdvancedForms";

describe("erProcedureLauncherCatalog (19M.3)", () => {
  it("splits provider and nursing launcher sections", () => {
    expect(ER_PROCEDURE_PROVIDER_TILES.length).toBeGreaterThan(10);
    expect(ER_PROCEDURE_NURSING_PRIMARY_TILES.length).toBe(6);
    expect(ER_PROCEDURE_NURSING_ASSIST_TILES.length).toBeGreaterThan(10);
  });

  it("includes splint application on provider and nursing tracks with one canonical procedureType", () => {
    expect(ER_PROCEDURE_PROVIDER_TILES.some((tile) => tile.step === "SPLINT_APPLICATION")).toBe(true);
    expect(ER_PROCEDURE_NURSING_PRIMARY_TILES.some((tile) => tile.step === "SPLINT_APPLICATION")).toBe(true);
    expect(
      ER_PROCEDURE_NURSING_ASSIST_TILES.some((tile) => tile.assistedProcedureType === "SPLINT_APPLICATION")
    ).toBe(true);
    expect(nursingAssistStepFor("SPLINT_APPLICATION")).toBe("nursing-assist:SPLINT_APPLICATION");
  });

  it("recognizes nursing assist step prefix", () => {
    const step = nursingAssistStepFor("INTUBATION");
    expect(isNursingAssistStep(step)).toBe(true);
    expect(step).toBe("nursing-assist:INTUBATION");
  });

  it("lists advanced procedures on provider side only", () => {
    for (const pt of ER_PROCEDURE_ADVANCED) {
      expect(isAdvancedProcedureType(pt)).toBe(true);
      expect(ER_PROCEDURE_PROVIDER_TILES.some((tile) => tile.step === pt)).toBe(true);
    }
  });

  it("has no coming-soon placeholders", () => {
    expect(ER_PROCEDURE_COMING_SOON_TILES).toHaveLength(0);
  });
});

describe("erProcedureLauncher dropdown options (19M)", () => {
  it("includes laceration repair site and wound length buckets", () => {
    expect(LACERATION_SITE_UI_VALUES).toEqual(
      expect.arrayContaining(["LIP", "EAR", "UPPER_EXTREMITY", "HAND_FINGER", "FOOT_TOE"])
    );
    expect(LACERATION_WOUND_LENGTH_UI_VALUES).toEqual(["LT_1CM", "CM_1_TO_2", "CM_2_TO_5", "GT_5CM", "OTHER"]);
    expect(LACERATION_ANESTHESIA_UI_VALUES).toEqual(
      expect.arrayContaining(["LOCAL_INFILTRATION", "LET_TOPICAL", "DIGITAL_BLOCK"])
    );
    expect(LACERATION_SUTURES_UI_VALUES).toEqual(
      expect.arrayContaining(["COUNT_1_3", "COUNT_4_6", "COUNT_7_10", "COUNT_GT_10"])
    );
  });

  it("includes Foley catheter size, indication, urine appearance, and balloon options", () => {
    expect(CATHETER_SIZE_UI_VALUES).toEqual(["FR_12", "FR_14", "FR_16", "FR_18", "FR_20", "OTHER"]);
    expect(FOLEY_INDICATION_UI_VALUES).toEqual(
      expect.arrayContaining(["STRICT_IO", "PERI_PROCEDURAL", "IMMOBILIZATION_CRITICAL"])
    );
    expect(URINE_APPEARANCE_FOLEY_UI_VALUES).toEqual(
      expect.arrayContaining(["CLEAR", "YELLOW", "AMBER", "CLOUDY", "BLOODY"])
    );
    expect(BALLOON_VOLUME_UI_VALUES).toEqual(["ML_5", "ML_10", "ML_30", "OTHER"]);
  });

  it("keeps eight basic non-laceration provider form types", () => {
    expect(ER_PROCEDURE_BASIC_NON_LACERATION).toHaveLength(8);
  });
});
