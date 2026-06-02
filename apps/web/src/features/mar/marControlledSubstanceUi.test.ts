import { describe, expect, it } from "vitest";
import { marControlledWorkflowVisible } from "@/components/medication/MarControlledSubstanceFields";

describe("MAR controlled substance UI (M1.3F.4)", () => {
  it("shows controlled workflow only for administered controlled medications", () => {
    expect(
      marControlledWorkflowVisible({ isControlled: true, requiresWitness: true }, "administered")
    ).toBe(true);
    expect(
      marControlledWorkflowVisible({ isControlled: true, requiresWitness: true }, "refused")
    ).toBe(false);
    expect(
      marControlledWorkflowVisible({ isControlled: false, requiresWitness: false }, "administered")
    ).toBe(false);
  });
});
