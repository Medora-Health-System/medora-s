import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataSummaryDetails (MEDUI.ED.CLINICAL_DATA.3)", () => {
  const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");

  it("10 — Clinical Summary remains visible", () => {
    expect(summary).toContain("emergency-clinical-data-summary");
    expect(summary).toContain("emergencyClinicalData.summary.clinicalSummary");
  });

  it("summary metrics include detail expansion", () => {
    expect(summary).toContain("clinical-data-summary-metric");
    expect(summary).toContain("secondaryDetailLines");
    expect(summary).toContain("detailRows");
  });

  it("summary shows form title not only score", () => {
    expect(summary).toContain("formTitle");
    expect(summary).toContain("metric.label");
    expect(summary).toContain("metric.value");
  });
});
