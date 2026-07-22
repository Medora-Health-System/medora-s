/**
 * Regression: production POST /inpatient-operations/direct-admission returned 500
 * (requestId 078be476-5289-4308-933c-efe344f12c64) with Prisma P2022 on
 * Encounter.hospitalEpisodeId while D3B migration was unapplied and foundation OFF.
 */

import { InpatientOperationsService } from "./inpatient-operations.service";
import { AdmissionCorrelationService } from "./admission-correlation.service";
import { ENCOUNTER_FORBIDDEN_SELECT_KEYS } from "./encounter-query-contracts";

describe("createDirectAdmission expand-and-contract (D3B)", () => {
  const prevDirect = process.env.DIRECT_INPATIENT_ADMISSION_ENABLED;
  const prevEpisode = process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
  const prevEpisodePublic = process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;

  beforeEach(() => {
    process.env.DIRECT_INPATIENT_ADMISSION_ENABLED = "true";
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    delete process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;
  });

  afterEach(() => {
    if (prevDirect === undefined) delete process.env.DIRECT_INPATIENT_ADMISSION_ENABLED;
    else process.env.DIRECT_INPATIENT_ADMISSION_ENABLED = prevDirect;
    if (prevEpisode === undefined) delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    else process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = prevEpisode;
    if (prevEpisodePublic === undefined) {
      delete process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED = prevEpisodePublic;
    }
  });

  function assertSelectOmitsD3b(select: Record<string, unknown> | undefined) {
    expect(select).toBeTruthy();
    for (const key of ENCOUNTER_FORBIDDEN_SELECT_KEYS) {
      expect(select).not.toHaveProperty(key);
    }
  }

  it("does not select Encounter.hospitalEpisodeId when foundation is OFF (prod P2022 regression)", async () => {
    const findManySelects: Array<Record<string, unknown>> = [];
    const findMany = jest.fn().mockImplementation(async (args: { select?: Record<string, unknown> }) => {
      if (args?.select) findManySelects.push(args.select);
      // Simulate pre-D3B DB: selecting hospitalEpisodeId would throw P2022.
      if (args?.select && "hospitalEpisodeId" in args.select) {
        throw Object.assign(new Error("Invalid `prisma.encounter.findMany()` invocation"), {
          name: "PrismaClientKnownRequestError",
          code: "P2022",
          meta: { modelName: "Encounter", column: "Encounter.hospitalEpisodeId" },
        });
      }
      return [];
    });

    const encounterCreate = jest.fn().mockResolvedValue({ id: "enc-new-1" });
    const encounterUpdate = jest.fn().mockResolvedValue({ id: "enc-new-1" });
    const encounterFindFirst = jest.fn().mockImplementation(async (args: { select?: Record<string, unknown> }) => {
      if (args?.select && "hospitalEpisodeId" in args.select) {
        throw Object.assign(new Error("Invalid `prisma.encounter.findFirst()` invocation"), {
          name: "PrismaClientKnownRequestError",
          code: "P2022",
          meta: { modelName: "Encounter", column: "Encounter.hospitalEpisodeId" },
        });
      }
      // Final detail load uses ENCOUNTER_DETAIL_SELECT (no hospitalEpisodeId).
      if (args?.select && "id" in (args.select ?? {}) && "patientId" in (args.select ?? {})) {
        return {
          id: "enc-new-1",
          patientId: "pat-1",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          admissionSummaryJson: {},
        };
      }
      return { id: "pat-1" };
    });

    const patientFindFirst = jest.fn().mockResolvedValue({ id: "pat-1" });

    const prisma = {
      patient: { findFirst: patientFindFirst },
      encounter: {
        findMany,
        findFirst: encounterFindFirst,
        create: encounterCreate,
        update: encounterUpdate,
      },
      hospitalEpisode: { findFirst: jest.fn(), create: jest.fn() },
      userRole: { findFirst: jest.fn() },
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounter: {
            findMany,
            create: encounterCreate,
            update: encounterUpdate,
          },
          hospitalEpisode: { create: jest.fn() },
        }),
    };

    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const admissionCorrelation = new AdmissionCorrelationService(prisma as never, audit as never);
    const bedBoardService = {
      getEffectiveBedRow: jest.fn().mockResolvedValue({
        bedKey: "MS:2",
        display: "MS-2",
        status: "AVAILABLE",
        occupantEncounterId: null,
        reasonCode: null,
        reasonText: null,
      }),
      assertBedAssignableOrThrow: jest.fn(),
    };

    const svc = new InpatientOperationsService(
      prisma as never,
      audit as never,
      admissionCorrelation,
      bedBoardService as never
    );

    const result = await svc.createDirectAdmission("fac-1", "user-rn-1", {
      patientId: "pat-1",
      admissionSource: "DIRECT",
      admissionDiagnosis: "Pneumonia",
      reasonForAdmission: "IV antibiotics",
      admittingService: "INTERNAL_MEDICINE",
      requestedUnit: "MS",
      requestedLevelOfCare: "MEDICAL_SURGICAL",
      assignedBedKey: "MS:2",
      admittedAt: new Date().toISOString(),
      idempotencyKey: "idem-ms2-regression-1",
    });

    expect(result.encounter?.id ?? (result as { encounter?: { id?: string } }).encounter).toBeTruthy();
    expect(findManySelects.length).toBeGreaterThan(0);
    for (const select of findManySelects) {
      assertSelectOmitsD3b(select);
    }
    expect(encounterCreate).toHaveBeenCalled();
    const createData = encounterCreate.mock.calls[0][0].data as Record<string, unknown>;
    expect(createData).not.toHaveProperty("hospitalEpisodeId");
    expect(createData.roomLabel).toBe("MS-2");
    expect(prisma.hospitalEpisode.create).not.toHaveBeenCalled();
  });

  it("returns coded 404 PATIENT_NOT_FOUND_IN_FACILITY when patient is outside facility", async () => {
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue(null) },
      encounter: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      hospitalEpisode: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    const audit = { log: jest.fn() };
    const admissionCorrelation = new AdmissionCorrelationService(prisma as never, audit as never);
    const svc = new InpatientOperationsService(
      prisma as never,
      audit as never,
      admissionCorrelation,
      {
        getEffectiveBedRow: jest.fn(),
        assertBedAssignableOrThrow: jest.fn(),
      } as never
    );

    try {
      await svc.createDirectAdmission("fac-1", "user-rn-1", {
        patientId: "pat-missing",
        admissionSource: "DIRECT",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "IV antibiotics",
        admittingService: "INTERNAL_MEDICINE",
        requestedUnit: "MS",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
        assignedBedKey: "MS:2",
        admittedAt: new Date().toISOString(),
        idempotencyKey: "idem-missing-patient",
      });
      throw new Error("expected NotFoundException");
    } catch (e) {
      const err = e as { getStatus?: () => number; getResponse?: () => unknown };
      expect(err.getStatus?.()).toBe(404);
      const body = err.getResponse?.() as { errorCode?: string; code?: string };
      expect(body.errorCode ?? body.code).toBe("PATIENT_NOT_FOUND_IN_FACILITY");
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("registers POST direct-admission on InpatientOperationsController", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(__dirname, "inpatient-operations.controller.ts"), "utf8");
    expect(src).toContain('@Controller("inpatient-operations")');
    expect(src).toContain('@Post("direct-admission")');
    expect(src).toContain("async directAdmission(");
  });

  it("rejects non-canonical assignedBedKey MS-2 with 400 (not 500)", async () => {
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: "pat-1" }) },
      encounter: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      hospitalEpisode: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    const audit = { log: jest.fn() };
    const admissionCorrelation = new AdmissionCorrelationService(prisma as never, audit as never);
    const bedBoardService = {
      getEffectiveBedRow: jest.fn(),
      assertBedAssignableOrThrow: jest.fn(),
    };
    const svc = new InpatientOperationsService(
      prisma as never,
      audit as never,
      admissionCorrelation,
      bedBoardService as never
    );

    await expect(
      svc.createDirectAdmission("fac-1", "user-rn-1", {
        patientId: "pat-1",
        admissionSource: "DIRECT",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "IV antibiotics",
        admittingService: "INTERNAL_MEDICINE",
        requestedUnit: "MS",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
        assignedBedKey: "MS-2",
        admittedAt: new Date().toISOString(),
        idempotencyKey: "idem-bad-bed",
      })
    ).rejects.toMatchObject({ status: 400 });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
