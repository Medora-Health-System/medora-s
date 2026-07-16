import { describe, expect, it } from "vitest";
import { composeSpineBackDischargeGuidance } from "./spineBackCompositeDischargeGuidance";

describe("spine/back composite discharge guidance", () => {
  it("prioritizes cauda red-flag precautions over generic back pain", () => {
    const result = composeSpineBackDischargeGuidance([
      { code: "M54.5", displayName: "Back pain", isPrimary: true },
      { code: "G83.4", displayName: "Cauda equina syndrome" },
    ]);
    expect(result.provenance[0]?.templateId).toBe("post_caudal_red_flag_evaluation_v1");
    expect(result.returnPrecautions).toMatch(/urinary retention/i);
  });
});
