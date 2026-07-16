import { describe, expect, it } from "vitest";
import { resolveSpineRedFlags, spineRedFlagWarnings } from "./spineRedFlagEngine";

describe("spineRedFlagEngine", () => {
  it("does not invent red flags from empty documentation", () => {
    expect(resolveSpineRedFlags({}).categories).toEqual([]);
    expect(spineRedFlagWarnings({})).toEqual([]);
  });

  it("screens cauda equina concern from documented bowel/bladder and saddle findings", () => {
    const result = resolveSpineRedFlags({
      documentedFlags: ["urinary retention", "saddle anesthesia", "bilateral leg weakness"],
    });
    expect(result.categories).toContain("cauda_equina");
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  it("screens infection concern without requiring the classic triad", () => {
    const result = resolveSpineRedFlags({
      displayName: "Concern for spinal epidural abscess",
      documentedFlags: ["IV drug use", "fever"],
    });
    expect(result.categories).toContain("infection");
  });

  it("screens malignancy and pathologic-fracture risk context", () => {
    const result = resolveSpineRedFlags({
      documentedFlags: ["known cancer", "night pain", "unexplained weight loss"],
    });
    expect(result.categories).toContain("malignancy");
  });

  it("screens fracture concern after trauma or osteoporosis context", () => {
    const result = resolveSpineRedFlags({
      code: "S32.000A",
      displayName: "Wedge compression fracture of lumbar vertebra",
      documentedFlags: ["fall"],
    });
    expect(result.categories).toContain("fracture");
  });

  it("screens vascular mimic concern", () => {
    const result = resolveSpineRedFlags({
      documentedFlags: ["tearing back pain", "pulsatile abdominal mass", "hypotension"],
    });
    expect(result.categories).toContain("vascular_mimic");
  });

  it("never auto-diagnoses from red-flag prompts", () => {
    const prompts = spineRedFlagWarnings({ documentedFlags: ["cauda equina"] }).join(" ");
    expect(prompts.toLowerCase()).not.toMatch(/diagnosed|confirmed|order mri|transfer now/);
  });
});
