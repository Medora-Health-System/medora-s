import {
  resolveAuthorizedFacilityId,
  resolveRequestedFacilityId,
} from "./request-facility";

describe("resolveRequestedFacilityId", () => {
  it("CASE B: lets an authorized Facility B header override a stale Facility A JWT", () => {
    expect(
      resolveRequestedFacilityId({
        userFacilityId: "facility-a",
        headerFacilityId: "facility-b",
      }),
    ).toBe("facility-b");
  });

  it("CASE A: falls back to the JWT facility when no explicit header exists", () => {
    expect(
      resolveRequestedFacilityId({
        userFacilityId: "facility-a",
        headerFacilityId: undefined,
      }),
    ).toBe("facility-a");
    expect(
      resolveRequestedFacilityId({
        userFacilityId: "facility-a",
        headerFacilityId: "  ",
      }),
    ).toBe("facility-a");
  });
});

describe("resolveAuthorizedFacilityId", () => {
  it("prefers the RolesGuard-authorized facility over a stale JWT or spoofed header", () => {
    expect(
      resolveAuthorizedFacilityId({
        facilityId: "facility-b",
        user: { facilityId: "facility-a" },
        headers: { "x-facility-id": "facility-spoofed" },
      }),
    ).toBe("facility-b");
  });

  it("does not independently trust an unvalidated UI header", () => {
    expect(
      resolveAuthorizedFacilityId({
        user: {},
        headers: { "x-facility-id": "facility-ui" },
      }),
    ).toBeUndefined();
  });

  it("uses the JWT facility only after the guard has copied it onto the request user", () => {
    expect(
      resolveAuthorizedFacilityId({
        user: { facilityId: "facility-jwt" },
        headers: {},
      }),
    ).toBe("facility-jwt");
  });
});
