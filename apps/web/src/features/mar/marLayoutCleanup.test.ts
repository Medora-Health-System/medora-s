import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMarShiftTimelineTitle } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

describe("marLayoutCleanup (MEDUI.ED.UI.I18N_CLEANUP.1)", () => {
  const timeline = readFileSync(
    join(webRoot, "components/encounters/FacilityMarShiftTimeline.tsx"),
    "utf8"
  );
  const marTab = readFileSync(
    join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );
  const activeWs = readFileSync(
    join(webRoot, "features/emergency/EmergencyActiveWorkspaceView.tsx"),
    "utf8"
  );

  it("timeline title uses Shift Timeline not MAR Shift Timeline", () => {
    expect(buildMarShiftTimelineTitle("Wayne Urgent Care Emergency Room")).toBe(
      "Wayne Urgent Care Emergency Room Shift Timeline"
    );
    expect(buildMarShiftTimelineTitle("Wayne Urgent Care Emergency Room")).not.toContain(
      "MAR"
    );
  });

  it("timeline has compact metadata row", () => {
    expect(timeline).toContain('data-testid="mar-shift-timeline-metadata"');
  });

  it("timeline supports embedded layout for ED card", () => {
    expect(timeline).toContain('embedded?: boolean');
    expect(timeline).toContain('data-embedded={embedded ? "true" : "false"}');
  });

  it("MAR tab passes embeddedWorkspaceLayout to timeline", () => {
    expect(marTab).toContain("embeddedWorkspaceLayout");
    expect(marTab).toContain("embedded={embeddedWorkspaceLayout}");
  });

  it("ED workspace keeps card marTitle heading only", () => {
    expect(activeWs).toContain('t("emergencyWorkspace.marTitle")');
    expect(activeWs).toContain("embeddedWorkspaceLayout");
  });

  it("legacy duplicate marTab.title h3 remains gated", () => {
    expect(marTab).toContain("MAR_TAB_SHOW_LEGACY_SECTIONS");
  });
});
