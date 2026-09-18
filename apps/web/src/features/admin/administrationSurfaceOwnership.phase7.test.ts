import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Administration Phase 7 surface ownership", () => {
  it("keeps facility operations owned by the facility control panel", () => {
    const panel = read("src/components/admin/FacilityAdminControlPanel.tsx");
    expect(panel).toContain('href="/app/admin/users"');
    expect(panel).toContain('href="/app/admin/audit"');
    expect(panel).toContain('href="/app/reports"');
    expect(panel).toContain('href="/app/admin/enterprise-workflow"');
    expect(panel).toContain('href="/app/admin/enterprise-clinical-rules"');
    expect(panel).toContain('href="/app/admin/go-live"');
    expect(panel).toContain('href="/app/admin/revenue-cycle"');
  });

  it("does not duplicate facility operation navigation in the configuration console", () => {
    const consoleSource = read("src/features/facility-configuration/FacilityConfigurationConsole.tsx");
    expect(consoleSource).not.toContain("FACILITY_OPERATIONS_LINKS");
    expect(consoleSource).not.toContain('href="/app/admin/users"');
    expect(consoleSource).not.toContain('href="/app/admin/enterprise-workflow"');
  });

  it("does not duplicate facility operation navigation in the residual platform dashboard", () => {
    const legacy = read("app/app/admin/LegacyAdminDashboard.tsx");
    expect(legacy).not.toContain('href="/app/admin/users"');
    expect(legacy).not.toContain('href="/app/admin/audit"');
    expect(legacy).not.toContain('href="/app/reports"');
    expect(legacy).not.toContain('href="/app/admin/go-live"');
    expect(legacy).not.toContain('href="/app/admin/enterprise-workflow"');
    expect(legacy).not.toContain('href="/app/admin/enterprise-clinical-rules"');
    expect(legacy).not.toContain('href="/app/admin/revenue-cycle"');
  });

  it("retains platform, connectivity, and facility-directory ownership", () => {
    const legacy = read("app/app/admin/LegacyAdminDashboard.tsx");
    expect(legacy).toContain('href="/app/admin/system-health"');
    expect(legacy).toContain('href="/app/admin/compliance"');
    expect(legacy).toContain('href="/app/admin/integrations"');
    expect(legacy).toContain("fetchAdminFacilities");
    expect(legacy).toContain("setAdminFacilityActive");
  });
});
