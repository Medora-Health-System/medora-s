import { describe, expect, it } from "vitest";
import {
  emergencyActiveWorkspacePath,
  emergencyChartPath,
  resolveEdBoardPatientNameHref,
} from "./emergencyRoutes";

describe("resolveEdBoardPatientNameHref", () => {
  it("routes open encounters to the active ED workspace", () => {
    expect(
      resolveEdBoardPatientNameHref({ encounterId: "enc-1", status: "OPEN", workflowState: "IN_PROGRESS" })
    ).toBe(emergencyActiveWorkspacePath("enc-1"));
  });

  it("routes closed encounters to the read-only chart", () => {
    expect(
      resolveEdBoardPatientNameHref({ encounterId: "enc-2", status: "CLOSED", workflowState: "CLOSED" })
    ).toBe(emergencyChartPath("enc-2"));
  });

  it("does not treat SIGNED documentation status as CLOSED", () => {
    expect(
      resolveEdBoardPatientNameHref({ encounterId: "enc-3", status: "SIGNED", workflowState: "IN_TREATMENT" })
    ).toBe(emergencyActiveWorkspacePath("enc-3"));
  });
});
