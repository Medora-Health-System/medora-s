import { describe, expect, it } from "vitest";
import {
  buildGraphicalHospitalUnitTreeV1,
  buildHospitalUnitRegistryV1,
  graphicalHospitalUnitTreeProductionDefaultsAreOff,
  graphicalTreeExcludesRoomBedNodes,
  unitBoardRoute,
} from "@medora/shared";
import {
  INPATIENT_ALL_UNITS_BOARD_PATH,
  inpatientServiceLineBoardPath,
  inpatientUnitBoardPath,
} from "@/features/inpatient-workspace/inpatientUnitBoardPaths";

describe("D3E.6C graphical service-line tree (web)", () => {
  it("builds a graphical tree without room accordion nodes", () => {
    const registry = buildHospitalUnitRegistryV1({
      facilityId: "fac-1",
      placementAvailability: "FEATURE_DISABLED",
      patients: [],
      includeDevelopmentFixtures: false,
    });
    const tree = buildGraphicalHospitalUnitTreeV1(registry);
    expect(tree.isGraphicalTree).toBe(true);
    expect(tree.isVerticalAccordion).toBe(false);
    expect(graphicalTreeExcludesRoomBedNodes(tree)).toBe(true);
    expect(tree.root.route).toBe(INPATIENT_ALL_UNITS_BOARD_PATH);
  });

  it("routes dedicated boards for Medical/Surgical and ICU", () => {
    expect(inpatientUnitBoardPath("ms")).toBe("/app/hospitalisation/inpatient/units/ms");
    expect(unitBoardRoute({ id: "unit-ms", code: "MS", name: "Medical/Surgical" })).toContain(
      "/units/ms"
    );
    expect(inpatientServiceLineBoardPath("critical-care")).toBe(
      "/app/hospitalisation/inpatient/critical-care"
    );
  });

  it("keeps production graphical flags OFF by default", () => {
    expect(graphicalHospitalUnitTreeProductionDefaultsAreOff({})).toBe(true);
  });
});
