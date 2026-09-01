import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ED.HOSP.1G hospital-care connection (no new board)", () => {
  const controller = readFileSync(join(__dirname, "hospital-care.controller.ts"), "utf8");
  const placement = readFileSync(join(__dirname, "internal-placement.service.ts"), "utf8");
  const placementHttp = readFileSync(join(__dirname, "internal-placement.controller.ts"), "utf8");

  it("reuses JWT-scoped hospital-care dashboard and existing placement queue", () => {
    expect(controller).toContain("facilityIdFromReq");
    expect(controller).toContain("listFacilityQueue");
    expect(controller).toContain("getHospitalCensus");
    expect(controller).not.toMatch("/incoming");
    expect(controller).not.toMatch("IncomingHospital");
  });

  it("does not add a second placement list or census query", () => {
    expect(placement).toContain("listFacilityQueue");
    expect(placement).toContain("facilityId");
  });

  it("maps JWT facilityRoles for existing placement transitions", () => {
    expect(placementHttp).toContain("facilityRoles");
    expect(placementHttp).toContain("x-facility-id");
    expect(placementHttp).not.toMatch("IncomingHospital");
  });
});
