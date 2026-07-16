import { describe, expect, it } from "vitest";
import { resolveVertigoDifferentiationContext } from "./vertigoDifferentiationEngine";

describe("vertigoDifferentiationEngine", () => {
  it("does not invent branches from empty documentation but always includes the never-classifies disclaimer", () => {
    const result = resolveVertigoDifferentiationContext({});
    expect(result.branches).toEqual([]);
    expect(result.redFlagCategories).toEqual([]);
    expect(result.prompts[0].toLowerCase()).toMatch(/never autonomously classifies vertigo as peripheral or central/);
  });

  it("captures a BPPV documentation branch", () => {
    const result = resolveVertigoDifferentiationContext({ documentedFlags: ["positional vertigo triggered by rolling in bed"] });
    expect(result.branches).toContain("bppv");
  });

  it("captures a vestibular neuritis documentation branch", () => {
    const result = resolveVertigoDifferentiationContext({ documentedFlags: ["vestibular neuritis"] });
    expect(result.branches).toContain("vestibular_neuritis");
  });

  it("captures a labyrinthitis documentation branch distinct from vestibular neuritis", () => {
    const result = resolveVertigoDifferentiationContext({ documentedFlags: ["vestibular neuritis with hearing loss"] });
    expect(result.branches).toContain("labyrinthitis");
    expect(result.branches).not.toContain("vestibular_neuritis");
  });

  it("captures a Meniere-type episodic vertigo documentation branch", () => {
    const result = resolveVertigoDifferentiationContext({ documentedFlags: ["episodic vertigo with tinnitus and aural fullness"] });
    expect(result.branches).toContain("meniere_type");
  });

  it("captures a central vertigo concern branch from red-flag findings without classifying it", () => {
    const result = resolveVertigoDifferentiationContext({ documentedFlags: ["direction-changing nystagmus", "truncal ataxia"] });
    expect(result.branches).toContain("central_vertigo_concern");
    expect(result.redFlagCategories).toContain("central_vertigo");
    expect(result.prompts.join(" ").toLowerCase()).not.toMatch(/classified as (peripheral|central)/);
  });

  it("never autonomously classifies peripheral versus central even when multiple branches match", () => {
    const result = resolveVertigoDifferentiationContext({
      documentedFlags: ["bppv", "vestibular neuritis", "direction-changing nystagmus"],
    });
    expect(result.prompts.join(" ").toLowerCase()).toMatch(/never autonomously classifies vertigo as peripheral or central/);
  });
});
