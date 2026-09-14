import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { filterSidebarNavItemsForSession } from "@/features/navigation/navigationVisibility";
import { isAppPathAllowedForRoles } from "@/lib/landingRoute";

const featureDir = __dirname;
const webRoot = join(featureDir, "../..");

function hrefsFor(roleCodes: string[], facilityCountry: string) {
  return filterSidebarNavItemsForSession(SIDEBAR_NAV_ITEMS, {
    roleCodes,
    profile: {
      roleCodes,
      facilityType: "CLINIC",
      facilityCountry,
    },
  }).map((item) => item.href);
}

describe("Clinic Care navigation cleanup", () => {
  it("removes duplicate Registration, Public Health, and Administration from the Clinic top strip", () => {
    const source = readFileSync(join(featureDir, "ClinicCareTopNav.tsx"), "utf8");
    expect(source).toContain('"registration"');
    expect(source).toContain('"publicHealth"');
    expect(source).toContain('"administration"');
    expect(source).toContain("CLINIC_COMPACT_TOP_NAV_HIDDEN_IDS");
  });

  it("keeps Clinic follow-up content inside the nested Clinic Care shell", () => {
    const page = readFileSync(
      join(webRoot, "app/app/clinic-care/follow-up/page.tsx"),
      "utf8"
    );
    expect(page).toContain('import FollowUpsPage from "../../../follow-ups/page"');
    expect(page).toContain("<FollowUpsPage />");
    expect(page).not.toContain("ClinicCareDirectCanonicalRedirect");
    expect(page).not.toContain('href={href}');
  });

  it("hides facility Public Health in the USA and Dominican Republic but preserves Haiti", () => {
    for (const country of ["US", "USA", "DO", "DOMINICAN REPUBLIC"]) {
      expect(hrefsFor(["ADMIN"], country).some((href) => href.startsWith("/app/public-health"))).toBe(false);
      expect(hrefsFor(["RN"], country).some((href) => href.startsWith("/app/public-health"))).toBe(false);
    }

    expect(hrefsFor(["ADMIN"], "HT").some((href) => href.startsWith("/app/public-health"))).toBe(true);
    expect(hrefsFor(["RN"], "Haiti").some((href) => href.startsWith("/app/public-health"))).toBe(true);
  });

  it("keeps Administration hidden and route-blocked for non-admin staff", () => {
    const rnHrefs = hrefsFor(["RN"], "US");
    expect(rnHrefs.some((href) => href === "/app/admin" || href.startsWith("/app/admin/"))).toBe(false);
    expect(
      isAppPathAllowedForRoles("/app/admin", ["RN"], {
        navigationProfile: { roleCodes: ["RN"], facilityType: "CLINIC", facilityCountry: "US" },
      })
    ).toBe(false);
    expect(
      isAppPathAllowedForRoles("/app/admin", ["ADMIN"], {
        navigationProfile: { roleCodes: ["ADMIN"], facilityType: "CLINIC", facilityCountry: "US" },
      })
    ).toBe(true);
  });
});
