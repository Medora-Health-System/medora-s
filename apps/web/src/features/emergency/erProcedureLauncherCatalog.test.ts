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
  ER_PROCEDURE_ENABLED_TILES,
} from "./erProcedureLauncherCatalog";
import { isAdvancedProcedureType } from "./ProcedureDocumentAdvancedForms";

describe("erProcedureLauncherCatalog (19M.1)", () => {
  it("lists seventeen enabled procedure tiles including advanced procedures", () => {
    expect(ER_PROCEDURE_ENABLED_TILES).toHaveLength(17);
    expect(ER_PROCEDURE_BASIC_NON_LACERATION).toHaveLength(8);
    expect(ER_PROCEDURE_ADVANCED).toHaveLength(8);
  });

  it("has no coming-soon placeholders after activation", () => {
    expect(ER_PROCEDURE_COMING_SOON_TILES).toHaveLength(0);
  });

  it("recognizes all advanced procedure types", () => {
    for (const pt of ER_PROCEDURE_ADVANCED) {
      expect(isAdvancedProcedureType(pt)).toBe(true);
    }
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
});
