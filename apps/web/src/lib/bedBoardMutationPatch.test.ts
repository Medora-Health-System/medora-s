import { describe, expect, it } from "vitest";
import {
  applyBedBoardStatusPatch,
  extractOperationalOverlaysFromBedBoard,
  mergeBedBoardRoomUpdate,
  rebuildFacilityBedBoardUnitFromEncounters,
} from "./bedBoardMutationPatch";
import type { FacilityBedBoardBedRow, FacilityBedBoardResponse } from "./bedBoardApi";

function sampleBoard(status: FacilityBedBoardBedRow["status"] = "AVAILABLE"): FacilityBedBoardResponse {
  const bed: FacilityBedBoardBedRow = {
    bedKey: "ED|1",
    display: "ED-1",
    storageKey: "ED|1",
    displayKey: "ED-1",
    room: "1",
    unitCode: "ED",
    unit: "ED",
    status,
    statusSource: "derived",
    occupantEncounterId: null,
    occupantPatientName: null,
    patientDisplay: null,
    occupantMrn: null,
    reasonCode: null,
    reasonText: null,
    updatedAt: null,
  };
  return {
    facilityId: "fac-1",
    generatedAt: "2026-06-03T10:00:00.000Z",
    units: [
      {
        unit: "ED",
        unitCode: "ED",
        summary: {
          occupied: 0,
          available: 1,
          blocked: 0,
          reserved: 0,
          cleaning: 0,
          dirty: 0,
          transferPending: 0,
          dischargePending: 0,
        },
        beds: [bed],
      },
    ],
  };
}

describe("bedBoardMutationPatch", () => {
  it("applyBedBoardStatusPatch updates tile status immediately", () => {
    const board = sampleBoard("AVAILABLE");
    const updated = applyBedBoardStatusPatch(board, {
      ...board.units[0]!.beds[0]!,
      status: "DIRTY",
      statusSource: "operational",
      updatedAt: "2026-06-03T10:05:00.000Z",
    });
    expect(updated.units[0]?.beds[0]?.status).toBe("DIRTY");
    expect(updated.units[0]?.summary.dirty).toBe(1);
    expect(updated.units[0]?.summary.available).toBe(0);
  });

  it("applyBedBoardStatusPatch updates cleaning and blocked counters", () => {
    const dirty = applyBedBoardStatusPatch(sampleBoard("DIRTY"), {
      ...sampleBoard("DIRTY").units[0]!.beds[0]!,
      status: "CLEANING",
      statusSource: "operational",
    });
    expect(dirty.units[0]?.summary.dirty).toBe(0);
    expect(dirty.units[0]?.summary.cleaning).toBe(1);

    const blocked = applyBedBoardStatusPatch(sampleBoard("AVAILABLE"), {
      ...sampleBoard("AVAILABLE").units[0]!.beds[0]!,
      status: "BLOCKED",
      statusSource: "operational",
    });
    expect(blocked.units[0]?.summary.blocked).toBe(1);
  });

  it("extractOperationalOverlaysFromBedBoard preserves housekeeping overlays", () => {
    const board = applyBedBoardStatusPatch(sampleBoard("AVAILABLE"), {
      ...sampleBoard("AVAILABLE").units[0]!.beds[0]!,
      status: "RESERVED",
      statusSource: "operational",
      reasonText: "Hold",
    });
    const overlays = extractOperationalOverlaysFromBedBoard(board);
    expect(overlays.get("ED|1")?.status).toBe("RESERVED");
    expect(overlays.get("ED|1")?.reasonText).toBe("Hold");
  });

  it("rebuildFacilityBedBoardUnitFromEncounters marks occupied bed from encounter rows", () => {
    const rebuilt = rebuildFacilityBedBoardUnitFromEncounters({
      facilityId: "fac-1",
      unit: "ED",
      previousBoard: sampleBoard("AVAILABLE"),
      encounters: [
        {
          id: "enc-1",
          roomLabel: "ED-1",
          type: "EMERGENCY",
          patient: { firstName: "Jean", lastName: "Test" },
        },
      ],
    });
    expect(rebuilt?.units[0]?.beds[0]?.status).toBe("OCCUPIED");
    expect(rebuilt?.units[0]?.beds[0]?.occupantEncounterId).toBe("enc-1");
    expect(rebuilt?.units[0]?.summary.occupied).toBe(1);
  });

  it("mergeBedBoardRoomUpdate returns refreshed bed index", () => {
    const board = sampleBoard("AVAILABLE");
    const { board: nextBoard, bedIndex } = mergeBedBoardRoomUpdate({
      board,
      bedIndex: new Map(),
      facilityId: "fac-1",
      unit: "ED",
      encounters: [
        {
          id: "enc-2",
          roomLabel: "ED-1",
          type: "EMERGENCY",
          patient: { firstName: "Marie", lastName: "Dupont" },
        },
      ],
    });
    expect(nextBoard?.units[0]?.beds[0]?.occupantEncounterId).toBe("enc-2");
    const bedKey = nextBoard?.units[0]?.beds[0]?.bedKey;
    expect(bedKey).toBeTruthy();
    expect(bedIndex.get(bedKey!)?.occupantEncounterId).toBe("enc-2");
  });
});
