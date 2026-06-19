import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildClinicalDataSummaryProjection } from "@medora/shared";
import { STROKE_NIHSS_CARD_ID } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataSummaryProjection (MEDUI.ED.CLINICAL_DATA.2)", () => {
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("15 — date/time uses facility timezone helper", () => {
    expect(summary).toContain("formatClinicalInstantForFacility");
    expect(summary).toContain("facilityTimeZone");
  });

  it("16 — facility timezone passed from panel", () => {
    expect(panel).toContain("facilityTimeZone={facilityTimeZone}");
    expect(panel).toContain("EmergencyClinicalDataSummary");
  });

  it("17 — English summary section label wired", () => {
    expect(summary).toContain("emergencyClinicalData.summary.clinicalSummary");
    expect(summary).toContain("emergencyClinicalData.summary.sections.neurology");
  });

  it("18 — French-capable section keys mirrored in i18n source", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain('clinicalSummary: "Clinical Summary"');
    expect(fr).toContain('clinicalSummary: "Résumé clinique"');
    expect(fr).toContain('neurology: "Neurologie"');
  });

  it("19 — no duplicate API fetch in hub when skipEntriesFetch", () => {
    expect(panel).toContain("skipEntriesFetch");
    expect(panel).toContain("externalEntries={entries}");
    expect(hub).toContain("skipEntriesFetch");
    expect(hub).toContain("if (skipEntriesFetch) return");
  });

  it("20 — projection wired in summary component", () => {
    expect(summary).toContain("buildClinicalDataSummaryProjection");
    expect(summary).toContain("emergency-clinical-data-summary");
  });

  it("22 — read-only mode preserved (panel uses review hub)", () => {
    expect(panel).toContain('accessMode="review"');
  });

  it("23 — Clinical Data tile unchanged in active workspace", () => {
    const activeView = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(activeView).toContain("ed-dashboard-tile-clinical-data");
    expect(activeView).toContain("EmergencyClinicalDataPanel");
  });

  it("24 — Nursing Assessment unchanged", () => {
    const nursing = readSrc("features/emergency/EmergencyNursingReassessmentPanel.tsx");
    expect(nursing).toContain("<ClinicalDocumentationHub");
    expect(nursing).not.toContain("skipEntriesFetch");
  });

  it("NIHSS value surfaces in summary projection integration", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        {
          id: "e1",
          cardId: STROKE_NIHSS_CARD_ID,
          category: "STROKE_DOCUMENTATION",
          cardTitleEn: "NIHSS",
          cardTitleFr: "NIHSS",
          authorDisplayName: "Elizabeth Posada",
          authorRoleTitle: "RN",
          createdAt: "2026-06-19T13:12:00.000Z",
          voidedAt: null,
          payloadJson: {
            assessedAt: "2026-06-19T13:12:00.000Z",
            levelOfConsciousness: 0,
            locQuestions: 1,
            locCommands: 0,
            bestGaze: 0,
            visualFields: 0,
            facialPalsy: 1,
            motorArmLeft: 2,
            motorArmRight: 0,
            motorLegLeft: 1,
            motorLegRight: 0,
            limbAtaxia: 0,
            sensory: 0,
            bestLanguage: 0,
            dysarthria: 0,
            extinctionInattention: 0,
            totalScore: 8,
          },
        },
      ],
      locale: "en",
    });
    const neuro = projection.sections.find((s) => s.sectionId === "NEUROLOGY");
    expect(neuro?.metrics.some((m) => m.value === "8")).toBe(true);
  });
});
