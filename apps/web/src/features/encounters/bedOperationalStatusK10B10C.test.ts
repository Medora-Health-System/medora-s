import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BED_STATUS_BLOCKS_ASSIGNMENT_CODE } from "@medora/shared";
import {
  formatBedStatusBlocksMessage,
  parseBedStatusBlocksApiError,
} from "../../lib/edRoomAssignment";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("bed operational status governance (K.10B.10C web)", () => {
  it("fetchFacilityBedBoard calls /facilities/:id/bed-board", () => {
    const api = readSrc("lib/bedBoardApi.ts");
    expect(api).toContain("/facilities/${facilityId}/bed-board");
  });

  it("updateFacilityBedStatus calls PATCH beds/:bedKey/status", () => {
    const api = readSrc("lib/bedBoardApi.ts");
    expect(api).toContain("/facilities/${facilityId}/beds/");
    expect(api).toContain('method: "PATCH"');
  });

  it("room assignment modal handles BED_STATUS_BLOCKS_ASSIGNMENT", () => {
    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("parseRoomAssignmentApiError");
    expect(modal).toContain("BedStatusBlocksConfirmModal");
    expect(modal).toContain("confirmBedStatusOverride: true");
  });

  it("confirm override resubmits with confirmBedStatusOverride", () => {
    const parsed = parseBedStatusBlocksApiError({
      status: 409,
      body: {
        code: BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
        bedKey: "ED:2",
        bedDisplay: "ED-2",
        status: "DIRTY",
        reasonCode: "HOUSEKEEPING",
        reasonText: "Room needs cleaning",
      },
    });
    expect(parsed?.bedDisplay).toBe("ED-2");
    const message = formatBedStatusBlocksMessage(parsed!, "en", (key) => {
      if (key === "roomAssignment.bedStatusConflictBody") {
        return "{bedDisplay} is {statusLabel}. Confirm override to continue.";
      }
      if (key === "bedStatus.DIRTY") return "Needs cleaning";
      return key;
    });
    expect(message).toContain("ED-2");
    expect(message).toContain("Needs cleaning");
  });

  it("ED dashboard uses simplified bed status chip labels", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("EdBedStatusChip");
    expect(trackboard).toContain("fetchFacilityBedBoard");
    const display = readSrc("lib/bedStatusDisplay.ts");
    expect(display).toContain("formatEdBedStatusChipLabel");
  });

  it("hospital board uses full bed status chip labels", () => {
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("HospitalBedStatusChip");
    expect(board).toContain("fetchFacilityBedBoard");
    const display = readSrc("lib/bedStatusDisplay.ts");
    expect(display).toContain("formatHospitalBedStatusLabel");
  });

  it("MAR remains governed room display only", () => {
    const timeline = readSrc("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain("governedRoomDisplay");
    expect(timeline).not.toContain("fetchFacilityBedBoard");
  });
});
