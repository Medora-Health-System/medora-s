import { emptyTrackboardOperationalAggregate, mergeOperationalIntoEncounters } from "./trackboard-operational.util";

describe("trackboard-operational.util — Phase 10B", () => {
  it("mergeOperationalIntoEncounters attaches defaults when map misses an id", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const map = new Map([["a", { ...emptyTrackboardOperationalAggregate(), resultsPendingCount: 3 }]]);
    const merged = mergeOperationalIntoEncounters(rows, map);
    expect(merged).toHaveLength(2);
    expect(merged[0].trackboardOps.resultsPendingCount).toBe(3);
    expect(merged[1].trackboardOps.resultsPendingCount).toBe(0);
    expect(merged[1].trackboardOps.criticalResultUnacknowledged).toBe(false);
  });
});
