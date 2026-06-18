import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const panelPath = join(import.meta.dirname, "ExternalBillingExportCertificationPanel.tsx");

describe("externalBillingExportCertification panel (MEDUI.BILLING.EXTERNAL_EXPORT.1 + .2)", () => {
  const panel = readFileSync(panelPath, "utf8");

  it("renders Ready status label", () => {
    expect(panel).toContain("externalExportCertificationReady");
  });

  it("renders Ready with warnings status label", () => {
    expect(panel).toContain("externalExportCertificationReadyWithWarnings");
  });

  it("renders Not Ready status label", () => {
    expect(panel).toContain("externalExportCertificationNotReady");
  });

  it("supports daily, weekly, and monthly period modes", () => {
    expect(panel).toContain("periodMode");
    expect(panel).toContain("externalExportModeMonthly");
    expect(panel).toContain("externalExportModeWeekly");
    expect(panel).toContain("externalExportModeDaily");
  });

  it("shows encounters, lines, warnings, and blockers", () => {
    expect(panel).toContain("certification.encounterCount");
    expect(panel).toContain("certification.lineCount");
    expect(panel).toContain("certification.warnings");
    expect(panel).toContain("certification.blockers");
  });

  it("has no mutation buttons", () => {
    expect(panel).not.toContain("<button");
    expect(panel).not.toContain("submitClaim");
  });
});
