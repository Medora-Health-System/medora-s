import { describe, expect, it } from "vitest";
import {
  adaptCrushComplaintIntel,
  resolveCrushContextFromDiagnosis,
} from "./crushClinicalIntelligence";
import { CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

describe("crushClinicalIntelligence", () => {
  it("resolves hand crush ICD to hand/finger family", () => {
    const ctx = resolveCrushContextFromDiagnosis({
      code: "S67.21XA",
      displayName: "Crushing injury of right hand",
    });
    expect(ctx.regions).toContain("hand_finger");
    expect(ctx.dischargeFamilyId).toBe("trauma_crush_hand_finger");
  });

  it("resolves prolonged compression / traumatic ischemia", () => {
    const ctx = resolveCrushContextFromDiagnosis({
      code: "T79.6XXA",
      displayName: "Traumatic ischemia of muscle",
    });
    expect(ctx.severity).toBe("prolonged_compression");
    expect(ctx.dischargeFamilyId).toBe("trauma_crush_prolonged_compression");
    expect(ctx.dispositionRecommendations.some((r) => r.id === "admission")).toBe(true);
  });

  it("adapts intel display ordering without dropping keys", () => {
    const adapted = adaptCrushComplaintIntel(CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL, {
      regions: ["hand_finger"],
    });
    expect(adapted.hpi?.length).toBe(CRUSH_INJURY_ADULT_COMPLAINT_V1_INTEL.hpi?.length);
  });
});
