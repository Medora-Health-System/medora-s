import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import { formatMarPrnReasonForLocale } from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const webRoot = join(import.meta.dirname, "../..");
const emergencyRoot = join(webRoot, "features/emergency");

function readSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function listEmergencySources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?)$/.test(entry) && !/\.(test|spec)\.(tsx?|jsx?)$/.test(entry)) {
        out.push(full);
      }
    }
  };
  walk(emergencyRoot);
  return out;
}

describe("emergencyDepartmentI18nAudit (MEDUI.ED.I18N.AUDIT.1)", () => {
  const emergencySources = listEmergencySources().map((p) => readFileSync(p, "utf8")).join("\n");

  it("dashboard labels use i18n", () => {
    const dashboard = readSource("features/emergency/EmergencyTrackboardView.tsx");
    expect(dashboard).toContain("useI18n");
    expect(dashboard).toContain("t(");
  });

  it("orders labels use i18n", () => {
    const orders = readSource("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(orders).toContain("useI18n");
    expect(orders).toContain("t(");
  });

  it("orders event titles do not cross-fallback French into English session", () => {
    const orders = readSource("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(orders).not.toMatch(/language === "fr" \? fr \|\| en : en \|\| fr/);
    expect(orders).toMatch(/language === "fr" \? fr \|\| en : en/);
  });

  it("results labels use locale-aware order display", () => {
    const results = readSource("features/emergency/EmergencyResultsPanel.tsx");
    expect(results).toContain("useI18n");
    expect(results).toContain("getOrderItemDisplayLabelForLanguage");
  });

  it("nurse assessment labels use i18n", () => {
    const nursing = readSource("features/emergency/EmergencyNursingReassessmentPanel.tsx");
    expect(nursing).toContain("useI18n");
    expect(nursing).toContain("t(");
  });

  it("MAR tab uses locale-aware medication labels", () => {
    const mar = readSource("components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("getOrderItemDisplayLabelForLanguage");
    expect(mar).toContain("FacilityMarShiftTimeline");
  });

  it("summary labels use i18n", () => {
    const summary = readSource("features/emergency/EmergencyVisitSummaryPanel.tsx");
    expect(summary).toContain("useI18n");
    expect(summary).toContain("t(");
  });

  it("disposition labels use i18n", () => {
    const disposition = readSource("features/emergency/EmergencyDispositionPanel.tsx");
    expect(disposition).toContain("useI18n");
    expect(disposition).toContain("t(");
  });

  it("ED production modules do not hardcode locale fr object literals", () => {
    expect(emergencySources).not.toMatch(/locale:\s*["']fr["']/);
  });

  it("ED production modules branch on active language for locale formatters", () => {
    expect(emergencySources).toContain("language === \"fr\"");
  });

  it("ED production modules avoid bare displayLabelFr || displayLabelEn fallbacks", () => {
    expect(emergencySources).not.toMatch(/displayLabelFr\s*\|\|\s*displayLabelEn/);
    expect(emergencySources).not.toMatch(/displayNameFr\s*\?\.\s*trim\(\)\s*\|\|\s*displayNameEn/);
  });

  it("order display uses locale-aware getOrderItemDisplayLabelForLanguage", () => {
    const orders = readSource("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(orders).toContain("getOrderItemDisplayLabelForLanguage");
  });

  it("MAR drawer uses locale-aware PRN formatter", () => {
    const drawer = readSource("components/encounters/FacilityMarShiftTimelineDrawer.tsx");
    expect(drawer).toContain("formatMarPrnReasonForLocale");
  });

  it("English MAR drawer does not render Douleur modérée", () => {
    expect(formatMarPrnReasonForLocale({ label: "Douleur modérée" }, "en")).not.toBe(
      "Douleur modérée"
    );
  });

  it("English MAR drawer does not render Vomissements", () => {
    expect(formatMarPrnReasonForLocale({ label: "Vomissements" }, "en")).not.toBe("Vomissements");
  });

  it("English MAR drawer renders moderate pain", () => {
    expect(formatMarPrnReasonForLocale({ code: "moderate_pain" }, "en")).toBe("Moderate pain");
  });

  it("English MAR drawer renders vomiting", () => {
    expect(formatMarPrnReasonForLocale({ code: "vomiting" }, "en")).toBe("Vomiting");
  });

  it("French MAR drawer renders douleur modérée", () => {
    expect(formatMarPrnReasonForLocale({ code: "moderate_pain" }, "fr")).toBe("Douleur modérée");
  });

  it("French MAR drawer renders vomissements", () => {
    expect(formatMarPrnReasonForLocale({ code: "vomiting" }, "fr")).toBe("Vomissements");
  });

  it("browser fr-FR does not override explicit English", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "en",
        browserLanguage: "fr",
      })
    ).toBe("en");
  });

  it("no stored language with browser fr defaults to English", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: null,
        facilityLanguage: null,
        cachedFacilityLanguage: null,
        browserLanguage: "fr",
      })
    ).toBe("en");
  });

  it("America/Chicago timezone does not force English when user selected French", () => {
    expect(
      resolveClientUiLanguage({
        storedLanguage: "fr",
        browserLanguage: "en",
      })
    ).toBe("fr");
  });

  it("MAR top duplicate section heading is gated in ED workspace", () => {
    const activeWs = readSource("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(activeWs).toContain('activeSection !== "mar"');
    expect(activeWs).toContain('t("emergencyWorkspace.marTitle")');
  });

  it("MAR card title is Medication Administration in English messages", () => {
    expect(en.emergencyWorkspace.marTitle).toBe("Medication Administration");
    expect(en.marTab.title).toBe("Medication Administration");
    expect(en.emergencyWorkspace.sectionTitle.mar).toBe("Medication Administration");
    expect(fr.emergencyWorkspace.marTitle).toBe("Administration des médicaments");
  });

  it("timeline title fallback is Shift Timeline not MAR SHIFT TIMELINE", () => {
    expect(en.marShiftTimeline.titleFallback).toBe("Shift Timeline");
    expect(en.marShiftTimeline.titleFallback).not.toMatch(/MAR/i);
  });

  it("timeline metadata row is compact in FacilityMarShiftTimeline", () => {
    const timeline = readSource("components/encounters/FacilityMarShiftTimeline.tsx");
    expect(timeline).toContain('data-testid="mar-shift-timeline-metadata"');
    expect(timeline).toContain('data-testid="mar-shift-timeline-viewer"');
    expect(timeline).toContain('data-testid="mar-shift-timeline-current-time"');
  });
});
