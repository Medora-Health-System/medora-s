import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  CLINIC_WORKSPACE_NAV_REGISTRY,
  resolveCapabilityAwareNavigationAreas,
  resolveClinicWorkspaceAccess,
  resolveVisibleClinicSideNav,
  resolveVisibleClinicTopTabs,
  isFacilityCareSettingPathAllowed,
} from "@medora/shared";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import { getLandingRouteForRoles, getRouteGuardRedirect, isAppPathAllowedForRoles } from "@/lib/landingRoute";
import {
  resolveClinicBoardActionHref,
  resolveClinicBoardPatientNameHref,
} from "./clinicCareBoardRoutes";

const featureDir = __dirname;

describe("MEDUI.D4C.2A.1 clinic workspace regression correction", () => {
  it("A — one-sidebar shell: no in-shell side nav mount; full-width main panel", () => {
    const shell = readFileSync(join(featureDir, "ClinicCareShell.tsx"), "utf8");
    expect(shell).toContain("ClinicCareTopNav");
    expect(shell).not.toMatch(/import\s*\{[^}]*ClinicCareSideNav/);
    expect(shell).not.toContain("<ClinicCareSideNav");
    expect(shell).toContain("clinic-care-main-panel");
    expect(shell).toContain('maxWidth: "100%"');
    expect(existsSync(join(featureDir, "ClinicCareSideNav.tsx"))).toBe(false);
    expect(resolveVisibleClinicSideNav(
      resolveClinicWorkspaceAccess({ roleCodes: ["ADMIN"], facilityType: "CLINIC" }).access
    )).toEqual([]);
  });

  it("B — ancillary modules are capability-gated top tabs under /app/clinic-care", () => {
    const ancillary = CLINIC_WORKSPACE_NAV_REGISTRY.filter((i) =>
      ["laboratory", "radiology", "pharmacy", "publicHealth", "administration"].includes(i.id)
    );
    expect(ancillary.length).toBe(5);
    for (const item of ancillary) {
      expect(item.topTab).toBe(true);
      expect(item.href.startsWith("/app/clinic-care")).toBe(true);
    }
    const admin = resolveClinicWorkspaceAccess({
      roleCodes: ["ADMIN"],
      facilityType: "CLINIC",
      careProfileJson: {
        schemaVersion: 1,
        optionalModules: { laboratory: true, pharmacy: true, radiology: false, publicHealth: false, billing: true },
      },
      facilityServiceLines: ["CLINIC", "LABORATORY", "PHARMACY"],
    });
    const tabs = resolveVisibleClinicTopTabs(admin.access);
    expect(tabs.some((t) => t.id === "laboratory")).toBe(true);
    expect(tabs.some((t) => t.id === "pharmacy")).toBe(true);
    expect(tabs.some((t) => t.id === "radiology")).toBe(false);
  });

  it("C — Admin Clinic-only still hides ED/Hospital; capability regression held", () => {
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
    expect(
      isAppPathAllowedForRoles("/app/emergency/trackboard", ["ADMIN"], {
        navigationProfile: { roleCodes: ["ADMIN"], facilityType: "CLINIC" },
      })
    ).toBe(false);
    expect(
      getRouteGuardRedirect("/app/hospitalisation", ["ADMIN"], {
        navigationProfile: { roleCodes: ["ADMIN"], facilityType: "CLINIC" },
      })
    ).toBe("/app/clinic-care");
    expect(
      isFacilityCareSettingPathAllowed("/app/clinic-care", {
        roleCodes: ["ADMIN"],
        facilityType: "CLINIC",
      })
    ).toBe(true);
  });

  it("D — trackboard distinguishes API error vs true empty; schema-miss not empty array", () => {
    const view = readFileSync(join(featureDir, "ClinicCareTrackboardView.tsx"), "utf8");
    expect(view).toContain("clinic-care-trackboard-error");
    expect(view).toContain("clinic-care-trackboard-true-empty");
    expect(view).toContain("clinic-care-trackboard-retry");
    expect(view).toContain("schemaMiss");
    expect(view).toContain("CLINIC_CARE_SCHEMA_MISS");
    expect(view).not.toMatch(/catch[\s\S]{0,200}setData\(\[\]\)/);
    const controller = readFileSync(
      join(featureDir, "../../../../api/src/clinic-care/clinic-care.controller.ts"),
      "utf8"
    );
    expect(controller).toContain("ServiceUnavailableException");
    expect(controller).toContain("isPrismaSchemaMissError");
    expect(controller).toContain("CLINIC_CARE_SCHEMA_MISS");
  });

  it("E — patient-name chart helper reuses ED pattern; actions stay in clinic-care", () => {
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "enc-1",
        patientId: "pat-1",
        status: "OPEN",
      })
    ).toBe("/app/encounters/enc-1?tab=clinic&workspace=ambulatory");
    expect(
      resolveClinicBoardPatientNameHref({
        encounterId: "enc-2",
        patientId: "pat-2",
        status: "CLOSED",
      })
    ).toBe("/app/patients/pat-2");
    expect(
      resolveClinicBoardActionHref({
        encounterId: "enc-3",
        stageId: "IN_PROGRESS",
        canAuthorProviderDocumentation: true,
        showClinicalActionLinks: true,
      })
    ).toBe("/app/clinic-care/provider?encounterId=enc-3");
    const view = readFileSync(join(featureDir, "ClinicCareTrackboardView.tsx"), "utf8");
    expect(view).toContain("resolveClinicBoardPatientNameHref");
    expect(view).toContain("clinic-care-patient-name-");
  });

  it("F — room + assign user reuse enterprise engines (no ClinicRoom*/ClinicUserAssignment)", () => {
    const view = readFileSync(join(featureDir, "ClinicCareTrackboardView.tsx"), "utf8");
    const roomSelect = readFileSync(join(featureDir, "ClinicCareInlineRoomSelect.tsx"), "utf8");
    expect(roomSelect).toContain("updateEncounterRoomAssignment");
    expect(view).toContain("ClinicCareInlineRoomSelect");
    expect(view).toContain("assignProviderSelf");
    expect(view).toContain("clinic-care-assign-provider-");
    expect(view).not.toContain("clinic-care-assign-room-");
    expect(view).not.toContain("clinic-care-assign-nurse-");
    expect(view).not.toContain("assignNurseSelf");
    expect(view).not.toMatch(/\bClinicRoomAssignment\b/);
    expect(view).not.toMatch(/\bClinicUserAssignment\b/);
    expect(existsSync(join(featureDir, "ClinicRoomAssignmentModal.tsx"))).toBe(false);
  });

  it("G — role landings + hybrid capability + Front Desk no Provider escalation", () => {
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
    const areas = resolveCapabilityAwareNavigationAreas({
      roleCodes: ["ADMIN"],
      facilityType: "URGENT_CARE",
      facilityServiceLines: ["URGENT_CARE", "EMERGENCY", "LABORATORY"],
    });
    expect(areas).toContain("EMERGENCY");
    expect(areas).not.toContain("HOSPITAL");
    const front = resolveClinicWorkspaceAccess({
      roleCodes: ["FRONT_DESK"],
      facilityType: "CLINIC",
    });
    const tabs = resolveVisibleClinicTopTabs(front.access);
    expect(tabs.some((t) => t.id === "registration")).toBe(true);
    expect(tabs.some((t) => t.id === "provider")).toBe(false);
  });
});
