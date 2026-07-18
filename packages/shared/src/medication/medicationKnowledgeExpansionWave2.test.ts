import { describe, expect, it } from "vitest";
import {
  MK_EXPANSION_WAVE2_CERTIFICATION_ID,
  MK_EXPANSION_WAVE2_SPECIALTY_PACKS,
  assertMkExpansionWave2SafetyDefaults,
  buildMkExpansionWave2SearchQueryExpansions,
  listMkExpansionWave2FamilyNames,
  mkExpansionWave2PackMarker,
} from "./medicationKnowledgeExpansionWave2.js";

describe("Medication Knowledge Expansion Wave 2", () => {
  it("defines specialty packs without acetaminophen", () => {
    expect(MK_EXPANSION_WAVE2_SPECIALTY_PACKS.length).toBeGreaterThanOrEqual(12);
    expect(listMkExpansionWave2FamilyNames().length).toBeGreaterThan(40);
    expect(
      listMkExpansionWave2FamilyNames().some((n) =>
        /acetaminophen|paracetamol/.test(n)
      )
    ).toBe(false);
    expect(() => assertMkExpansionWave2SafetyDefaults()).not.toThrow();
    expect(MK_EXPANSION_WAVE2_CERTIFICATION_ID).toContain("WAVE_2");
  });

  it("builds search expansions for abbreviations and typos", () => {
    const exp = buildMkExpansionWave2SearchQueryExpansions();
    expect(exp["narcan"]).toContain("naloxone");
    expect(exp["ventolin"]).toContain("albuterol");
    expect(exp["txa"]).toBeDefined();
    expect(mkExpansionWave2PackMarker("CARDIOLOGY")).toBe("EM_PACK:CARDIOLOGY");
  });
});
