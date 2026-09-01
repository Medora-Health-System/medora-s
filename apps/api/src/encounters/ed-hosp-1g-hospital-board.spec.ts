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

  it("GET dashboard and GET placement queue remain read-only", () => {
    expect(controller).not.toContain("reconcileActorUserId");
    expect(controller).not.toContain("reconcileSignedHospitalBoundDecisions");
    const listStart = placement.indexOf("async listFacilityQueue");
    const listEnd = placement.indexOf("async getActiveForEncounter");
    expect(listStart).toBeGreaterThan(-1);
    expect(listEnd).toBeGreaterThan(listStart);
    expect(placement.slice(listStart, listEnd)).not.toContain("reconcileSignedHospitalBoundDecisions");
    expect(placementHttp).not.toMatch(
      /@Get\("internal-placement"\)[\s\S]{0,800}reconcileActorUserId/
    );
  });

  it("exposes ADMIN-only explicit reconcile POST", () => {
    expect(placementHttp).toContain('@Post("internal-placement/reconcile-signed-decisions")');
    expect(placementHttp).toMatch(
      /@Post\("internal-placement\/reconcile-signed-decisions"\)\s+@RequireRoles\(RoleCode\.ADMIN\)/
    );
  });
});
