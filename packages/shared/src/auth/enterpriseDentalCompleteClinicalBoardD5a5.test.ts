import { describe, expect, it } from "vitest";
import {
  D5A5_CERTIFICATION_ID,
  D5A5_OVERVIEW_SECTIONS,
  deriveClinicalAttachmentLevelMm,
  isD5a5PeriodontalSite,
  normalizeBulkToothCodes,
  summarizePeriodontalSites,
  validateProbingDepthMm,
} from "./enterpriseDentalCompleteClinicalBoardD5a5.js";

describe("MEDUI.D5A.5 dental clinical board contracts", () => {
  it("exports certification id and overview sections", () => {
    expect(D5A5_CERTIFICATION_ID).toBe("MEDUI.D5A.5");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("odontogramFindings");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("periodontalExam");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("treatmentPlan");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("procedures");
  });

  it("validates six-site codes and probing depths", () => {
    expect(isD5a5PeriodontalSite("MB")).toBe(true);
    expect(isD5a5PeriodontalSite("XX")).toBe(false);
    expect(validateProbingDepthMm(3.5)).toBe(3.5);
    expect(() => validateProbingDepthMm(99)).toThrow("INVALID_PROBING_DEPTH");
  });

  it("summarizes perio sites without diagnosing", () => {
    const summary = summarizePeriodontalSites([
      { toothCode: "PERM_16", site: "MB", probingDepthMm: 5, bleedingOnProbing: true, plaque: false },
      { toothCode: "PERM_16", site: "B", probingDepthMm: 2, bleedingOnProbing: false, plaque: true },
      { toothCode: "PERM_16", site: "DB", probingDepthMm: 4, bleedingOnProbing: true, plaque: false, mobilityGrade: 1 },
    ]);
    expect(summary.deepestProbingDepthMm).toBe(5);
    expect(summary.sitesAtOrAboveThreshold).toBe(2);
    expect(summary.bleedingPercent).toBe(66.7);
    expect(summary.mobilityFlaggedToothCount).toBe(1);
  });

  it("derives CAL and normalizes bulk tooth codes", () => {
    expect(deriveClinicalAttachmentLevelMm({ probingDepthMm: 4, gingivalMarginMm: 1 })).toBe(5);
    expect(normalizeBulkToothCodes(["PERM_12", "perm_12", "PERM_13"])).toEqual([
      "PERM_12",
      "PERM_13",
    ]);
  });
});
