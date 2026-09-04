import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dentalEncounterChartExportHtmlPath } from "./dentalEncounterChartExportPath";

const panelSrc = readFileSync(
  resolve(__dirname, "./EnterpriseDentalEncounterOverviewPanel.tsx"),
  "utf8"
);

describe("MEDUI.ES.1J.B dental chart-export active UI locale routing", () => {
  it("EN UI requests locale=en, FR locale=fr, ES locale=es", () => {
    expect(dentalEncounterChartExportHtmlPath("enc-1", "en")).toBe(
      "/encounters/enc-1/chart-export?format=html&locale=en"
    );
    expect(dentalEncounterChartExportHtmlPath("enc-1", "fr")).toBe(
      "/encounters/enc-1/chart-export?format=html&locale=fr"
    );
    expect(dentalEncounterChartExportHtmlPath("enc-1", "es")).toBe(
      "/encounters/enc-1/chart-export?format=html&locale=es"
    );
  });

  it("ES UI does not leak FR or EN on the request", () => {
    const es = dentalEncounterChartExportHtmlPath("enc-99", "es");
    expect(es).toContain("locale=es");
    expect(es).not.toContain("locale=fr");
    expect(es).not.toContain("locale=en");
  });

  it("missing/invalid locale resolves to product default EN only", () => {
    expect(dentalEncounterChartExportHtmlPath("enc-1", undefined)).toContain("locale=en");
    expect(dentalEncounterChartExportHtmlPath("enc-1", null)).toContain("locale=en");
    expect(dentalEncounterChartExportHtmlPath("enc-1", "")).toContain("locale=en");
    expect(dentalEncounterChartExportHtmlPath("enc-1", "de")).toContain("locale=en");
    expect(dentalEncounterChartExportHtmlPath("enc-1", undefined)).not.toContain("locale=fr");
  });

  it("caller uses active product UI language, not preferredLanguage, and does not hardcode FR", () => {
    expect(panelSrc).toContain("dentalEncounterChartExportHtmlPath(encounterId, language)");
    expect(panelSrc).not.toContain("locale=fr");
    expect(panelSrc).not.toContain('locale=en"');
    expect(panelSrc).not.toMatch(/preferredLanguage/);
    const helperSrc = readFileSync(
      resolve(__dirname, "./dentalEncounterChartExportPath.ts"),
      "utf8"
    );
    expect(helperSrc).toContain("resolveProductUiLanguageOrDefault(language)");
    expect(helperSrc).not.toMatch(/preferredLanguage/);
  });
});
