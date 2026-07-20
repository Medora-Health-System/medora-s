import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import { resolveEdIncompleteChartBadgeKeys } from "@/features/emergency/edIncompleteChartsFilter";
import {
  INCOMPLETE_CHARTS_SUPPRESSED_BADGE_KEYS,
  resolveIncompleteChartsVisibleBadgeKeys,
  shouldShowIncompleteChartsAcuityChip,
  shouldShowIncompleteChartsBedStatusChip,
  shouldShowIncompleteChartsOpsChips,
  shouldShowIncompleteChartsOwnershipBadge,
} from "@/features/emergency/edIncompleteChartsUiCleanup";
import {
  shouldShowTrackboardBedStatusChip,
  shouldShowTrackboardOwnershipBadge,
} from "@/features/emergency/edTrackboardBadgeCleanup";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function departedIncompleteRow() {
  return {
    id: "e-inc",
    status: "OPEN",
    type: "EMERGENCY",
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

describe("edIncompleteChartsUiCleanup (MEDUI.ED.LIFECYCLE.6C)", () => {
  it("suppresses all certification deficiency badge keys on My Incomplete Charts cards", () => {
    const badges = resolveEdIncompleteChartBadgeKeys(departedIncompleteRow());
    expect(badges.length).toBeGreaterThan(0);
    expect(resolveIncompleteChartsVisibleBadgeKeys(badges)).toEqual([]);
    for (const key of badges) {
      expect(INCOMPLETE_CHARTS_SUPPRESSED_BADGE_KEYS).toContain(key);
    }
  });

  it("My Incomplete Charts hides Occupied bed status chip via view guard", () => {
    expect(shouldShowIncompleteChartsBedStatusChip("incompleteCharts")).toBe(false);
    expect(shouldShowTrackboardBedStatusChip("trackboard")).toBe(false);
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("shouldShowTrackboardBedStatusChip(boardViewMode)");
  });

  it("My Incomplete Charts hides Monitoring acuity chip via view guard", () => {
    expect(shouldShowIncompleteChartsAcuityChip("incompleteCharts")).toBe(false);
    expect(shouldShowIncompleteChartsAcuityChip("myPatients")).toBe(true);
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("shouldShowIncompleteChartsAcuityChip(boardViewMode)");
  });

  it("My Incomplete Charts hides Assigned to you ownership badge", () => {
    expect(shouldShowIncompleteChartsOwnershipBadge("incompleteCharts")).toBe(false);
    expect(shouldShowIncompleteChartsOwnershipBadge("myPatients")).toBe(false);
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("shouldShowIncompleteChartsOwnershipBadge(boardViewMode)");
    expect(trackboard).toContain("edLifecycle.myPatients.ownershipBadge");
  });

  it("hides individual deficiency badge labels on incomplete charts cards", () => {
    const en = readSrc("i18n/messages/en.ts");
    const hiddenLabels = [
      "incompleteChart:",
      "billingNotReady:",
      "providerSignatureNeeded:",
      "nursingDocumentationNeeded:",
      "documentationDeficiency:",
      "missingDocumentation:",
      "readyForClosure:",
    ];
    for (const label of hiddenLabels) {
      expect(en).toContain(label);
    }
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveIncompleteChartsVisibleBadgeKeys");
    expect(trackboard).toMatch(
      /incompleteChartsView[\s\S]{0,200}resolveIncompleteChartsVisibleBadgeKeys/
    );
  });

  it("My Incomplete Charts keeps Discharge and Completed disposition chips", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("primaryStatusLabel");
    expect(trackboard).toContain("executedBadge");
    expect(trackboard).not.toMatch(
      /incompleteChartsView[\s\S]{0,400}primaryStatusLabel[\s\S]{0,80}\? null/
    );
  });

  it("My Incomplete Charts keeps clickable patient-name workspace entry without Chart button", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).not.toContain('t("emergencyTrackboard.chartLink")');
    expect(trackboard).toContain("resolveEdBoardPatientNameHref");
    expect(trackboard).not.toContain('t("common.view")');
  });

  it("My Incomplete Charts keeps Assign me nurse action before self-assignment", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("assignNurseMeShort");
    expect(trackboard).toContain("isNurse && !isNurseMine");
  });

  it("My Incomplete Charts keeps Review certification as prominent first action", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('data-testid={`ed-certification-review-${encounter.id}`}');
    expect(trackboard).toContain("edLifecycle.incompleteCharts.reviewCertification");
    const actionBlock = trackboard.slice(
      trackboard.indexOf('boardViewMode === "incompleteCharts" ? ('),
      trackboard.indexOf("isProvider && !isPhysMine")
    );
    expect(actionBlock).toContain("reviewCertification");
  });

  it("Trackboard still shows active operational chips", () => {
    expect(shouldShowIncompleteChartsBedStatusChip("trackboard")).toBe(false);
    expect(shouldShowIncompleteChartsAcuityChip("trackboard")).toBe(true);
    expect(shouldShowIncompleteChartsOpsChips("trackboard")).toBe(true);
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("<EdBedStatusChip");
    expect(trackboard).toContain("acuityLabelKey(acuity)");
  });

  it("My Patients still shows ownership badge when applicable", () => {
    expect(shouldShowIncompleteChartsOwnershipBadge("myPatients")).toBe(false);
    expect(shouldShowIncompleteChartsAcuityChip("myPatients")).toBe(true);
  });

  it("certification panel still renders deficiencies", () => {
    const panel = readSrc("features/emergency/EdClosedEncounterCertificationPanel.tsx");
    expect(panel).toContain("advisoryFindings");
    expect(panel).toContain("establishedFindings");
    expect(panel).toContain("edLifecycle.certification.findingsTitle");
    expect(panel).not.toContain("resolveIncompleteChartsVisibleBadgeKeys");
  });

  it("does not delete i18n keys", () => {
    const en = readSrc("i18n/messages/en.ts");
    expect(en).toContain("incompleteChart: \"Incomplete Chart\"");
    expect(en).toContain("reviewCertification: \"Review certification\"");
  });

  it("no lifecycle filtering regression", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyIncompleteChartsEncounters");
    expect(trackboard).toContain("resolveMyActivePatientsEncounters");
    expect(trackboard).toContain("resolveActiveTrackboardEncounters");
  });

  it("no API changes", () => {
    const cleanup = readSrc("features/emergency/edIncompleteChartsUiCleanup.ts");
    expect(cleanup).not.toContain("apiFetch");
    expect(cleanup).not.toContain("fetchOpenEncounters");
  });

  it("resolveEdIncompleteChartBadgeKeys logic unchanged", () => {
    const filter = readSrc("features/emergency/edIncompleteChartsFilter.ts");
    expect(filter).toContain("export function resolveEdIncompleteChartBadgeKeys");
    expect(filter).not.toContain("resolveIncompleteChartsVisibleBadgeKeys");
  });
});
