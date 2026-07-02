import { describe, expect, it } from "vitest";
import { emptyErTriageV1Form } from "./medoraErTriageV1";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";

describe("emergencyTriageVitalsMerge", () => {
  it("persists painScore at top-level vitalsJson", () => {
    const merged = mergeVitalsJsonForSave(null, {
      tempC: "",
      hr: "88",
      rr: "",
      bpSys: "120",
      bpDia: "80",
      spo2: "",
      weightKg: "",
      heightCm: "",
      painScore: "8",
      allergyNote: "",
      erV1: emptyErTriageV1Form(),
    });
    expect(merged?.painScore).toBe(8);
  });

  it("backfills legacy medoraErTriageV1 painScale0to10 when saving vitals pain", () => {
    const merged = mergeVitalsJsonForSave(
      { medoraErTriageV1: { painScale0to10: 3 } },
      {
        tempC: "",
        hr: "",
        rr: "",
        bpSys: "",
        bpDia: "",
        spo2: "",
        weightKg: "",
        heightCm: "",
        painScore: "7",
        allergyNote: "",
        erV1: { ...emptyErTriageV1Form(), painScale0to10: "3" },
      }
    );
    const er = merged?.medoraErTriageV1 as { painScale0to10?: number | string };
    expect(merged?.painScore).toBe(7);
    expect(er?.painScale0to10).toBe(7);
  });

  it("preserves existing vitals when pain is cleared", () => {
    const merged = mergeVitalsJsonForSave(
      { hr: 90, painScore: 5 },
      {
        tempC: "",
        hr: "90",
        rr: "",
        bpSys: "",
        bpDia: "",
        spo2: "",
        weightKg: "",
        heightCm: "",
        painScore: "",
        allergyNote: "",
        erV1: emptyErTriageV1Form(),
      }
    );
    expect(merged?.hr).toBe(90);
    expect(merged?.painScore).toBeUndefined();
  });
});
