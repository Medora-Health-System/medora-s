import { describe, expect, it } from "vitest";
import { resolveSubmersionElectricalLightningContext } from "./submersionElectricalLightningClinicalIntelligence";

describe("submersionElectricalLightningClinicalIntelligence", () => {
  it("resolves nonfatal drowning branch and allows routine discharge for a brief, asymptomatic submersion", () => {
    const context = resolveSubmersionElectricalLightningContext({
      displayName: "Brief submersion, asymptomatic, well appearing",
    });
    expect(context.branches).toContain("nonfatal_drowning");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("resolves aspiration after submersion branch", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "Submersion with aspiration and cough" });
    expect(context.branches).toContain("aspiration_after_submersion");
  });

  it("resolves cold water submersion branch", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "Cold water submersion, rescued quickly" });
    expect(context.branches).toContain("cold_water_submersion");
  });

  it("resolves low-voltage electrical injury branch", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "Low-voltage electrical injury to the hand" });
    expect(context.branches).toContain("low_voltage_electrical");
  });

  it("resolves high-voltage electrical injury branch and withholds routine discharge", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "High-voltage electrical injury" });
    expect(context.branches).toContain("high_voltage_electrical");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves electrical arc injury branch", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "Electrical arc injury to the forearm" });
    expect(context.branches).toContain("electrical_arc");
  });

  it("resolves lightning injury branch", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "Lightning injury, uncomplicated contact" });
    expect(context.branches).toContain("lightning_injury");
  });

  it("resolves cardiac/neuro complication concern for lightning injury with arrest and withholds routine discharge", () => {
    const context = resolveSubmersionElectricalLightningContext({
      displayName: "Lightning injury with cardiac arrest",
    });
    expect(context.branches).toContain("cardiac_neuro_complication_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves cardiac/neuro complication concern for drowning with respiratory failure", () => {
    const context = resolveSubmersionElectricalLightningContext({
      displayName: "Submersion with respiratory failure after rescue",
    });
    expect(context.branches).toContain("cardiac_neuro_complication_concern");
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("resolves rhabdomyolysis concern branch", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "Rhabdomyolysis after electrical injury" });
    expect(context.branches).toContain("rhabdomyolysis_concern");
  });

  it("allows discharge for high-acuity branches only when documented as post-acute follow-up", () => {
    const context = resolveSubmersionElectricalLightningContext({
      displayName: "High-voltage electrical injury, follow-up recheck visit",
    });
    expect(context.branches).toContain("high_voltage_electrical");
    expect(context.dischargeFamilyId).not.toBeNull();
  });

  it("never uses 'dry drowning' or 'secondary drowning' language for delayed respiratory decompensation after submersion", () => {
    const context = resolveSubmersionElectricalLightningContext({
      displayName: "Submersion with respiratory failure, monitored for delayed symptoms",
    });
    const allBranchText = context.branches.join(" ");
    expect(allBranchText.toLowerCase()).not.toMatch(/dry drowning|secondary drowning/);
  });

  it("falls back to other when no submersion/electrical/lightning terms are documented", () => {
    const context = resolveSubmersionElectricalLightningContext({ displayName: "" });
    expect(context.branches).toContain("other");
  });
});
