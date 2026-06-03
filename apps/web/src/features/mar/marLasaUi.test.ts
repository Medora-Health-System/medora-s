import { describe, expect, it } from "vitest";
import { marControlledWorkflowVisible } from "@/components/medication/MarControlledSubstanceFields";
import { marHighAlertWorkflowVisible } from "@/components/medication/MarHighAlertFields";
import { marLasaWorkflowVisible } from "@/components/medication/MarLasaFields";

describe("MAR LASA UI (M1.3F.6)", () => {
  it("shows LASA workflow for HIGH/MEDIUM severity on administered", () => {
    expect(
      marLasaWorkflowVisible(
        { lasaGroupId: "GROUP_LASA_OPIOID", lasaSeverity: "LASA_HIGH" },
        "administered"
      )
    ).toBe(true);
    expect(
      marLasaWorkflowVisible(
        { lasaGroupId: "GROUP_LASA_OPIOID", lasaSeverity: "LASA_MEDIUM" },
        "administered"
      )
    ).toBe(true);
    expect(
      marLasaWorkflowVisible(
        { lasaGroupId: "GROUP_LASA_OPIOID", lasaSeverity: "LASA_LOW" },
        "administered"
      )
    ).toBe(false);
  });

  it("coexists with controlled and high-alert sections", () => {
    const governance = {
      isControlled: true,
      requiresWitness: true,
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_INSULIN",
      requiresDoubleSign: true,
      lasaGroupId: "GROUP_LASA_OPIOID",
      lasaSeverity: "LASA_HIGH",
    };
    expect(marControlledWorkflowVisible(governance, "administered")).toBe(true);
    expect(marHighAlertWorkflowVisible(governance, "administered")).toBe(true);
    expect(marLasaWorkflowVisible(governance, "administered")).toBe(true);
  });
});
