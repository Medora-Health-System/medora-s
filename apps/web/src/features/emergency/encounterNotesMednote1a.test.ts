/**
 * MEDNOTE.1A — legal chart safety guards (append-only, full body, legacy immutability).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSrcRoot = join(import.meta.dirname, "../..");
const panelSource = readFileSync(
  join(webSrcRoot, "features/emergency/EmergencyErNotesPanel.tsx"),
  "utf8"
);
const chartTabsSource = readFileSync(
  join(webSrcRoot, "components/patient-chart/PatientChartClinicalTabs.tsx"),
  "utf8"
);
const printLayoutSource = readFileSync(
  join(webSrcRoot, "components/patient-chart/PatientChartPrintLayout.tsx"),
  "utf8"
);
const summaryPanelSource = readFileSync(
  join(webSrcRoot, "features/emergency/EmergencyVisitSummaryPanel.tsx"),
  "utf8"
);
const controllerSource = readFileSync(
  join(webSrcRoot, "../../api/src/encounters/encounters.controller.ts"),
  "utf8"
);
const serviceSource = readFileSync(
  join(webSrcRoot, "../../api/src/encounters/encounter-notes.service.ts"),
  "utf8"
);
const chartExportHtmlSource = readFileSync(
  join(webSrcRoot, "../../api/src/encounters/chart-export-html.util.ts"),
  "utf8"
);
const chartExportServiceSource = readFileSync(
  join(webSrcRoot, "../../api/src/encounters/chart-export.service.ts"),
  "utf8"
);

describe("MEDNOTE.1A legal chart hardening guards", () => {
  it("patient chart renders full note body for legal record", () => {
    expect(chartTabsSource).toContain("encounterNotes");
    expect(chartTabsSource).toContain("{note.body}");
    expect(chartTabsSource).not.toContain("encounterNotePreview");
  });

  it("print layout renders full note body", () => {
    expect(printLayoutSource).toContain("note.body");
    expect(printLayoutSource).not.toContain("encounterNotePreview");
  });

  it("ED visit summary renders full note body", () => {
    expect(summaryPanelSource).toContain("encounter.encounterNotes");
    expect(summaryPanelSource).toContain("{note.body");
    expect(summaryPanelSource).not.toContain("encounterNotePreview");
  });

  it("chart export HTML and JSON manifest include full note body field", () => {
    expect(chartExportHtmlSource).toContain("encounterNotes");
    expect(chartExportHtmlSource).toContain("n.body");
    expect(chartExportServiceSource).toContain("mapEncounterNoteForLegalChart");
    expect(chartExportServiceSource).toContain("body:");
    expect(chartExportServiceSource).not.toContain("encounterNotePreview");
  });

  it("sidebar registry may preview but supports expand to full body", () => {
    expect(panelSource).toContain("encounterNotePreview");
    expect(panelSource).toContain("encounter-note-full-body");
    expect(panelSource).toContain("encounter-note-preview-body");
  });

  it("legacy erNotesV1 notes are read-only in registry", () => {
    expect(panelSource).toContain("legacyBadge");
    expect(panelSource).toContain("data-legacy-readonly");
    expect(panelSource).not.toContain("mergeErNotesV1IntoNursingAssessment");
    expect(serviceSource).not.toMatch(/erNotesV1.*update|nursingAssessment.*update/i);
  });

  it("append-only API — no PATCH/PUT note body routes; body never updated in place", () => {
    expect(controllerSource).toContain('@Post("encounters/:id/notes")');
    expect(controllerSource).toContain('@Get("encounters/:id/notes")');
    expect(controllerSource).not.toMatch(/@Patch\("encounters\/:id\/notes/i);
    expect(controllerSource).not.toMatch(/@Put\("encounters\/:id\/notes/i);
    expect(serviceSource).toContain("encounterNote.create");
    expect(serviceSource).not.toMatch(/update\(\{[\s\S]*body:/);
    expect(serviceSource).not.toMatch(/encounterNote\.(upsert|delete)/);
  });

  it("audit uses allowlisted metadata builder", () => {
    expect(serviceSource).toContain("buildEncounterNoteAuditMetadata");
    expect(serviceSource).toContain("assertEncounterNoteAuditMetadataSafe");
  });

  it("responsive layout avoids clipped save and registry overflow", () => {
    expect(panelSource).toContain("maxWidth: \"100%\"");
    expect(panelSource).toContain("overflowY: \"auto\"");
    expect(panelSource).toContain("overflowWrap: \"anywhere\"");
    expect(panelSource).toContain("matchMedia(\"(max-width: 900px)\")");
  });
});
