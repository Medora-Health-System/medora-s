import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EdEncounterLifecycleState, ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import {
  resolveIncompleteChartsEncounters,
  resolveMyIncompleteChartsEncounters,
  resolveTrackboardEncounterLifecycleState,
} from "./edIncompleteChartsFilter";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function ctx(userId = "rn-1", roles: string[] = ["RN"]) {
  return { currentUserId: userId, roles };
}

function departedIncomplete(id: string, assignee = "rn-1") {
  return {
    id,
    status: "OPEN",
    type: "EMERGENCY",
    nurseAssignedUserId: assignee,
    chiefComplaint: "Pain",
    providerNote: "Note",
    providerDocumentationStatus: "DRAFT",
    dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
    nursingAssessment: {
      nursingEvalV1: { sections: { assessment: { text: "Done" } } },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "RN",
      },
    },
  };
}

describe("edMyIncompleteChartsFilter (MEDUI.ED.LIFECYCLE.5B)", () => {
  it("INCOMPLETE_CHART assigned appears in My Incomplete Charts", () => {
    const rows = [departedIncomplete("e1")];
    expect(resolveTrackboardEncounterLifecycleState(rows[0]!)).toBe(
      EdEncounterLifecycleState.INCOMPLETE_CHART
    );
    expect(resolveMyIncompleteChartsEncounters(rows, ctx())).toHaveLength(1);
  });

  it("READY_FOR_CLOSURE assigned appears in My Incomplete Charts", () => {
    const rows = [
      {
        ...departedIncomplete("e2", "rn-1"),
        chiefComplaint: "Abdominal pain",
        providerNote: "Stable",
        providerDocumentationStatus: "SIGNED",
        dispositionSafetyReadiness: { canClose: true },
      },
    ];
    expect(resolveTrackboardEncounterLifecycleState(rows[0]!)).toBe(
      EdEncounterLifecycleState.READY_FOR_CLOSURE
    );
    expect(resolveMyIncompleteChartsEncounters(rows, ctx())).toHaveLength(1);
  });

  it("unassigned incomplete chart does not appear in My Incomplete Charts", () => {
    const rows = [departedIncomplete("e3", "other-rn")];
    expect(resolveMyIncompleteChartsEncounters(rows, ctx())).toEqual([]);
  });

  it("global incomplete charts filter still includes all departed incomplete rows", () => {
    const rows = [departedIncomplete("e4", "other-rn"), departedIncomplete("e5", "rn-1")];
    expect(resolveIncompleteChartsEncounters(rows)).toHaveLength(2);
    expect(resolveMyIncompleteChartsEncounters(rows, ctx())).toHaveLength(1);
  });

  it("trackboard uses personalized incomplete charts filter", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyIncompleteChartsEncounters");
    expect(trackboard).not.toMatch(/incompleteChartsBase[\s\S]{0,80}resolveIncompleteChartsEncounters\(/);
  });

  it("My Incomplete Charts counter uses assigned incomplete base", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('view === "incompleteCharts" && incompleteChartsBase.length > 0');
  });

  it("empty state uses personalized incomplete charts copy", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('data-testid="ed-incomplete-charts-empty"');
    expect(trackboard).toContain("edLifecycle.incompleteCharts.empty");
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain("No incomplete charts are currently assigned to you.");
    expect(fr).toContain("Aucun dossier incomplet ne vous est actuellement assigné.");
  });

  it("tab label renamed to My Incomplete Charts", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain('incompleteCharts: "My Incomplete Charts"');
    expect(fr).toContain('incompleteCharts: "Mes dossiers incomplets"');
  });
});
