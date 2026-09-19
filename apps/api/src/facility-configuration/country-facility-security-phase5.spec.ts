import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 5 country/facility security hardening", () => {
  it("keeps clinical tenant authority bound to exact facility membership", () => {
    const guard = read("src/common/guards/roles.guard.ts");
    expect(guard).toContain("userId,");
    expect(guard).toContain("facilityId,");
    expect(guard).toContain("facility: { isActive: true }");
    expect(guard).not.toContain("allowedCountries");
    expect(guard).not.toContain("countryScopes");
  });

  it("enforces pharmacy capability at the pharmacy API boundary", () => {
    const source = read("src/pharmacy-dispense/pharmacy-dispense.controller.ts");
    expect(source).toContain('assertModuleEnabled(facilityId, "pharmacy")');
  });

  it("enforces laboratory and radiology capabilities at diagnostic result boundaries", () => {
    const source = read("src/results/results.controller.ts");
    expect(source).toContain('item.type === "LAB_TEST"');
    expect(source).toContain('assertModuleEnabled(facilityId, "laboratory")');
    expect(source).toContain('item.type === "IMAGING_STUDY"');
    expect(source).toContain('assertModuleEnabled(facilityId, "radiology")');
  });

  it("does not add a second facility feature matrix or country-scoped clinical role model", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).not.toContain("model FacilityFeatureOverride");
    expect(schema).not.toContain("model CountryUserRole");
    expect(schema).not.toContain("model CountryFacilityMembership");
  });
});
