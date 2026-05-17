import { describe, expect, it } from "vitest";
import {
  deriveObservationTemplateCareOpsIndicators,
  deriveObservationTemplateLineLifecyclePhase,
  observationTemplateLineAllowsInProgressStart,
} from "./observationTemplateOrderLifecycle.js";

describe("observationTemplateOrderLifecycle", () => {
  it("maps statuses to distinct lifecycle phases", () => {
    expect(deriveObservationTemplateLineLifecyclePhase({ status: "PLACED", cancelled: false })).toBe(
      "ORDERED"
    );
    expect(
      deriveObservationTemplateLineLifecyclePhase({ status: "ACKNOWLEDGED", cancelled: false })
    ).toBe("ACKNOWLEDGED");
    expect(
      deriveObservationTemplateLineLifecyclePhase({ status: "IN_PROGRESS", cancelled: false })
    ).toBe("IN_PROGRESS");
    expect(
      deriveObservationTemplateLineLifecyclePhase({ status: "COMPLETED", cancelled: false })
    ).toBe("COMPLETED");
    expect(deriveObservationTemplateLineLifecyclePhase({ status: "PLACED", cancelled: true })).toBe(
      "CANCELLED"
    );
  });

  it("ordered != acknowledged != completed", () => {
    expect(
      deriveObservationTemplateLineLifecyclePhase({ status: "PLACED", cancelled: false })
    ).not.toBe("ACKNOWLEDGED");
    expect(
      deriveObservationTemplateLineLifecyclePhase({ status: "ACKNOWLEDGED", cancelled: false })
    ).not.toBe("COMPLETED");
  });

  it("allows in-progress start only for monitoring-style template lines", () => {
    expect(observationTemplateLineAllowsInProgressStart("mon_vitals_q2h")).toBe(true);
    expect(observationTemplateLineAllowsInProgressStart("com_diet_ad_lib")).toBe(false);
  });

  it("derives care ops indicators from row phases", () => {
    const indicators = deriveObservationTemplateCareOpsIndicators([
      { lifecyclePhase: "ORDERED", templateItemId: "mon_vitals_q2h" },
      { lifecyclePhase: "ACKNOWLEDGED", templateItemId: "nurse_reassess_q2h" },
      { lifecyclePhase: "IN_PROGRESS", templateItemId: "mon_vitals_q2h" },
      { lifecyclePhase: "COMPLETED", templateItemId: "com_diet_ad_lib" },
    ]);
    expect(indicators.pendingAcknowledgementCount).toBe(1);
    expect(indicators.careTasksPendingCount).toBe(3);
    expect(indicators.monitoringActiveCount).toBe(1);
    expect(indicators.careCompleteCount).toBe(1);
  });
});
