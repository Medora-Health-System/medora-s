/**
 * MEDUI.D4A.4.3A — enterprise bed transfer consistency (board Change room → PATCH /room).
 */
import { ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { AuditAction, EncounterType } from "@prisma/client";
import {
  ROOM_ALREADY_OCCUPIED_CODE,
  buildCanonicalBedKey,
  composeUnitBedBoard,
  buildHospitalCensusV1,
} from "@medora/shared";
import { EncountersService } from "./encounters.service";
import {
  acquireBedAssignmentRaceLock,
  buildBedAssignmentLockMaterial,
  hashBedAssignmentLockKeys,
} from "./encounter-bed-assignment-race-lock.util";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";
import { createMockEnterpriseAssignmentService } from "./encounters.service.test-enterprise-assignment.mock";
import { createMockEnterpriseLifecycleService } from "./encounters.service.test-enterprise-lifecycle.mock";

const facilityId = "fac-1";

function buildMocks(opts: {
  encounterRow: Record<string, unknown>;
  openRows?: unknown[];
  savedRoomLabel?: string | null;
  findFirstSecond?: Record<string, unknown> | null;
}) {
  const { encounterRow, openRows = [], savedRoomLabel } = opts;
  const encounterUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const resolvedRoomLabel =
    savedRoomLabel !== undefined ? savedRoomLabel : (encounterRow.roomLabel as string | null);
  const updatedRow = {
    ...encounterRow,
    roomLabel: resolvedRoomLabel,
    patient: {
      id: encounterRow.patientId ?? "pat-1",
      firstName: "Jean",
      lastName: "Dupont",
      mrn: "MRN1",
      dob: null,
      sexAtBirth: null,
    },
    physicianAssigned: null,
    nurseAssigned: null,
  };
  const second = opts.findFirstSecond === undefined ? updatedRow : opts.findFirstSecond;
  const encounterFindFirst = jest.fn().mockResolvedValueOnce(encounterRow).mockResolvedValue(second);
  const encounterFindMany = jest.fn().mockResolvedValue(openRows);
  const executeRawUnsafe = jest.fn().mockResolvedValue(undefined);
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const txClient = {
    encounter: {
      findFirst: encounterFindFirst,
      findMany: encounterFindMany,
      updateMany: encounterUpdateMany,
    },
    $executeRawUnsafe: executeRawUnsafe,
  };
  const prisma = {
    encounter: {
      findFirst: encounterFindFirst,
      findMany: encounterFindMany,
      updateMany: encounterUpdateMany,
    },
    $transaction: jest.fn(async (fn: (tx: typeof txClient) => Promise<unknown>) => fn(txClient)),
    $executeRawUnsafe: executeRawUnsafe,
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
  return {
    service,
    auditLog,
    encounterUpdateMany,
    encounterFindMany,
    executeRawUnsafe,
    prisma,
    updatedRow,
  };
}

describe("MEDUI.D4A.4.3A bed transfer consistency (updateRoom)", () => {
  const inpatientOnMs1 = {
    id: "enc-a",
    facilityId,
    patientId: "pat-a",
    type: EncounterType.INPATIENT,
    status: "OPEN",
    workflowState: "IN_TREATMENT",
    version: 1,
    roomLabel: "MS-1",
    providerDocumentationStatus: "DRAFT",
    admissionSummaryJson: { serviceUnit: "Med/Surg" },
  };

  it("A — MS-1 → MS-4: one encounter, destination roomLabel MS-4", async () => {
    const openRows = [
      {
        id: "enc-a",
        facilityId,
        roomLabel: "MS-1",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Jean", lastName: "Dupont" },
      },
    ];
    const { service, encounterUpdateMany, updatedRow } = buildMocks({
      encounterRow: inpatientOnMs1,
      openRows,
      savedRoomLabel: "MS-4",
    });

    const res = (await service.updateRoom(facilityId, "enc-a", {
      room: "4",
      unitCode: "MS",
      reason: "ROOM_CHANGE",
    })) as Record<string, unknown>;

    expect(encounterUpdateMany).toHaveBeenCalledWith({
      where: { id: "enc-a", facilityId, version: 1 },
      data: { roomLabel: "MS-4", version: { increment: 1 } },
    });
    expect(res.roomLabel).toBe("MS-4");
    expect((updatedRow as { id?: string }).id).toBe("enc-a");
  });

  it("B — after move, old bed MS-1 has no open occupant in occupancy set", () => {
    const beds = composeUnitBedBoard({
      unitCode: "MS",
      encounters: [
        {
          id: "enc-a",
          facilityId,
          roomLabel: "MS-4",
          status: "OPEN",
          type: EncounterType.INPATIENT,
          admissionSummaryJson: { serviceUnit: "Med/Surg" },
          patientFirstName: "Jean",
          patientLastName: "Dupont",
        },
      ],
      overlays: new Map(),
    });
    const ms1 = beds.find((b) => b.bedKey === "MS:1");
    const ms4 = beds.find((b) => b.bedKey === "MS:4");
    expect(ms1?.status).toBe("AVAILABLE");
    expect(ms1?.occupantEncounterId).toBeFalsy();
    expect(ms4?.status).toBe("OCCUPIED");
    expect(ms4?.occupantEncounterId).toBe("enc-a");
  });

  it("C — destination occupied → ROOM_ALREADY_OCCUPIED; no update", async () => {
    const openRows = [
      {
        id: "enc-a",
        facilityId,
        roomLabel: "MS-1",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Jean", lastName: "Dupont" },
      },
      {
        id: "enc-b",
        facilityId,
        roomLabel: "MS-4",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Paul", lastName: "Louis" },
      },
    ];
    const { service, encounterUpdateMany } = buildMocks({
      encounterRow: inpatientOnMs1,
      openRows,
      savedRoomLabel: "MS-4",
    });

    await expect(
      service.updateRoom(facilityId, "enc-a", {
        room: "4",
        unitCode: "MS",
        reason: "ROOM_CHANGE",
      })
    ).rejects.toMatchObject({
      response: { code: ROOM_ALREADY_OCCUPIED_CODE, occupiedRoom: "MS-4" },
    });
    expect(encounterUpdateMany).not.toHaveBeenCalled();
  });

  it("D — competing exclusive claims take advisory lock on MS:4 before occupancy re-check", async () => {
    const openRows = [
      {
        id: "enc-a",
        facilityId,
        roomLabel: "MS-1",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Jean", lastName: "Dupont" },
      },
    ];
    const { service, executeRawUnsafe, encounterFindMany, prisma } = buildMocks({
      encounterRow: inpatientOnMs1,
      openRows,
      savedRoomLabel: "MS-4",
    });

    const callOrder: string[] = [];
    executeRawUnsafe.mockImplementation(async () => {
      callOrder.push("lock");
    });
    encounterFindMany.mockImplementation(async () => {
      callOrder.push("occupancy");
      return openRows;
    });

    await service.updateRoom(facilityId, "enc-a", {
      room: "4",
      unitCode: "MS",
      reason: "ROOM_CHANGE",
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    const expected = hashBedAssignmentLockKeys(
      buildBedAssignmentLockMaterial({ facilityId, canonicalBedKey: "MS:4" })
    );
    expect(executeRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock($1::int, $2::int)",
      expected.key1,
      expected.key2
    );
    expect(callOrder.indexOf("lock")).toBeLessThan(callOrder.indexOf("occupancy"));
    expect(buildCanonicalBedKey("MS", "4")).toBe("MS:4");
  });

  it("D2 — second claim after first occupies MS-4 is rejected (serialized outcome)", async () => {
    const patientB = {
      id: "enc-b",
      facilityId,
      patientId: "pat-b",
      type: EncounterType.INPATIENT,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: "MS-2",
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: { serviceUnit: "Med/Surg" },
    };
    const openAfterA = [
      {
        id: "enc-a",
        facilityId,
        roomLabel: "MS-4",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Jean", lastName: "Dupont" },
      },
      {
        id: "enc-b",
        facilityId,
        roomLabel: "MS-2",
        status: "OPEN",
        type: EncounterType.INPATIENT,
        admissionSummaryJson: { serviceUnit: "Med/Surg" },
        patient: { firstName: "Paul", lastName: "Louis" },
      },
    ];
    const { service, encounterUpdateMany } = buildMocks({
      encounterRow: patientB,
      openRows: openAfterA,
      savedRoomLabel: "MS-4",
    });

    await expect(
      service.updateRoom(facilityId, "enc-b", { room: "4", unitCode: "MS" })
    ).rejects.toMatchObject({
      response: { code: ROOM_ALREADY_OCCUPIED_CODE },
    });
    expect(encounterUpdateMany).not.toHaveBeenCalled();
  });

  it("E — foreign-facility encounter id → NotFound (no cross-facility mutation)", async () => {
    const encounterFindFirst = jest.fn().mockResolvedValue(null);
    const prisma = {
      encounter: { findFirst: encounterFindFirst, findMany: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const service = new EncountersService(
      prisma as never,
      { log: jest.fn() } as never,
      {} as never,
      createMockBedBoardService() as never,
      createMockInternalPlacementService() as never,
      createMockEnterpriseAssignmentService() as never,
      createMockEnterpriseLifecycleService() as never
    );

    await expect(
      service.updateRoom(facilityId, "enc-foreign", { room: "4", unitCode: "MS" })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(encounterFindFirst).toHaveBeenCalledWith({
      select: expect.anything(),
      where: { id: "enc-foreign", facilityId },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("E2 — wrong-unit / out-of-pool bed rejected server-side", async () => {
    const { service, encounterUpdateMany } = buildMocks({
      encounterRow: inpatientOnMs1,
      openRows: [],
    });

    await expect(
      service.updateRoom(facilityId, "enc-a", { room: "99", unitCode: "MS" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(encounterUpdateMany).not.toHaveBeenCalled();
  });

  it("F — encounter roomLabel, census, and bed-board agree after transfer", () => {
    const encounter = {
      id: "enc-a",
      facilityId,
      patientId: "pat-a",
      type: "INPATIENT",
      status: "OPEN",
      roomLabel: "MS-4",
      admittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      patient: { id: "pat-a", firstName: "Jean", lastName: "Dupont", mrn: "MRN1" },
    };
    const census = buildHospitalCensusV1({
      facilityId,
      encounters: [encounter],
      placements: [],
      placementAvailability: "ENABLED",
      bedSummary: { total: 30, available: 29, occupied: 1, cleaning: 0, blocked: 0 },
      snapshotScope: "ALL_HOSPITAL_CARE",
    });
    const beds = composeUnitBedBoard({
      unitCode: "MS",
      encounters: [
        {
          id: "enc-a",
          facilityId,
          roomLabel: "MS-4",
          status: "OPEN",
          type: EncounterType.INPATIENT,
          admissionSummaryJson: { serviceUnit: "Med/Surg" },
          patientFirstName: "Jean",
          patientLastName: "Dupont",
        },
      ],
      overlays: new Map(),
    });
    const row = census.inpatientPatients.find((p) => p.encounterId === "enc-a");
    const bed = beds.find((b) => b.bedKey === "MS:4");
    expect(row?.unitRoomBed).toBe("MS-4");
    expect(bed?.occupantEncounterId).toBe("enc-a");
    expect(bed?.status).toBe("OCCUPIED");
  });

  it("G — ED room-change still blocks duplicate and still audits", async () => {
    const edEncounter = {
      id: "enc-ed",
      facilityId,
      patientId: "pat-ed",
      type: EncounterType.EMERGENCY,
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      version: 1,
      roomLabel: "1",
      providerDocumentationStatus: "DRAFT",
      admissionSummaryJson: null,
    };
    const openRows = [
      {
        id: "enc-ed",
        facilityId,
        roomLabel: "1",
        status: "OPEN",
        type: EncounterType.EMERGENCY,
        admissionSummaryJson: null,
        patient: { firstName: "Ed", lastName: "One" },
      },
      {
        id: "enc-other",
        facilityId,
        roomLabel: "2",
        status: "OPEN",
        type: EncounterType.EMERGENCY,
        admissionSummaryJson: null,
        patient: { firstName: "Marie", lastName: "Martin" },
      },
    ];
    const blocked = buildMocks({ encounterRow: edEncounter, openRows, savedRoomLabel: "2" });
    await expect(
      blocked.service.updateRoom(facilityId, "enc-ed", { room: "2", unitCode: "ED" })
    ).rejects.toBeInstanceOf(ConflictException);

    const free = buildMocks({
      encounterRow: edEncounter,
      openRows: [openRows[0]!],
      savedRoomLabel: "3",
    });
    await free.service.updateRoom(facilityId, "enc-ed", {
      room: "3",
      unitCode: "ED",
      reason: "ROOM_CHANGE",
    });
    expect(free.auditLog).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_UPDATE,
      "ENCOUNTER",
      expect.objectContaining({
        metadata: expect.objectContaining({
          event: "ROOM_ASSIGNMENT_UPDATE",
          roomFrom: "1",
          roomTo: "3",
        }),
      })
    );
  });

  it("previous-bed semantics: board Change room does not invent DIRTY (AVAILABLE when vacated)", () => {
    const beds = composeUnitBedBoard({
      unitCode: "MS",
      encounters: [],
      overlays: new Map(),
    });
    const vacated = beds.find((b) => b.bedKey === "MS:1");
    expect(vacated?.status).toBe("AVAILABLE");
  });

  it("lock helper is exported for transaction clients", async () => {
    const tx = { $executeRawUnsafe: jest.fn() };
    await acquireBedAssignmentRaceLock(tx, { facilityId: "f", canonicalBedKey: "ICU:2" });
    expect(tx.$executeRawUnsafe).toHaveBeenCalled();
  });
});
