import { describe, expect, it } from "vitest";
import {
  filterSidebarNavItemsByNavigationAreas,
  filterSidebarNavItemsForSession,
} from "@/features/navigation/navigationVisibility";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";

const freestandingErProfile = {
  facilityType: "FREESTANDING_ER" as const,
};

describe("facility navigation visibility (MEDUI.OBS.TECH.1 + MEDUI.FSER.ROLE.1)", () => {
  it("freestanding ER lab tech menu includes emergency, observation, and laboratory", () => {
    const profile = {
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LABORATORY",
      ...freestandingErProfile,
    };
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      profile,
    });
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
    const observationItem = filtered.find((item) => item.href === "/app/hospitalisation");
    expect(observationItem?.label).toBe("nav.observation");
  });

  it("freestanding ER rad tech menu includes emergency, observation, and radiology", () => {
    const profile = {
      roleCodes: ["RADIOLOGY"],
      prismaDepartmentCode: "RADIOLOGY",
      ...freestandingErProfile,
    };
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RADIOLOGY"],
      profile,
    });
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
    const observationItem = filtered.find((item) => item.href === "/app/hospitalisation");
    expect(observationItem?.label).toBe("nav.observation");
  });

  it("freestanding ER dual lab/rad tech sees emergency, observation, laboratory, and radiology", () => {
    const profile = {
      roleCodes: ["LAB", "RADIOLOGY"],
      prismaDepartmentCode: "LABORATORY",
      ...freestandingErProfile,
    };
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB", "RADIOLOGY"],
      profile,
    });
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(true);
  });

  it("outside lab user sees lab worklist only", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      profile: {
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LAB",
        facilityType: "OUTSIDE_LABORATORY",
      },
    });
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(false);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(false);
  });

  it("nav-area filter alone would show observation but role gate hides it without LAB/RAD on item", () => {
    const profile = {
      roleCodes: ["LAB"],
      prismaDepartmentCode: "LABORATORY",
      ...freestandingErProfile,
    };
    const navAreasOnly = filterSidebarNavItemsByNavigationAreas(SIDEBAR_NAV_ITEMS, profile);
    expect(navAreasOnly.some((item) => item.href === "/app/hospitalisation")).toBe(true);
  });

  it("freestanding ER RN sidebar includes registration, emergency, triage, lab, and observation", () => {
    const profile = {
      roleCodes: ["RN"],
      prismaDepartmentCode: "EMERGENCY",
      ...freestandingErProfile,
      facilityServiceLines: null,
    };
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RN"],
      profile,
    });
    expect(filtered.some((item) => item.href === "/app/registration")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/triage")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(false);
  });

  it("freestanding ER provider sidebar includes registration, emergency, triage, lab, and observation", () => {
    const profile = {
      roleCodes: ["PROVIDER"],
      prismaDepartmentCode: "EMERGENCY",
      ...freestandingErProfile,
      facilityServiceLines: null,
    };
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["PROVIDER"],
      profile,
    });
    expect(filtered.some((item) => item.href === "/app/registration")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/triage")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(false);
  });

  it("radiology role still sees radiology worklist at freestanding ER", () => {
    const profile = {
      roleCodes: ["RADIOLOGY"],
      prismaDepartmentCode: "RADIOLOGY",
      ...freestandingErProfile,
    };
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RADIOLOGY"],
      profile,
    });
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(true);
  });

  it("freestanding ER RN does not see hospital trackboard, nursing, or provider pages (MEDUI.ED.PROCEDURE.TECH.1A)", () => {
    const profile = {
      roleCodes: ["RN"],
      prismaDepartmentCode: "EMERGENCY",
      ...freestandingErProfile,
      facilityServiceLines: null,
    };
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RN"],
      profile,
    });
    expect(filtered.some((item) => item.href === "/app/trackboard")).toBe(false);
    expect(filtered.some((item) => item.href === "/app/nursing")).toBe(false);
    expect(filtered.some((item) => item.href === "/app/provider")).toBe(false);
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(false);
  });

  it("hospital RN still sees nursing dashboard (MEDUI.ED.PROCEDURE.TECH.1A)", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RN"],
      profile: {
        roleCodes: ["RN"],
        prismaDepartmentCode: "EMERGENCY",
        facilityType: "HOSPITAL",
        facilityServiceLines: null,
      },
    });
    expect(filtered.some((item) => item.href === "/app/nursing")).toBe(true);
  });
});
