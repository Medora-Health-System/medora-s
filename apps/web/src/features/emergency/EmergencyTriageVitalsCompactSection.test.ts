import { describe, expect, it } from "vitest";
import { emptyTriageVitalsCompactValues } from "./EmergencyTriageVitalsCompactSection";
import { oxygenDeviceSuggestsFlow, oxygenDeviceSuggestsFiO2 } from "@medora/shared";

describe("EmergencyTriageVitalsCompactSection helpers", () => {
  it("starts with room air and empty measured placeholders when provided", () => {
    const v = emptyTriageVitalsCompactValues({ date: "2026-07-14", time: "23:26" });
    expect(v.oxygenDevice).toBe("ROOM_AIR");
    expect(v.measuredDate).toBe("2026-07-14");
    expect(v.measuredTime).toBe("23:26");
    expect(v.tempC).toBe("");
  });

  it("only suggests flow/FiO2 for supported devices", () => {
    expect(oxygenDeviceSuggestsFlow("ROOM_AIR")).toBe(false);
    expect(oxygenDeviceSuggestsFiO2("ROOM_AIR")).toBe(false);
    expect(oxygenDeviceSuggestsFlow("NASAL_CANNULA")).toBe(true);
    expect(oxygenDeviceSuggestsFiO2("BIPAP")).toBe(true);
  });
});
