import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "medicationMasterGovernanceApi.ts"),
  "utf8"
);

describe("medicationMasterGovernanceApi — read-only governance", () => {
  it("uses GET only", () => {
    expect(source).toMatch(/method:\s*["']GET["']/);
    expect(source).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
  });

  it("exposes governance summary, warnings, unmapped, duplicates", () => {
    expect(source).toContain("fetchMedicationGovernanceSummary");
    expect(source).toContain("fetchMedicationGovernanceWarnings");
    expect(source).toContain("fetchMedicationGovernanceUnmapped");
    expect(source).toContain("fetchMedicationGovernanceDuplicates");
    expect(source).not.toMatch(/activate|promoteStaging|importStaging/i);
  });

  it("unmapped rows are confident UNMAPPED only", () => {
    expect(source).toContain('matchConfidence: "UNMAPPED"');
  });
});
