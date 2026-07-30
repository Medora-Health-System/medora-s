import { ConflictException } from "@nestjs/common";
import { AuditAction, EncounterType } from "@prisma/client";
import { ROOM_ALREADY_OCCUPIED_CODE } from "@medora/shared";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";
import { createMockEnterpriseAssignmentService } from "./encounters.service.test-enterprise-assignment.mock";
import { createMockEnterpriseLifecycleService } from "./encounters.service.test-enterprise-lifecycle.mock";

const facilityId = "fac-1";
const patientId = "pat-1";

function buildUpdateRoomMocks(
  encounterRow: Record<string, unknown>,
  openRows: unknown[] = [],
  savedRoomLabel?: string | null
) {
  const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const resolvedRoomLabel =
    savedRoomLabel !== undefined ? savedRoomLabel : (encounterRow.roomLabel as string | null);
  const updatedRow = {
    ...encounterRow,
    roomLabel: resolvedRoomLabel,
    patient: { id: patientId, firstName: "Jean", lastName: "Dupont", mrn: "MRN1", dob: null, sexAtBirth: null },
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
    createMockEnterpriseAssignmentService() as never,
    createMockEnterpriseLifecycleService() as never
  );
  return { service, auditLog, encounterUpdateMany, encounterFindFirst, updatedRow };
}

describe("EncountersService.updateRoom — bed governance (K.10B.10B M2)", () => {
  it("blocks duplicate ED room assignment with ROOM_ALREADY_OCCUPIED", async () => {
    const edEncounter = {
      id: "enc-new",
      facilityId,
      patientId,
      type: EncounterType.EMERGENCY,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: null,
    };
    const openRows = [
      {
        id: "enc-occupied",
        facilityId,
        roomLabel: "2",
        status: "OPEN",
        type: EncounterType.EMERGENCY,
        admissionSummaryJson: null,
        patient: { firstName: "Marie", lastName: "Martin" },
      },
    ];
    const { service } = buildUpdateRoomMocks(edEncounter, openRows);

    await expect(
      service.updateRoom(facilityId, "enc-new", {
        room: "2",
        unitCode: "ED",
        reason: "ROOM_CHANGE",
      })
    ).rejects.toMatchObject({
      response: {
        code: ROOM_ALREADY_OCCUPIED_CODE,
        occupiedRoom: "ED-2",
        occupiedByEncounterId: "enc-occupied",
        occupiedByPatientName: "Marie Martin",
      },
    });
  });

  it("blocks duplicate MS room assignment", async () => {
    const encounter = {
      id: "enc-ms-new",
      facilityId,
      patientId,
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { serviceUnit: "Med/Surg" },
    };
    const openRows = [
      {
        id: "enc-ms-occupied",
        facilityId,
        roomLabel: "MS-2",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Paul", lastName: "Louis" },
      },
    ];
    const { service, encounterUpdateMany } = buildUpdateRoomMocks(encounter, openRows, "MS-2");

    await expect(
      service.updateRoom(facilityId, "enc-ms-new", {
        room: "2",
        unitCode: "MS",
        reason: "ROOM_CHANGE",
      })
    ).rejects.toMatchObject({
      response: {
        code: ROOM_ALREADY_OCCUPIED_CODE,
        occupiedRoom: "MS-2",
      },
    });
    expect(encounterUpdateMany).not.toHaveBeenCalled();
  });

  it("blocks duplicate ICU room assignment", async () => {
    const encounter = {
      id: "enc-icu-new",
      facilityId,
      patientId,
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { serviceUnit: "ICU" },
    };
    const openRows = [
      {
        id: "enc-icu-occupied",
        facilityId,
        roomLabel: "ICU-2",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "ICU" },
        patient: { firstName: "Luc", lastName: "Bernard" },
      },
    ];
    const { service } = buildUpdateRoomMocks(encounter, openRows);

    await expect(
      service.updateRoom(facilityId, "enc-icu-new", {
        room: "2",
        unitCode: "ICU",
      })
    ).rejects.toMatchObject({
      response: {
        code: ROOM_ALREADY_OCCUPIED_CODE,
        occupiedRoom: "ICU-2",
      },
    });
  });

  it("blocks duplicate OBS room assignment", async () => {
    const encounter = {
      id: "enc-obs-new",
      facilityId,
      patientId,
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { careLevel: "Observation" },
    };
    const openRows = [
      {
        id: "enc-obs-occupied",
        facilityId,
        roomLabel: "OBS-2",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { careLevel: "Observation" },
        patient: { firstName: "Anne", lastName: "Petit" },
      },
    ];
    const { service } = buildUpdateRoomMocks(encounter, openRows);

    await expect(
      service.updateRoom(facilityId, "enc-obs-new", {
        room: "2",
        unitCode: "OBS",
      })
    ).rejects.toMatchObject({
      response: {
        code: ROOM_ALREADY_OCCUPIED_CODE,
        occupiedRoom: "OBS-2",
      },
    });
  });

  it("allows ED-2 and MS-2 simultaneously", async () => {
    const encounter = {
      id: "enc-ms-new",
      facilityId,
      patientId,
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { serviceUnit: "Med/Surg" },
    };
    const openRows = [
      {
        id: "enc-ed",
        facilityId,
        roomLabel: "2",
        status: "OPEN",
        type: EncounterType.EMERGENCY,
        admissionSummaryJson: null,
        patient: { firstName: "Ed", lastName: "Patient" },
      },
    ];
    const { service, encounterUpdateMany } = buildUpdateRoomMocks(encounter, openRows, "MS-2");

    await service.updateRoom(facilityId, "enc-ms-new", {
      room: "2",
      unitCode: "MS",
    });

    expect(encounterUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomLabel: "MS-2" }),
      })
    );
  });

  it("same encounter no-op succeeds without DB update", async () => {
    const encounter = {
      id: "enc-1",
      facilityId,
      patientId,
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: "MS-2",
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { serviceUnit: "Med/Surg" },
    };
    const { service, encounterUpdateMany, auditLog } = buildUpdateRoomMocks(encounter, [
      {
        id: "enc-1",
        facilityId,
        roomLabel: "MS-2",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Jean", lastName: "Dupont" },
      },
    ]);

    await service.updateRoom(facilityId, "enc-1", {
      room: "2",
      unitCode: "MS",
    });

    expect(encounterUpdateMany).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("ignores closed encounter occupying the same bed", async () => {
    const encounter = {
      id: "enc-new",
      facilityId,
      patientId,
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { serviceUnit: "Med/Surg" },
    };
    const openRows = [
      {
        id: "enc-closed",
        facilityId,
        roomLabel: "MS-2",
        status: "CLOSED",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Old", lastName: "Patient" },
      },
    ];
    const { service, encounterUpdateMany } = buildUpdateRoomMocks(encounter, openRows, "MS-2");

    await service.updateRoom(facilityId, "enc-new", {
      room: "2",
      unitCode: "MS",
    });

    expect(encounterUpdateMany).toHaveBeenCalled();
  });

  it("override succeeds and audits override metadata", async () => {
    const encounter = {
      id: "enc-new",
      facilityId,
      patientId,
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { serviceUnit: "Med/Surg" },
    };
    const openRows = [
      {
        id: "enc-occupied",
        facilityId,
        roomLabel: "MS-2",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Marie", lastName: "Martin" },
      },
    ];
    const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const encounterFindFirst = jest
      .fn()
      .mockResolvedValueOnce(encounter)
      .mockResolvedValue({
        ...encounter,
        roomLabel: "MS-2",
        patient: { id: patientId, firstName: "Jean", lastName: "Dupont", mrn: "MRN1", dob: null, sexAtBirth: null },
        physicianAssigned: null,
        nurseAssigned: null,
      });
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
    createMockEnterpriseAssignmentService() as never,
    createMockEnterpriseLifecycleService() as never
  );

    await service.updateRoom(facilityId, "enc-new", {
      room: "2",
      unitCode: "MS",
      reason: "ROOM_CHANGE",
      confirmOccupiedRoomAssignment: true,
      roomOccupancyOverride: { requestedRoom: "2", acceptedRoom: "2" },
    });

    expect(encounterUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomLabel: "MS-2" }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_UPDATE,
      "ENCOUNTER",
      expect.objectContaining({
        metadata: expect.objectContaining({
          event: "ROOM_ASSIGNMENT_UPDATE",
          override: true,
          overrideRequestedRoom: "2",
          overrideAcceptedRoom: "2",
          reasonCode: "ROOM_CHANGE",
        }),
      })
    );
  });
});

describe("EncountersService.updateRoom — bed governance conflict shape", () => {
  it("throws ConflictException with structured 409 body", async () => {
    const edEncounter = {
      id: "enc-new",
      facilityId,
      patientId,
      type: EncounterType.EMERGENCY,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: null,
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: null,
    };
    const openRows = [
      {
        id: "enc-occupied",
        facilityId,
        roomLabel: "2",
        status: "OPEN",
        type: EncounterType.EMERGENCY,
        admissionSummaryJson: null,
        patient: { firstName: "Marie", lastName: "Martin" },
      },
    ];
    const { service } = buildUpdateRoomMocks(edEncounter, openRows);

    try {
      await service.updateRoom(facilityId, "enc-new", { room: "2", unitCode: "ED" });
      throw new Error("expected conflict");
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictException);
    }
  });
});
