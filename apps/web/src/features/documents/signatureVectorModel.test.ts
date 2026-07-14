import { describe, expect, it } from "vitest";
import {
  cloneSignatureValue,
  emptySignatureValue,
  isSignatureEmpty,
  normalizeSignatureValue,
} from "../../components/documents/signatureVectorModel";

describe("signature vector model", () => {
  it("creates an empty signature with requested dimensions", () => {
    expect(emptySignatureValue(400, 200)).toEqual({ strokes: [], width: 400, height: 200 });
  });

  it("normalizes legacy point-array strokes", () => {
    const value = normalizeSignatureValue({
      width: 200,
      height: 100,
      strokes: [[{ x: 1, y: 2, t: 3, pointerType: "pen" }]],
    });
    expect(value?.strokes[0].points[0]).toMatchObject({ x: 1, y: 2, timestamp: 3, pointerType: "pen" });
    expect(isSignatureEmpty(value)).toBe(false);
  });

  it("clones without sharing point references", () => {
    const value = normalizeSignatureValue({ width: 100, height: 100, strokes: [[{ x: 1, y: 2, timestamp: 3 }]] })!;
    const copy = cloneSignatureValue(value);
    copy.strokes[0].points[0].x = 99;
    expect(value.strokes[0].points[0].x).toBe(1);
  });
});
