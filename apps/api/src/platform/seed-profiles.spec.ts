import {
  assertDemoSeedAllowed,
  isProductionEnv,
  resolveMedoraSeedMode,
  resolveMedoraSeedSteps,
  seedStepEnabled,
} from "../../prisma/helpers/seed-modes";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("MEDUI.PLATFORM.SEED_MODULARIZATION modes", () => {
  it("defaults development to all", () => {
    expect(resolveMedoraSeedMode({ NODE_ENV: "development" })).toBe("all");
    expect(resolveMedoraSeedSteps({ NODE_ENV: "development" })).toEqual([
      "core",
      "clinical-content",
      "templates",
      "demo",
    ]);
  });

  it("defaults production to core", () => {
    expect(resolveMedoraSeedMode({ NODE_ENV: "production" })).toBe("core");
    expect(resolveMedoraSeedSteps({ NODE_ENV: "production" })).toEqual(["core"]);
  });

  it("core mode does not include demo", () => {
    const steps = resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "core" });
    expect(steps).toEqual(["core"]);
    expect(seedStepEnabled(steps, "demo")).toBe(false);
  });

  it("templates mode is templates only", () => {
    expect(resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "templates" })).toEqual(["templates"]);
  });

  it("clinical-content mode is clinical-content only", () => {
    expect(resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "clinical-content" })).toEqual([
      "clinical-content",
    ]);
  });

  it("demo mode is demo only", () => {
    expect(resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "demo" })).toEqual(["demo"]);
  });

  it("all executes all modules in order", () => {
    expect(resolveMedoraSeedSteps({ MEDORA_SEED_MODE: "all" })).toEqual([
      "core",
      "clinical-content",
      "templates",
      "demo",
    ]);
  });

  it("enterprise profile maps to core+clinical-content+templates (no demo)", () => {
    expect(
      resolveMedoraSeedSteps({
        NODE_ENV: "production",
        MEDORA_SEED_PROFILE: "enterprise",
      }),
    ).toEqual(["core", "clinical-content", "templates"]);
  });

  it("production demo mode blocked without explicit override", () => {
    expect(() =>
      assertDemoSeedAllowed({
        NODE_ENV: "production",
        MEDORA_SEED_MODE: "demo",
      }),
    ).toThrow(/Refusing to run demo seed in production/i);
  });

  it("production demo mode allowed with explicit override", () => {
    expect(() =>
      assertDemoSeedAllowed({
        NODE_ENV: "production",
        MEDORA_ALLOW_DEMO_SEED_IN_PRODUCTION: "true",
      }),
    ).not.toThrow();
  });

  it("isProductionEnv detects production", () => {
    expect(isProductionEnv({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionEnv({ NODE_ENV: "development" })).toBe(false);
  });

  it("orchestrator seed.ts does not log demo passwords", () => {
    const seedSrc = readFileSync(join(__dirname, "../../prisma/seed.ts"), "utf8");
    expect(seedSrc).not.toMatch(/MedoraAdmin123/);
    expect(seedSrc).not.toMatch(/password for all/i);
  });

  it("demo helper does not print password values", () => {
    const demoSrc = readFileSync(
      join(__dirname, "../../prisma/helpers/seed-demo-haiti.ts"),
      "utf8",
    );
    expect(demoSrc).toContain("credentials not logged");
    expect(demoSrc).not.toMatch(/password for all/i);
    // constant may exist for hashing, but must not be interpolated into console.log
    const logLines = demoSrc.split("\n").filter((l) => l.includes("console.log"));
    for (const line of logLines) {
      expect(line).not.toMatch(/DEMO_PASSWORD/);
      expect(line).not.toMatch(/MedoraAdmin123/);
    }
  });

  it("seed helper modules exist for required architecture", () => {
    const helpers = join(__dirname, "../../prisma/helpers");
    for (const file of [
      "seed-core.ts",
      "seed-icd.ts",
      "seed-medications.ts",
      "seed-registration-templates.ts",
      "seed-demo-haiti.ts",
      "seed-modes.ts",
    ]) {
      expect(readFileSync(join(helpers, file), "utf8").length).toBeGreaterThan(20);
    }
  });
});
