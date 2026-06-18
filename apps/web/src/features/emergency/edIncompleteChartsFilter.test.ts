import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  EdEncounterLifecycleState,
  ED_DISCHARGE_MODE_HOME,
} from "@medora/shared";
import {
  buildEdTrackboardLifecycleSnapshot,
  resolveActiveTrackboardEncounters,
  resolveEdIncompleteChartBadgeKeys,
  resolveIncompleteChartsEncounters,
  resolveTrackboardEncounterLifecycleState,
} from "./edIncompleteChartsFilter";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function departedIncompleteRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    status: "OPEN",
    type: "EMERGENCY",
    chiefComplaint: "Abdominal pain",
    providerNote: "Stable",
    providerDocumentationStatus: "DRAFT",
    dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
    nursingAssessment: {
      nursingEvalV1: {
        sections: { assessment: { text: "Nursing assessment documented" } },
      },
      erDispositionExecutionV1: {
        dischargeSortieCompletedAt: "2026-06-03T12:00:00.000Z",
        dischargeSortieCompletedByDisplayName: "Marie Infirmière",
      },
    },
    ...overrides,
  };
}

function activeEdRow(id: string) {
  return {
    id,
    status: "OPEN",
    type: "EMERGENCY",
    chiefComplaint: "Headache",
    dischargeSummaryJson: null,
    nursingAssessment: {
      nursingEvalV1: {
        sections: { assessment: { text: "Assessment" } },
      },
    },
  };
}

function dispositionOrderedRow(id: string) {
  return {
    id,
    status: "OPEN",
    type: "EMERGENCY",
    chiefComplaint: "Chest pain",
    dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
    nursingAssessment: {
      nursingEvalV1: {
        sections: { assessment: { text: "Assessment" } },
      },
    },
  };
}

describe("edIncompleteChartsFilter (MEDUI.ED.LIFECYCLE.5)", () => {
  it("excludes ACTIVE_ED from incomplete charts", () => {
    const rows = [activeEdRow("e-active")];
    expect(resolveIncompleteChartsEncounters(rows)).toEqual([]);
    expect(resolveTrackboardEncounterLifecycleState(rows[0]!)).toBe(
      EdEncounterLifecycleState.ACTIVE_ED
    );
  });

  it("excludes DISPOSITION_ORDERED from incomplete charts", () => {
    const rows = [dispositionOrderedRow("e-disp")];
    expect(resolveIncompleteChartsEncounters(rows)).toEqual([]);
    expect(resolveTrackboardEncounterLifecycleState(rows[0]!)).toBe(
      EdEncounterLifecycleState.DISPOSITION_ORDERED
    );
  });

  it("includes INCOMPLETE_CHART after physical departure", () => {
    const rows = [departedIncompleteRow("e-inc")];
    expect(resolveIncompleteChartsEncounters(rows).map((r) => r.id)).toEqual(["e-inc"]);
  });

  it("excludes READY_FOR_CLOSURE from incomplete charts and active trackboard", () => {
    const row = {
      ...departedIncompleteRow("e-ready"),
      providerDocumentationStatus: "SIGNED",
      dispositionSafetyReadiness: { canClose: true },
    };
    const state = resolveTrackboardEncounterLifecycleState(row);
    expect(state).toBe(EdEncounterLifecycleState.READY_FOR_CLOSURE);
    expect(resolveIncompleteChartsEncounters([row])).toEqual([]);
    expect(resolveActiveTrackboardEncounters([row])).toEqual([]);
  });

  it("excludes CLOSED_ENCOUNTER", () => {
    const row = {
      ...departedIncompleteRow("e-closed"),
      status: "CLOSED",
      providerDocumentationStatus: "DRAFT",
    };
    expect(resolveIncompleteChartsEncounters([row])).toEqual([]);
    expect(resolveTrackboardEncounterLifecycleState(row)).toBe(
      EdEncounterLifecycleState.CLOSED_ENCOUNTER
    );
  });

  it("excludes ARCHIVED_ALL_ENCOUNTERS", () => {
    const row = {
      ...departedIncompleteRow("e-arch"),
      status: "CLOSED",
      providerDocumentationStatus: "SIGNED",
    };
    expect(resolveIncompleteChartsEncounters([row])).toEqual([]);
    expect(resolveTrackboardEncounterLifecycleState(row)).toBe(
      EdEncounterLifecycleState.ARCHIVED_ALL_ENCOUNTERS
    );
  });

  it("search helper is wired independently for incomplete charts", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("filterOpenEncountersBySearch(incompleteChartsBase, search, t)");
    expect(trackboard).toContain("filterOpenEncountersBySearch(activeTrackboardBase, search, t)");
    expect(trackboard).toContain("filterOpenEncountersBySearch(myPatientsBase, search, t)");
  });

  it("tab counters use lifecycle-filtered bases", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('view === "trackboard" && activeTrackboardBase.length > 0');
    expect(trackboard).toContain('view === "incompleteCharts" && incompleteChartsBase.length > 0');
  });

  it("active trackboard excludes incomplete charts", () => {
    const rows = [activeEdRow("a1"), dispositionOrderedRow("d1"), departedIncompleteRow("i1")];
    expect(resolveActiveTrackboardEncounters(rows).map((r) => r.id)).toEqual(["a1", "d1"]);
    expect(resolveIncompleteChartsEncounters(rows).map((r) => r.id)).toEqual(["i1"]);
  });

  it("my patients filter still uses full emergencyOnly set", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyPatientsEncounters(emergencyOnly, myPatientsFilterCtx)");
    expect(trackboard).not.toMatch(
      /resolveMyPatientsEncounters\(activeTrackboardBase/
    );
  });

  it("assignment controls remain on encounter cards", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("assignProviderSelf");
    expect(trackboard).toContain("assignNurseSelf");
    expect(trackboard).toContain("encounterListRows.map");
  });

  it("lifecycle projection is used for incomplete charts classification", () => {
    const filterSrc = readSrc("features/emergency/edIncompleteChartsFilter.ts");
    expect(filterSrc).toContain("resolveEdEncounterLifecycleState");
    expect(filterSrc).toContain("buildEdEncounterLifecycleProjection");
    expect(buildEdTrackboardLifecycleSnapshot(activeEdRow("x")).encounterType).toBe("EMERGENCY");
  });

  it("no API calls added in incomplete charts filter module", () => {
    const filterSrc = readSrc("features/emergency/edIncompleteChartsFilter.ts");
    expect(filterSrc).not.toContain("apiFetch");
    expect(filterSrc).not.toContain("fetchOpenEncounters");
  });

  it("no status mutation in trackboard view lifecycle wiring", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).not.toContain("/close");
    expect(trackboard).not.toMatch(/status:\s*["']CLOSED["']/);
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("resolveIncompleteChartsEncounters");
  });

  it("patient chart links remain accessible on list cards", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("emergencyChartPath(encounter.id)");
    expect(trackboard).toContain("emergencyActiveWorkspacePath(encounter.id)");
    expect(resolveEdIncompleteChartBadgeKeys(departedIncompleteRow("e1")).length).toBeGreaterThan(0);
  });
});
