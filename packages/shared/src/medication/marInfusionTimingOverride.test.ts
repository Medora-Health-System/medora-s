import { describe, expect, it } from "vitest";
import {
  buildMarInfusionTimingDocumentation,
  computeMarInfusionTimingMovedMinutes,
  marInfusionClinicalTimeDiffersFromSave,
  validateMarInfusionClinicalTimeOverride,
} from "./marInfusionTimingOverrideGovernance.js";

describe("marInfusionTimingOverrideGovernance (H9E)", () => {
  const saveAt = new Date("2026-06-03T14:00:00.000Z");

  it("1 — infusion start clinical time is editable (differs from save)", () => {
    const clinicalAt = "2026-06-03T09:00:00.000Z";
    expect(marInfusionClinicalTimeDiffersFromSave(clinicalAt, saveAt)).toBe(true);
  });

  it("2 — infusion stop clinical time is editable", () => {
    const clinicalAt = "2026-06-03T11:30:00.000Z";
    expect(marInfusionClinicalTimeDiffersFromSave(clinicalAt, saveAt)).toBe(true);
  });

  it("3 — bolus complete clinical time is editable", () => {
    const clinicalAt = "2026-06-03T10:15:00.000Z";
    expect(computeMarInfusionTimingMovedMinutes(clinicalAt, saveAt)).toBeGreaterThan(0);
  });

  it("4 — start time changed does not require reason", () => {
    const result = validateMarInfusionClinicalTimeOverride({
      clinicalAt: "2026-06-03T09:00:00.000Z",
      saveAt,
      reasonCode: null,
    });
    expect(result.ok).toBe(true);
  });

  it("5 — stop time changed does not require reason", () => {
    const result = validateMarInfusionClinicalTimeOverride({
      clinicalAt: "2026-06-03T16:00:00.000Z",
      saveAt,
      reasonCode: "",
    });
    expect(result.ok).toBe(true);
  });

  it("6 — duration helpers use clinical vs save delta", () => {
    expect(computeMarInfusionTimingMovedMinutes("2026-06-03T09:00:00.000Z", saveAt)).toBe(300);
  });

  it("allows on-time clinical time without reason", () => {
    const result = validateMarInfusionClinicalTimeOverride({
      clinicalAt: saveAt.toISOString(),
      saveAt,
    });
    expect(result.ok).toBe(true);
  });

  it("builds structured timing documentation in notes", () => {
    const doc = buildMarInfusionTimingDocumentation({
      clinicalAt: "2026-06-03T09:00:00.000Z",
      saveAt,
      reasonCode: "WORKFLOW_DELAY",
    });
    expect(doc).toContain("MAR_SCHEDULE_TIMING:");
    expect(doc).toContain("WORKFLOW_DELAY");
  });
});
