/**
 * MEDUI.D4C.7K — repository-level integrity checks for the enterprise lifecycle authority.
 *
 * Pins the corrections that cannot be observed from a unit test alone:
 *   * migration folder ordering / naming (no future-dated prefix, unique prefix, dependency-safe)
 *   * required lifecycle dependency (no optional injection, no legacy close fallback)
 *   * lifecycle routes opt in to platform-principal access with explicit facility context
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(__dirname, "../../prisma/migrations");
const MIGRATION_NAME = "20260730130000_enterprise_encounter_lifecycle_reopen_d4c7k";

describe("MEDUI.D4C.7K — migration ordering", () => {
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  it("uses a unique 14-digit timestamp prefix", () => {
    expect(folders).toContain(MIGRATION_NAME);
    const prefix = MIGRATION_NAME.slice(0, 14);
    expect(prefix).toMatch(/^\d{14}$/);
    expect(folders.filter((name) => name.startsWith(prefix))).toEqual([MIGRATION_NAME]);
  });

  it("is not future-dated relative to the July 2026 implementation period", () => {
    const prefix = Number(MIGRATION_NAME.slice(0, 8));
    expect(prefix).toBeGreaterThanOrEqual(20260701);
    expect(prefix).toBeLessThanOrEqual(20260731);
  });

  it("runs after every table and enum it depends on", () => {
    const index = folders.indexOf(MIGRATION_NAME);
    expect(index).toBeGreaterThan(0);
    const earlierSql = folders
      .slice(0, index)
      .map((name) => resolve(MIGRATIONS_DIR, name, "migration.sql"))
      .filter((file) => existsSync(file))
      .map((file) => readFileSync(file, "utf8"));

    for (const dependency of [
      'CREATE TABLE "Encounter"',
      'CREATE TABLE "Facility"',
      'CREATE TABLE "Patient"',
      'CREATE TABLE "User"',
      'CREATE TYPE "AuditAction"',
    ]) {
      expect(earlierSql.some((sql) => sql.includes(dependency))).toBe(true);
    }
  });

  it("is additive and does not backfill closedAt from dischargedAt", () => {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, MIGRATION_NAME, "migration.sql"), "utf8");
    expect(existsSync(resolve(MIGRATIONS_DIR, MIGRATION_NAME, "migration.sql"))).toBe(true);
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "closedAt"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "EncounterLifecycleTransition"');
    expect(sql).toContain("'ENCOUNTER_REOPEN'");
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/UPDATE "Encounter" SET "closedAt"/i);
  });
});

describe("MEDUI.D4C.7K — required lifecycle dependency", () => {
  const source = readFileSync(resolve(__dirname, "encounters.service.ts"), "utf8");

  it("injects EnterpriseEncounterLifecycleService as a required constructor dependency", () => {
    expect(source).toContain(
      "private readonly enterpriseLifecycle: EnterpriseEncounterLifecycleService"
    );
    expect(source).not.toContain("enterpriseLifecycle?: EnterpriseEncounterLifecycleService");
    expect(source).not.toMatch(/@Optional\(\)\s*private readonly enterpriseLifecycle/);
  });

  it("has no conditional lifecycle execution and no legacy close fallback", () => {
    expect(source).not.toMatch(/if \(this\.enterpriseLifecycle\)/);
    expect(source).not.toMatch(/this\.enterpriseLifecycle\?\./);
    expect(source).toContain("this.enterpriseLifecycle.applyCloseTransition(tx, {");
  });
});

describe("MEDUI.D4C.7K — lifecycle route authorization wiring", () => {
  const controller = readFileSync(resolve(__dirname, "encounters.controller.ts"), "utf8");

  for (const route of [
    'encounters/:id/close"',
    'encounters/:id/reopen"',
    'encounters/:id/lifecycle-timeline"',
  ]) {
    it(`${route} opts in to platform-principal access with an explicit facility context`, () => {
      const at = controller.indexOf(route);
      expect(at).toBeGreaterThan(-1);
      const block = controller.slice(at, at + 700);
      expect(block).toContain("RoleCode.MEDORA_SUPER_ADMIN");
      expect(block).toContain("@AllowPlatformPrincipalWithFacilityContext()");
      expect(block).toContain('req.headers["x-facility-id"]');
      expect(block).toContain("Facility ID required");
    });
  }
});
