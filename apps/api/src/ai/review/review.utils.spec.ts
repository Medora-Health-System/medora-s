import { buildStableSuggestionId } from "./review.utils.js";

describe("buildStableSuggestionId", () => {
  it("returns the same UUID for the same finding in the same snapshot", () => {
    const input = {
      snapshotVersion: "snapshot-v1",
      source: "deterministic",
      category: "CLINICAL_SAFETY",
      title: "Critical result requires acknowledgement",
    };

    const first = buildStableSuggestionId(input);
    const second = buildStableSuggestionId(input);

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("changes identity when snapshot provenance changes", () => {
    const base = {
      source: "deterministic",
      category: "CLINICAL_SAFETY",
      title: "Critical result requires acknowledgement",
    };

    expect(buildStableSuggestionId({ ...base, snapshotVersion: "snapshot-v1" }))
      .not.toBe(buildStableSuggestionId({ ...base, snapshotVersion: "snapshot-v2" }));
  });
});
