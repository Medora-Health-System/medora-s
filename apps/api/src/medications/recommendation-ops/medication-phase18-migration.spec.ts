import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Phase 18 migration", () => {
  const migration = resolve(
    __dirname,
    "../../../prisma/migrations/20261023120000_medication_phase_18_operational_governance/migration.sql"
  );

  it("exists and is additive with constitutional checks", () => {
    expect(existsSync(migration)).toBe(true);
    const sql = readFileSync(migration, "utf8");
    expect(sql).toContain("MedicationRecommendationOpsSnapshot");
    expect(sql).toContain("MedicationRecommendationReplayRun");
    expect(sql).toContain("MedicationRecommendationReplayFailure");
    expect(sql).toContain("MedicationRecommendationRollbackEvent");
    expect(sql).toContain("MedicationRecommendationDriftAlert");
    expect(sql).toContain("claimsApproval");
    expect(sql).toMatch(/mutatesPatientCare" = false/);
    expect(sql).toMatch(/interruptProviders" = false/);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});
