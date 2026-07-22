import { describe, expect, it } from "vitest";
import { enrichComposedBedBoardRow } from "@medora/shared";

describe("bed-status-instant-update API response (MEDUI.ED.BEDBOARD.ROOM_MUTATION.2)", () => {
  it("PATCH bed status response includes storageKey/displayKey aliases GET bed-board uses", () => {
    const row = enrichComposedBedBoardRow({
      bedKey: "ED:4",
      display: "ED-4",
      room: "4",
      unitCode: "ED",
      status: "DIRTY",
      statusSource: "operational",
      occupantEncounterId: null,
      occupantPatientName: null,
      occupantMrn: null,
      occupantAgeYears: null,
      occupantSex: null,
      reasonCode: null,
      reasonText: null,
      updatedAt: "2026-06-03T10:00:00.000Z",
    });
    expect(row.storageKey).toBe("ED:4");
    expect(row.displayKey).toBe("ED-4");
    expect(row.bedKey).toBe(row.storageKey);
  });
});
