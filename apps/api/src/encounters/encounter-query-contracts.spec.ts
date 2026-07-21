import {
  assertAllEncounterQueryContractsExcludeD3,
  assertEncounterSelectExcludesD3Fields,
  ENCOUNTER_CORE_REQUIRED_COLUMNS,
  ENCOUNTER_FORBIDDEN_SELECT_KEYS,
  ENCOUNTER_QUERY_CONTRACTS,
} from "./encounter-query-contracts";

describe("Encounter query contracts (pre-/post-D3B)", () => {
  it("every named contract excludes D3B/D3C keys", () => {
    expect(() => assertAllEncounterQueryContractsExcludeD3()).not.toThrow();
    for (const [name, select] of Object.entries(ENCOUNTER_QUERY_CONTRACTS)) {
      for (const key of ENCOUNTER_FORBIDDEN_SELECT_KEYS) {
        expect(select).not.toHaveProperty(key);
      }
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("core required columns are non-empty and exclude hospitalEpisodeId", () => {
    expect(ENCOUNTER_CORE_REQUIRED_COLUMNS.length).toBeGreaterThan(10);
    expect(ENCOUNTER_CORE_REQUIRED_COLUMNS).not.toContain("hospitalEpisodeId");
    expect(ENCOUNTER_CORE_REQUIRED_COLUMNS).toContain("id");
    expect(ENCOUNTER_CORE_REQUIRED_COLUMNS).toContain("facilityId");
    expect(ENCOUNTER_CORE_REQUIRED_COLUMNS).toContain("status");
  });

  it("assert helper fails closed when D3 key leaks", () => {
    expect(() =>
      assertEncounterSelectExcludesD3Fields({ hospitalEpisodeId: true })
    ).toThrow(/hospitalEpisodeId/);
  });
});
