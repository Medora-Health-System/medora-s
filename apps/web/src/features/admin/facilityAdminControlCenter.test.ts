import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("facility admin control center", () => {
  it("surfaces the facility-scoped configuration engine from Administration navigation", () => {
    const nav = read("src/components/app-shell/sidebarNavConfig.ts");
    const page = read("app/app/admin/facility-control/page.tsx");
    expect(nav).toContain('href:"/app/admin/facility-control"');
    expect(nav).toContain('roles:["ADMIN","MEDORA_SUPER_ADMIN"]');
    expect(page).toContain("FacilityServiceConfigModal");
    expect(page).toContain("headerFacilityId={facilityId}");
    expect(page).toContain("targetFacilityId={facilityId}");
    expect(page).toContain("fetchAdminFacilities(facilityId");
  });

  it("keeps cross-facility platform operations out of the facility control center", () => {
    const page = read("app/app/admin/facility-control/page.tsx");
    expect(page).not.toContain("setAdminFacilityActive");
    expect(page).not.toContain("switchSessionToFacility");
    expect(page).not.toContain("canCreateFacilities");
  });
});
