import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "./navigationVisibility";

describe("ADMIN full Medora menu visibility", () => {
  it("shows Digital Care to ADMIN", () => {
    const digitalCare = SIDEBAR_NAV_ITEMS.find((item) => item.href === "/app/digital-care");
    expect(digitalCare?.roles).toContain("ADMIN");
  });

  it("does not profession/department-filter ADMIN navigation", () => {
    const visible = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["ADMIN"],
      profile: {
        roleCodes: ["ADMIN"],
        departmentCode: "ADMINISTRATION",
        professionCodes: ["ADMINISTRATOR"],
        facilityType: "EMERGENCY_ROOM",
      },
    });
    const hrefs = new Set(visible.map((item) => item.href));
    expect(hrefs.has("/app/provider")).toBe(true);
    expect(hrefs.has("/app/digital-care")).toBe(true);
    expect(hrefs.has("/app/lab-worklist")).toBe(true);
    expect(hrefs.has("/app/rad-worklist")).toBe(true);
    expect(hrefs.has("/app/pharmacy")).toBe(true);
    expect(hrefs.has("/app/billing")).toBe(true);
    expect(hrefs.has("/app/admin")).toBe(true);
  });

  it("keeps non-admin role filtering intact", () => {
    const visible = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["FRONT_DESK"],
      profile: { roleCodes: ["FRONT_DESK"], facilityType: "EMERGENCY_ROOM" },
    });
    expect(visible.some((item) => item.href === "/app/digital-care")).toBe(false);
  });
});
