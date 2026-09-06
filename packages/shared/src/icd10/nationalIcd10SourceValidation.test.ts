import { describe, expect, it } from "vitest";
import {
  classifyNationalCode,
  inspectAdversarialCodes,
  intersectNationalSource,
  nationalNormalizedCode,
} from "./nationalIcd10SourceValidation.js";

describe("P3-F.3 national source exact-code intersection", () => {
  const us = [
    { code: "R10.85", normalizedCode: "R1085", label: "Abdominal pain of multiple sites", selectable: true },
    { code: "R11", normalizedCode: "R11", label: "Nausea and vomiting", selectable: false },
    { code: "R11.0", normalizedCode: "R110", label: "Nausea", selectable: true },
    { code: "L03", normalizedCode: "L03", label: "Cellulitis", selectable: false },
    { code: "L03.90", normalizedCode: "L0390", label: "Cellulitis, unspecified", selectable: true },
  ];

  it("intersects exact selectable codes without parent inheritance", () => {
    const source = [
      { code: "R11.0", normalizedCode: "R110", label: "Nausées", terminal: true },
      { code: "R11", normalizedCode: "R11", label: "Nausées et vomissements", terminal: true },
      { code: "A99.9", normalizedCode: "A999", label: "Extension", terminal: true },
    ];
    const stats = intersectNationalSource({ usRows: us, sourceRows: source, terminalOnly: true });
    expect(stats.exactCodeIntersection).toBe(1);
    expect(stats.intersectionCodes).toEqual(["R110"]);
    expect(stats.categoryCollisions).toBe(1);
    expect(stats.categoryCollisionCodes).toEqual(["R11"]);
    expect(stats.sourceOnly).toBe(1);
    expect(stats.usOnly).toBe(2);
    expect(stats.exactCodeCoveragePercent).toBe(33.33);
  });

  it("does not treat a parent source label as covering children", () => {
    const source = [{ code: "L03", normalizedCode: "L03", label: "Phlegmon", terminal: true }];
    const stats = intersectNationalSource({ usRows: us, sourceRows: source, terminalOnly: true });
    expect(stats.intersectionCodes).not.toContain("L0390");
    expect(stats.categoryCollisionCodes).toContain("L03");
    const usMap = new Map(us.map((row) => [row.normalizedCode, row]));
    const srcMap = new Map(source.map((row) => [row.normalizedCode, row]));
    const matrix = inspectAdversarialCodes({
      queries: ["L03", "L03.90"],
      usByNormalized: usMap,
      sourceByNormalized: srcMap,
    });
    expect(matrix[0]?.classification).toBe("CATEGORY_ONLY");
    expect(matrix[1]?.classification).toBe("US_ONLY");
  });

  it("classifies unknown and source-only codes", () => {
    expect(classifyNationalCode({})).toBe("INVALID_SOURCE_CODE");
    expect(
      classifyNationalCode({
        source: { code: "T14.1", normalizedCode: "T141", label: "Plaie", terminal: true },
      }),
    ).toBe("SOURCE_ONLY_EXTENSION");
    expect(nationalNormalizedCode("R10.85")).toBe("R1085");
  });

  it("counts duplicates and blank labels without rewriting codes", () => {
    const source = [
      { code: "R11.0", normalizedCode: "R110", label: "A", terminal: true },
      { code: "R11.0", normalizedCode: "R110", label: "B", terminal: true },
      { code: "R11.0", normalizedCode: "R110", label: "   ", terminal: true },
    ];
    const stats = intersectNationalSource({ usRows: us, sourceRows: source });
    expect(stats.duplicateNormalized).toBe(2);
    expect(stats.blankLabels).toBe(1);
    expect(stats.sourceUniqueNormalized).toBe(1);
  });
});
