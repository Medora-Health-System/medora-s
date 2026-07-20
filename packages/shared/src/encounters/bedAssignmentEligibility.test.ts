import { describe, expect, it } from "vitest";
import { ED_CANONICAL_WAITING_ROOM_LABEL } from "./edRoomLabel.js";
import {
  isEligibleForTreatmentBedAssignment,
  selectTreatmentBedAssignmentCandidates,
} from "./bedAssignmentEligibility.js";

describe("bedAssignmentEligibility", () => {
  it("includes open ED encounter in Waiting Room", () => {
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e1",
        status: "OPEN",
        facilityId: "fac-a",
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
      })
    ).toBe(true);
  });

  it("includes open encounter with null/empty treatment-room assignment", () => {
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e2",
        status: "OPEN",
        roomLabel: null,
        type: "EMERGENCY",
      })
    ).toBe(true);
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e3",
        status: "OPEN",
        roomLabel: "  ",
        type: "EMERGENCY",
      })
    ).toBe(true);
  });

  it("excludes patient already assigned to an occupied ED room", () => {
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e4",
        status: "OPEN",
        roomLabel: "1",
        type: "EMERGENCY",
      })
    ).toBe(false);
  });

  it("excludes discharged and cancelled encounters", () => {
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e5",
        status: "DISCHARGED",
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
      })
    ).toBe(false);
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e6",
        status: "CANCELLED",
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
      })
    ).toBe(false);
  });

  it("excludes cross-facility encounters when facility scope is set", () => {
    expect(
      isEligibleForTreatmentBedAssignment(
        {
          id: "e7",
          status: "OPEN",
          facilityId: "fac-b",
          roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
          type: "EMERGENCY",
        },
        { facilityId: "fac-a" }
      )
    ).toBe(false);
  });

  it("does not treat waiting-room location as a treatment-room assignment", () => {
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e8",
        status: "OPEN",
        roomLabel: "Waiting room",
        type: "EMERGENCY",
      })
    ).toBe(true);
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e9",
        status: "OPEN",
        roomLabel: "Salle d'attente",
        type: "EMERGENCY",
      })
    ).toBe(true);
  });

  it("returns each encounter only once when history duplicates appear in the list", () => {
    const rows = [
      {
        id: "e10",
        status: "OPEN",
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
      },
      {
        id: "e10",
        status: "OPEN",
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
      },
      {
        id: "e11",
        status: "OPEN",
        roomLabel: "3",
        type: "EMERGENCY",
      },
    ];
    const selected = selectTreatmentBedAssignmentCandidates(rows);
    expect(selected.map((r) => r.id)).toEqual(["e10"]);
  });

  it("keeps eligibility when prior movements left a waiting-room label", () => {
    expect(
      isEligibleForTreatmentBedAssignment({
        id: "e12",
        status: "OPEN",
        roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL,
        type: "EMERGENCY",
      })
    ).toBe(true);
  });
});
