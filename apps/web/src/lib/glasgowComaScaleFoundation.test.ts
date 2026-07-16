import { describe, expect, it } from "vitest";
import {
  buildGcsSerialEntry,
  computeGcsTotal,
  deriveGcsSeverityBand,
  formatGcsForDocumentation,
  GCS_FOUNDATION_STATUS,
  hasClinicallySignificantGcsDecline,
  sortGcsSerialEntries,
  validateGcsComponents,
} from "./glasgowComaScaleFoundation";

describe("glasgowComaScaleFoundation", () => {
  it("is labeled as a structured foundation, not an autonomous TBI severity tool", () => {
    expect(GCS_FOUNDATION_STATUS).toBe("STRUCTURED_FOUNDATION_READY");
  });

  it("computes the total from valid eye/verbal/motor components", () => {
    expect(computeGcsTotal({ eye: 4, verbal: 5, motor: 6 })).toBe(15);
    expect(computeGcsTotal({ eye: 1, verbal: 1, motor: 1 })).toBe(3);
  });

  it("validates components and rejects an invalid combination", () => {
    expect(validateGcsComponents({ eye: 4, verbal: 5, motor: 6 })).toBe(true);
    expect(validateGcsComponents({ eye: 0, verbal: 5, motor: 6 })).toBe(false);
    expect(validateGcsComponents({ eye: 4, verbal: 7, motor: 6 })).toBe(false);
    expect(() => computeGcsTotal({ eye: 0, verbal: 5, motor: 6 })).toThrow();
  });

  it("derives severity bands without claiming to establish a TBI diagnosis", () => {
    expect(deriveGcsSeverityBand(15)).toBe("MILD");
    expect(deriveGcsSeverityBand(13)).toBe("MILD");
    expect(deriveGcsSeverityBand(12)).toBe("MODERATE");
    expect(deriveGcsSeverityBand(9)).toBe("MODERATE");
    expect(deriveGcsSeverityBand(8)).toBe("SEVERE");
    expect(deriveGcsSeverityBand(3)).toBe("SEVERE");
  });

  it("builds and sorts serial GCS entries for trend documentation", () => {
    const entries = [
      buildGcsSerialEntry({ timestamp: "2026-07-15T10:00:00Z", eye: 4, verbal: 5, motor: 6 }),
      buildGcsSerialEntry({ timestamp: "2026-07-15T08:00:00Z", eye: 3, verbal: 4, motor: 6 }),
    ];
    const sorted = sortGcsSerialEntries(entries);
    expect(sorted[0]?.total).toBe(13);
    expect(sorted[1]?.total).toBe(15);
  });

  it("flags a clinically significant decline of 2 or more points without dictating action", () => {
    expect(hasClinicallySignificantGcsDecline(15, 13)).toBe(true);
    expect(hasClinicallySignificantGcsDecline(15, 14)).toBe(false);
    expect(hasClinicallySignificantGcsDecline(undefined, 13)).toBe(false);
  });

  it("formats intubated/nonverbal patients with a documented notation, not a guessed verbal score", () => {
    const formatted = formatGcsForDocumentation({ eye: 3, verbal: 1, motor: 6, nonVerbalReason: "INTUBATED" });
    expect(formatted).toContain("T");
    expect(formatted).toContain("E3");
    expect(formatted).toContain("M6");
    expect(formatGcsForDocumentation({ eye: 4, verbal: 5, motor: 6 })).toBe("GCS 15 (E4 V5 M6)");
  });

  it("never claims to auto-determine TBI severity from GCS alone", () => {
    const source = [
      GCS_FOUNDATION_STATUS,
      deriveGcsSeverityBand(8).toString(),
      formatGcsForDocumentation({ eye: 1, verbal: 1, motor: 1 }),
    ].join(" ");
    expect(source.toLowerCase()).not.toMatch(/diagnos|traumatic brain injury confirmed|disposition/);
  });
});
