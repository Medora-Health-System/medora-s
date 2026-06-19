import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyBedBoardStatusPatch } from "@/lib/bedBoardMutationPatch";
import type { FacilityBedBoardBedRow, FacilityBedBoardResponse } from "@/lib/bedBoardApi";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function boardWithStatus(status: FacilityBedBoardBedRow["status"]): FacilityBedBoardResponse {
  const bed: FacilityBedBoardBedRow = {
    bedKey: "ED|2",
    display: "ED-2",
    storageKey: "ED|2",
    displayKey: "ED-2",
    room: "2",
    unitCode: "ED",
    unit: "ED",
    status,
    statusSource: "operational",
    occupantEncounterId: null,
    occupantPatientName: null,
    patientDisplay: null,
    occupantMrn: null,
    reasonCode: null,
    reasonText: null,
    updatedAt: "2026-06-03T10:00:00.000Z",
  };
  return {
    facilityId: "fac-1",
    generatedAt: "2026-06-03T10:00:00.000Z",
    units: [
      {
        unit: "ED",
        unitCode: "ED",
        summary: {
          occupied: status === "OCCUPIED" ? 1 : 0,
          available: status === "AVAILABLE" ? 1 : 0,
          blocked: status === "BLOCKED" ? 1 : 0,
          reserved: status === "RESERVED" ? 1 : 0,
          cleaning: status === "CLEANING" ? 1 : 0,
          dirty: status === "DIRTY" ? 1 : 0,
          transferPending: 0,
          dischargePending: 0,
        },
        beds: [bed],
      },
    ],
  };
}

describe("edBedBoardStatusInstantUpdate (MEDUI.ED.BEDBOARD.ROOM_MUTATION.1)", () => {
  const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
  const statusModal = readSrc("components/encounters/BedBoardStatusDetailModal.tsx");

  it("8 — dirty status changes tile immediately", () => {
    const next = applyBedBoardStatusPatch(boardWithStatus("AVAILABLE"), {
      ...boardWithStatus("AVAILABLE").units[0]!.beds[0]!,
      status: "DIRTY",
    });
    expect(next.units[0]?.beds[0]?.status).toBe("DIRTY");
  });

  it("9 — cleaning status changes tile immediately", () => {
    const next = applyBedBoardStatusPatch(boardWithStatus("DIRTY"), {
      ...boardWithStatus("DIRTY").units[0]!.beds[0]!,
      status: "CLEANING",
    });
    expect(next.units[0]?.beds[0]?.status).toBe("CLEANING");
  });

  it("10 — blocked status changes tile immediately", () => {
    const next = applyBedBoardStatusPatch(boardWithStatus("AVAILABLE"), {
      ...boardWithStatus("AVAILABLE").units[0]!.beds[0]!,
      status: "BLOCKED",
    });
    expect(next.units[0]?.beds[0]?.status).toBe("BLOCKED");
  });

  it("11 — available status changes tile immediately", () => {
    const next = applyBedBoardStatusPatch(boardWithStatus("CLEANING"), {
      ...boardWithStatus("CLEANING").units[0]!.beds[0]!,
      status: "AVAILABLE",
    });
    expect(next.units[0]?.beds[0]?.status).toBe("AVAILABLE");
  });

  it("12 — occupied / available / dirty counters update immediately", () => {
    const next = applyBedBoardStatusPatch(boardWithStatus("AVAILABLE"), {
      ...boardWithStatus("AVAILABLE").units[0]!.beds[0]!,
      status: "DIRTY",
    });
    expect(next.units[0]?.summary.dirty).toBe(1);
    expect(next.units[0]?.summary.available).toBe(0);
  });

  it("trackboard wires handleBedStatusUpdated with applyBedBoardStatusPatch", () => {
    expect(trackboard).toContain("handleBedStatusUpdated");
    expect(trackboard).toContain("applyBedBoardStatusPatch");
    expect(trackboard).toContain("onBedStatusUpdated={handleBedStatusUpdated}");
  });

  it("status modal passes API bed row to onStatusUpdated before close", () => {
    expect(statusModal).toContain("onStatusUpdated?.(updated)");
    expect(statusModal).toContain("onClose()");
    expect(statusModal).toContain("updateFacilityBedStatus");
  });

  it("reserved status changes tile immediately", () => {
    const next = applyBedBoardStatusPatch(boardWithStatus("AVAILABLE"), {
      ...boardWithStatus("AVAILABLE").units[0]!.beds[0]!,
      status: "RESERVED",
    });
    expect(next.units[0]?.summary.reserved).toBe(1);
  });

  it("no setTimeout delay in bed status modal save path", () => {
    expect(statusModal).not.toContain("setTimeout");
  });
});
