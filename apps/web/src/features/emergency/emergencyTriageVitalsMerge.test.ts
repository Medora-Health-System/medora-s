import { describe, expect, it } from "vitest";
import { emptyErTriageV1Form } from "./medoraErTriageV1";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";

describe("mergeVitalsJsonForSave measurement context", () => {
  it("stores temperature site and room-air oxygen without flow", () => {
    const merged = mergeVitalsJsonForSave(null, {
      tempC: "98.6",
      hr: "80",
      rr: "16",
      bpSys: "120",
      bpDia: "80",
      spo2: "97",
      weightKg: "",
      heightCm: "",
      painScore: "",
      allergyNote: "",
      erV1: emptyErTriageV1Form(),
      tempInputUnit: "F",
      temperatureSite: "ORAL",
      oxygenDevice: "ROOM_AIR",
      oxygenFlowLpm: "2",
      oxygenFiO2Percent: "40",
    });
    expect(merged?.temperatureSite).toBe("ORAL");
    expect(merged?.oxygenDevice).toBe("ROOM_AIR");
    expect(merged?.oxygenFlowLpm).toBeUndefined();
    expect(merged?.oxygenFiO2Percent).toBeUndefined();
  });

  it("stores nasal cannula flow with SpO2", () => {
    const merged = mergeVitalsJsonForSave(null, {
      tempC: "",
      hr: "",
      rr: "",
      bpSys: "",
      bpDia: "",
      spo2: "94",
      weightKg: "",
      heightCm: "",
      painScore: "",
      allergyNote: "",
      erV1: emptyErTriageV1Form(),
      oxygenDevice: "NASAL_CANNULA",
      oxygenFlowLpm: "2",
    });
    expect(merged?.spo2).toBe(94);
    expect(merged?.oxygenDevice).toBe("NASAL_CANNULA");
    expect(merged?.oxygenFlowLpm).toBe(2);
  });
});
