import { collectPromotionAliases, normalizeMedicationAlias } from "./promotion-alias.util";

describe("promotion-alias.util", () => {
  it("deduplicates aliases", () => {
    const aliases = collectPromotionAliases({
      generic_name: "Norepinephrine",
      brand_name: "Levophed",
      aliases: "levophed|LEVOPHED",
      ed_quick_search_keywords: "pressor",
    });
    const normalized = aliases.map((a) => a.normalizedAlias);
    expect(new Set(normalized).size).toBe(normalized.length);
    expect(normalized).toContain(normalizeMedicationAlias("levophed"));
  });
});
