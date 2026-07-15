import { describe, expect, it } from "vitest";
import { DIAGNOSIS_REMOVAL_REASON_OPTIONS } from "@/lib/diagnosisRemovalReasons";

describe("diagnosis removal reasons", () => {
  it("includes Other and entered-in-error options for the confirmation dialog", () => {
    const codes = DIAGNOSIS_REMOVAL_REASON_OPTIONS.map((o) => o.code);
    expect(codes).toContain("ENTERED_IN_ERROR");
    expect(codes).toContain("OTHER");
    expect(codes).toHaveLength(6);
  });
});
