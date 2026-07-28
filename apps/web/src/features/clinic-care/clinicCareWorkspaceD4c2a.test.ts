import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLINIC_WORKSPACE_NAV_REGISTRY,
  resolveCapabilityAwareNavigationAreas,
  resolveClinicWorkspaceAccess,
  resolveVisibleClinicTopTabs,
  isFacilityCareSettingPathAllowed,
} from "@medora/shared";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import { getLandingRouteForRoles, getRouteGuardRedirect, isAppPathAllowedForRoles } from "@/lib/landingRoute";

describe("MEDUI.D4C.2A unified clinic workspace capability navigation", () => {
  it("A — Admin Clinic-only sidebar hides Emergency and Hospital", () => {
    const filtered = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["ADMIN"],
      profile: {
        roleCodes: ["ADMIN"],
        facilityType: "CLINIC",
        facilityServiceLines: null,
      },
    });
    const hrefs = filtered.map((i) => i.href);
    expect(hrefs).toContain("/app/clinic-care");
    expect(hrefs).not.toContain("/app/emergency/trackboard");
    expect(hrefs).not.toContain("/app/hospitalisation");
  });

  it("B — top tab registry never bounces to global /app/nursing|/provider|/patients", () => {
    const top = CLINIC_WORKSPACE_NAV_REGISTRY.filter((i) => i.topTab);
    for (const item of top) {
      expect(item.href.startsWith("/app/clinic-care")).toBe(true);
    }
    const source = readFileSync(
      join(__dirname, "ClinicCareTopNav.tsx"),
      "utf8"
    );
    expect(source).toContain("resolveVisibleClinicTopTabs");
    expect(source).not.toContain('href: "/app/nursing"');
  });

  it("C — role landings for Clinic facility", () => {
    expect(
      getLandingRouteForRoles(["FRONT_DESK"], {
        navigationProfile: { roleCodes: ["FRONT_DESK"], facilityType: "CLINIC" },
      })
    ).toBe("/app/clinic-care/registration");
    expect(
      getLandingRouteForRoles(["PROVIDER"], {
        navigationProfile: { roleCodes: ["PROVIDER"], facilityType: "CLINIC" },
      })
    ).toBe("/app/clinic-care/provider");
    expect(
      getLandingRouteForRoles(["ADMIN"], {
        navigationProfile: { roleCodes: ["ADMIN"], facilityType: "CLINIC" },
      })
    ).toBe("/app/clinic-care");
  });

  it("D — direct URL guard blocks ED/Hospital on Clinic even for Admin", () => {
    const profile = { roleCodes: ["ADMIN"], facilityType: "CLINIC" as const };
    expect(
      isAppPathAllowedForRoles("/app/emergency/trackboard", ["ADMIN"], {
        navigationProfile: profile,
      })
    ).toBe(false);
    expect(
      getRouteGuardRedirect("/app/hospitalisation", ["ADMIN"], {
        navigationProfile: profile,
      })
    ).toBe("/app/clinic-care");
    expect(
      isFacilityCareSettingPathAllowed("/app/clinic-care/registration", profile)
    ).toBe(true);
  });

  it("E — hybrid facility shows ED only when EMERGENCY line present", () => {
    const areas = resolveCapabilityAwareNavigationAreas({
      roleCodes: ["ADMIN"],
      facilityType: "URGENT_CARE",
      facilityServiceLines: ["URGENT_CARE", "EMERGENCY", "LABORATORY"],
    });
    expect(areas).toContain("EMERGENCY");
    expect(areas).not.toContain("HOSPITAL");
  });

  it("F — Front Desk cannot escalate via Provider tab visibility", () => {
    const front = resolveClinicWorkspaceAccess({
      roleCodes: ["FRONT_DESK"],
      facilityType: "CLINIC",
    });
    const tabs = resolveVisibleClinicTopTabs(front.access);
    expect(tabs.some((t) => t.id === "registration")).toBe(true);
    expect(tabs.some((t) => t.id === "provider")).toBe(false);
    expect(tabs.some((t) => t.id === "nursing")).toBe(false);
  });

  it("G — nested layout + shell files exist for unified Clinic workspace (no side nav)", () => {
    const layout = readFileSync(
      join(__dirname, "../../../app/app/clinic-care/layout.tsx"),
      "utf8"
    );
    const shell = readFileSync(
      join(__dirname, "ClinicCareShell.tsx"),
      "utf8"
    );
    expect(layout).toContain("ClinicCareShell");
    expect(shell).toContain("clinic-care-shell");
    expect(shell).toContain("ClinicCareTopNav");
    expect(shell).not.toMatch(/import\s*\{[^}]*ClinicCareSideNav/);
    expect(shell).not.toContain("<ClinicCareSideNav");
  });
});
