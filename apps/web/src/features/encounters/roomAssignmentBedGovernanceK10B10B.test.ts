import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOM_ALREADY_OCCUPIED_CODE } from "@medora/shared";
import {
  parseRoomOccupancyApiError,
  buildEdRoomOccupancyConfirmPayload,
} from "../../lib/edRoomAssignment";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("room assignment bed governance (K.10B.10B web)", () => {
  it("frontend recognizes ROOM_ALREADY_OCCUPIED from API error body", () => {
    const conflict = parseRoomOccupancyApiError({
      status: 409,
      body: {
        code: ROOM_ALREADY_OCCUPIED_CODE,
        occupiedRoom: "ED-2",
        occupiedByEncounterId: "enc-other",
        occupiedByPatientName: "Marie Martin",
        requestedRoom: "2",
        suggestedRoom: "2A",
      },
    });
    expect(conflict).not.toBeNull();
    expect(conflict?.occupiedRoom).toBe("ED-2");
    expect(conflict?.occupyingEncounterId).toBe("enc-other");
  });

  it("modal displays occupancy conflict message via i18n key", () => {
    const modal = readSrc("components/encounters/EdRoomOccupancyConfirmModal.tsx");
    expect(modal).toContain("roomAssignment.occupancyConflictBody");
    expect(modal).toContain("{occupiedRoom}");
    const assignmentModal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(assignmentModal).toContain("parseRoomOccupancyApiError");
    expect(assignmentModal).toContain("EdRoomOccupancyConfirmModal");
  });

  it("confirm override resubmits with confirmOccupiedRoomAssignment true", () => {
    const payload = buildEdRoomOccupancyConfirmPayload({
      occupyingEncounterId: "enc-other",
      requestedRoom: "2",
      suggestedRoom: "2",
      occupiedRoom: "MS-2",
    });
    expect(payload.confirmOccupiedRoomAssignment).toBe(true);
    expect(payload.roomOccupancyOverride).toEqual({
      requestedRoom: "2",
      acceptedRoom: "2",
    });

    const modal = readSrc("components/encounters/RoomAssignmentModal.tsx");
    expect(modal).toContain("confirmOccupiedRoomAssignment: true");
    expect(modal).toContain("roomOccupancyOverride: payload.roomOccupancyOverride");
  });

  it("room assignment endpoint remains PATCH /encounters/:id/room", () => {
    const api = readSrc("lib/roomAssignmentApi.ts");
    expect(api).toContain("/encounters/${encounterId}/room");
    expect(api).toContain('method: "PATCH"');
  });
});
