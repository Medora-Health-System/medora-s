import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataSavePath (MEDUI.ED.CLINICAL_DATA.4)", () => {
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const apiController = readFileSync(
    join(webRoot, "../../../apps/api/src/encounters/encounters.controller.ts"),
    "utf8"
  );
  const apiService = readFileSync(
    join(webRoot, "../../../apps/api/src/encounters/clinical-documentation.service.ts"),
    "utf8"
  );

  it("22 — Provider save uses existing createClinicalDocumentationEntry handler", () => {
    expect(hub).toContain("createClinicalDocumentationEntry(");
    expect(hub).toContain("!cardIsReviewMode(c) && expandedCardId");
  });

  it("23 — Provider save refreshes recent entries via onEntriesChanged", () => {
    expect(panel).toContain("onEntriesChanged={loadEntries}");
    expect(hub).toContain("onEntriesChanged?.()");
  });

  it("24 — Save refresh updates summary projection through shared entries state", () => {
    expect(panel).toContain("setEntries");
    expect(panel).toContain("EmergencyClinicalDataSummary");
    expect(panel).toContain("externalEntries={entries}");
  });

  it("Backend permits PROVIDER role on clinical documentation create", () => {
    expect(apiController).toContain("createClinicalDocumentationEntry");
    expect(apiController).toMatch(/RequireRoles\([^)]*RoleCode\.PROVIDER/);
  });

  it("Backend does not block save by form owner role", () => {
    expect(apiService).toContain("assertClinicalDocumentationEntryCreateAllowed");
    expect(apiService).not.toContain("primaryRole");
    expect(apiService).not.toContain("formOwner");
  });

  it("25 — Nursing Assessment hub unchanged (default workspace, own fetch)", () => {
    const nursing = readSrc("features/emergency/EmergencyNursingReassessmentPanel.tsx");
    expect(nursing).toContain("<ClinicalDocumentationHub");
    expect(nursing).not.toContain('workspaceContext="clinicalData"');
    expect(nursing).not.toContain("skipEntriesFetch");
  });

  it("26 — Existing projection still wired", () => {
    const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");
    expect(summary).toContain("buildClinicalDataSummaryProjection");
  });

  it("28 — No new API endpoint in panel", () => {
    expect(panel).not.toContain("fetch(");
    expect(panel).toContain("fetchClinicalDocumentationEntries");
  });

  it("29 — No duplicate storage; panel reads existing entries API", () => {
    expect(panel).not.toContain("createClinicalDocumentationEntry");
    expect(panel).toContain("fetchClinicalDocumentationEntries");
  });
});
