import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { filterHospitalUnitsForPlacementDestination } from "./hospitalCareUnitsApi";
import {
  acceptingProviderFieldsForTransition,
  assignBedSelectionReady,
  canAcceptPlacement,
  canEditPlacementAssignment,
  canRunPlacementWorkspaceAction,
  isAcceptingProviderEditable,
  isBedSelectorEnabled,
  isRoomSelectorEnabled,
  isUnitSelectorEnabled,
  placementEditorMode,
  placementReadOnlyProviderLine,
  placementTransitionErrorKind,
  primaryActionLabelKey,
  shouldAutoSelectSoleEligibleUnit,
} from "./placementWorkspaceEditor";

describe("ED.HOSP.1G.3 placement workspace bed editor", () => {
  it("ADMIN REQUESTED: Accept visible, selectors disabled until ACCEPTED", () => {
    expect(canAcceptPlacement(["ADMIN"], "REQUESTED")).toBe(true);
    expect(isUnitSelectorEnabled({ roles: ["ADMIN"], status: "REQUESTED" })).toBe(false);
    expect(isRoomSelectorEnabled({ roles: ["ADMIN"], status: "REQUESTED", unitCode: "OBS" })).toBe(
      false
    );
    expect(isBedSelectorEnabled({ roles: ["ADMIN"], status: "REQUESTED", roomKey: "1" })).toBe(
      false
    );
    expect(isAcceptingProviderEditable({ roles: ["ADMIN"], status: "REQUESTED" })).toBe(false);
    expect(placementEditorMode("REQUESTED")).toBe("awaiting_acceptance");
  });

  it("ADMIN ACCEPTED: unit enabled; room after unit; bed after room; Assign bed with valid selection", () => {
    expect(canEditPlacementAssignment(["ADMIN"], "ACCEPTED")).toBe(true);
    expect(isUnitSelectorEnabled({ roles: ["ADMIN"], status: "ACCEPTED" })).toBe(true);
    expect(isRoomSelectorEnabled({ roles: ["ADMIN"], status: "ACCEPTED", unitCode: "" })).toBe(
      false
    );
    expect(isRoomSelectorEnabled({ roles: ["ADMIN"], status: "ACCEPTED", unitCode: "OBS" })).toBe(
      true
    );
    expect(isBedSelectorEnabled({ roles: ["ADMIN"], status: "ACCEPTED", roomKey: "" })).toBe(false);
    expect(isBedSelectorEnabled({ roles: ["ADMIN"], status: "ACCEPTED", roomKey: "1" })).toBe(
      true
    );
    expect(
      assignBedSelectionReady({
        unitCode: "OBS",
        roomKey: "1",
        bedKey: "OBS:1",
        roomHasBeds: true,
        selectedBedOccupied: false,
      })
    ).toBe(true);
    expect(
      assignBedSelectionReady({
        unitCode: "OBS",
        roomKey: "1",
        bedKey: "",
        roomHasBeds: true,
        selectedBedOccupied: false,
      })
    ).toBe(false);
  });

  it("RN REQUESTED has no Accept; RN ACCEPTED has no editable assignment controls", () => {
    expect(canAcceptPlacement(["RN"], "REQUESTED")).toBe(false);
    expect(canEditPlacementAssignment(["RN"], "ACCEPTED")).toBe(false);
    expect(isUnitSelectorEnabled({ roles: ["RN"], status: "ACCEPTED" })).toBe(false);
    expect(isAcceptingProviderEditable({ roles: ["RN"], status: "ACCEPTED" })).toBe(false);
  });

  it("BED_ASSIGNED assignment is read-only", () => {
    expect(placementEditorMode("BED_ASSIGNED")).toBe("assigned");
    expect(canEditPlacementAssignment(["ADMIN"], "BED_ASSIGNED")).toBe(false);
    expect(isUnitSelectorEnabled({ roles: ["ADMIN"], status: "BED_ASSIGNED" })).toBe(false);
  });

  it("Observation units are observation-capable only; Admission inpatient-capable only", () => {
    const units = [
      {
        id: "1",
        code: "OBS",
        name: "Observation Unit",
        unitType: "OBSERVATION",
        levelOfCare: "OBS",
        specialty: null,
        active: true,
        acceptsInpatient: false,
        acceptsObservation: true,
        developmentOnly: false,
        patientCount: 0,
        occupiedBedCount: 0,
        availableBedCount: 9,
        alertCount: 0,
        rooms: [],
        physicalLocationHint: null,
      },
      {
        id: "2",
        code: "MS",
        name: "Medical/Surgical",
        unitType: "MS",
        levelOfCare: "MS",
        specialty: null,
        active: true,
        acceptsInpatient: true,
        acceptsObservation: false,
        developmentOnly: false,
        patientCount: 0,
        occupiedBedCount: 0,
        availableBedCount: 4,
        alertCount: 0,
        rooms: [],
        physicalLocationHint: null,
      },
    ];
    expect(filterHospitalUnitsForPlacementDestination(units, "OBSERVATION").map((u) => u.code)).toEqual([
      "OBS",
    ]);
    expect(filterHospitalUnitsForPlacementDestination(units, "INPATIENT").map((u) => u.code)).toEqual([
      "MS",
    ]);
  });

  it("occupied bed cannot be selected for assignment", () => {
    expect(
      assignBedSelectionReady({
        unitCode: "OBS",
        roomKey: "1",
        bedKey: "OBS:2",
        roomHasBeds: true,
        selectedBedOccupied: true,
      })
    ).toBe(false);
  });

  it("stale-bed race maps to a truthful clinical error", () => {
    expect(
      placementTransitionErrorKind({ status: 409, message: "Selected bed is no longer available" }, "ASSIGN_BED")
    ).toBe("bedTaken");
    expect(
      placementTransitionErrorKind({ status: 409, message: "Placement request version conflict" }, "ASSIGN_BED")
    ).toBe("stale");
    expect(placementTransitionErrorKind({ status: 403 }, "ASSIGN_BED")).toBe("noPermissionAssign");
    expect(placementTransitionErrorKind({ status: 403 }, "ACCEPT")).toBe("noPermissionAccept");
  });

  it("auto-selects a sole eligible unit only after ACCEPT, never a bed", () => {
    expect(
      shouldAutoSelectSoleEligibleUnit({
        roles: ["ADMIN"],
        status: "ACCEPTED",
        currentUnitCode: "",
        eligibleUnitCount: 1,
      })
    ).toBe(true);
    expect(
      shouldAutoSelectSoleEligibleUnit({
        roles: ["ADMIN"],
        status: "REQUESTED",
        currentUnitCode: "",
        eligibleUnitCount: 1,
      })
    ).toBe(false);
    expect(
      shouldAutoSelectSoleEligibleUnit({
        roles: ["ADMIN"],
        status: "ACCEPTED",
        currentUnitCode: "",
        eligibleUnitCount: 2,
      })
    ).toBe(false);
  });

  it("workspace renders awaiting-acceptance copy instead of disabled REQUESTED editors", () => {
    const ws = readFileSync(join(__dirname, "HospitalCarePlacementWorkspaceView.tsx"), "utf8");
    expect(ws).toContain("placementSectionHeadingKey");
    expect(ws).toContain("canEditPlacementAssignment");
    expect(ws).toContain("placement-workspace-assignment-readonly");
    expect(ws).not.toContain("Avancer le placement");
    expect(ws).not.toContain("disabled={!canEditBeds}");
    expect(ws).toContain("placement-workspace-awaiting-acceptance");
    expect(ws).toContain("admittingProvider");
    expect(ws).toContain("acceptingProviderFieldsForTransition");
  });

  it("PROVIDER has no placement mutation controls", () => {
    expect(canAcceptPlacement(["PROVIDER"], "REQUESTED")).toBe(false);
    expect(canEditPlacementAssignment(["PROVIDER"], "ACCEPTED")).toBe(false);
    expect(isUnitSelectorEnabled({ roles: ["PROVIDER"], status: "ACCEPTED" })).toBe(false);
    expect(canRunPlacementWorkspaceAction("ACCEPT", ["PROVIDER"])).toBe(false);
    expect(canRunPlacementWorkspaceAction("ASSIGN_BED", ["PROVIDER"])).toBe(false);
    expect(canRunPlacementWorkspaceAction("MARK_READY", ["PROVIDER"])).toBe(false);
  });

  it("RN BED_ASSIGNED can mark ready and cannot edit assignment", () => {
    expect(canEditPlacementAssignment(["RN"], "BED_ASSIGNED")).toBe(false);
    expect(canRunPlacementWorkspaceAction("ASSIGN_BED", ["RN"])).toBe(false);
    expect(canRunPlacementWorkspaceAction("ACCEPT", ["RN"])).toBe(false);
    expect(canRunPlacementWorkspaceAction("MARK_READY", ["RN"])).toBe(true);
    expect(primaryActionLabelKey("MARK_READY")).toBe("readyForTransfer");
  });

  it("does not label an ED responsible physician as hospital accepting provider", () => {
    expect(
      placementReadOnlyProviderLine({
        acceptingProviderUserId: null,
        acceptingProviderNameSnapshot: "Rajnil Shah",
        responsiblePhysicianName: "Rajnil Shah",
      })
    ).toEqual({ kind: "admitting", name: "Rajnil Shah" });
    expect(
      placementReadOnlyProviderLine({
        acceptingProviderUserId: "user-1",
        acceptingProviderNameSnapshot: "Hospital MD",
        responsiblePhysicianName: "Rajnil Shah",
      })
    ).toEqual({ kind: "accepting", name: "Hospital MD" });
    expect(
      acceptingProviderFieldsForTransition({
        acceptingProviderUserId: null,
        acceptingProviderName: "Rajnil Shah",
      })
    ).toEqual({});
  });
});
