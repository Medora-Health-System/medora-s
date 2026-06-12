import { AuditAction } from "@prisma/client";
import {
  BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
  BED_STATUS_UPDATE_EVENT,
  FACILITY_BED_ENTITY_TYPE,
  ROOM_ALREADY_OCCUPIED_CODE,
} from "@medora/shared";
import { FacilityBedBoardService } from "./facility-bed-board.service";
import { EncountersService } from "../encounters/encounters.service";

const facilityId = "fac-1";

function buildBedBoardMocks(options?: {
  encounters?: unknown[];
  auditRows?: unknown[];
}) {
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    encounter: {
      findMany: jest.fn().mockResolvedValue(options?.encounters ?? []),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue(options?.auditRows ?? []),
    },
  };
  const service = new FacilityBedBoardService(prisma as never, { log: auditLog } as never);
  return { service, prisma, auditLog };
}

describe("FacilityBedBoardService (K.10B.10C)", () => {
  it("GET bed-board returns pool beds", async () => {
    const { service } = buildBedBoardMocks();
    const board = await service.getBedBoard(facilityId);
    expect(board.facilityId).toBe(facilityId);
    expect(board.units.some((u) => u.unitCode === "ICU")).toBe(true);
    expect(board.units.find((u) => u.unitCode === "OBS")?.beds.length).toBe(10);
  });

  it("occupied encounter resolves OCCUPIED", async () => {
    const { service } = buildBedBoardMocks({
      encounters: [
        {
          id: "enc-ms",
          facilityId,
          roomLabel: "MS-2",
          status: "OPEN",
          type: "INPATIENT",
          workflowState: "IN_TREATMENT",
          disposition: null,
          admissionSummaryJson: { serviceUnit: "Med/Surg" },
          patient: { firstName: "Jean", lastName: "Test", mrn: "MRN1" },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "MS");
    const bed = board.units[0]?.beds.find((b) => b.bedKey === "MS:2");
    expect(bed?.status).toBe("OCCUPIED");
    expect(bed?.occupantPatientName).toBe("Jean Test");
  });

  it("audit DIRTY overlay resolves DIRTY", async () => {
    const { service } = buildBedBoardMocks({
      auditRows: [
        {
          entityId: "ED:2",
          createdAt: new Date("2026-06-03T12:00:00.000Z"),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "ED:2",
            status: "DIRTY",
            cleared: false,
            reasonCode: "HOUSEKEEPING",
            reasonText: "Room needs cleaning",
          },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "ED");
    const bed = board.units[0]?.beds.find((b) => b.bedKey === "ED:2");
    expect(bed?.status).toBe("DIRTY");
    expect(bed?.statusSource).toBe("operational");
  });

  it("BLOCKED overlay overrides occupied by precedence", async () => {
    const { service } = buildBedBoardMocks({
      encounters: [
        {
          id: "enc-ed",
          facilityId,
          roomLabel: "2",
          status: "OPEN",
          type: "EMERGENCY",
          workflowState: "IN_TREATMENT",
          disposition: null,
          admissionSummaryJson: null,
          patient: { firstName: "A", lastName: "B", mrn: "MRN2" },
        },
      ],
      auditRows: [
        {
          entityId: "ED:2",
          createdAt: new Date(),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "ED:2",
            status: "BLOCKED",
            cleared: false,
          },
        },
      ],
    });
    const board = await service.getBedBoard(facilityId, "ED");
    const bed = board.units[0]?.beds.find((b) => b.bedKey === "ED:2");
    expect(bed?.status).toBe("BLOCKED");
  });

  it("PATCH DIRTY writes audit", async () => {
    const { service, auditLog } = buildBedBoardMocks();
    const row = await service.updateBedStatus(
      facilityId,
      "ED:2",
      { status: "DIRTY", reasonCode: "HOUSEKEEPING", reasonText: "Room needs cleaning" },
      "user-1"
    );
    expect(row.status).toBe("DIRTY");
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.UPDATE,
      FACILITY_BED_ENTITY_TYPE,
      expect.objectContaining({
        entityId: "ED:2",
        metadata: expect.objectContaining({
          event: BED_STATUS_UPDATE_EVENT,
          status: "DIRTY",
          cleared: false,
        }),
      })
    );
  });

  it("PATCH AVAILABLE clears overlay", async () => {
    const { service } = buildBedBoardMocks({
      auditRows: [
        {
          entityId: "MS:2",
          createdAt: new Date(),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "MS:2",
            status: "DIRTY",
            cleared: false,
          },
        },
        {
          entityId: "MS:2",
          createdAt: new Date(),
          metadata: {
            event: BED_STATUS_UPDATE_EVENT,
            bedKey: "MS:2",
            status: "AVAILABLE",
            cleared: true,
          },
        },
      ],
    });
    const row = await service.updateBedStatus(facilityId, "MS:2", { status: "AVAILABLE" }, "user-1");
    expect(row.status).toBe("AVAILABLE");
  });

  it("PATCH OCCUPIED rejected", async () => {
    const { service } = buildBedBoardMocks();
    await expect(
      service.updateBedStatus(facilityId, "ED:2", { status: "OCCUPIED" as never })
    ).rejects.toThrow();
  });
});

function buildUpdateRoomWithBedBoardMocks(input: {
  encounterRow: Record<string, unknown>;
  openRows?: unknown[];
  bedRow?: Record<string, unknown> | null;
}) {
  const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const updatedRow = {
    ...input.encounterRow,
    roomLabel: "MS-2",
    patient: { id: "pat-1", firstName: "Jean", lastName: "Dupont", mrn: "MRN1", dob: null, sexAtBirth: null },
    physicianAssigned: null,
    nurseAssigned: null,
  };
  const encounterFindFirst = jest
    .fn()
    .mockResolvedValueOnce(input.encounterRow)
    .mockResolvedValue(updatedRow);
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    encounter: {
      findFirst: encounterFindFirst,
      findMany: jest.fn().mockResolvedValue(input.openRows ?? []),
      updateMany: encounterUpdateMany,
    },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const bedBoardService = {
    buildBedKeyForAssignment: jest.fn((unit: string, room: string) => `${unit}:${room}`),
    getEffectiveBedRow: jest.fn().mockResolvedValue(input.bedRow ?? null),
    assertBedAssignableOrThrow: jest.fn((opts: { confirmBedStatusOverride?: boolean }) => {
      if (input.bedRow && !opts.confirmBedStatusOverride) {
        const { throwBedStatusBlocksAssignmentConflict } = require("./bed-status-blocks.util");
        throwBedStatusBlocksAssignmentConflict({
          bedKey: "MS:2",
          bedDisplay: "MS-2",
          status: "DIRTY",
          reasonCode: "HOUSEKEEPING",
          reasonText: "Room needs cleaning",
        });
      }
    }),
  };
  const service = new EncountersService(
    prisma as never,
    { log: auditLog } as never,
    {} as never,
    bedBoardService as never
  );
  return { service, encounterUpdateMany, auditLog };
}

describe("EncountersService.updateRoom — bed status enforcement (K.10B.10C)", () => {
  const baseEncounter = {
    id: "enc-new",
    facilityId,
    patientId: "pat-1",
    type: "INPATIENT",
    status: "OPEN",
    workflowState: "IN_TREATMENT",
    version: 1,
    roomLabel: null,
    providerDocumentationStatus: "DRAFT",
    admissionSummaryJson: { serviceUnit: "Med/Surg" },
  };

  it("room assignment to DIRTY rejected", async () => {
    const { service, encounterUpdateMany } = buildUpdateRoomWithBedBoardMocks({
      encounterRow: baseEncounter,
      bedRow: {
        bedKey: "MS:2",
        display: "MS-2",
        status: "DIRTY",
        reasonCode: "HOUSEKEEPING",
        reasonText: "Room needs cleaning",
      },
    });

    await expect(
      service.updateRoom(facilityId, "enc-new", { room: "2", unitCode: "MS" })
    ).rejects.toMatchObject({
      response: {
        code: BED_STATUS_BLOCKS_ASSIGNMENT_CODE,
        bedDisplay: "MS-2",
        status: "DIRTY",
      },
    });
    expect(encounterUpdateMany).not.toHaveBeenCalled();
  });

  it("room assignment to DIRTY with override succeeds", async () => {
    const { service, encounterUpdateMany, auditLog } = buildUpdateRoomWithBedBoardMocks({
      encounterRow: baseEncounter,
      bedRow: {
        bedKey: "MS:2",
        display: "MS-2",
        status: "DIRTY",
      },
    });

    await service.updateRoom(facilityId, "enc-new", {
      room: "2",
      unitCode: "MS",
      confirmBedStatusOverride: true,
      bedStatusOverrideReasonCode: "CLINICAL_NEED",
      bedStatusOverrideReasonText: "Patient requires immediate placement",
    });

    expect(encounterUpdateMany).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_UPDATE,
      "ENCOUNTER",
      expect.objectContaining({
        metadata: expect.objectContaining({
          bedStatusOverride: true,
          blockedStatusOverridden: "DIRTY",
        }),
      })
    );
  });

  it("ROOM_ALREADY_OCCUPIED still governs occupied beds", async () => {
    const encounterUpdateMany = jest.fn();
    const encounterFindFirst = jest.fn().mockResolvedValueOnce(baseEncounter);
    const auditLog = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      encounter: {
        findFirst: encounterFindFirst,
        findMany: jest.fn().mockResolvedValue([
          {
            id: "enc-other",
            facilityId,
            roomLabel: "MS-2",
            status: "OPEN",
            type: "INPATIENT",
            admissionSummaryJson: { serviceUnit: "Med/Surg" },
            patient: { firstName: "Other", lastName: "Patient" },
          },
        ]),
        updateMany: encounterUpdateMany,
      },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const bedBoardService = {
      buildBedKeyForAssignment: jest.fn(() => "MS:2"),
      getEffectiveBedRow: jest.fn().mockResolvedValue({
        bedKey: "MS:2",
        display: "MS-2",
        status: "OCCUPIED",
      }),
      assertBedAssignableOrThrow: jest.fn(),
    };
    const service = new EncountersService(
      prisma as never,
      { log: auditLog } as never,
      {} as never,
      bedBoardService as never
    );

    await expect(
      service.updateRoom(facilityId, "enc-new", { room: "2", unitCode: "MS" })
    ).rejects.toMatchObject({
      response: { code: ROOM_ALREADY_OCCUPIED_CODE },
    });
  });
});
