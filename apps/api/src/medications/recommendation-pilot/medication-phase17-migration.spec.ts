import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 17 migration", () => {
  const migration = resolve(
    __dirname,
    "../../../prisma/migrations/20261022120000_medication_phase_17_controlled_pilot/migration.sql"
  );

  it("exists and is additive with constitutional locks", () => {
    expect(existsSync(migration)).toBe(true);
    const sql = readFileSync(migration, "utf8");
    expect(sql).toContain("MedicationRecommendationPilotProgram");
    expect(sql).toContain("MedicationRecommendationPilotQualification");
    expect(sql).toContain("MedicationRecommendationPilotExposure");
    expect(sql).toContain("MedicationRecommendationPilotSafetyEvent");
    expect(sql).toContain("enterpriseActiveAllowed");
    expect(sql).toContain("orderFromRecommendationEnabled");
    expect(sql).toContain("controlledPilotAllowed");
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});
