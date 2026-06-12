import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildEdRoomOccupancyConfirmPayload,
  checkEdRoomAssignmentConflict,
  isSameNormalizedRoom,
  parseEdRoomOccupiedApiError,
  parseRoomOccupancyApiError,
} from "@/lib/edRoomAssignment";
import { ED_ROOM_OCCUPIED_CODE, ROOM_ALREADY_OCCUPIED_CODE } from "@medora/shared";

vi.mock("@/lib/clinicalWorklistApi", () => ({
  fetchOpenEncounters: vi.fn(),
}));

import { fetchOpenEncounters } from "@/lib/clinicalWorklistApi";

describe("edRoomAssignment — web conflict helper", () => {
  beforeEach(() => {
    vi.mocked(fetchOpenEncounters).mockReset();
  });

  it("returns conflict from open encounters in the same facility", async () => {
    vi.mocked(fetchOpenEncounters).mockResolvedValue([
      { id: "enc-1", facilityId: "fac-a", roomLabel: "4", status: "OPEN" },
    ]);
    const conflict = await checkEdRoomAssignmentConflict("fac-a", "4", "enc-2");
    expect(conflict?.requestedRoom).toBe("4");
    expect(conflict?.suggestedRoom).toBe("4A");
  });

  it("treats unchanged normalized room as same assignment", () => {
    expect(isSameNormalizedRoom("4", "4")).toBe(true);
    expect(isSameNormalizedRoom("4a", "4A")).toBe(true);
    expect(isSameNormalizedRoom("4", "5")).toBe(false);
    expect(isSameNormalizedRoom("WAITING_ROOM", "Salle d'attente")).toBe(true);
  });

  it("parses 409 ROOM_ALREADY_OCCUPIED from api error body", () => {
    const err = Object.assign(new Error("conflict"), {
      status: 409,
      body: {
        code: ROOM_ALREADY_OCCUPIED_CODE,
        occupiedRoom: "ED-4",
        requestedRoom: "4",
        suggestedRoom: "4A",
        occupiedByEncounterId: "enc-1",
      },
    });
    expect(parseRoomOccupancyApiError(err)).toEqual({
      occupyingEncounterId: "enc-1",
      requestedRoom: "4",
      suggestedRoom: "4A",
      occupiedRoom: "ED-4",
      occupiedByPatientName: undefined,
    });
  });

  it("parses legacy 409 ED_ROOM_OCCUPIED from api error body", () => {
    const err = Object.assign(new Error("conflict"), {
      status: 409,
      body: {
        code: ED_ROOM_OCCUPIED_CODE,
        requestedRoom: "4",
        suggestedRoom: "4A",
      },
    });
    expect(parseEdRoomOccupiedApiError(err)).toEqual({
      occupyingEncounterId: "",
      requestedRoom: "4",
      suggestedRoom: "4A",
      occupiedRoom: undefined,
      occupiedByPatientName: undefined,
    });
  });

  it("buildEdRoomOccupancyConfirmPayload sends safe override fields", () => {
    expect(
      buildEdRoomOccupancyConfirmPayload({ occupyingEncounterId: "e1", requestedRoom: "4", suggestedRoom: "4A" })
    ).toEqual({
      roomLabel: "4",
      confirmOccupiedRoomAssignment: true,
      roomOccupancyOverride: { requestedRoom: "4", acceptedRoom: "4A" },
    });
  });
});
