import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { isSidebarNavItemActive } from "@/components/app-shell/appShellNavHelpers";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import {
  HOSPITAL_CARE_FLOOR_BOARD,
  HOSPITAL_CARE_HOME,
  HOSPITAL_CARE_PLACEMENT_QUEUE,
} from "./hospitalCarePaths";
import {
  canAccessHospitalCareSection,
  filterHospitalCareSectionsForRoles,
} from "./hospitalCareSectionAccess";
import { parseFacilityPlacementQueueResponse } from "./hospitalCarePlacementApi";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const FREESTANDING_ER = { facilityType: "FREESTANDING_ER" as const };

function hospitalCareNavLabel(roleCodes: string[], facilityType: "HOSPITAL" | "FREESTANDING_ER") {
  const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
    roleCodes,
    profile: {
      roleCodes,
      prismaDepartmentCode: roleCodes.includes("LAB")
        ? "LABORATORY"
        : roleCodes.includes("RADIOLOGY")
          ? "RADIOLOGY"
          : "EMERGENCY",
      facilityType,
      facilityServiceLines: null,
    },
  });
  return filtered.find((item) => item.href === HOSPITAL_CARE_HOME)?.label ?? null;
}

describe("D3CA.CLOSURE — Hospital Care navigation identity", () => {
  it("LAB uses Hospital Care label (not Observation) for /app/hospitalisation", () => {
    expect(hospitalCareNavLabel(["LAB"], "FREESTANDING_ER")).toBe("nav.hospitalisation");
  });

  it("RADIOLOGY uses Hospital Care label (not Observation) for /app/hospitalisation", () => {
    expect(hospitalCareNavLabel(["RADIOLOGY"], "FREESTANDING_ER")).toBe("nav.hospitalisation");
  });

  it.each([
    ["ADMIN", "HOSPITAL"],
    ["PROVIDER", "HOSPITAL"],
    ["RN", "HOSPITAL"],
    ["LAB", "FREESTANDING_ER"],
    ["RADIOLOGY", "FREESTANDING_ER"],
  ] as const)("%s (%s) sees nav.hospitalisation for Hospital Care home", (role, facilityType) => {
    expect(hospitalCareNavLabel([role], facilityType)).toBe("nav.hospitalisation");
  });

  it("PHARMACY / FRONT_DESK / TRIAGE do not get Hospital Care sidebar entry", () => {
    for (const role of ["PHARMACY", "FRONT_DESK", "BILLING"]) {
      expect(hospitalCareNavLabel([role], "HOSPITAL")).toBeNull();
    }
  });

  it("EN/FR module labels stay Hospital Care / Soins hospitaliers", () => {
    expect(en.nav.hospitalisation).toBe("Hospital Care");
    expect(fr.nav.hospitalisation).toBe("Soins hospitaliers");
    expect(en.hospitalCareD3ca.home.title).toBe("Hospital Care");
    expect(fr.hospitalCareD3ca.home.title).toBe("Soins hospitaliers");
    expect(en.hospitalCareD3ca.home.floorBoardLink).toBe("Floor Board");
    expect(fr.hospitalCareD3ca.home.floorBoardLink).toBe("Tableau des unités");
    expect(en.hospitalTechnicianWorkspace.backBoard).toContain("Floor Board");
    expect(fr.hospitalTechnicianWorkspace.backBoard).toContain("Tableau des unités");
  });

  it("Hospital Care home and floor board routes are distinct", () => {
    expect(HOSPITAL_CARE_HOME).toBe("/app/hospitalisation");
    expect(HOSPITAL_CARE_FLOOR_BOARD).toBe("/app/hospitalisation/floor-board");
    expect(HOSPITAL_CARE_HOME).not.toBe(HOSPITAL_CARE_FLOOR_BOARD);
  });

  it("sidebar marks Hospital Care active on home, sections, and floor board", () => {
    expect(isSidebarNavItemActive(HOSPITAL_CARE_HOME, HOSPITAL_CARE_HOME, true)).toBe(true);
    expect(isSidebarNavItemActive(HOSPITAL_CARE_PLACEMENT_QUEUE, HOSPITAL_CARE_HOME, true)).toBe(
      true
    );
    expect(isSidebarNavItemActive(HOSPITAL_CARE_FLOOR_BOARD, HOSPITAL_CARE_HOME, true)).toBe(true);
    expect(isSidebarNavItemActive("/app/emergency/trackboard", HOSPITAL_CARE_HOME, true)).toBe(
      false
    );
  });
});

describe("D3CA.CLOSURE — section visibility", () => {
  it("LAB cannot open placement queue / admissions; can open observation", () => {
    expect(canAccessHospitalCareSection("placementQueue", ["LAB"])).toBe(false);
    expect(canAccessHospitalCareSection("admissions", ["LAB"])).toBe(false);
    expect(canAccessHospitalCareSection("observation", ["LAB"])).toBe(true);
    expect(canAccessHospitalCareSection("home", ["LAB"])).toBe(true);
  });

  it("PROVIDER can open placement queue and admissions", () => {
    expect(canAccessHospitalCareSection("placementQueue", ["PROVIDER"])).toBe(true);
    expect(canAccessHospitalCareSection("admissions", ["PROVIDER"])).toBe(true);
  });

  it("filters section pills for LAB without placement queue", () => {
    const ids = filterHospitalCareSectionsForRoles(["LAB"]).map((s) => s.id);
    expect(ids).toContain("home");
    expect(ids).toContain("observation");
    expect(ids).not.toContain("placementQueue");
    expect(ids).not.toContain("admissions");
  });
});

describe("D3CA.CLOSURE — feature-OFF placement envelope", () => {
  it("parses FEATURE_DISABLED as deliberate soft-empty (not a patient census)", () => {
    const parsed = parseFacilityPlacementQueueResponse({
      availability: "FEATURE_DISABLED",
      items: [],
    });
    expect(parsed.availability).toBe("FEATURE_DISABLED");
    expect(parsed.items).toEqual([]);
  });

  it("parses ENABLED items", () => {
    const parsed = parseFacilityPlacementQueueResponse({
      availability: "ENABLED",
      items: [{ id: "ipr-1" }],
    });
    expect(parsed.availability).toBe("ENABLED");
    expect(parsed.items).toHaveLength(1);
  });
});

describe("D3CA.CLOSURE — legacy Observation alias removed from sidebar source", () => {
  it("sidebar config keeps nav.hospitalisation for Hospital Care href", () => {
    const item = SIDEBAR_NAV_ITEMS.find((i) => i.href === "/app/hospitalisation");
    expect(item?.label).toBe("nav.hospitalisation");
  });

  it("freestanding ER LAB profile never remaps to nav.observation", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      profile: {
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LABORATORY",
        ...FREESTANDING_ER,
      },
    });
    const labels = filtered.map((i) => i.label);
    expect(labels).not.toContain("nav.observation");
    expect(labels).toContain("nav.hospitalisation");
  });

  it("hospital ADMIN still lands on Hospital Care via HOSPITAL area", () => {
    expect(hospitalCareNavLabel(["ADMIN"], "HOSPITAL")).toBe("nav.hospitalisation");
  });
});
