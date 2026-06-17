import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const componentSrc = readFileSync(
  join(process.cwd(), "src/components/mar/MedicationClinicalDateTimeField.tsx"),
  "utf8"
);

describe("MedicationClinicalDateTimeField (H9F)", () => {
  it("exposes datetime-local input with test ids", () => {
    expect(componentSrc).toContain('type="datetime-local"');
    expect(componentSrc).toContain("data-testid={`${testId}-input`}");
    expect(componentSrc).toContain("data-testid={`${testId}-now`}");
  });

  it("uses H9C timing override reason codes", () => {
    expect(componentSrc).toContain("MAR_MEDICATION_TIMING_OVERRIDE_REASON_CODES");
    expect(componentSrc).toContain("marTimingOverride.reason.");
  });

  it("shows documentedAt help and schedule hints", () => {
    expect(componentSrc).toContain("marClinicalTime.documentedAtHelp");
    expect(componentSrc).toContain("marClinicalTime.scheduledTime");
    expect(componentSrc).toContain("resolveMarUniversalClinicalTime");
  });
});
