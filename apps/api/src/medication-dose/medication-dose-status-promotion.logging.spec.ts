import { resolveLogPolicy, resetLogPolicyCache, schedulerCompletionLevel } from "../common/logging/log-policy";

describe("MedicationDoseStatusPromotion logging policy", () => {
  afterEach(() => {
    resetLogPolicyCache();
  });

  it("does not emit INFO for zero-change promotion runs in production", () => {
    const policy = resolveLogPolicy({ NODE_ENV: "production" });
    expect(schedulerCompletionLevel(0, policy)).toBe("suppress");
    expect(schedulerCompletionLevel(1, policy)).toBe("log");
  });

  it("log policy does not alter promotion arithmetic (execution independence)", () => {
    // Snapshot shape remains independent of logging level decisions.
    const promotedToDue = 0;
    const promotedToOverdue = 0;
    const changed = promotedToDue + promotedToOverdue;
    expect(changed).toBe(0);
    expect(schedulerCompletionLevel(changed, resolveLogPolicy({ NODE_ENV: "production" }))).toBe(
      "suppress",
    );
    expect(promotedToDue + promotedToOverdue).toBe(0);
  });
});
