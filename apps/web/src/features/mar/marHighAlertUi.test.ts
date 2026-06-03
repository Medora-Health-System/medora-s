import { describe, expect, it } from "vitest";
import { marControlledWorkflowVisible } from "@/components/medication/MarControlledSubstanceFields";
import { marHighAlertWorkflowVisible } from "@/components/medication/MarHighAlertFields";

describe("MAR high-alert UI (M1.3F.5 / M1.7A.9)", () => {
  it("shows high-alert workflow only for administered meds requiring double-check", () => {
    expect(
      marHighAlertWorkflowVisible(
        { isHighAlert: true, highAlertClass: "HIGH_ALERT_INSULIN", requiresDoubleSign: true },
        "administered"
      )
    ).toBe(true);
    expect(
      marHighAlertWorkflowVisible(
        { isHighAlert: true, highAlertClass: "HIGH_ALERT_INSULIN", requiresDoubleSign: true },
        "refused"
      )
    ).toBe(false);
    expect(
      marHighAlertWorkflowVisible(
        { isHighAlert: true, highAlertClass: "HIGH_ALERT_OPIOID", requiresDoubleSign: true },
        "administered",
        { route: "IV", isContinuousInfusion: false }
      )
    ).toBe(false);
  });

  it("can show controlled and high-alert workflows together", () => {
    const governance = {
      isControlled: true,
      requiresWitness: true,
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_INSULIN",
      requiresDoubleSign: true,
    };
    expect(marControlledWorkflowVisible(governance, "administered")).toBe(true);
    expect(marHighAlertWorkflowVisible(governance, "administered")).toBe(true);
  });
});
