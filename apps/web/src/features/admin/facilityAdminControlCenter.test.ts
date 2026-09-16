import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("facility admin control center", () => {
  it("is integrated directly into the existing administration dashboard", () => {
    const adminPage = read("app/app/admin/page.tsx");
    const panel = read("src/components/admin/FacilityAdminControlPanel.tsx");
    const nav = read("src/components/app-shell/sidebarNavConfig.ts");

    expect(adminPage).toContain("FacilityAdminControlPanel");
    expect(adminPage).toContain("LegacyAdminDashboard");
    expect(panel).toContain('data-testid="facility-admin-control-panel"');
    expect(nav).toContain('href:"/app/admin"');
    expect(nav).not.toContain('href:"/app/admin/facility-control",labelKey:"nav.admin"');
  });

  it("uses the facility-scoped active list instead of the platform-only inactive facility list", () => {
    const panel = read("src/components/admin/FacilityAdminControlPanel.tsx");
    expect(panel).toContain("fetchAdminFacilities(facilityId)");
    expect(panel).not.toContain("includeInactive: true");
    expect(panel).toContain("headerFacilityId={facilityId}");
    expect(panel).toContain("targetFacilityId={facilityId}");
  });

  it("keeps the old facility-control URL as a compatibility redirect to the admin dashboard", () => {
    const compatibilityPage = read("app/app/admin/facility-control/page.tsx");
    expect(compatibilityPage).toContain('redirect("/app/admin")');
  });

  it("provides French, English, and Spanish copy without English-only dashboard chrome", () => {
    const panel = read("src/components/admin/FacilityAdminControlPanel.tsx");
    expect(panel).toContain('title: "Contrôle de l’application et de l’établissement"');
    expect(panel).toContain('modulesTitle: "Modules et lignes de service"');
    expect(panel).toContain('title: "App & Facility Control"');
    expect(panel).toContain('title: "Control de la aplicación y del establecimiento"');
    expect(panel).toContain('locale === "fr"');
    expect(panel).toContain('locale === "es"');
  });

  it("does not expose cross-facility activation or switching controls in the facility panel", () => {
    const panel = read("src/components/admin/FacilityAdminControlPanel.tsx");
    expect(panel).not.toContain("setAdminFacilityActive");
    expect(panel).not.toContain("switchSessionToFacility");
    expect(panel).not.toContain("canCreateFacilities");
  });
});
