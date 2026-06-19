import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGetDedupeKey,
  dedupeGetRequest,
  getGetDedupeCachedValue,
  hasGetDedupeCachedResult,
  resetGetRequestDedupeForTests,
} from "@/lib/getRequestDedupe";
import {
  clinicalBoardGetDedupeKeys,
  clinicalBoardGetPaths,
  invalidateClinicalBoardGetCache,
  TRACKBOARD_INPATIENT_GET_PATH,
  TRACKBOARD_OPEN_GET_PATH,
} from "@/lib/invalidateClinicalBoardGetCache";
import { applyBedBoardStatusPatch } from "@/lib/bedBoardMutationPatch";
import { applyTrackboardRoomMutationPatch } from "@/lib/trackboardMutationPatch";
import { normalizeBedBoardApiRow } from "@/lib/normalizeBedBoardApiRow";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";

const FACILITY_ID = "fac-verify-1";
const BED_KEY = "ED:4";
const BED_BOARD_GET_PATH = `/facilities/${FACILITY_ID}/bed-board?unit=ED`;
const BED_BOARD_DEDUPE_KEY = buildGetDedupeKey(BED_BOARD_GET_PATH, FACILITY_ID);
const TRACKBOARD_DEDUPE_KEY = buildGetDedupeKey(TRACKBOARD_OPEN_GET_PATH, FACILITY_ID);

async function simulateBedStatusMutation(status: FacilityBedBoardBedRow["status"]) {
  const patchAt = new Date().toISOString();
  let fetchCount = 0;

  await dedupeGetRequest(BED_BOARD_DEDUPE_KEY, async () => {
    fetchCount += 1;
    return { generatedAt: "stale-before-patch", beds: [{ bedKey: BED_KEY, status: "AVAILABLE" }] };
  });
  expect(hasGetDedupeCachedResult(BED_BOARD_DEDUPE_KEY)).toBe(true);

  const invalidation = invalidateClinicalBoardGetCache(FACILITY_ID);
  expect(hasGetDedupeCachedResult(BED_BOARD_DEDUPE_KEY)).toBe(false);

  const getAt = new Date().toISOString();
  const freshBoard = await dedupeGetRequest(BED_BOARD_DEDUPE_KEY, async () => {
    fetchCount += 1;
    return { generatedAt: getAt, beds: [{ bedKey: BED_KEY, status }] };
  });

  return {
    action: status,
    patchAt,
    invalidatedAt: invalidation.invalidatedAt,
    getAt,
    dedupeKeys: invalidation.dedupeKeys,
    fetchCountAfterPatch: fetchCount,
    returnedStatus: freshBoard.beds[0]?.status,
    cachedAfterGet: getGetDedupeCachedValue<{ generatedAt: string }>(BED_BOARD_DEDUPE_KEY)?.generatedAt,
  };
}

async function simulateRoomMutation(roomLabel: string | null, governedRoomDisplay: string | null) {
  const patchAt = new Date().toISOString();
  let trackboardFetchCount = 0;

  await dedupeGetRequest(TRACKBOARD_DEDUPE_KEY, async () => {
    trackboardFetchCount += 1;
    return [{ id: "enc-1", roomLabel: "ED-1", governedRoomDisplay: "ED-1" }];
  });
  expect(hasGetDedupeCachedResult(TRACKBOARD_DEDUPE_KEY)).toBe(true);

  const invalidation = invalidateClinicalBoardGetCache(FACILITY_ID);
  expect(hasGetDedupeCachedResult(TRACKBOARD_DEDUPE_KEY)).toBe(false);

  applyTrackboardRoomMutationPatch(
    [{ id: "enc-1", roomLabel: "ED-1", governedRoomDisplay: "ED-1" }],
    {
      id: "enc-1",
      roomLabel,
      governedRoomDisplay,
      governedRoomUnit: "ED",
      governedRoomHasAssignment: Boolean(roomLabel),
    }
  );

  const getAt = new Date().toISOString();
  const freshRows = await dedupeGetRequest(TRACKBOARD_DEDUPE_KEY, async () => {
    trackboardFetchCount += 1;
    return [{ id: "enc-1", roomLabel, governedRoomDisplay }];
  });

  return {
    action: roomLabel ? "save-room" : "clear-room",
    patchAt,
    invalidatedAt: invalidation.invalidatedAt,
    getAt,
    dedupeKeys: invalidation.dedupeKeys,
    fetchCountAfterPatch: trackboardFetchCount,
    returnedRoom: freshRows[0]?.governedRoomDisplay ?? null,
    cachedAfterGet: getGetDedupeCachedValue<{ governedRoomDisplay: string | null }[]>(TRACKBOARD_DEDUPE_KEY)?.[0]
      ?.governedRoomDisplay,
  };
}

describe("edBedBoardMutationVerification (MEDUI.ED.BEDBOARD.ROOM_MUTATION.2A)", () => {
  beforeEach(() => {
    resetGetRequestDedupeForTests();
    vi.useRealTimers();
  });

  it("documents exact invalidated GET paths and dedupe keys for fac-verify-1", () => {
    expect(clinicalBoardGetPaths(FACILITY_ID)).toEqual([
      TRACKBOARD_OPEN_GET_PATH,
      TRACKBOARD_INPATIENT_GET_PATH,
      `/facilities/${FACILITY_ID}/bed-board`,
      `/facilities/${FACILITY_ID}/bed-board?unit=ED`,
      `/facilities/${FACILITY_ID}/bed-board?unit=MS`,
      `/facilities/${FACILITY_ID}/bed-board?unit=ICU`,
      `/facilities/${FACILITY_ID}/bed-board?unit=OBS`,
    ]);

    expect(clinicalBoardGetDedupeKeys(FACILITY_ID)).toEqual([
      `GET:${TRACKBOARD_OPEN_GET_PATH}:${FACILITY_ID}`,
      `GET:${TRACKBOARD_INPATIENT_GET_PATH}:${FACILITY_ID}`,
      `GET:/facilities/${FACILITY_ID}/bed-board:${FACILITY_ID}`,
      `GET:/facilities/${FACILITY_ID}/bed-board?unit=ED:${FACILITY_ID}`,
      `GET:/facilities/${FACILITY_ID}/bed-board?unit=MS:${FACILITY_ID}`,
      `GET:/facilities/${FACILITY_ID}/bed-board?unit=ICU:${FACILITY_ID}`,
      `GET:/facilities/${FACILITY_ID}/bed-board?unit=OBS:${FACILITY_ID}`,
    ]);
  });

  it("1 Save room — PATCH → invalidate → GET fresh (not cached stale)", async () => {
    const step = await simulateRoomMutation("ED-4", "ED-4");
    expect(step.fetchCountAfterPatch).toBe(2);
    expect(step.returnedRoom).toBe("ED-4");
    expect(step.cachedAfterGet).toBe("ED-4");
    expect(step.getAt >= step.invalidatedAt).toBe(true);
  });

  it("2 Clear room — PATCH → invalidate → GET fresh", async () => {
    const step = await simulateRoomMutation(null, null);
    expect(step.fetchCountAfterPatch).toBe(2);
    expect(step.returnedRoom).toBeNull();
  });

  it("3 Mark dirty — PATCH → invalidate → GET returns DIRTY", async () => {
    const step = await simulateBedStatusMutation("DIRTY");
    expect(step.fetchCountAfterPatch).toBe(2);
    expect(step.returnedStatus).toBe("DIRTY");
    expect(step.cachedAfterGet).toBe(step.getAt);
    expect(step.cachedAfterGet).not.toBe("stale-before-patch");
  });

  it("4 Start cleaning — PATCH → invalidate → GET returns CLEANING", async () => {
    const step = await simulateBedStatusMutation("CLEANING");
    expect(step.returnedStatus).toBe("CLEANING");
  });

  it("5 Mark available — PATCH → invalidate → GET returns AVAILABLE", async () => {
    const step = await simulateBedStatusMutation("AVAILABLE");
    expect(step.returnedStatus).toBe("AVAILABLE");
  });

  it("6 Reserve bed — PATCH → invalidate → GET returns RESERVED", async () => {
    const step = await simulateBedStatusMutation("RESERVED");
    expect(step.returnedStatus).toBe("RESERVED");
  });

  it("7 Block bed — PATCH → invalidate → GET returns BLOCKED", async () => {
    const step = await simulateBedStatusMutation("BLOCKED");
    expect(step.returnedStatus).toBe("BLOCKED");
  });

  it("negative control — without invalidation GET stays stale", async () => {
    let fetchCount = 0;
    await dedupeGetRequest(BED_BOARD_DEDUPE_KEY, async () => {
      fetchCount += 1;
      return { generatedAt: "stale-before-patch", status: "AVAILABLE" };
    });
    await dedupeGetRequest(BED_BOARD_DEDUPE_KEY, async () => {
      fetchCount += 1;
      return { generatedAt: "fresh-never-used", status: "DIRTY" };
    });
    expect(fetchCount).toBe(1);
    expect(getGetDedupeCachedValue<{ generatedAt: string }>(BED_BOARD_DEDUPE_KEY)?.generatedAt).toBe(
      "stale-before-patch"
    );
  });

  it("UI patch applies immediately from PATCH response before GET completes", () => {
    const board = {
      facilityId: FACILITY_ID,
      generatedAt: "before",
      units: [
        {
          unit: "ED" as const,
          unitCode: "ED" as const,
          summary: {
            occupied: 0,
            available: 1,
            blocked: 0,
            reserved: 0,
            cleaning: 0,
            dirty: 0,
            transferPending: 0,
            dischargePending: 0,
          },
          beds: [
            normalizeBedBoardApiRow({
              bedKey: BED_KEY,
              display: "ED-4",
              room: "4",
              unitCode: "ED",
              status: "AVAILABLE",
              statusSource: "derived",
              occupantEncounterId: null,
              occupantPatientName: null,
              occupantMrn: null,
              reasonCode: null,
              reasonText: null,
              updatedAt: null,
            }),
          ],
        },
      ],
    };
    const patched = applyBedBoardStatusPatch(
      board,
      normalizeBedBoardApiRow({
        bedKey: BED_KEY,
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
        updatedAt: new Date().toISOString(),
      })
    );
    expect(patched.units[0]?.beds[0]?.status).toBe("DIRTY");
  });
});
