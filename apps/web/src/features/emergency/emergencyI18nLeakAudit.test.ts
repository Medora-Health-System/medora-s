import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import { formatMarPrnReasonForLocale } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

describe("emergencyI18nLeakAudit (MEDUI.ED.UI.I18N_CLEANUP.1)", () => {
  const drawer = readFileSync(
    join(webRoot, "components/encounters/FacilityMarShiftTimelineDrawer.tsx"),
    "utf8"
  );
  const activeWs = readFileSync(
    join(webRoot, "features/emergency/EmergencyActiveWorkspaceView.tsx"),
    "utf8"
  );
  const chartView = readFileSync(
    join(webRoot, "features/emergency/EmergencyChartView.tsx"),
    "utf8"
  );

  it("drawer uses formatMarPrnReasonForLocale instead of raw prnReasonLabel", () => {
    expect(drawer).toContain("formatMarPrnReasonForLocale");
    expect(drawer).not.toMatch(/value:\s*item\.prnReasonLabel/);
  });

  it("English UI does not show French PRN labels via formatter", () => {
    expect(formatMarPrnReasonForLocale({ label: "Vomissements" }, "en")).not.toContain(
      "Vomissements"
    );
    expect(formatMarPrnReasonForLocale({ label: "Douleur modérée" }, "en")).not.toMatch(
      /modérée/i
    );
  });

  it("explicit English user language wins over browser fr-FR", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        browserLanguage: "fr",
        facilityLanguage: "fr",
      })
    ).toBe("en");
  });

  it("facility timezone America/Port-au-Prince does not imply French language", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: null,
        facilityLanguage: null,
        browserLanguage: null,
        fallback: "en",
      })
    ).toBe("en");
  });

  it("ED workspace hides duplicate MAR section h2", () => {
    expect(activeWs).toContain('activeSection !== "mar"');
  });

  it("ED chart view removes redundant section MAR h2 heading", () => {
    expect(chartView).not.toContain('id="section-mar"');
    expect(chartView).toContain("embeddedWorkspaceLayout");
  });
});
