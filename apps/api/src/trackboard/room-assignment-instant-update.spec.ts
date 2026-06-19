import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const apiRoot = join(import.meta.dirname, "../..");

function readApi(relativePath: string): string {
  return readFileSync(join(apiRoot, relativePath), "utf8");
}

describe("room-assignment-instant-update API (MEDUI.ED.BEDBOARD.ROOM_MUTATION.2)", () => {
  it("updateRoom persists roomLabel and returns governed display fields", () => {
    const service = readApi("encounters/encounters.service.ts");
    expect(service).toContain("roomLabel: resolvedRoomLabel");
    expect(service).toContain("buildEncounterRoomUpdateResponse(updated)");
    expect(service).toContain("governedRoomDisplay");
  });

  it("bed status overlay is written to audit log and recomposed on GET bed-board", () => {
    const bedBoard = readApi("facilities/facility-bed-board.service.ts");
    expect(bedBoard).toContain("audit.log(AuditAction.UPDATE, FACILITY_BED_ENTITY_TYPE");
    expect(bedBoard).toContain("composeFacilityBedBoard");
    expect(bedBoard).toContain("enrichComposedBedBoardRow(row)");
  });
});
