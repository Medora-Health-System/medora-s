import { describe, expect, it } from "vitest";
import { filterSidebarNavItemsByNavigationAreas } from "@/features/navigation/navigationVisibility";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";

describe("facility navigation visibility (MEDUI.FACILITY.TYPE.1)", () => {
  it("freestanding ER lab tech nav includes emergency, observation, and laboratory", () => {
    const filtered = filterSidebarNavItemsByNavigationAreas(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LABORATORY",
      facilityType: "FREESTANDING_ER",
    });
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
  });

  it("freestanding ER rad tech nav includes emergency, observation, and radiology", () => {
    const filtered = filterSidebarNavItemsByNavigationAreas(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RADIOLOGY"],
      prismaDepartmentCode: "RADIOLOGY",
      facilityType: "FREESTANDING_ER",
    });
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
  });

  it("outside lab user sees lab worklist only", () => {
    const filtered = filterSidebarNavItemsByNavigationAreas(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LAB",
      facilityType: "OUTSIDE_LABORATORY",
    });
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(false);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(false);
  });
});
