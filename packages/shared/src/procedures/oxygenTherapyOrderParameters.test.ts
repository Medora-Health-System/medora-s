import { describe, expect, it } from "vitest";
import {
  buildOxygenTherapyManualLabel,
  buildOxygenTherapyOrderNotes,
  defaultOxygenTherapyDraft,
  deviceUsesFio2,
  deviceUsesFlow,
  validateOxygenTherapyDraft,
} from "./oxygenTherapyOrderParameters.js";

describe("MEDUI.CARE_PROCEDURES.OXYGEN_ORDER_PARAMETERS.1", () => {
  it("nasal cannula 2 L/min continuous generates correct label", () => {
    const draft = {
      ...defaultOxygenTherapyDraft(),
      device: "nasal_cannula" as const,
      flowSelection: "2" as const,
      frequencyMode: "continuous" as const,
      targetSelection: "spo2_ge_92" as const,
    };
    expect(buildOxygenTherapyManualLabel(draft, "en")).toContain("Nasal cannula 2 L/min continuous");
    expect(buildOxygenTherapyManualLabel(draft, "en")).toContain("maintain SpO₂ ≥ 92%");
  });

  it("non-rebreather 15 L/min STAT generates correct label", () => {
    const draft = {
      ...defaultOxygenTherapyDraft(),
      device: "non_rebreather" as const,
      flowSelection: "15" as const,
      frequencyMode: "stat" as const,
    };
    const label = buildOxygenTherapyManualLabel(draft, "en");
    expect(label).toContain("Non-rebreather mask 15 L/min STAT");
    expect(label).toContain("maintain SpO₂ ≥ 92%");
  });

  it("Venturi FiO2 40% continuous generates correct label", () => {
    const draft = {
      ...defaultOxygenTherapyDraft(),
      device: "venturi_mask" as const,
      fio2Selection: "40" as const,
      frequencyMode: "continuous" as const,
    };
    const label = buildOxygenTherapyManualLabel(draft, "en");
    expect(label).toContain("Venturi mask");
    expect(label).toContain("FiO₂ 40%");
    expect(label).toContain("continuous");
  });

  it("PRN oxygen order generates correct label", () => {
    const draft = {
      ...defaultOxygenTherapyDraft(),
      device: "nasal_cannula" as const,
      flowSelection: "3" as const,
      frequencyMode: "prn" as const,
    };
    expect(buildOxygenTherapyManualLabel(draft, "en")).toContain("Nasal cannula 3 L/min PRN");
  });

  it("requires custom flow when custom flow selected", () => {
    const result = validateOxygenTherapyDraft({
      ...defaultOxygenTherapyDraft(),
      flowSelection: "custom",
      flowCustomLpm: "",
    });
    expect(result.ok).toBe(false);
  });

  it("requires custom device text for other device", () => {
    const result = validateOxygenTherapyDraft({
      ...defaultOxygenTherapyDraft(),
      device: "other",
      deviceCustom: "",
    });
    expect(result.ok).toBe(false);
  });

  it("stores structured notes with instruction block", () => {
    const draft = defaultOxygenTherapyDraft();
    const notes = buildOxygenTherapyOrderNotes(draft, "en");
    expect(notes.startsWith("[O2_PARAMS:")).toBe(true);
    expect(notes).toContain("Oxygen therapy:");
  });

  it("device field visibility helpers", () => {
    expect(deviceUsesFlow("nasal_cannula")).toBe(true);
    expect(deviceUsesFio2("venturi_mask")).toBe(true);
    expect(deviceUsesFio2("nasal_cannula")).toBe(false);
  });
});
