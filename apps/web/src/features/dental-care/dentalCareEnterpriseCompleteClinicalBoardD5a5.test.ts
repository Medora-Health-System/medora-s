import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D5A5_CERTIFICATION_ID,
  D5A5_OVERVIEW_SECTIONS,
  isD5a3DentalSectionActive,
  normalizeBulkToothCodes,
} from "@medora/shared";

describe("MEDUI.D5A.5 web dental clinical board contracts", () => {
  it("certification and workspace activation", () => {
    expect(D5A5_CERTIFICATION_ID).toBe("MEDUI.D5A.5");
    expect(isD5a3DentalSectionActive("periodontal")).toBe(true);
    expect(isD5a3DentalSectionActive("treatmentPlan")).toBe(true);
    expect(isD5a3DentalSectionActive("procedures")).toBe(true);
    expect(D5A5_OVERVIEW_SECTIONS.length).toBeGreaterThanOrEqual(15);
  });

  it("bulk tooth codes preserve per-tooth provenance list", () => {
    expect(normalizeBulkToothCodes(["PERM_12", "PERM_13", "PERM_14"])).toEqual([
      "PERM_12",
      "PERM_13",
      "PERM_14",
    ]);
  });

  it("print/export caller does not hardcode locale=fr", () => {
    const overview = readFileSync(
      resolve(__dirname, "./overview/EnterpriseDentalEncounterOverviewPanel.tsx"),
      "utf8"
    );
    expect(overview).toContain("dentalEncounterChartExportHtmlPath(encounterId, language)");
    expect(overview).not.toContain("locale=fr");
  });
});
