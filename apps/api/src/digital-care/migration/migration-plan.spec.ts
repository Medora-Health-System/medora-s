import {
  DIGITAL_CARE_MIGRATION_INVARIANTS,
  DIGITAL_CARE_MIGRATION_STAGES,
} from "./migration-plan";

describe("Digital Care migration plan", () => {
  it("uses the required progressive cutover sequence", () => {
    expect(DIGITAL_CARE_MIGRATION_STAGES.map((stage) => stage.id)).toEqual([
      "coexistence",
      "read-adapters",
      "capability-cutover",
      "write-ownership",
      "legacy-retirement",
    ]);
  });

  it("gives every stage a rollback path", () => {
    for (const stage of DIGITAL_CARE_MIGRATION_STAGES) {
      expect(stage.rollback.length).toBeGreaterThan(0);
    }
  });

  it("explicitly forbids destructive DC-1H database migration", () => {
    expect(DIGITAL_CARE_MIGRATION_INVARIANTS).toContain(
      "No destructive database migration is authorized by DC-1H.",
    );
  });
});
