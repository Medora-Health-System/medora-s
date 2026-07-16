import { describe, expect, it } from "vitest";
import {
  buildHintsDocumentationFields,
  HINTS_SAFETY_DISCLAIMER,
  isHintsDocumentationAllowed,
} from "./hintsExaminationSafety";

describe("hintsExaminationSafety", () => {
  it("documents HINTS as documentation-only and not a validated automated stroke rule-out", () => {
    expect(HINTS_SAFETY_DISCLAIMER.toLowerCase()).toMatch(/documentation-only/);
    expect(HINTS_SAFETY_DISCLAIMER.toLowerCase()).toMatch(/not.*validated automated stroke rule-out/);
    expect(HINTS_SAFETY_DISCLAIMER.toLowerCase()).toMatch(/never.*autonomously exclude stroke/);
  });

  it("allows HINTS documentation only for continuous acute vestibular syndrome", () => {
    expect(isHintsDocumentationAllowed({ timing: "continuous_acute" })).toBe(true);
    expect(isHintsDocumentationAllowed({ documentedFlags: ["continuous vertigo since onset this morning"] })).toBe(true);
    expect(isHintsDocumentationAllowed({ documentedFlags: ["acute vestibular syndrome"] })).toBe(true);
  });

  it("disallows HINTS documentation for episodic positional dizziness", () => {
    expect(isHintsDocumentationAllowed({ timing: "episodic_positional" })).toBe(false);
    expect(isHintsDocumentationAllowed({ documentedFlags: ["positional vertigo triggered by rolling in bed"] })).toBe(false);
    expect(isHintsDocumentationAllowed({ documentedFlags: ["bppv"] })).toBe(false);
  });

  it("disallows HINTS documentation for episodic spontaneous vertigo", () => {
    expect(isHintsDocumentationAllowed({ timing: "episodic_spontaneous" })).toBe(false);
  });

  it("defaults to disallowed when timing cannot be established (never widens eligibility on ambiguous input)", () => {
    expect(isHintsDocumentationAllowed({})).toBe(false);
    expect(isHintsDocumentationAllowed({ documentedFlags: ["dizziness"] })).toBe(false);
    expect(isHintsDocumentationAllowed({ timing: "unknown" })).toBe(false);
  });

  it("builds three separate documentation-only fields — head impulse, nystagmus, and skew are never merged", () => {
    const fields = buildHintsDocumentationFields();
    expect(fields.headImpulse.key).toBe("head_impulse");
    expect(fields.nystagmus.key).toBe("nystagmus");
    expect(fields.skew.key).toBe("skew");
    expect(fields.headImpulse.documentationOnly).toBe(true);
    expect(fields.nystagmus.documentationOnly).toBe(true);
    expect(fields.skew.documentationOnly).toBe(true);
    const keys = new Set([fields.headImpulse.key, fields.nystagmus.key, fields.skew.key]);
    expect(keys.size).toBe(3);
  });

  it("never resolves an automated stroke-positive/negative classification from field values", () => {
    const fields = buildHintsDocumentationFields();
    const allValues = [...fields.headImpulse.allowedValues, ...fields.nystagmus.allowedValues, ...fields.skew.allowedValues];
    expect(allValues.some((v) => /stroke/.test(v))).toBe(false);
  });
});
