import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  shouldShowTrackboardBedStatusChip,
  shouldShowTrackboardOwnershipBadge,
} from "@/features/emergency/edTrackboardBadgeCleanup";
import {
  shouldShowIncompleteChartsAcuityChip,
  shouldShowIncompleteChartsBedStatusChip,
  shouldShowIncompleteChartsOwnershipBadge,
} from "@/features/emergency/edIncompleteChartsUiCleanup";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edTrackboardBadgeCleanup (MEDUI.ED.LIFECYCLE.UI.CLEANUP.2)", () => {
  it("Trackboard hides Assigned to you", () => {
    expect(shouldShowTrackboardOwnershipBadge("trackboard")).toBe(false);
    expect(shouldShowIncompleteChartsOwnershipBadge("trackboard")).toBe(false);
  });

  it("My Patients hides Assigned to you", () => {
    expect(shouldShowTrackboardOwnershipBadge("myPatients")).toBe(false);
    expect(shouldShowIncompleteChartsOwnershipBadge("myPatients")).toBe(false);
  });

  it("Incomplete Charts hides Assigned to you", () => {
    expect(shouldShowTrackboardOwnershipBadge("incompleteCharts")).toBe(false);
    expect(shouldShowIncompleteChartsOwnershipBadge("incompleteCharts")).toBe(false);
  });

  it("Trackboard hides Occupied bed status chip", () => {
    expect(shouldShowTrackboardBedStatusChip("trackboard")).toBe(false);
    expect(shouldShowIncompleteChartsBedStatusChip("trackboard")).toBe(false);
  });

  it("My Patients hides Occupied bed status chip", () => {
    expect(shouldShowTrackboardBedStatusChip("myPatients")).toBe(false);
  });

  it("Incomplete Charts hides Occupied bed status chip", () => {
    expect(shouldShowTrackboardBedStatusChip("incompleteCharts")).toBe(false);
  });

  it("Trackboard keeps Open status via primary status badge", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("primaryStatusLabel");
    expect(trackboard).toContain("tEncounterStatus(t, statusKey)");
  });

  it("Trackboard keeps ER disposition context (ED type filtering)", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('EMERGENCY_TYPE = "EMERGENCY"');
    expect(trackboard).toContain("erDispositionBadgeFromEncounterJson");
  });

  it("Trackboard removes redundant Chart action (patient name + workspace full chart)", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).not.toContain('t("emergencyTrackboard.chartLink")');
    expect(trackboard).toContain("resolveEdBoardPatientNameHref");
  });

  it("Trackboard uses clickable patient name instead of redundant View action", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveEdBoardPatientNameHref");
    expect(trackboard).toContain("ed-board-patient-name-");
    expect(trackboard).not.toContain('t("common.view")');
  });

  it("Trackboard keeps Assign me nurse action before self-assignment", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("assignNurseMeShort");
    expect(trackboard).toContain("isNurse && !isNurseMine");
  });

  it("Trackboard keeps Assign me provider action before self-assignment", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("assignProviderMeShort");
    expect(trackboard).toContain("isProvider && !isPhysMine");
  });

  it("My Patients keeps Assign me nurse action before self-assignment", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain('boardViewMode === "myPatients"');
    expect(trackboard).toContain("assignNurseMeShort");
    expect(trackboard).not.toMatch(
      /boardViewMode === "myPatients"[\s\S]{0,400}assignNurseMeShort[\s\S]{0,40}\? null/
    );
  });

  it("My Patients keeps Assign me provider action before self-assignment", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("assignProviderMeShort");
  });

  it("Stable/Monitoring/Critical derived from triage ESI", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("acuityFromEsi(encounter.triage?.esi)");
    expect(trackboard).toContain("function acuityFromEsi");
    expect(shouldShowIncompleteChartsAcuityChip("trackboard")).toBe(true);
    expect(shouldShowIncompleteChartsAcuityChip("myPatients")).toBe(true);
  });

  it("Bed Board still has occupancy status", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("BedBoardUnitSection");
    expect(trackboard).toContain("fetchFacilityBedBoard");
    const bedBoard = readSrc("components/encounters/BedBoardGrid.tsx");
    expect(bedBoard).toContain("cellAriaOccupied");
  });

  it("no assignment filter regression", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyActivePatientsEncounters");
    expect(trackboard).toContain("isEncounterAssignedToCurrentUser");
    const filter = readSrc("features/emergency/edMyPatientsFilter.ts");
    expect(filter).toContain("resolveMyActivePatientsEncounters");
  });

  it("no lifecycle filter regression", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyIncompleteChartsEncounters");
    expect(trackboard).toContain("resolveActiveTrackboardEncounters");
  });

  it("does not delete i18n keys", () => {
    const en = readSrc("i18n/messages/en.ts");
    const fr = readSrc("i18n/messages/fr.ts");
    expect(en).toContain('ownershipBadge: "Assigned to you"');
    expect(fr).toContain("ownershipBadge:");
    expect(en).toContain('OCCUPIED: "Occupied"');
  });

  it("no API changes", () => {
    const cleanup = readSrc("features/emergency/edTrackboardBadgeCleanup.ts");
    expect(cleanup).not.toContain("apiFetch");
    expect(cleanup).not.toContain("fetchOpenEncounters");
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("shouldShowTrackboardBedStatusChip");
  });
});
