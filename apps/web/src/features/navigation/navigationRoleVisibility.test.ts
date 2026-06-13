import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import {
  filterSidebarNavItemsByNavigationAreas,
  navigationVisibilityUsesSharedResolver,
} from "./navigationVisibility";

describe("navigationRoleVisibility (MEDUI.NAV.ROLE.1)", () => {
  it("uses shared navigation resolver", () => {
    expect(navigationVisibilityUsesSharedResolver()).toBe(true);
  });

  it("preserves full navigation config registry", () => {
    expect(SIDEBAR_NAV_ITEMS.length).toBeGreaterThan(20);
    expect(SIDEBAR_NAV_ITEMS.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
    expect(SIDEBAR_NAV_ITEMS.some((item) => item.href === "/app/lab-worklist")).toBe(true);
  });

  it("tags clinical menu entries with navAreas", () => {
    const emergency = SIDEBAR_NAV_ITEMS.find((item) => item.href === "/app/emergency/trackboard");
    const hospital = SIDEBAR_NAV_ITEMS.find((item) => item.href === "/app/hospitalisation");
    expect(emergency?.navAreas).toContain("EMERGENCY");
    expect(hospital?.navAreas).toContain("HOSPITAL");
  });

  it("hides emergency and laboratory for ICU technician profile", () => {
    const filtered = filterSidebarNavItemsByNavigationAreas(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      prismaDepartmentCode: "INPATIENT",
    });
    const hrefs = filtered.map((item) => item.href);
    expect(hrefs).toContain("/app/trackboard");
    expect(hrefs).toContain("/app/hospitalisation");
    expect(hrefs).not.toContain("/app/emergency/trackboard");
    expect(hrefs).not.toContain("/app/lab-worklist");
    expect(hrefs).not.toContain("/app/pharmacy");
  });

  it("shows emergency for ED technician without explicit department", () => {
    const filtered = filterSidebarNavItemsByNavigationAreas(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
    });
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(false);
  });

  it("shows laboratory queue for lab department assignment", () => {
    const filtered = filterSidebarNavItemsByNavigationAreas(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LAB",
    });
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(false);
  });

  it("leaves MSPP entries without navAreas visible through role filter path", () => {
    const msppItem = SIDEBAR_NAV_ITEMS.find((item) => item.href === "/app/mspp/dashboard");
    expect(msppItem?.navAreas).toBeUndefined();
  });
});
