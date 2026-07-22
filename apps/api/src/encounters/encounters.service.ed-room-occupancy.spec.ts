import { ConflictException } from "@nestjs/common";
import { AuditAction, EncounterType } from "@prisma/client";
import {
  ED_CANONICAL_WAITING_ROOM_LABEL,
  ROOM_ALREADY_OCCUPIED_CODE,
  resolveEdRoomAssignmentForSave,
} from "@medora/shared";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";

const facilityId = "fac-a";
const patientId = "pat-1";
const encounterId = "enc-new";

type OpenRow = {
  id: string;
  facilityId: string;
  roomLabel: string | null;
  status: string;
  type?: string;
  admissionSummaryJson?: unknown;
  patient?: { firstName: string; lastName: string };
};

function buildCreateMocks(openRows: OpenRow[]) {
  const encounterCreate = jest.fn().mockImplementation(async ({ data }) => ({
    id: encounterId,
    ...data,
    patient: { id: patientId, firstName: "Jean", lastName: "Test", mrn: "MRN1" },
  }));
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    patient: {
      findFirst: jest.fn().mockResolvedValue({ id: patientId, facilityId }),
    },
    encounter: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue(openRows),
      create: encounterCreate,
    },
    facility: {
      findFirst: jest.fn().mockResolvedValue({ billingSiteType: "ED" }),
    },
  };
  return { prisma, auditLog, encounterCreate };
}

function buildUpdateMocks(
  encounterRow: Record<string, unknown>,
  openRows: OpenRow[]
) {
  const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const updatedRow = {
    ...encounterRow,
    roomLabel: "4A",
    patient: { id: patientId, firstName: "Jean", lastName: "Test", mrn: "MRN1" },
    physicianAssigned: null,
    nurseAssigned: null,
  };
  const encounterFindFirst = jest
    .fn()
    .mockResolvedValueOnce(encounterRow)
    .mockResolvedValue(updatedRow);
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    encounter: {
      findFirst: encounterFindFirst,
      findMany: jest.fn().mockResolvedValue(openRows),
      updateMany: encounterUpdateMany,
    },
  };
  return { prisma, auditLog, encounterUpdateMany, encounterFindFirst };
}

describe("EncountersService — ED room occupancy enforcement (ROOMS.ED.2)", () => {
  it("create ED encounter into occupied room returns 409 ROOM_ALREADY_OCCUPIED with suggestedRoom", async () => {
    const { prisma, auditLog, encounterCreate } = buildCreateMocks([
      { id: "enc-occupied", facilityId, roomLabel: "4", status: "OPEN", type: "EMERGENCY" },
    ]);
    const svc = new EncountersService(
      prisma as never,
      { log: auditLog } as never,
      {} as never,
      createMockBedBoardService() as never,
      createMockInternalPlacementService() as never
    );

    await expect(
      svc.create(patientId, facilityId, { type: "EMERGENCY", roomLabel: "4" }, "user-1")
    ).rejects.toMatchObject({
      response: {
        code: ROOM_ALREADY_OCCUPIED_CODE,
        requestedRoom: "4",
        suggestedRoom: "4A",
        occupiedRoom: "ED-4",
      },
    });
    expect(encounterCreate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("create with confirm/accepted suffix saves 4A when 4 is occupied", async () => {
    const { prisma, auditLog, encounterCreate } = buildCreateMocks([
      { id: "enc-occupied", facilityId, roomLabel: "4", status: "OPEN", type: "EMERGENCY" },
    ]);
    const svc = new EncountersService(
      prisma as never,
      { log: auditLog } as never,
      {} as never,
      createMockBedBoardService() as never,
      createMockInternalPlacementService() as never
    );

    await svc.create(
      patientId,
      facilityId,
      {
        type: "EMERGENCY",
        roomLabel: "4",
        confirmOccupiedRoomAssignment: true,
        roomOccupancyOverride: { requestedRoom: "4", acceptedRoom: "4A" },
      },
      "user-1"
    );

    expect(encounterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomLabel: "4A" }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(AuditAction.ENCOUNTER_CREATE, "ENCOUNTER", expect.any(Object));
  });

  it("updateOperational into occupied room returns 409 ED_ROOM_OCCUPIED", async () => {
    const openRows = [
      { id: "enc-occupied", facilityId, roomLabel: "4", status: "OPEN", type: "EMERGENCY" },
      { id: encounterId, facilityId, roomLabel: "2", status: "OPEN", type: "EMERGENCY" },
    ];
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(
      {
        id: encounterId,
        patientId,
        facilityId,
        type: EncounterType.EMERGENCY,
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        roomLabel: "2",
        version: 1,
        physicianAssignedUserId: null,
        nursingAssignedUserId: null,
        nursingAssessment: null,
        providerDocumentationStatus: null,
      },
      openRows
    );
    const svc = new EncountersService(
      prisma as never,
      { log: auditLog } as never,
      {} as never,
      createMockBedBoardService() as never,
      createMockInternalPlacementService() as never
    );

    await expect(
      svc.updateOperational(facilityId, encounterId, { roomLabel: "4" }, "user-1")
    ).rejects.toBeInstanceOf(ConflictException);
    expect(encounterUpdateMany).not.toHaveBeenCalled();
  });

  it("updateOperational confirm saves accepted suffix", async () => {
    const openRows = [
      { id: "enc-occupied", facilityId, roomLabel: "4", status: "OPEN", type: "EMERGENCY" },
      { id: encounterId, facilityId, roomLabel: "2", status: "OPEN", type: "EMERGENCY" },
    ];
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(
      {
        id: encounterId,
        patientId,
        facilityId,
        type: EncounterType.EMERGENCY,
        status: "OPEN",
        workflowState: "IN_TREATMENT",
        roomLabel: "2",
        version: 1,
        physicianAssignedUserId: null,
        nursingAssessment: null,
        providerDocumentationStatus: null,
      },
      openRows
    );
    const svc = new EncountersService(
      prisma as never,
      { log: auditLog } as never,
      {} as never,
      createMockBedBoardService() as never,
      createMockInternalPlacementService() as never
    );

    await svc.updateOperational(
      facilityId,
      encounterId,
      {
        roomLabel: "4",
        confirmOccupiedRoomAssignment: true,
        roomOccupancyOverride: { requestedRoom: "4", acceptedRoom: "4A" },
      },
      "user-1"
    );

    expect(encounterUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomLabel: "4A" }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", expect.any(Object));
  });

  it("waiting room labels do not trigger numbered room conflict", async () => {
    const { prisma, auditLog, encounterCreate } = buildCreateMocks([
      { id: "enc-occupied", facilityId, roomLabel: "4", status: "OPEN", type: "EMERGENCY" },
    ]);
    const svc = new EncountersService(
      prisma as never,
      { log: auditLog } as never,
      {} as never,
      createMockBedBoardService() as never,
      createMockInternalPlacementService() as never
    );

    await svc.create(
      patientId,
      facilityId,
      { type: "EMERGENCY", roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL },
      "user-1"
    );

    expect(encounterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomLabel: ED_CANONICAL_WAITING_ROOM_LABEL }),
      })
    );
  });
});

describe("resolveEdRoomAssignmentForSave — shared policy", () => {
  const openRows = [
    { id: "enc-1", facilityId: "fac-a", roomLabel: "4", status: "OPEN" },
    { id: "enc-2", facilityId: "fac-a", roomLabel: "4A", status: "OPEN" },
    { id: "enc-closed", facilityId: "fac-a", roomLabel: "4", status: "CLOSED" },
    { id: "enc-other", facilityId: "fac-b", roomLabel: "4", status: "OPEN" },
  ];

  it("4 + 4A occupied suggests 4B", () => {
    const result = resolveEdRoomAssignmentForSave({
      facilityId: "fac-a",
      encounterId: "enc-new",
      requestedRoomRaw: "4",
      openEncounters: openRows,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.conflict.suggestedRoom).toBe("4B");
  });

  it("same encounter update does not conflict with itself", () => {
    const result = resolveEdRoomAssignmentForSave({
      facilityId: "fac-a",
      encounterId: "enc-1",
      currentRoomLabel: "4",
      requestedRoomRaw: "4",
      openEncounters: openRows,
    });
    expect(result).toEqual({ ok: true, roomLabel: "4" });
  });

  it("closed encounters do not block reuse", () => {
    const result = resolveEdRoomAssignmentForSave({
      facilityId: "fac-a",
      encounterId: "enc-new",
      requestedRoomRaw: "4",
      openEncounters: [{ id: "enc-closed", facilityId: "fac-a", roomLabel: "4", status: "CLOSED" }],
    });
    expect(result).toEqual({ ok: true, roomLabel: "4" });
  });

  it("other facility does not block", () => {
    const result = resolveEdRoomAssignmentForSave({
      facilityId: "fac-a",
      encounterId: "enc-new",
      requestedRoomRaw: "4",
      openEncounters: [{ id: "enc-other", facilityId: "fac-b", roomLabel: "4", status: "OPEN" }],
    });
    expect(result).toEqual({ ok: true, roomLabel: "4" });
  });
});
