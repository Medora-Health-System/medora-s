import { resolveMarAssignedNurseFilter } from "./mar-assigned-nurse-query.util";

describe("resolveMarAssignedNurseFilter", () => {
  it("ignores assignedToUserId when encounterId is present", () => {
    expect(
      resolveMarAssignedNurseFilter({
        encounterId: "enc-1",
        assignedToUserId: "nurse-other",
      })
    ).toBeUndefined();
  });

  it("keeps assignedToUserId for facility-wide boards without encounterId", () => {
    expect(
      resolveMarAssignedNurseFilter({
        assignedToUserId: "nurse-1",
      })
    ).toBe("nurse-1");
  });

  it("returns undefined when neither filter applies", () => {
    expect(resolveMarAssignedNurseFilter({})).toBeUndefined();
  });
});
