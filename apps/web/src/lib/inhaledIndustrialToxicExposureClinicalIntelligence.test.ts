import { describe, expect, it } from "vitest";
import { resolveInhaledIndustrialToxicExposureContext } from "./inhaledIndustrialToxicExposureClinicalIntelligence";
import { resolveToxicologyToxidromeRedFlags } from "./toxicologyToxidromeRedFlagEngine";

describe("inhaledIndustrialToxicExposureClinicalIntelligence", () => {
  it("resolves carbon monoxide and asserts pulse-ox alone does not exclude CO", () => {
    const context = resolveInhaledIndustrialToxicExposureContext({
      displayName: "Carbon monoxide poisoning, enclosed space",
    });
    expect(context.branches).toContain("carbon_monoxide");
    expect(context.pulseOxAloneDoesNotExcludeCo).toBe(true);
    const flags = resolveToxicologyToxidromeRedFlags({
      displayName: "Carbon monoxide poisoning",
    });
    expect(flags.prompts.join(" ")).toMatch(/Pulse oximetry alone does not exclude/i);
  });

  it("withholds routine discharge for cyanide", () => {
    const context = resolveInhaledIndustrialToxicExposureContext({
      displayName: "Cyanide exposure after industrial fire",
    });
    expect(context.branches).toContain("cyanide");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves methemoglobinemia concern", () => {
    const context = resolveInhaledIndustrialToxicExposureContext({
      displayName: "Methemoglobinemia after oxidizing exposure",
    });
    expect(context.branches).toContain("methemoglobinemia");
  });
});
