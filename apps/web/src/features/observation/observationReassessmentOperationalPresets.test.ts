import { describe, expect, it } from "vitest";
import { OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS } from "./observationReassessmentOperationalPresets";

describe("OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS", () => {
  it("has stable preset ids for i18n wiring", () => {
    expect(OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS).toContain("presetStable");
    expect(OBSERVATION_REASSESSMENT_OPERATIONAL_PRESET_IDS).toHaveLength(8);
  });
});
