import { describe, expect, it } from "vitest";
import { buildTetanusAdvisoryPrompts, tetanusAppliesToHumanBite } from "./woundTetanusAdvisory";

describe("woundTetanusAdvisory", () => {
  it("never auto-orders and applies to human bites", () => {
    expect(tetanusAppliesToHumanBite()).toBe(true);
    const prompts = buildTetanusAdvisoryPrompts({ woundCategory: "bite", rustMentioned: true });
    expect(prompts.every((p) => p.autoOrder === false)).toBe(true);
    expect(prompts.some((p) => p.id === "rust_not_decisive")).toBe(true);
  });
});
