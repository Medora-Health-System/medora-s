import { describe, expect, it } from "vitest";
import {
  looksLikeSmashedLabAnalyteBlob,
  normalizeLabResultTextForPersist,
  recoverJammedRadiologyHeadings,
  recoverSmashedLabAnalyteRows,
  serializeLabAnalyteRows,
  serializeRadiologyReportFields,
} from "./labSmashedAnalyteParse.js";

describe("recoverSmashedLabAnalyteRows", () => {
  const smashed =
    "Glucose9270–100mg/dL—BUN146–20mg/dL—Creatinine0.90.6–1.2mg/dL—Sodium140135–145mEq/L";

  it("recovers CMP-style smashed analytes without inventing values", () => {
    expect(looksLikeSmashedLabAnalyteBlob(smashed)).toBe(true);
    const rows = recoverSmashedLabAnalyteRows(smashed);
    expect(rows.map((r) => r.label)).toEqual(["Glucose", "BUN", "Creatinine", "Sodium"]);
    expect(rows[0]).toMatchObject({ value: "92", ref: "70–100", units: "mg/dL" });
    expect(rows[1]).toMatchObject({ value: "14", ref: "6–20", units: "mg/dL" });
    expect(rows[2]).toMatchObject({ ref: "0.6–1.2", units: "mg/dL" });
    expect(Number(rows[2].value)).toBeCloseTo(0.9, 5);
    expect(rows[3]).toMatchObject({ value: "140", ref: "135–145", units: "mEq/L" });
  });

  it("does not smash already structured colon/newline text", () => {
    const structured = "Glucose: 92 mg/dL (70–100)\nBUN: 14 mg/dL (6–20)";
    expect(looksLikeSmashedLabAnalyteBlob(structured)).toBe(false);
  });

  it("serializes recovered rows into the existing Name: value (range) contract", () => {
    const text = serializeLabAnalyteRows(recoverSmashedLabAnalyteRows(smashed));
    expect(text).toContain("Glucose: 92 mg/dL (70–100)");
    expect(text).toContain("Sodium: 140 mEq/L (135–145)");
  });

  it("normalizes smashed blobs for persist without rewriting structured text", () => {
    const structured = "Glucose: 92 mg/dL (70–100)\nBUN: 14 mg/dL (6–20)";
    expect(normalizeLabResultTextForPersist(smashed)).toContain("Glucose: 92 mg/dL (70–100)");
    expect(normalizeLabResultTextForPersist(structured)).toBe(structured);
  });
});

describe("recoverJammedRadiologyHeadings", () => {
  it("inserts newlines before glued headings without rewriting clinical words", () => {
    const jammed =
      "18 Aug 2026Exam Type: CT AbdomenContrastComparison: noneFindingsLower Chest is clear.ImpressionNo acute process.";
    const recovered = recoverJammedRadiologyHeadings(jammed);
    expect(recovered).toMatch(/Exam Type:/);
    expect(recovered).toMatch(/\nFindings:/);
    expect(recovered).toMatch(/\nImpression:/);
    expect(recovered).toContain("Lower Chest is clear.");
    expect(recovered).toContain("No acute process.");
  });

  it("serializes radiology fields as newline-prefixed headings", () => {
    const text = serializeRadiologyReportFields({
      indication: "Pain",
      findings: "Lower chest is clear.",
      impression: "No acute process.",
    });
    expect(text).toContain("Indication:\nPain");
    expect(text).toContain("Findings:\nLower chest is clear.");
    expect(text).toContain("Impression:\nNo acute process.");
  });
});
