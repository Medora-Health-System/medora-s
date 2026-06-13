import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  requestorMayPerformEnterpriseProcedureAction,
  resolveProcedureExecutionProfile,
} from "@medora/shared";

const panelSource = readFileSync(
  join(import.meta.dirname, "EmergencyErOrdersPanel.tsx"),
  "utf8"
);

describe("EmergencyErOrdersPanel technician procedure governance (MEDUI.ED.PROCEDURE.TECH.1)", () => {
  it("uses facility-scoped enterprise procedure action helper", () => {
    expect(panelSource).toContain("requestorMayPerformEnterpriseProcedureAction");
    expect(panelSource).toContain("facilityType");
  });

  it("start button uses start permission not acknowledge fallback", () => {
    expect(panelSource).toContain('deptOkStart && itemStatusAllowsStart(st)');
  });

  it("LAB EKG workflow allowed at freestanding ER in shared governance", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "ekg_ecg" });
    expect(
      requestorMayPerformEnterpriseProcedureAction({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        enterpriseProcedureId: "ekg_ecg",
        profile,
        action: "acknowledge",
      })
    ).toBe(true);
    expect(
      requestorMayPerformEnterpriseProcedureAction({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        enterpriseProcedureId: "ekg_ecg",
        profile,
        action: "start",
      })
    ).toBe(true);
    expect(
      requestorMayPerformEnterpriseProcedureAction({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        enterpriseProcedureId: "ekg_ecg",
        profile,
        action: "complete",
      })
    ).toBe(true);
  });

  it("LAB blocked from foley at freestanding ER", () => {
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId: "foley_catheter" });
    expect(
      requestorMayPerformEnterpriseProcedureAction({
        roleCodes: ["LAB"],
        facilityType: "FREESTANDING_ER",
        enterpriseProcedureId: "foley_catheter",
        profile,
        action: "complete",
      })
    ).toBe(false);
  });
});
