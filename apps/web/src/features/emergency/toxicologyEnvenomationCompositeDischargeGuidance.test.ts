import { describe, expect, it } from "vitest";
import { composeToxicologyEnvenomationDischargeGuidance } from "./toxicologyEnvenomationCompositeDischargeGuidance";

describe("toxicologyEnvenomationCompositeDischargeGuidance", () => {
  it("keeps intentional overdose toxicology guidance and does not invent medical clearance", () => {
    const result = composeToxicologyEnvenomationDischargeGuidance([
      {
        code: "T39.1X2A",
        displayName: "Poisoning by 4-Aminophenol derivatives, intentional self-harm, initial encounter",
        isPrimary: true,
      },
      { code: "R45.851", displayName: "Suicidal ideation", isPrimary: false },
    ]);
    expect(result.returnPrecautions.toLowerCase()).not.toContain("medically cleared");
    expect(result.provenance.some((p) => p.templateId.includes("acetaminophen") || p.templateId.includes("poison"))).toBe(
      true
    );
  });

  it("surfaces snake envenomation ahead of generic bleeding text without duplicate noise", () => {
    const result = composeToxicologyEnvenomationDischargeGuidance([
      { code: "T63.001A", displayName: "Snake envenomation", isPrimary: true },
      { code: "D68.9", displayName: "Coagulation defect, unspecified", isPrimary: false },
    ]);
    expect(result.provenance[0]?.templateId).toBe("snake_envenomation_post_acute_v1");
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it("keeps carbon monoxide toxicology ownership with smoke context without pulse-ox exclusion claim", () => {
    const result = composeToxicologyEnvenomationDischargeGuidance([
      { code: "T58.01XA", displayName: "Carbon monoxide poisoning", isPrimary: true },
      { code: "T27.3XXA", displayName: "Burn of respiratory tract", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "carbon_monoxide_post_acute_v1")).toBe(true);
    expect(result.returnPrecautions.toLowerCase()).not.toContain("pulse oximetry alone excludes");
  });

  it("keeps alcohol withdrawal and trauma guidance without duplicate observation sentences", () => {
    const result = composeToxicologyEnvenomationDischargeGuidance([
      { code: "F10.239", displayName: "Alcohol withdrawal post-acute care", isPrimary: true },
      { code: "S06.0X0A", displayName: "Concussion", isPrimary: false },
    ]);
    expect(result.provenance.some((p) => p.templateId === "alcohol_withdrawal_post_acute_v1")).toBe(true);
    const lines = result.returnPrecautions.split(/\n+/).filter(Boolean);
    expect(new Set(lines).size).toBe(lines.length);
  });
});
