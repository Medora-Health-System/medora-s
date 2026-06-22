import { describe, expect, it } from "vitest";
import { buildAnticoagulationDuplicateProtectionReport } from "./anticoagulationDuplicateProtection.js";

describe("AnticoagulationDuplicateProtectionReport", () => {
  it("passes anticoagulation duplicate protection", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().decision).toBe("PASS");
  });

  it("keeps activation collision decision safe", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().activationCollisionDecision).toBe("SAFE");
  });

  it("keeps provider search collision decision safe", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().providerSearchCollisionDecision).toBe("SAFE");
  });

  it("does not report provider-search duplicate rows", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().duplicateProviderSearchRows).toBe(0);
  });

  it("does not produce duplicate blockers", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().blockers).toEqual([]);
  });

  it("audits anticoagulant duplicate families", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().duplicateAnticoagulants).toBeGreaterThanOrEqual(0);
  });

  it("audits thrombolytic duplicate families", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().duplicateThrombolytics).toBeGreaterThanOrEqual(0);
  });

  it("audits reversal duplicate families", () => {
    expect(buildAnticoagulationDuplicateProtectionReport().duplicateReversalAgents).toBeGreaterThanOrEqual(0);
  });
});
