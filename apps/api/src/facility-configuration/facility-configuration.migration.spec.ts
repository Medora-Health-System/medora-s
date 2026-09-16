import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Facility configuration migration safety", () => {
  const backfill = readFileSync(
    resolve(process.cwd(), "prisma/migrations/20261117121500_facility_configuration_backfill/migration.sql"),
    "utf8",
  );
  const rollback = readFileSync(
    resolve(process.cwd(), "prisma/migrations/20261117121500_facility_configuration_backfill/rollback.sql"),
    "utf8",
  );
  const create = readFileSync(
    resolve(process.cwd(), "prisma/migrations/20261117120000_facility_configuration/migration.sql"),
    "utf8",
  );

  it("creates configuration for every existing facility", () => {
    expect(backfill).toContain('INSERT INTO "FacilityConfiguration"');
    expect(backfill).toContain('FROM "Facility" f');
    expect(backfill).toContain("WHERE NOT EXISTS");
    expect(backfill).toContain("'{}'::jsonb");
    expect(create).toContain('"settingsJson" JSONB NOT NULL');
  });

  it("has a tested rollback that does not drop live tables", () => {
    expect(rollback).toContain('DELETE FROM "FacilityConfigurationRevision"');
    expect(rollback).toContain('DELETE FROM "FacilityConfiguration"');
    expect(rollback).not.toContain("DROP TABLE");
  });
});
