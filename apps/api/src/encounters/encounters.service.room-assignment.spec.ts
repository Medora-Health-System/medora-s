import { AuditAction, EncounterType } from "@prisma/client";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";
import { createMockEnterpriseAssignmentService } from "./encounters.service.test-enterprise-assignment.mock";

function buildUpdateRoomMocks(encounterRow: Record<string, unknown>, openRows: unknown[] = []) {
  const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const updatedRow = {
    ...encounterRow,
    roomLabel: "MS-4",
    patient: { id: "pat-1", firstName: "Jean", lastName: "Test", mrn: "MRN1", dob: null, sexAtBirth: null },
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
  const service = new EncountersService(
    prisma as never,
    { log: auditLog } as never,
    {} as never,
    createMockBedBoardService() as never,
    createMockInternalPlacementService() as never,
    createMockEnterpriseAssignmentService() as never
  );
  return { service, auditLog, encounterUpdateMany, updatedRow };
}

describe("EncountersService.updateRoom (K.10B.10)", () => {
  const facilityId = "fac-1";
  const baseEncounter = {
    id: "enc-1",
    facilityId,
    patientId: "pat-1",
    type: EncounterType.INPATIENT,
    status: "OPEN",
    workflowState: "ACTIVE",
    version: 1,
    roomLabel: null,
    providerDocumentationStatus: "DRAFT",
    admissionSummaryJson: { serviceUnit: "Med/Surg" },
  };

  it("updates encounter room and returns governed display", async () => {
    const { service, updatedRow } = buildUpdateRoomMocks(baseEncounter);
    const res = (await service.updateRoom(facilityId, "enc-1", {
      room: "4",
      unitCode: "MS",
      reason: "ROOM_CHANGE",
    })) as Record<string, unknown>;

    expect(res.roomLabel).toBe(updatedRow.roomLabel);
    expect(res.governedRoomDisplay).toBe("MS-4");
    expect(res.governedRoomHasAssignment).toBe(true);
  });

  it("logs ROOM_ASSIGNMENT_UPDATE audit metadata", async () => {
    const { service, auditLog } = buildUpdateRoomMocks({
      ...baseEncounter,
      roomLabel: "MS-2",
    });
    await service.updateRoom(facilityId, "enc-1", {
      room: "4",
      unitCode: "MS",
      reason: "TRANSFER",
    });

    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_UPDATE,
      "ENCOUNTER",
      expect.objectContaining({
        metadata: expect.objectContaining({
          event: "ROOM_ASSIGNMENT_UPDATE",
          roomFrom: "MS-2",
          roomTo: "MS-4",
          reasonCode: "TRANSFER",
        }),
      })
    );
  });

  it("clears room when room is null", async () => {
    const { service, encounterUpdateMany } = buildUpdateRoomMocks({
      ...baseEncounter,
      roomLabel: "MS-2",
    });
    await service.updateRoom(facilityId, "enc-1", {
      room: null,
      unitCode: "MS",
    });

    expect(encounterUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomLabel: null }),
      })
    );
  });

  it("accepts EMERGENCY unitCode alias and returns governed display", async () => {
    const edEncounter = {
      ...baseEncounter,
      type: EncounterType.EMERGENCY,
      roomLabel: null,
      admissionSummaryJson: null,
    };
    const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const updatedRow = {
      ...edEncounter,
      roomLabel: "2",
      patient: { id: "pat-1", firstName: "Jean", lastName: "Test", mrn: "MRN1", dob: null, sexAtBirth: null },
      physicianAssigned: null,
      nurseAssigned: null,
    };
    const encounterFindFirst = jest
      .fn()
      .mockResolvedValueOnce(edEncounter)
      .mockResolvedValue(updatedRow);
    const auditLog = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      encounter: {
        findFirst: encounterFindFirst,
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: encounterUpdateMany,
      },
    };
    const service = new EncountersService(
    prisma as never,
    { log: auditLog } as never,
    {} as never,
    createMockBedBoardService() as never,
    createMockInternalPlacementService() as never,
    createMockEnterpriseAssignmentService() as never
  );

    const res = (await service.updateRoom(facilityId, "enc-1", {
      room: "2",
      unitCode: "EMERGENCY" as never,
      reason: "ROOM_CHANGE",
    })) as Record<string, unknown>;

    expect(res.governedRoomDisplay).toBe("ED-2");
  });

  it("returns success without DB update when room is unchanged (no-op)", async () => {
    const edEncounter = {
      ...baseEncounter,
      type: EncounterType.EMERGENCY,
      roomLabel: "4",
      admissionSummaryJson: null,
    };
    const encounterFindFirst = jest.fn().mockResolvedValue(edEncounter);
    const encounterUpdateMany = jest.fn();
    const auditLog = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      encounter: {
        findFirst: encounterFindFirst,
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: encounterUpdateMany,
      },
    };
    const service = new EncountersService(
    prisma as never,
    { log: auditLog } as never,
    {} as never,
    createMockBedBoardService() as never,
    createMockInternalPlacementService() as never,
    createMockEnterpriseAssignmentService() as never
  );

    const res = (await service.updateRoom(facilityId, "enc-1", {
      room: "4",
      unitCode: "ED",
      reason: "ROOM_CHANGE",
    })) as Record<string, unknown>;

    expect(encounterUpdateMany).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
    expect(res.governedRoomDisplay).toBe("ED-4");
  });
});
