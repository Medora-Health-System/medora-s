import { describe, expect, it } from "vitest";
import { buildRabiesAdvisoryPrompts, rabiesAdvisoryApplies } from "./animalRabiesAdvisory";

describe("animalRabiesAdvisory", () => {
  it("never applies to human bites", () => {
    expect(rabiesAdvisoryApplies({ isHumanBite: true, species: "dog" })).toBe(false);
    expect(buildRabiesAdvisoryPrompts({ isHumanBite: true, species: "bat" })).toEqual([]);
  });

  it("provides animal-only advisory prompts without auto-order", () => {
    const prompts = buildRabiesAdvisoryPrompts({ species: "bat", animalAvailable: false });
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.every((p) => p.autoOrder === false)).toBe(true);
    expect(prompts.some((p) => p.id === "high_concern_species")).toBe(true);
  });
});
