import {
  D5A5_CERTIFICATION_ID,
  D5A5_OVERVIEW_SECTIONS,
  D5A5_PERIODONTAL_SITES,
  D5A5_TREATMENT_PLAN_ITEM_STATUSES,
  isD5a3DentalSectionActive,
  summarizePeriodontalSites,
} from "@medora/shared";

describe("MEDUI.D5A.5 API clinical board contracts", () => {
  it("exports certification and activates former placeholders", () => {
    expect(D5A5_CERTIFICATION_ID).toBe("MEDUI.D5A.5");
    expect(isD5a3DentalSectionActive("periodontal")).toBe(true);
    expect(isD5a3DentalSectionActive("treatmentPlan")).toBe(true);
    expect(isD5a3DentalSectionActive("procedures")).toBe(true);
    expect(D5A5_PERIODONTAL_SITES).toHaveLength(6);
    expect(D5A5_TREATMENT_PLAN_ITEM_STATUSES).toContain("COMPLETED");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("procedures");
  });

  it("periodontal summary never invents a diagnosis", () => {
    const s = summarizePeriodontalSites([
      { toothCode: "PERM_16", site: "MB", probingDepthMm: 6, bleedingOnProbing: true },
    ]);
    expect(s.deepestProbingDepthMm).toBe(6);
    expect((s as { diagnosis?: string }).diagnosis).toBeUndefined();
  });
});
