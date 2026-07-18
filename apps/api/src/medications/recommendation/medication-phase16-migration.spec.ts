import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 16 migration", () => {
  const migration = resolve(
    __dirname,
    "../../../prisma/migrations/20261021120000_medication_phase_16_controlled_recommendation_engine/migration.sql"
  );

  it("exists and is additive with constitutional checks", () => {
    expect(existsSync(migration)).toBe(true);
    const sql = readFileSync(migration, "utf8");
    expect(sql).toContain("MedicationRecommendationProgram");
    expect(sql).toContain("MedicationRecommendationDefinition");
    expect(sql).toContain("MedicationRecommendationShadowEvaluation");
    expect(sql).toContain("controlledPilotAllowed");
    expect(sql).toContain("enterpriseActiveAllowed");
    expect(sql).toContain("orderFromRecommendationAllowed");
    expect(sql).toMatch(/CHECK \("controlledPilotAllowed" = false\)/);
    expect(sql).toMatch(/CHECK \("enterpriseActiveAllowed" = false\)/);
    expect(sql).toMatch(/CHECK \("mutatesOrders" = false\)/);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});
