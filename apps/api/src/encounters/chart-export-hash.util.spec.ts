import {
  canonicalizeForHash,
  hashCanonicalJson,
  sha256Hex,
} from "./chart-export-hash.util";

describe("canonicalizeForHash", () => {
  it("sorts object keys lexicographically", () => {
    expect(canonicalizeForHash({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("produces identical output for the same logical value with different key order", () => {
    const a = canonicalizeForHash({ z: 1, a: 2, m: { y: 3, x: 4 } });
    const b = canonicalizeForHash({ a: 2, m: { x: 4, y: 3 }, z: 1 });
    expect(a).toBe(b);
  });

  it("preserves array order", () => {
    expect(canonicalizeForHash([3, 1, 2])).toBe("[3,1,2]");
  });

  it("encodes nested structures stably", () => {
    const v = {
      manifestVersion: "v1",
      items: [{ id: "b" }, { id: "a" }],
      counts: { y: 2, x: 1 },
    };
    expect(canonicalizeForHash(v)).toBe(
      '{"counts":{"x":1,"y":2},"items":[{"id":"b"},{"id":"a"}],"manifestVersion":"v1"}'
    );
  });

  it("drops undefined / function / symbol object props (matches JSON.stringify)", () => {
    const out = canonicalizeForHash({
      a: 1,
      b: undefined,
      c: () => 1,
      d: Symbol("x"),
    } as unknown);
    expect(out).toBe('{"a":1}');
  });

  it("coerces undefined / function / symbol array members to null (matches JSON.stringify)", () => {
    const out = canonicalizeForHash([1, undefined, () => 1, Symbol("x"), 2]);
    expect(out).toBe("[1,null,null,null,2]");
  });

  it("encodes null and booleans", () => {
    expect(canonicalizeForHash(null)).toBe("null");
    expect(canonicalizeForHash(true)).toBe("true");
    expect(canonicalizeForHash(false)).toBe("false");
  });

  it("encodes strings with JSON escape rules", () => {
    expect(canonicalizeForHash('a"b\\c\n')).toBe(JSON.stringify('a"b\\c\n'));
  });

  it("throws on non-finite numbers", () => {
    expect(() => canonicalizeForHash(Number.NaN)).toThrow();
    expect(() => canonicalizeForHash(Number.POSITIVE_INFINITY)).toThrow();
  });

  it("throws on bigint", () => {
    expect(() => canonicalizeForHash(BigInt(1))).toThrow();
  });
});

describe("sha256Hex / hashCanonicalJson", () => {
  it("produces a stable 64-hex-char hash", () => {
    const { hash, canonicalJson } = hashCanonicalJson({ a: 1, b: 2 });
    expect(canonicalJson).toBe('{"a":1,"b":2}');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Reference: sha256("{\"a\":1,\"b\":2}").
    expect(hash).toBe(sha256Hex('{"a":1,"b":2}'));
  });

  it("hashes equal-value inputs identically (key-order independence)", () => {
    const h1 = hashCanonicalJson({ b: 2, a: 1 }).hash;
    const h2 = hashCanonicalJson({ a: 1, b: 2 }).hash;
    expect(h1).toBe(h2);
  });

  it("hashes different inputs to different digests", () => {
    const h1 = hashCanonicalJson({ a: 1 }).hash;
    const h2 = hashCanonicalJson({ a: 2 }).hash;
    expect(h1).not.toBe(h2);
  });
});
