import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EncounterClinicalSummaryDisplayMode,
  emergencyAllEncountersArchivePath,
  isEdEncounterClosedForArchive,
  resolveEncounterClinicalSummaryDisplayMode,
} from "@/features/emergency/edClosedChartDisplayMode";
import { emergencyChartPath, emergencyActiveWorkspacePath } from "@/features/emergency/emergencyRoutes";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED closed chart archive workflow", () => {
  it("treats CLOSED and CANCELLED as archive-closed from server status", () => {
    expect(isEdEncounterClosedForArchive("CLOSED")).toBe(true);
    expect(isEdEncounterClosedForArchive("CANCELLED")).toBe(true);
    expect(isEdEncounterClosedForArchive("OPEN")).toBe(false);
    expect(isEdEncounterClosedForArchive("closed")).toBe(true);
    expect(resolveEncounterClinicalSummaryDisplayMode("CLOSED")).toBe(
      EncounterClinicalSummaryDisplayMode.CLOSED_READ_ONLY
    );
    expect(resolveEncounterClinicalSummaryDisplayMode("OPEN")).toBe(
      EncounterClinicalSummaryDisplayMode.ACTIVE_SUMMARY
    );
  });

  it("All Encounters chart href targets emergency chart path (server status gates archive UI)", () => {
    const archive = readSrc("features/emergency/edAllEncountersArchive.ts");
    expect(archive).toContain("emergencyChartPath(row.id)");
    expect(emergencyChartPath("enc-1")).toBe("/app/emergency/chart/enc-1");
  });

  it("EmergencyChartView renders closed archive for closed encounters, not editable triage shell", () => {
    const chart = readSrc("features/emergency/EmergencyChartView.tsx");
    expect(chart).toContain("isEdEncounterClosedForArchive");
    expect(chart).toContain("EmergencyClosedChartArchiveView");
    expect(chart).toMatch(/if \(isEdEncounterClosedForArchive\(encounter\.status\)\)/);
  });

  it("closed archive reuses EmergencyErSummaryClosureSurface in CLOSED_READ_ONLY mode", () => {
    const archiveView = readSrc("features/emergency/EmergencyClosedChartArchiveView.tsx");
    expect(archiveView).toContain("EmergencyErSummaryClosureSurface");
    expect(archiveView).toContain("CLOSED_READ_ONLY");
    expect(archiveView).toContain("summaryReadOnly");
    expect(archiveView).not.toContain("EmergencyTriagePanel");
    expect(archiveView).not.toContain("EmergencyErOrdersPanel");
    expect(archiveView).not.toContain("EmergencyDispositionPanel");
    expect(archiveView).not.toContain("emergencyChartView.linkMedoraEncounterRef");
    expect(archiveView).toContain("ed-closed-chart-readonly-badge");
    expect(archiveView).toContain("emergencyClosedChart.backToAllEncounters");
  });

  it("does not expose Open full encounter chart to ordinary closed-chart users", () => {
    const archiveView = readSrc("features/emergency/EmergencyClosedChartArchiveView.tsx");
    expect(archiveView).not.toContain("linkMedoraEncounterRef");
    expect(archiveView).toContain("canOpenAdminControlledFullChart");
    expect(archiveView).toContain("emergencyClosedChart.adminControlledFullChart");
  });

  it("active workspace redirects closed encounters to chart summary", () => {
    const active = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain("isEdEncounterClosedForArchive");
    expect(active).toContain("router.replace(emergencyChartPath(encounter.id))");
    expect(active).toContain("ed-active-workspace-closed-redirect");
    expect(emergencyActiveWorkspacePath("enc-1")).toBe("/app/emergency/active/enc-1");
  });

  it("back navigation restores All Encounters board via query", () => {
    expect(emergencyAllEncountersArchivePath()).toBe(
      "/app/emergency/trackboard?board=allEncounters"
    );
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('board === "allEncounters"');
    expect(trackboard).toContain("useSearchParams");
  });

  it("All Encounters action label is View chart (Demo unchanged)", () => {
    const table = readSrc("features/emergency/EdAllEncountersArchiveTable.tsx");
    expect(table).toContain("edLifecycle.allEncounters.actions.chart");
    expect(table).toContain("edLifecycle.allEncounters.actions.demo");
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain('chart: "View chart"');
    expect(fr).toContain('chart: "Voir le dossier"');
    expect(en).toContain("emergencyClosedChart:");
    expect(fr).toContain("emergencyClosedChart:");
    expect(en).toContain("Closed encounter — read only");
    expect(fr).toContain("Rencontre clôturée — lecture seule");
  });

  it("closure surface hides end-encounter controls in CLOSED_READ_ONLY", () => {
    const closure = readSrc("features/emergency/EmergencyErSummaryClosureSurface.tsx");
    expect(closure).toContain('summaryDisplayMode === "CLOSED_READ_ONLY"');
    expect(closure).toContain("open && !isClosedReadOnlyArchive");
  });

  it("summary display mode prop is plumbed through visit summary and clinical record", () => {
    const panel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");
    const clinical = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(panel).toContain("summaryDisplayMode");
    expect(clinical).toContain("summaryDisplayMode");
    expect(clinical).toContain('data-testid="encounter-clinical-record-summary"');
  });
});
