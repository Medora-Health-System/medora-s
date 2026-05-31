import { describe, expect, it } from "vitest";
import {
  computeLabResultFlagFromReference,
  extractExplicitLabResultFlag,
  parseLabNumericValue,
  parseLabReferenceRange,
  resolveLabParsedRowFlag,
} from "./labResultReferenceFlag";

describe("parseLabNumericValue", () => {
  it("parses plain and unit-suffixed values", () => {
    expect(parseLabNumericValue("140")).toBe(140);
    expect(parseLabNumericValue("140 mmol/L")).toBe(140);
    expect(parseLabNumericValue("6,500 /µL")).toBe(6500);
    expect(parseLabNumericValue("1.0 mg/dL")).toBe(1.0);
    expect(parseLabNumericValue("250,000")).toBe(250000);
  });
});

describe("parseLabReferenceRange", () => {
  it("parses bounded ranges with units and separators", () => {
    expect(parseLabReferenceRange("135 – 145 mmol/L")).toEqual({ low: 135, high: 145 });
    expect(parseLabReferenceRange("3.5 - 5.0 mmol/L")).toEqual({ low: 3.5, high: 5.0 });
    expect(parseLabReferenceRange("4,000 – 11,000 /µL")).toEqual({ low: 4000, high: 11000 });
  });

  it("parses one-sided ranges", () => {
    expect(parseLabReferenceRange("> 90")).toEqual({ low: 90, high: null });
    expect(parseLabReferenceRange("< 5")).toEqual({ low: null, high: 5 });
  });

  it("returns null for unparseable ranges", () => {
    expect(parseLabReferenceRange("see report")).toBeNull();
  });
});

describe("computeLabResultFlagFromReference — CBC/CMP normals", () => {
  it("does not flag in-range CBC/CMP values", () => {
    expect(computeLabResultFlagFromReference("140", "135 – 145 mmol/L")).toBeNull();
    expect(computeLabResultFlagFromReference("4.2", "3.5 - 5.0 mmol/L")).toBeNull();
    expect(computeLabResultFlagFromReference("102", "98–106")).toBeNull();
    expect(computeLabResultFlagFromReference("90", "70–99")).toBeNull();
    expect(computeLabResultFlagFromReference("6,500 /µL", "4,000 – 11,000 /µL")).toBeNull();
    expect(computeLabResultFlagFromReference("250,000", "150,000–450,000")).toBeNull();
  });

  it("flags below-range as L and above-range as H", () => {
    expect(computeLabResultFlagFromReference("130", "135 – 145 mmol/L")).toBe("L");
    expect(computeLabResultFlagFromReference("150", "135 – 145 mmol/L")).toBe("H");
    expect(computeLabResultFlagFromReference("3.0", "3.5 - 5.0 mmol/L")).toBe("L");
    expect(computeLabResultFlagFromReference("5.5", "3.5 - 5.0 mmol/L")).toBe("H");
  });

  it("returns null when value or range cannot be parsed", () => {
    expect(computeLabResultFlagFromReference("pending", "135 – 145")).toBeNull();
    expect(computeLabResultFlagFromReference("140", "N/A")).toBeNull();
  });
});

describe("extractExplicitLabResultFlag", () => {
  it("does not treat unit suffix /L as a low flag", () => {
    expect(extractExplicitLabResultFlag("140 mmol/L")).toEqual({ cleanValue: "140 mmol/L", flag: null });
    expect(extractExplicitLabResultFlag("1.0 mg/dL")).toEqual({ cleanValue: "1.0 mg/dL", flag: null });
  });

  it("keeps explicit trailing H/L flags", () => {
    expect(extractExplicitLabResultFlag("140 L")).toEqual({ cleanValue: "140", flag: "L" });
    expect(extractExplicitLabResultFlag("180 H")).toEqual({ cleanValue: "180", flag: "H" });
  });
});

describe("resolveLabParsedRowFlag", () => {
  it("prefers explicit flag, otherwise computes from reference", () => {
    expect(resolveLabParsedRowFlag({ value: "140", ref: "135 – 145", explicitFlag: "L" })).toBe("L");
    expect(resolveLabParsedRowFlag({ value: "140", ref: "135 – 145", explicitFlag: null })).toBeNull();
    expect(resolveLabParsedRowFlag({ value: "130", ref: "135 – 145", explicitFlag: null })).toBe("L");
  });
});
