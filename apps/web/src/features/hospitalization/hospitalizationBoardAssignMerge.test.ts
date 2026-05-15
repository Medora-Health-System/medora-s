import { describe, expect, it } from "vitest";
import type { HospitalisationBoardEncounterRow } from "@/lib/hospitalisationBoardTypes";
import { mergeHospitalisationRowAfterAssign } from "./hospitalizationBoardAssignMerge";

describe("mergeHospitalisationRowAfterAssign", () => {
  const base: HospitalisationBoardEncounterRow = {
    id: "enc-1",
    status: "OPEN",
    createdAt: "2026-01-01T12:00:00.000Z",
    physicianAssignedUserId: null,
    nurseAssignedUserId: null,
    physicianAssigned: null,
    nurseAssigned: null,
  };

  it("returns original row when updated is not an object", () => {
    expect(mergeHospitalisationRowAfterAssign(base, null)).toBe(base);
    expect(mergeHospitalisationRowAfterAssign(base, "x")).toBe(base);
  });

  it("merges physician and nurse assignment fields from API payload", () => {
    const updated = {
      physicianAssignedUserId: "u-md",
      nurseAssignedUserId: "u-rn",
      physicianAssigned: { id: "u-md", firstName: "Ann", lastName: "Lee" },
      nurseAssigned: { id: "u-rn", firstName: "Bob", lastName: "Nguyen" },
    };
    const out = mergeHospitalisationRowAfterAssign(base, updated);
    expect(out.physicianAssignedUserId).toBe("u-md");
    expect(out.nurseAssignedUserId).toBe("u-rn");
    expect(out.physicianAssigned).toEqual(updated.physicianAssigned);
    expect(out.nurseAssigned).toEqual(updated.nurseAssigned);
    expect(out.id).toBe("enc-1");
  });
});
