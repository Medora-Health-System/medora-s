import { hasStrokes, isValidSignatureValue } from "./document-signature.service";

describe("signature vector validation", () => {
  const valid = {
    width: 400,
    height: 200,
    strokes: [{ id: "one", points: [{ x: 1, y: 2, timestamp: 3, pressure: 0.5 }] }],
  };

  it("accepts the canonical signature vector", () => {
    expect(hasStrokes(valid)).toBe(true);
    expect(isValidSignatureValue(valid)).toBe(true);
  });

  it("accepts the legacy Point[][] shape", () => {
    expect(isValidSignatureValue({ ...valid, strokes: [[{ x: 1, y: 2, t: 3 }]] })).toBe(true);
  });

  it("rejects empty, non-finite, and unbounded vectors", () => {
    expect(isValidSignatureValue({ ...valid, strokes: [] })).toBe(false);
    expect(isValidSignatureValue({ ...valid, width: Infinity })).toBe(false);
    expect(isValidSignatureValue({ ...valid, strokes: [{ points: Array.from({ length: 5001 }, () => ({ x: 1, y: 2, timestamp: 3 })) }] })).toBe(false);
  });
});
