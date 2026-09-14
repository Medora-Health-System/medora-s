import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import { getRouteGuardRedirect } from "@/lib/landingRoute";

const featureDir = __dirname;
const topNavSource = readFileSync(join(featureDir, "ClinicCareTopNav.tsx"), "utf8");
const clinicFollowUpPageSource = readFileSync(
  join(featureDir, "../../../app/app/clinic-care/follow-up/page.tsx"),
  "utf8"
);

describe("Clinic Care navigation cleanup", () => {
  it("removes duplicate Registration, Public Health, and Administration shortcuts from the Clinic top header", () => {
    expect(topNavSource).toContain('"registration"');
    expect(topNavSource).toContain('"publicHealth"');
    expect(topNavSource).toContain('"administration"');
    expect(topNavSource).toContain("CLINIC_COMPACT_TOP_NAV_HIDDEN_IDS");
  });

  it("keeps the shared Follow-ups workspace mounted inside Clinic Care instead of redirecting away", () => {
    expect(clinicFollowUpPageSource).toContain('import FollowUpsPage from "../../follow-ups/page"');
    expect(clinicFollowUpPageSource).toContain("<FollowUpsPage />");
    expect(clinicFollowUpPageSource).not.toContain("ClinicCareDirectCanonicalRedirect");
  });

  it("hides the generic Public Health sidebar section for US and Dominican Republic clinical staff", () => {
    const usRn = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RN"],
      profile: {
        roleCodes: ["RN"],
        facilityType: "CLINIC",
        facilityCountry: "US",
        careProfileJson: { schemaVersion: 1, optionalModules: { publicHealth: true } },
      },
    });
    const drProvider = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["PROVIDER"],
      profile: {
        roleCodes: ["PROVIDER"],
        facilityType: "CLINIC",
        facilityCountry: "DO",
        careProfileJson: { schemaVersion: 1, optionalModules: { publicHealth: true } },
      },
    });

    expect(usRn.some((item) => item.group === "sante_publique")).toBe(false);
    expect(drProvider.some((item) => item.group === "sante_publique")).toBe(false);
  });

  it("keeps Public Health visible for Haiti clinical staff and for Admin oversight", () => {
    const haitiRn = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["RN"],
      profile: {
        roleCodes: ["RN"],
        facilityType: "CLINIC",
        facilityCountry: "HT",
      },
    });
    const usAdmin = filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
      roleCodes: ["ADMIN"],
      profile: {
        roleCodes: ["ADMIN"],
        facilityType: "CLINIC",
        facilityCountry: "US",
        careProfileJson: { schemaVersion: 1, optionalModules: { publicHealth: true } },
      },
    });

    expect(haitiRn.some((item) => item.group === "sante_publique")).toBe(true);
    expect(usAdmin.some((item) => item.group === "sante_publique")).toBe(true);
  });

  it("keeps Administration menu and dashboard restricted to Admin roles", () => {
    const adminRoot = SIDEBAR_NAV_ITEMS.find((item) => item.href === "/app/admin");
    expect(adminRoot?.roles).toEqual(expect.arrayContaining(["ADMIN", "MEDORA_SUPER_ADMIN"]));
    expect(adminRoot?.roles).not.toEqual(expect.arrayContaining(["RN", "PROVIDER", "FRONT_DESK"]));

    expect(
      getRouteGuardRedirect("/app/admin", ["RN"], {
        navigationProfile: { roleCodes: ["RN"], facilityType: "CLINIC" },
      })
    ).not.toBeNull();
  });
});
