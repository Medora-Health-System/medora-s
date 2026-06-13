import { describe, expect, it } from "vitest";
import { getLandingRouteForNavigationProfile } from "@medora/shared";
import { getLandingRouteForRoles, getRouteGuardRedirect } from "@/lib/landingRoute";

describe("navigationRoleLandingPage (MEDUI.NAV.ROLE.1)", () => {
  it("ED technician lands on emergency trackboard", () => {
    expect(
      getLandingRouteForNavigationProfile({ roleCodes: ["LAB"] })
    ).toBe("/app/emergency/trackboard");
  });

  it("ICU technician lands on hospital board", () => {
    expect(
      getLandingRouteForNavigationProfile({
        roleCodes: ["LAB"],
        prismaDepartmentCode: "INPATIENT",
      })
    ).toBe("/app/hospitalisation");
  });

  it("lab technician lands on laboratory worklist", () => {
    expect(
      getLandingRouteForNavigationProfile({
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LAB",
      })
    ).toBe("/app/lab-worklist");
  });

  it("radiology technician lands on radiology worklist", () => {
    expect(
      getLandingRouteForNavigationProfile({
        roleCodes: ["RADIOLOGY"],
        prismaDepartmentCode: "RAD",
      })
    ).toBe("/app/rad-worklist");
  });

  it("admin lands on dashboard trackboard", () => {
    expect(getLandingRouteForNavigationProfile({ roleCodes: ["ADMIN"] })).toBe("/app/trackboard");
  });

  it("/app redirect uses navigation profile when provided", () => {
    expect(
      getRouteGuardRedirect("/app", ["LAB"], {
        navigationProfile: { roleCodes: ["LAB"], prismaDepartmentCode: "LAB" },
      })
    ).toBe("/app/lab-worklist");
  });

  it("legacy getLandingRouteForRoles without profile keeps LAB role landing", () => {
    expect(getLandingRouteForRoles(["LAB"])).toBe("/app/lab-worklist");
  });
});
