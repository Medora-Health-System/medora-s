import {
  resolveMedoraSeedModules,
  resolveMedoraSeedProfile,
  seedModuleEnabled,
} from "../../prisma/helpers/seed-profiles";

describe("MEDUI.PLATFORM.SEED_MODULARIZATION profiles", () => {
  it("defaults to full profile including demo", () => {
    expect(resolveMedoraSeedProfile({})).toBe("full");
    expect(resolveMedoraSeedModules({})).toEqual([
      "core",
      "facilities",
      "catalogs",
      "icd10",
      "templates",
      "demo",
    ]);
  });

  it("enterprise/production profiles exclude demo", () => {
    for (const key of ["enterprise", "production", "prod"]) {
      const env = { MEDORA_SEED_PROFILE: key };
      expect(resolveMedoraSeedProfile(env)).toBe("enterprise");
      expect(resolveMedoraSeedModules(env)).not.toContain("demo");
      expect(resolveMedoraSeedModules(env)).toEqual([
        "core",
        "facilities",
        "catalogs",
        "icd10",
        "templates",
      ]);
    }
  });

  it("MEDORA_SEED_MODULES overrides profile list", () => {
    const modules = resolveMedoraSeedModules({
      MEDORA_SEED_PROFILE: "full",
      MEDORA_SEED_MODULES: "core,templates",
    });
    expect(modules).toEqual(["core", "templates"]);
    expect(seedModuleEnabled(modules, "demo")).toBe(false);
    expect(seedModuleEnabled(modules, "templates")).toBe(true);
  });

  it("rejects empty MEDORA_SEED_MODULES", () => {
    expect(() => resolveMedoraSeedModules({ MEDORA_SEED_MODULES: "nope" })).toThrow(/invalid/i);
  });
});
