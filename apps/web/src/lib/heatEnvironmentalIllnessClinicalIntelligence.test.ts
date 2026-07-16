import { describe, expect, it } from "vitest";
import { adaptHeatEnvironmentalIllnessIntel, resolveHeatEnvironmentalIllnessContext } from "./heatEnvironmentalIllnessClinicalIntelligence";

describe("heatEnvironmentalIllnessClinicalIntelligence", () => {
  it("resolves heat cramps and allows routine discharge", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Heat cramps after outdoor exercise" });
    expect(context.branches).toContain("heat_cramps");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves heat syncope branch", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Heat syncope during a hot afternoon" });
    expect(context.branches).toContain("heat_syncope");
  });

  it("resolves heat exhaustion branch", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Heat exhaustion, well appearing" });
    expect(context.branches).toContain("heat_exhaustion");
  });

  it("resolves exertional heat illness branch", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Exertional heat illness after a marathon" });
    expect(context.branches).toContain("exertional_heat_illness");
  });

  it("resolves classic (nonexertional) heat illness branch", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Classic heat illness in an elderly patient" });
    expect(context.branches).toContain("classic_heat_illness");
  });

  it("resolves exertional rhabdomyolysis overlap branch", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Exertional rhabdomyolysis after heat exposure" });
    expect(context.branches).toContain("exertional_rhabdomyolysis_overlap");
  });

  it("resolves dehydration/electrolyte concern branch", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Dehydration and electrolyte abnormality" });
    expect(context.branches).toContain("dehydration_electrolyte_concern");
  });

  it("requires documented altered mental status, seizure, or coma language to resolve heat stroke concern — a measured temperature alone is not sufficient", () => {
    const temperatureOnly = resolveHeatEnvironmentalIllnessContext({
      displayName: "Core temperature of 104F after exertion, alert and oriented",
    });
    expect(temperatureOnly.branches).not.toContain("heat_stroke_concern");
    expect(temperatureOnly.dischargeFamilyId).not.toBeNull();

    const withAms = resolveHeatEnvironmentalIllnessContext({
      displayName: "Heat stroke with altered mental status and core temperature of 104F",
    });
    expect(withAms.branches).toContain("heat_stroke_concern");
    expect(withAms.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for heat stroke concern unless documented as post-acute follow-up", () => {
    const seriousFollowUp = resolveHeatEnvironmentalIllnessContext({
      displayName: "Heat stroke with confusion, follow-up recheck visit",
    });
    expect(seriousFollowUp.branches).toContain("heat_stroke_concern");
    expect(seriousFollowUp.dischargeFamilyId).not.toBeNull();
  });

  it("surfaces the heat_stroke red-flag category through the shared red-flag engine", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "Heat stroke with seizure activity" });
    expect(context.redFlagCategories).toContain("heat_stroke");
  });

  it("adapts (reorders) chip order without changing chip content", () => {
    const intel = { hpi: ["a", "heat stroke concern noted"], rosRedFlags: ["b"], mdmPlanSummary: ["c"] };
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "heat stroke with altered mental status" });
    const adapted = adaptHeatEnvironmentalIllnessIntel(intel, context);
    expect(adapted.hpi?.slice().sort()).toEqual(intel.hpi.slice().sort());
  });

  it("falls back to other when no heat-related terms are documented", () => {
    const context = resolveHeatEnvironmentalIllnessContext({ displayName: "" });
    expect(context.branches).toContain("other");
  });
});
