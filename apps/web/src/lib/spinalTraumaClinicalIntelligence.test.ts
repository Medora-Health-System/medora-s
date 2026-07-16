import { describe, expect, it } from "vitest";
import { adaptSpinalTraumaComplaintIntel, resolveSpinalTraumaContext } from "./spinalTraumaClinicalIntelligence";
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";

describe("spinalTraumaClinicalIntelligence", () => {
  it("resolves cervical/thoracic/lumbar trauma regions", () => {
    expect(resolveSpinalTraumaContext({ code: "S12.000A", displayName: "Fracture of C1" }).regions).toContain("cervical");
    expect(resolveSpinalTraumaContext({ code: "S22.010A", displayName: "Wedge compression fracture of thoracic vertebra" }).regions).toContain("thoracic");
    expect(resolveSpinalTraumaContext({ code: "S32.000A", displayName: "Wedge compression fracture of lumbar vertebra" }).regions).toContain("lumbar");
  });

  it("documents cord syndromes without auto-assignment from incomplete findings", () => {
    const ctx = resolveSpinalTraumaContext({
      displayName: "Central cord syndrome",
      documentedFlags: ["central cord"],
    });
    expect(ctx.findings).toContain("central_cord_syndrome");
    expect(ctx.findings).not.toContain("brown_sequard_syndrome");
  });

  it("distinguishes neurogenic shock from spinal shock descriptors", () => {
    expect(resolveSpinalTraumaContext({ documentedFlags: ["neurogenic shock"] }).findings).toContain("neurogenic_shock");
    expect(resolveSpinalTraumaContext({ documentedFlags: ["spinal shock"] }).findings).toContain("spinal_shock");
  });

  it("supports SCIWORA as a clinical descriptor only", () => {
    expect(resolveSpinalTraumaContext({ documentedFlags: ["SCIWORA", "normal CT"] }).findings).toContain("sciwora_descriptor");
  });

  it("adapts trauma intel without inventing disposition", () => {
    const intel = {
      hpi: ["hpi.fall", "hpi.central cord", "hpi.sciwora"],
      mdmPlanSummary: ["plan.precautions"],
    } as ProviderDocumentationComplaintIntelligence;
    const adapted = adaptSpinalTraumaComplaintIntel(intel, {
      mechanisms: ["fall"],
      regions: ["cervical"],
      findings: ["central_cord_syndrome", "sciwora_descriptor"],
    });
    expect(adapted.hpi?.some((value) => value.toLowerCase().includes("central"))).toBe(true);
  });
});
