import { resolveAuthorizedFacilityId } from "./request-facility";

describe("resolveAuthorizedFacilityId", () => {
  it("prefers the RolesGuard-authorized facility over a stale JWT or spoofed header", () => {
    expect(
      resolveAuthorizedFacilityId({
        facilityId: "facility-a",
        user: { facilityId: "facility-stale" },
        headers: { "x-facility-id": "facility-b" },
      }),
    ).toBe("facility-a");
  });

  it("uses the explicit UI header when the guard has not bound request.facilityId", () => {
    expect(
      resolveAuthorizedFacilityId({
        user: {},
        headers: { "x-facility-id": "facility-ui" },
      }),
    ).toBe("facility-ui");
  });
});
