import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  resolveApiPackageRoot,
  resolvePrismaDataDirectory,
  resolvePrismaDirectory,
  resolvePrismaHelpersDirectory,
} from "../../prisma/helpers/resolve-prisma-data-directory";
import {
  resolveMedoraSeedSteps,
  assertDemoSeedAllowed,
} from "../../prisma/helpers/seed-modes";

describe("MEDUI.PLATFORM.HOTFIX_MODULAR_SEED_DATA_PATHS", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  function assertStableDataDir(label: string) {
    const dataDir = resolvePrismaDataDirectory();
    const normalized = dataDir.replace(/\\/g, "/");
    expect(`${label}:${normalized.endsWith("apps/api/prisma/data")}`).toBe(`${label}:true`);
    expect(`${label}:${normalized.includes("prisma/prisma")}`).toBe(`${label}:false`);
    expect(`${label}:exists=${existsSync(dataDir)}`).toBe(`${label}:exists=true`);
    expect(resolvePrismaHelpersDirectory().replace(/\\/g, "/").endsWith("apps/api/prisma/helpers")).toBe(
      true,
    );
    expect(resolvePrismaDirectory().replace(/\\/g, "/").endsWith("apps/api/prisma")).toBe(true);
    expect(resolveApiPackageRoot().replace(/\\/g, "/").endsWith("apps/api")).toBe(true);
  }

  it("resolves prisma/data when cwd is repository root", () => {
    const repoRoot = resolve(__dirname, "../../..");
    process.chdir(repoRoot);
    assertStableDataDir("repo root");
  });

  it("resolves prisma/data when cwd is apps/api", () => {
    const apiRoot = resolve(__dirname, "../..");
    process.chdir(apiRoot);
    assertStableDataDir("apps/api");
  });

  it("resolves prisma/data when cwd is another directory", () => {
    const tmp = resolve(__dirname, "..");
    process.chdir(tmp);
    assertStableDataDir("apps/api/src");
  });

  it("clinical-content mode still composes ICD + medication steps via orchestrator", () => {
    expect(resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "clinical-content" })).toEqual([
      "clinical-content",
    ]);
    const seedSrc = readFileSync(join(__dirname, "../../prisma/seed.ts"), "utf8");
    expect(seedSrc).toContain("seedIcd(");
    expect(seedSrc).toContain("seedMedications(");
    expect(seedSrc).toMatch(/seedStepEnabled\(steps,\s*"clinical-content"\)/);
  });

  it("templates and core modes remain unchanged", () => {
    expect(resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "templates" })).toEqual(["templates"]);
    expect(resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "core" })).toEqual(["core"]);
  });

  it("demo production guard remains unchanged", () => {
    expect(() =>
      assertDemoSeedAllowed({
        NODE_ENV: "production",
        MEDORA_SEED_MODE: "demo",
      }),
    ).toThrow(/Refusing to run demo seed in production/i);
  });

  it("enterprise catalogs assert does not join prisma twice", () => {
    const assertSrc = readFileSync(
      join(__dirname, "../../prisma/helpers/assert-no-stale-haiti-catalog-artifacts.ts"),
      "utf8",
    );
    const catalogsSrc = readFileSync(
      join(__dirname, "../../prisma/helpers/seed-enterprise-catalogs.ts"),
      "utf8",
    );
    expect(assertSrc).toContain("resolvePrismaDataDirectory");
    expect(assertSrc).not.toMatch(/join\(apiRoot,\s*"prisma",\s*"data"\)/);
    expect(catalogsSrc).toContain("assertNoStaleHaitiCatalogArtifacts()");
    expect(catalogsSrc).not.toContain('join(__dirname, "..")');
  });

  it("ICD seed uses api package root resolver (not cwd-dependent default)", () => {
    const icdSrc = readFileSync(join(__dirname, "../../prisma/helpers/seed-icd.ts"), "utf8");
    const sampleSrc = readFileSync(
      join(__dirname, "../../prisma/helpers/seed-icd10-sample.ts"),
      "utf8",
    );
    expect(icdSrc).toContain("resolveApiPackageRoot");
    expect(sampleSrc).toContain("resolveApiPackageRoot");
  });
});
