/**
 * MEDUI.CP.1F.3 — NOT_STARTED display + discipline label helpers.
 */

import { describe, expect, it } from "vitest";
import { shouldShowCarePlanComponentStatus } from "./CarePlanClinicianWorkflowCp1c";

describe("MEDUI.CP.1F.3 Care Plan component status display", () => {
  it("hides default NOT_STARTED and PENDING from routine display", () => {
    expect(shouldShowCarePlanComponentStatus("NOT_STARTED")).toBe(false);
    expect(shouldShowCarePlanComponentStatus("PENDING")).toBe(false);
    expect(shouldShowCarePlanComponentStatus(null)).toBe(false);
  });

  it("shows meaningful lifecycle statuses", () => {
    expect(shouldShowCarePlanComponentStatus("IN_PROGRESS")).toBe(true);
    expect(shouldShowCarePlanComponentStatus("COMPLETED")).toBe(true);
    expect(shouldShowCarePlanComponentStatus("MET")).toBe(true);
    expect(shouldShowCarePlanComponentStatus("PARTIALLY_MET")).toBe(true);
  });
});
