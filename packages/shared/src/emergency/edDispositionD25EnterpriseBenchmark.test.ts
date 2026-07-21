import { describe, expect, it } from "vitest";
import {
  buildEdDispositionD25EnterpriseBenchmarkCases,
  evaluateEdDispositionD25EnterpriseBenchmark,
} from "./edDispositionD25EnterpriseBenchmark.js";

describe("edDispositionD25EnterpriseBenchmark", () => {
  it("contains 100 cases with required distribution", () => {
    const cases = buildEdDispositionD25EnterpriseBenchmarkCases();
    expect(cases).toHaveLength(100);
    const counts = Object.fromEntries(
      ["HOME", "AMA", "LWBS", "ELOPEMENT", "DECEASED", "OTHER"].map((p) => [
        p,
        cases.filter((c) => c.path === p).length,
      ])
    );
    expect(counts).toEqual({
      HOME: 20,
      AMA: 20,
      LWBS: 15,
      ELOPEMENT: 15,
      DECEASED: 20,
      OTHER: 10,
    });
  });

  it("meets exact-set, precision/recall, and zero false READY targets", () => {
    const m = evaluateEdDispositionD25EnterpriseBenchmark();
    expect(m.exactSetMatchRate).toBe(1);
    expect(m.precision).toBe(1);
    expect(m.recall).toBe(1);
    expect(m.falseReadyCount).toBe(0);
    expect(m.crossPathHomeSatisfactionCount).toBe(0);
    expect(m.fabricatedMseCompletionCount).toBe(0);
  });
});
