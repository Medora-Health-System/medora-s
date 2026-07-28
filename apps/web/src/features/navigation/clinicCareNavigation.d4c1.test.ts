import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import { CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS } from "@medora/shared";

describe("MEDUI.D4C.1 clinic care navigation visibility", () => {
  it("shows Clinic Care and hides ED/Hospital for clinic Admin (MEDUI.D4C.2A)", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["ADMIN"],
      profile: {
        roleCodes: ["ADMIN"],
        facilityType: "CLINIC",
        facilityServiceLines: null,
      },
    });
    const hrefs = filtered.map((item) => item.href);
    expect(hrefs).toContain("/app/clinic-care");
    expect(hrefs).not.toContain("/app/emergency/trackboard");
    expect(hrefs).not.toContain("/app/hospitalisation");
  });

  it("shows Clinic Care and hides ED/Hospital for clinic RN", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RN"],
      profile: {
        roleCodes: ["RN"],
        facilityType: "CLINIC",
        facilityServiceLines: null,
      },
    });
    const hrefs = filtered.map((item) => item.href);
    expect(hrefs).toContain("/app/clinic-care");
    expect(hrefs).toContain("/app/registration");
    expect(hrefs).not.toContain("/app/emergency/trackboard");
    expect(hrefs).not.toContain("/app/hospitalisation");
  });

  it("shows Clinic Care and Lab for authorized lab technician at Clinic", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["LAB"],
      profile: {
        roleCodes: ["LAB"],
        prismaDepartmentCode: "LAB",
        facilityType: "CLINIC",
        facilityServiceLines: null,
      },
    });
    expect(filtered.some((item) => item.href === "/app/clinic-care")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/lab-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(false);
  });

  it("shows Clinic Care for patient-care technician at Clinic", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["PATIENT_CARE_TECH"],
      profile: {
        roleCodes: ["PATIENT_CARE_TECH"],
        prismaDepartmentCode: "PRIMARY_CARE",
        facilityType: "CLINIC",
        facilityServiceLines: null,
      },
    });
    expect(filtered.some((item) => item.href === "/app/clinic-care")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(false);
    expect(filtered.some((item) => item.href === "/app/hospitalisation")).toBe(false);
  });

  it("shows Clinic Care and Radiology for authorized rad technician at Urgent Care", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RADIOLOGY"],
      profile: {
        roleCodes: ["RADIOLOGY"],
        prismaDepartmentCode: "RAD",
        facilityType: "URGENT_CARE",
        facilityServiceLines: null,
      },
    });
    expect(filtered.some((item) => item.href === "/app/clinic-care")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/rad-worklist")).toBe(true);
    expect(filtered.some((item) => item.href === "/app/emergency/trackboard")).toBe(false);
  });

  it("metric contracts are facility-name free", () => {
    const blob = JSON.stringify(CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS).toLowerCase();
    expect(blob).not.toContain("rapid city");
    expect(CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS).toHaveLength(6);
  });
});
