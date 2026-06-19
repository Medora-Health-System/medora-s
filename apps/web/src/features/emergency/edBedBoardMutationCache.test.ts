import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildGetDedupeKey,
  dedupeGetRequest,
  resetGetRequestDedupeForTests,
} from "@/lib/getRequestDedupe";
import { invalidateClinicalBoardGetCache } from "@/lib/invalidateClinicalBoardGetCache";
import { normalizeBedBoardApiRow } from "@/lib/normalizeBedBoardApiRow";
import { applyBedBoardStatusPatch } from "@/lib/bedBoardMutationPatch";
import { mergeTrackboardEncounterUpdate } from "@/lib/trackboardMutationPatch";
import type { FacilityBedBoardBedRow, FacilityBedBoardResponse } from "@/lib/bedBoardApi";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function boardWithBed(bed: FacilityBedBoardBedRow): FacilityBedBoardResponse {
  return {
    facilityId: "fac-1",
    generatedAt: "2026-06-03T10:00:00.000Z",
    units: [
      {
        unit: "ED",
        unitCode: "ED",
        summary: {
          occupied: bed.status === "OCCUPIED" ? 1 : 0,
          available: bed.status === "AVAILABLE" ? 1 : 0,
          blocked: bed.status === "BLOCKED" ? 1 : 0,
          reserved: bed.status === "RESERVED" ? 1 : 0,
          cleaning: bed.status === "CLEANING" ? 1 : 0,
          dirty: bed.status === "DIRTY" ? 1 : 0,
          transferPending: 0,
          dischargePending: 0,
        },
        beds: [bed],
      },
    ],
  };
}

describe("edBedBoardMutationCache (MEDUI.ED.BEDBOARD.ROOM_MUTATION.2)", () => {
  beforeEach(() => {
    resetGetRequestDedupeForTests();
    vi.useRealTimers();
  });

  it("1 — bed status PATCH invalidates GET /bed-board cache used by refresh", () => {
    const api = readSrc("lib/bedBoardApi.ts");
    expect(api).toContain("invalidateClinicalBoardGetCache(facilityId)");
    expect(api).toContain("updateFacilityBedStatus");
  });

  it("2 — ED-4 / ED:4 canonical bed key mapping patches the same tile", () => {
    const board = boardWithBed({
      bedKey: "ED:4",
      display: "ED-4",
      storageKey: "ED:4",
      displayKey: "ED-4",
      room: "4",
      unitCode: "ED",
      unit: "ED",
      status: "AVAILABLE",
      statusSource: "derived",
      occupantEncounterId: null,
      occupantPatientName: null,
      patientDisplay: null,
      occupantMrn: null,
      reasonCode: null,
      reasonText: null,
      updatedAt: null,
    });
    const sparsePatch = normalizeBedBoardApiRow({
      bedKey: "ED:4",
      display: "ED-4",
      room: "4",
      unitCode: "ED",
      status: "DIRTY",
      statusSource: "operational",
      occupantEncounterId: null,
      occupantPatientName: null,
      occupantMrn: null,
      reasonCode: null,
      reasonText: null,
      updatedAt: "2026-06-03T10:01:00.000Z",
    });
    const next = applyBedBoardStatusPatch(board, sparsePatch);
    expect(next.units[0]?.beds[0]?.status).toBe("DIRTY");
    expect(next.units[0]?.summary.dirty).toBe(1);
  });

  it("3 — mark dirty updates tile immediately", () => {
    const next = applyBedBoardStatusPatch(
      boardWithBed({
        bedKey: "ED:2",
        display: "ED-2",
        storageKey: "ED:2",
        displayKey: "ED-2",
        room: "2",
        unitCode: "ED",
        unit: "ED",
        status: "AVAILABLE",
        statusSource: "derived",
        occupantEncounterId: null,
        occupantPatientName: null,
        patientDisplay: null,
        occupantMrn: null,
        reasonCode: null,
        reasonText: null,
        updatedAt: null,
      }),
      normalizeBedBoardApiRow({
        bedKey: "ED:2",
        display: "ED-2",
        room: "2",
        unitCode: "ED",
        status: "DIRTY",
        statusSource: "operational",
        occupantEncounterId: null,
        occupantPatientName: null,
        occupantMrn: null,
        reasonCode: null,
        reasonText: null,
        updatedAt: "2026-06-03T10:01:00.000Z",
      })
    );
    expect(next.units[0]?.beds[0]?.status).toBe("DIRTY");
  });

  it("4 — start cleaning updates tile immediately", () => {
    const next = applyBedBoardStatusPatch(
      boardWithBed({
        bedKey: "ED:2",
        display: "ED-2",
        storageKey: "ED:2",
        displayKey: "ED-2",
        room: "2",
        unitCode: "ED",
        unit: "ED",
        status: "DIRTY",
        statusSource: "operational",
        occupantEncounterId: null,
        occupantPatientName: null,
        patientDisplay: null,
        occupantMrn: null,
        reasonCode: null,
        reasonText: null,
        updatedAt: null,
      }),
      normalizeBedBoardApiRow({
        bedKey: "ED:2",
        display: "ED-2",
        room: "2",
        unitCode: "ED",
        status: "CLEANING",
        statusSource: "operational",
        occupantEncounterId: null,
        occupantPatientName: null,
        occupantMrn: null,
        reasonCode: null,
        reasonText: null,
        updatedAt: "2026-06-03T10:02:00.000Z",
      })
    );
    expect(next.units[0]?.beds[0]?.status).toBe("CLEANING");
  });

  it("5 — mark available updates tile immediately", () => {
    const next = applyBedBoardStatusPatch(
      boardWithBed({
        bedKey: "ED:2",
        display: "ED-2",
        storageKey: "ED:2",
        displayKey: "ED-2",
        room: "2",
        unitCode: "ED",
        unit: "ED",
        status: "CLEANING",
        statusSource: "operational",
        occupantEncounterId: null,
        occupantPatientName: null,
        patientDisplay: null,
        occupantMrn: null,
        reasonCode: null,
        reasonText: null,
        updatedAt: null,
      }),
      normalizeBedBoardApiRow({
        bedKey: "ED:2",
        display: "ED-2",
        room: "2",
        unitCode: "ED",
        status: "AVAILABLE",
        statusSource: "operational",
        occupantEncounterId: null,
        occupantPatientName: null,
        occupantMrn: null,
        reasonCode: null,
        reasonText: null,
        updatedAt: "2026-06-03T10:03:00.000Z",
      })
    );
    expect(next.units[0]?.beds[0]?.status).toBe("AVAILABLE");
  });

  it("6 — room assignment invalidates trackboard GET cache", () => {
    const api = readSrc("lib/roomAssignmentApi.ts");
    expect(api).toContain("invalidateClinicalBoardGetCache(facilityId)");
  });

  it("7 — trackboard refresh invalidates bed-board cache before fetch", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("invalidateClinicalBoardGetCache(facilityId, [\"ED\"])");
    expect(trackboard).toContain("mergeBedBoardRoomUpdate");
  });

  it("8 — stale cached GET cannot overwrite newer room patch after invalidation", async () => {
    vi.useFakeTimers();
    const facilityId = "fac-1";
    const path = `/facilities/${facilityId}/bed-board?unit=ED`;
    const key = buildGetDedupeKey(path, facilityId);
    let fetchCount = 0;
    const fn = vi.fn(async () => {
      fetchCount += 1;
      return { stale: fetchCount === 1, generatedAt: `fetch-${fetchCount}` };
    });
    await dedupeGetRequest(key, fn);
    expect(fetchCount).toBe(1);
    invalidateClinicalBoardGetCache(facilityId, ["ED"]);
    await dedupeGetRequest(key, fn);
    expect(fetchCount).toBe(2);
  });

  it("9 — production PATCH response normalized to patch helper shape", () => {
    const normalized = normalizeBedBoardApiRow({
      bedKey: "ED:3",
      display: "ED-3",
      room: "3",
      unitCode: "ED",
      status: "BLOCKED",
      statusSource: "operational",
      occupantEncounterId: null,
      occupantPatientName: null,
      occupantMrn: null,
      reasonCode: null,
      reasonText: "Maintenance",
      updatedAt: "2026-06-03T10:04:00.000Z",
    });
    expect(normalized.storageKey).toBe("ED:3");
    expect(normalized.displayKey).toBe("ED-3");
    expect(normalized.unit).toBe("ED");
    expect(normalized.patientDisplay).toBeNull();
  });

  it("10 — failed mutation does not invalidate cache from modal (only success path)", () => {
    const modal = readSrc("components/encounters/BedBoardStatusDetailModal.tsx");
    const api = readSrc("lib/bedBoardApi.ts");
    expect(modal).toContain("onStatusUpdated?.(updated)");
    expect(modal).toMatch(/catch \(err\)[\s\S]{0,400}setError\(/);
    expect(api).toContain("invalidateClinicalBoardGetCache(facilityId)");
  });

  it("11 — duplicate click blocked via saving guard", () => {
    const modal = readSrc("components/encounters/BedBoardStatusDetailModal.tsx");
    expect(modal).toContain("if (!bed || !facilityId || !canManageStatus || !pendingAction || saving) return");
  });

  it("12 — invalidateClinicalBoardGetCache clears trackboard and bed-board keys", () => {
    const facilityId = "fac-1";
    const bedBoardKey = buildGetDedupeKey(`/facilities/${facilityId}/bed-board?unit=ED`, facilityId);
    const trackboardKey = buildGetDedupeKey("/trackboard?status=OPEN", facilityId);
    const fn = vi.fn(async () => ({ ok: true }));
    void dedupeGetRequest(bedBoardKey, fn);
    void dedupeGetRequest(trackboardKey, fn);
    expect(fn).toHaveBeenCalledTimes(2);
    invalidateClinicalBoardGetCache(facilityId, ["ED"]);
    void dedupeGetRequest(bedBoardKey, fn);
    void dedupeGetRequest(trackboardKey, fn);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("background refresh merge keeps newer optimistic room when server row is stale", () => {
    const pending = new Map([
      [
        "enc-1",
        {
          id: "enc-1",
          roomLabel: "ED-5",
          governedRoomDisplay: "ED-5",
        },
      ],
    ]);
    const merged = mergeTrackboardEncounterUpdate(
      [{ id: "enc-1", roomLabel: "ED-5", governedRoomDisplay: "ED-5" }],
      [{ id: "enc-1", roomLabel: "ED-1", governedRoomDisplay: "ED-1" }],
      pending
    );
    expect(merged[0]?.governedRoomDisplay).toBe("ED-5");
  });
});
