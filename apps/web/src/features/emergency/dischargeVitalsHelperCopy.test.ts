import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("discharge vitals helper copy removed", () => {
  it("does not render measuredAt/recorder helper sentences in nursing discharge or compact section", () => {
    const discharge = readFileSync(
      join(import.meta.dirname, "NursingDischargeExecutionSection.tsx"),
      "utf8"
    );
    const compact = readFileSync(
      join(import.meta.dirname, "EmergencyTriageVitalsCompactSection.tsx"),
      "utf8"
    );
    expect(discharge).not.toContain("nursingDischargeVitals.saveHint");
    expect(compact).not.toContain("vitalsContext.saveVitalsHint");
    expect(discharge).toContain("nursingDischargeVitals.saveDischargeVitals");
    expect(compact).toContain("vitalsContext.measuredDate");
    expect(compact).toContain("vitalsContext.measuredTime");
  });
});
