import { describe, expect, it } from "vitest";
import { marControlledWorkflowVisible } from "@/components/medication/MarControlledSubstanceFields";
import { marHighAlertWorkflowVisible } from "@/components/medication/MarHighAlertFields";

describe("MAR high-alert UI (M1.3F.5)", () => {
  it("shows high-alert workflow only for administered meds requiring double-check", () => {
    expect(
      marHighAlertWorkflowVisible(
        { isHighAlert: true, requiresDoubleSign: true },
        "administered"
      )
    ).toBe(true);
    expect(
      marHighAlertWorkflowVisible(
        { isHighAlert: true, requiresDoubleSign: true },
        "refused"
      )
    ).toBe(false);
    expect(
      marHighAlertWorkflowVisible(
        { isHighAlert: true, requiresDoubleSign: false },
        "administered"
      )
    ).toBe(false);
  });

  it("can show controlled and high-alert workflows together", () => {
    const governance = {
      isControlled: true,
      requiresWitness: true,
      isHighAlert: true,
      requiresDoubleSign: true,
    };
    expect(marControlledWorkflowVisible(governance, "administered")).toBe(true);
    expect(marHighAlertWorkflowVisible(governance, "administered")).toBe(true);
  });
});
