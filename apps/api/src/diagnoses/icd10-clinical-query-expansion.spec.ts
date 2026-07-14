import {
  normalizeIcd10SearchQuery,
  resolveIcd10ClinicalQueryExpansion,
} from "./icd10-clinical-query-expansion";

describe("icd10 clinical query expansion", () => {
  it("normalizes curly apostrophes for skier's thumb", () => {
    expect(normalizeIcd10SearchQuery("skier’s thumb")).toBe("skiers thumb");
    expect(resolveIcd10ClinicalQueryExpansion("skier's thumb")?.allOf).toEqual([
      "sprain of metacarpophalangeal joint of",
      "thumb",
    ]);
  });

  it("expands ACL tear to anterior cruciate ligament", () => {
    expect(resolveIcd10ClinicalQueryExpansion("ACL tear")?.anyOf).toContain("anterior cruciate ligament");
  });

  it("expands gamekeeper's thumb without inventing codes", () => {
    const e = resolveIcd10ClinicalQueryExpansion("gamekeeper's thumb");
    expect(e?.allOf?.join(" ")).toContain("thumb");
    expect(e?.allOf?.join(" ")).toContain("metacarpophalangeal");
  });
});
