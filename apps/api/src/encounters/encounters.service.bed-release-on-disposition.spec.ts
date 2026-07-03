import { EncounterType, EncounterWorkflowState } from "@prisma/client";
import {
  ED_DISCHARGE_MODE_HOME,
  ED_DISCHARGE_MODE_TRANSFER,
  ED_DISCHARGE_MODE_ADMISSION,
  ED_DISCHARGE_MODE_AMA,
  ED_DISCHARGE_MODE_DECEASED,
  ED_DISCHARGE_MODE_OTHER,
} from "@medora/shared";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";

const facilityId = "fac-a";
const encounterId = "enc-1";
const patientId = "pat-1";
const userId = "user-1";

function baseEncounter(overrides?: Record<string, unknown>) {
  return {
    id: encounterId,
    facilityId,
    patientId,
    type: EncounterType.EMERGENCY,
    status: "OPEN",
    workflowState: EncounterWorkflowState.IN_TREATMENT,
    roomLabel: "ed-2",
    version: 1,
    providerDocumentationStatus: null,
    dischargeSummaryJson: null,
    nursingAssessment: null,
    admissionSummaryJson: null,
    billingCaptureJson: null,
    billingFinalizationStatus: null,
    physicianAssignedUserId: null,
    ...overrides,
  };
}

function buildUpdateMocks(encounter: Record<string, unknown>) {
  const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const updatedRow = {
    ...encounter,
    patient: { id: patientId, firstName: "Jean", lastName: "Test", mrn: "MRN1" },
    physicianAssigned: null,
  };
  const encounterFindFirst = jest
    .fn()
    .mockResolvedValueOnce(encounter)
    .mockResolvedValue(updatedRow);
  const auditLog = jest.fn().mockResolvedValue(undefined);

  const findFirstForRole = jest.fn().mockResolvedValue({
    userId,
    role: { code: "RN" },
  });
  const userFindFirst = jest.fn().mockResolvedValue({
    id: userId,
    firstName: "Marie",
    lastName: "Nurse",
  });

  const prisma = {
    encounter: {
      findFirst: encounterFindFirst,
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: encounterUpdateMany,
    },
    userRole: {
      findFirst: findFirstForRole,
      findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]),
    },
    user: {
      findFirst: userFindFirst,
    },
    encounterClinicalEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => {
      return fn(prisma);
    }),
  };
  return { prisma, auditLog, encounterUpdateMany, encounterFindFirst };
}

function createService(prisma: unknown, auditLog: jest.Mock, bedBoardService?: unknown) {
  return new EncountersService(
    prisma as never,
    { log: auditLog } as never,
    {} as never,
    (bedBoardService ?? createMockBedBoardService()) as never
  );
}

describe("EncountersService — ED bed release on disposition", () => {
  it("discharge disposition releases ED bed and marks Dirty", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    bedBoard.getEffectiveBedRow.mockResolvedValue({
      bedKey: "ED:ed-2",
      status: "OCCUPIED",
      display: "ED-2",
    });
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME } },
      userId
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(encounterUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: encounterId, roomLabel: "ed-2" }),
        data: expect.objectContaining({ roomLabel: null }),
      })
    );
    expect(bedBoard.updateBedStatus).toHaveBeenCalledWith(
      facilityId,
      "ED:ed-2",
      { status: "DIRTY" },
      userId
    );
  });

  it("transfer disposition releases ED bed and marks Dirty", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    bedBoard.getEffectiveBedRow.mockResolvedValue({
      bedKey: "ED:ed-2",
      status: "OCCUPIED",
      display: "ED-2",
    });
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_TRANSFER } },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(encounterUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: encounterId, roomLabel: "ed-2" }),
        data: expect.objectContaining({ roomLabel: null }),
      })
    );
    expect(bedBoard.updateBedStatus).toHaveBeenCalledWith(
      facilityId,
      "ED:ed-2",
      { status: "DIRTY" },
      userId
    );
  });

  it("observation/admission disposition releases ED bed", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    bedBoard.getEffectiveBedRow.mockResolvedValue({
      bedKey: "ED:ed-2",
      status: "OCCUPIED",
      display: "ED-2",
    });
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION } },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(bedBoard.updateBedStatus).toHaveBeenCalledWith(
      facilityId,
      "ED:ed-2",
      { status: "DIRTY" },
      userId
    );
  });

  it("bed is not double-released if already Dirty", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    bedBoard.getEffectiveBedRow.mockResolvedValue({
      bedKey: "ED:ed-2",
      status: "DIRTY",
      display: "ED-2",
    });
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME } },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(bedBoard.updateBedStatus).not.toHaveBeenCalled();
  });

  it("active encounter without disposition keeps room occupied", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { notes: "Patient stable, monitoring continues." },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    const roomLabelClearCalls = encounterUpdateMany.mock.calls.filter(
      (c: unknown[]) => {
        const args = c[0] as Record<string, unknown>;
        return args?.data && (args.data as Record<string, unknown>).roomLabel === null;
      }
    );
    expect(roomLabelClearCalls.length).toBe(0);
    expect(bedBoard.updateBedStatus).not.toHaveBeenCalled();
  });

  it("AMA disposition releases bed", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    bedBoard.getEffectiveBedRow.mockResolvedValue({
      bedKey: "ED:ed-2",
      status: "OCCUPIED",
      display: "ED-2",
    });
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_AMA } },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(bedBoard.updateBedStatus).toHaveBeenCalledWith(
      facilityId,
      "ED:ed-2",
      { status: "DIRTY" },
      userId
    );
  });

  it("deceased disposition releases bed", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    bedBoard.getEffectiveBedRow.mockResolvedValue({
      bedKey: "ED:ed-2",
      status: "OCCUPIED",
      display: "ED-2",
    });
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_DECEASED } },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(bedBoard.updateBedStatus).toHaveBeenCalledWith(
      facilityId,
      "ED:ed-2",
      { status: "DIRTY" },
      userId
    );
  });

  it("LWBS/other disposition releases bed", async () => {
    const encounter = baseEncounter();
    const { prisma, auditLog } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    bedBoard.getEffectiveBedRow.mockResolvedValue({
      bedKey: "ED:ed-2",
      status: "OCCUPIED",
      display: "ED-2",
    });
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_OTHER } },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(bedBoard.updateBedStatus).toHaveBeenCalledWith(
      facilityId,
      "ED:ed-2",
      { status: "DIRTY" },
      userId
    );
  });

  it("encounter without room does not attempt bed release", async () => {
    const encounter = baseEncounter({ roomLabel: null });
    const { prisma, auditLog, encounterUpdateMany } = buildUpdateMocks(encounter);
    const bedBoard = createMockBedBoardService();
    const svc = createService(prisma, auditLog, bedBoard);

    await svc.update(
      facilityId,
      encounterId,
      { dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME } },
      userId
    );
    await new Promise((r) => setTimeout(r, 50));

    expect(bedBoard.updateBedStatus).not.toHaveBeenCalled();
  });
});
