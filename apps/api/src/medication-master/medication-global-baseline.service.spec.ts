import { MEDICATION_BASELINE_SOURCE_PRIORITY_ER } from "./medication-baseline.constants";

describe("medication-global-baseline (19H)", () => {
  it("defines PRIORITY_ER_INVENTORY baseline source", () => {
    expect(MEDICATION_BASELINE_SOURCE_PRIORITY_ER).toBe("PRIORITY_ER_INVENTORY");
  });
});
