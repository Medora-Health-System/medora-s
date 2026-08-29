/**
 * INP.DIS.1F — Planning summary projection tests.
 */

import { describe, expect, it } from "vitest";
import { projectInpatientDischargePlanningSummary } from "./inpatientDischargeBoardInpDis1f.js";

describe("INP.DIS.1F planning summary", () => {
  it("projects planning card fields from clinical ops", () => {
    const summary = projectInpatientDischargePlanningSummary({
      ops: {
        version: 1,
        dischargePlanning: {
          destination: "HOME",
          workflowState: "PLANNING",
          transportation: "PRIVATE_VEHICLE",
          homeHealth: null,
          specialNeedsEquipment: "None",
          careTeamNotified: true,
          barriers: null,
          updatedAt: "2026-08-28T12:00:00.000Z",
        },
      },
      providerDispositionCode: "HOME",
    });
    expect(summary.plannedDestination).toBe("HOME");
    expect(summary.transportPlan).toBe("PRIVATE_VEHICLE");
    expect(summary.specialNeedsEquipment).toBe("None");
    expect(summary.careTeamNotified).toBe(true);
    expect(summary.differsFromProviderDisposition).toBe(false);
  });

  it("flags planning vs provider disposition mismatch", () => {
    const summary = projectInpatientDischargePlanningSummary({
      ops: {
        version: 1,
        dischargePlanning: {
          destination: "SKILLED_NURSING_FACILITY",
          workflowState: "PLANNING",
          updatedAt: "2026-08-28T12:00:00.000Z",
        },
      },
      providerDispositionCode: "HOME",
    });
    expect(summary.differsFromProviderDisposition).toBe(true);
  });
});
