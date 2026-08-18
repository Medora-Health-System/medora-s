/**
 * Regression: production POST /inpatient-operations/direct-admission returned 500
 * (requestId 078be476-5289-4308-933c-efe344f12c64) with Prisma P2022 on
 * Encounter.hospitalEpisodeId while D3B migration was unapplied and foundation OFF.
 *
 * Root cause: prisma.encounter.update() without `select` RETURNINGs all schema
 * scalars including hospitalEpisodeId even when data does not set the column.
 */

import {
  DIRECT_ADMISSION_ERROR_MESSAGES_EN,
  DIRECT_ADMISSION_ERROR_MESSAGES_FR,
} from "@medora/shared";
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

  function p2022HospitalEpisodeId(invocation: string) {
    return Object.assign(new Error(`Invalid \`${invocation}\` invocation`), {
      name: "PrismaClientKnownRequestError",
      code: "P2022",
      meta: { modelName: "Encounter", column: "Encounter.hospitalEpisodeId" },
    });
  }

  function buildService(overrides?: {
    findMany?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    findFirst?: jest.Mock;
    patientFindFirst?: jest.Mock;
    transactionImpl?: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  }) {
    const findMany =
      overrides?.findMany ??
      jest.fn().mockImplementation(async (args: { select?: Record<string, unknown> }) => {
        if (args?.select && "hospitalEpisodeId" in args.select) {
          throw p2022HospitalEpisodeId("prisma.encounter.findMany()");
        }
        return [];
      });
    const encounterCreate =
      overrides?.create ?? jest.fn().mockResolvedValue({ id: "enc-new-1" });
    const encounterUpdate =
      overrides?.update ??
      jest.fn().mockImplementation(async (args: { select?: Record<string, unknown>; data?: Record<string, unknown> }) => {
        if (!args?.select) {
          throw p2022HospitalEpisodeId("prisma.encounter.update()");
        }
        if ("hospitalEpisodeId" in (args.select ?? {})) {
          throw p2022HospitalEpisodeId("prisma.encounter.update()");
        }
        if (args?.data && "hospitalEpisodeId" in args.data) {
          throw p2022HospitalEpisodeId("prisma.encounter.update()");
        }
        return { id: "enc-new-1" };
      });
    const encounterFindFirst =
      overrides?.findFirst ??
      jest.fn().mockImplementation(async (args: { select?: Record<string, unknown> }) => {
        if (args?.select && "hospitalEpisodeId" in args.select) {
          throw p2022HospitalEpisodeId("prisma.encounter.findFirst()");
        }
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
    const patientFindFirst =
      overrides?.patientFindFirst ?? jest.fn().mockResolvedValue({ id: "pat-1" });

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
      $transaction:
        overrides?.transactionImpl ??
        (async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            encounter: {
              findMany,
              create: encounterCreate,
              update: encounterUpdate,
            },
            hospitalEpisode: { create: jest.fn() },
          })),
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

    const clinicalSynthesis = {} as never;
    const compatibleEncounters = {
      isHospitalEpisodeFoundationEnabled: jest.fn().mockReturnValue(false),
      findFacilityEncounterForWorkspace: jest.fn(),
      findOpenHospitalEncountersForCensus: jest.fn(),
    };
    const encounterAuthority = {
      resolveRequestedEncounter: jest.fn(),
      certification: jest.fn().mockReturnValue(
        "MEDUI.AUTHORITATIVE_HOSPITAL_CENSUS_LINEAGE_RECOVERY.D4A2_8_HF2"
      ),
    };
    const svc = new InpatientOperationsService(
      prisma as never,
      audit as never,
      admissionCorrelation,
      bedBoardService as never,
      clinicalSynthesis,
      compatibleEncounters as never,
      encounterAuthority as never,
      { upsertLatestActiveEntryForCard: jest.fn() } as never
    );
    return { svc, prisma, encounterCreate, encounterUpdate, findMany, audit };
  }

  it("1+2+3: succeeds feature-OFF pre-D3B without hospitalEpisodeId on create/update/select", async () => {
    const findManySelects: Array<Record<string, unknown>> = [];
    const { svc, prisma, encounterCreate, encounterUpdate, findMany } = buildService({
      findMany: jest.fn().mockImplementation(async (args: { select?: Record<string, unknown> }) => {
        if (args?.select) findManySelects.push(args.select);
        if (args?.select && "hospitalEpisodeId" in args.select) {
          throw p2022HospitalEpisodeId("prisma.encounter.findMany()");
        }
        return [];
      }),
    });

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
    expect(createData).not.toHaveProperty("hospitalEpisode");
    expect(createData.roomLabel).toBe("MS-2");
    expect(prisma.hospitalEpisode.create).not.toHaveBeenCalled();

    expect(encounterUpdate).toHaveBeenCalled();
    for (const call of encounterUpdate.mock.calls) {
      const args = call[0] as {
        data?: Record<string, unknown>;
        select?: Record<string, unknown>;
      };
      expect(args.data).not.toHaveProperty("hospitalEpisodeId");
      expect(args.data).not.toHaveProperty("hospitalEpisode");
      expect(args.select).toEqual({ id: true });
      assertSelectOmitsD3b(args.select);
    }
    expect(findMany).toHaveBeenCalled();
  });

  it("4: feature-ON with D3B absent is blocked before create write", async () => {
    process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = "true";
    const encounterCreate = jest.fn();
    const { svc } = buildService({
      create: encounterCreate,
      findMany: jest.fn().mockImplementation(async () => {
        throw p2022HospitalEpisodeId("prisma.encounter.findMany()");
      }),
      transactionImpl: jest.fn(),
    });

    try {
      await svc.createDirectAdmission("fac-1", "user-rn-1", {
        patientId: "pat-1",
        admissionSource: "DIRECT",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "IV antibiotics",
        admittingService: "INTERNAL_MEDICINE",
        requestedUnit: "MS",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
        assignedBedKey: "MS:2",
        admittedAt: new Date().toISOString(),
        idempotencyKey: "idem-flag-on-no-d3b",
      });
      throw new Error("expected ServiceUnavailableException");
    } catch (e) {
      const err = e as { getStatus?: () => number; getResponse?: () => unknown };
      expect(err.getStatus?.()).toBe(503);
      const body = err.getResponse?.() as { errorCode?: string; code?: string };
      expect(body.errorCode ?? body.code).toBe("DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE");
    }
    expect(encounterCreate).not.toHaveBeenCalled();
  });

  it("5: feature-ON with D3B present writes hospitalEpisodeId continuity", async () => {
    process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = "true";
    const hospitalEpisodeCreate = jest.fn().mockResolvedValue({ id: "he-1" });
    const encounterCreate = jest.fn().mockResolvedValue({ id: "enc-new-1" });
    const encounterUpdate = jest.fn().mockResolvedValue({ id: "enc-new-1" });
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: "pat-1" }) },
      encounter: {
        findMany,
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-new-1",
          patientId: "pat-1",
          facilityId: "fac-1",
          type: "INPATIENT",
          status: "OPEN",
          admissionSummaryJson: {},
        }),
        create: encounterCreate,
        update: encounterUpdate,
      },
      hospitalEpisode: { findFirst: jest.fn(), create: hospitalEpisodeCreate },
      userRole: { findFirst: jest.fn() },
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounter: {
            findMany,
            create: encounterCreate,
            update: encounterUpdate,
          },
          hospitalEpisode: { create: hospitalEpisodeCreate },
        }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const admissionCorrelation = new AdmissionCorrelationService(prisma as never, audit as never);
    const svc = new InpatientOperationsService(
      prisma as never,
      audit as never,
      admissionCorrelation,
      {
        getEffectiveBedRow: jest.fn().mockResolvedValue({
          bedKey: "MS:2",
          display: "MS-2",
          status: "AVAILABLE",
          occupantEncounterId: null,
        }),
        assertBedAssignableOrThrow: jest.fn(),
      } as never,
      {} as never,
      {
        isHospitalEpisodeFoundationEnabled: jest.fn().mockReturnValue(true),
        findFacilityEncounterForWorkspace: jest.fn(),
        findOpenHospitalEncountersForCensus: jest.fn(),
      } as never,
      {
        resolveRequestedEncounter: jest.fn(),
        certification: jest.fn(),
      } as never,
      { upsertLatestActiveEntryForCard: jest.fn() } as never
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
      idempotencyKey: "idem-flag-on-d3b",
    });

    expect(hospitalEpisodeCreate).toHaveBeenCalled();
    expect(result.hospitalEpisodeId).toBe("he-1");
    const updateWithEpisode = encounterUpdate.mock.calls.find(
      (c) => (c[0] as { data?: { hospitalEpisodeId?: string } }).data?.hospitalEpisodeId === "he-1"
    );
    expect(updateWithEpisode).toBeTruthy();
  });

  it("6: failed write rolls back via transaction (create not committed outside tx)", async () => {
    const encounterCreate = jest.fn().mockResolvedValue({ id: "enc-orphan" });
    const encounterUpdate = jest.fn().mockImplementation(async () => {
      throw p2022HospitalEpisodeId("prisma.encounter.update()");
    });
    let txFn: ((tx: unknown) => Promise<unknown>) | null = null;
    const { svc, audit } = buildService({
      create: encounterCreate,
      update: encounterUpdate,
      transactionImpl: async (fn) => {
        txFn = fn;
        // Simulate Prisma rollback: surface error, do not commit.
        return fn({
          encounter: {
            findMany: jest.fn().mockResolvedValue([]),
            create: encounterCreate,
            update: encounterUpdate,
          },
          hospitalEpisode: { create: jest.fn() },
        });
      },
    });

    await expect(
      svc.createDirectAdmission("fac-1", "user-rn-1", {
        patientId: "pat-1",
        admissionSource: "DIRECT",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "IV antibiotics",
        admittingService: "INTERNAL_MEDICINE",
        requestedUnit: "MS",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
        assignedBedKey: "MS:2",
        admittedAt: new Date().toISOString(),
        idempotencyKey: "idem-rollback",
      })
    ).rejects.toMatchObject({ status: 503 });

    expect(txFn).toBeTruthy();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("7: repeated request remains idempotent (reuse open IP by correlation key)", async () => {
    const existingSummary = {
      admissionCorrelation: {
        version: 1,
        admissionCorrelationId: "admcorr:idem:idem-repeat-1",
        admissionIntent: "DIRECT_ADMISSION",
        status: "ENCOUNTER_CREATED",
        patientId: "pat-1",
        facilityId: "fac-1",
        destinationEncounterContext: "INPATIENT",
        receivingEncounterId: "enc-existing-1",
        idempotencyKey: "idem-repeat-1",
        correlationVersion: 2,
        admissionIntentCreatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      d3e6dIdempotencyKey: "idem-repeat-1",
    };
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "enc-existing-1",
        type: "INPATIENT",
        status: "OPEN",
        admissionSummaryJson: existingSummary,
      },
    ]);
    const encounterCreate = jest.fn();
    const { svc } = buildService({
      findMany,
      create: encounterCreate,
      findFirst: jest.fn().mockImplementation(async (args: { select?: Record<string, unknown>; where?: { id?: string } }) => {
        if (args?.where?.id === "enc-existing-1" || (args?.select && "patientId" in (args.select ?? {}))) {
          return {
            id: "enc-existing-1",
            patientId: "pat-1",
            facilityId: "fac-1",
            type: "INPATIENT",
            status: "OPEN",
            admissionSummaryJson: existingSummary,
          };
        }
        return { id: "pat-1" };
      }),
    });

    const first = await svc.createDirectAdmission("fac-1", "user-rn-1", {
      patientId: "pat-1",
      admissionSource: "DIRECT",
      admissionDiagnosis: "Pneumonia",
      reasonForAdmission: "IV antibiotics",
      admittingService: "INTERNAL_MEDICINE",
      requestedUnit: "MS",
      requestedLevelOfCare: "MEDICAL_SURGICAL",
      assignedBedKey: "MS:2",
      admittedAt: new Date().toISOString(),
      idempotencyKey: "idem-repeat-1",
    });
    const second = await svc.createDirectAdmission("fac-1", "user-rn-1", {
      patientId: "pat-1",
      admissionSource: "DIRECT",
      admissionDiagnosis: "Pneumonia",
      reasonForAdmission: "IV antibiotics",
      admittingService: "INTERNAL_MEDICINE",
      requestedUnit: "MS",
      requestedLevelOfCare: "MEDICAL_SURGICAL",
      assignedBedKey: "MS:2",
      admittedAt: new Date().toISOString(),
      idempotencyKey: "idem-repeat-1",
    });

    expect(first.idempotentReuse).toBe(true);
    expect(second.idempotentReuse).toBe(true);
    expect(encounterCreate).not.toHaveBeenCalled();
  });

  it("8: returns coded 404 PATIENT_NOT_FOUND_IN_FACILITY when patient is outside facility", async () => {
    const { svc, prisma } = buildService({
      patientFindFirst: jest.fn().mockResolvedValue(null),
      transactionImpl: jest.fn(),
    });

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

  it("9+10: schema error response includes coded error (requestId added by filter)", async () => {
    const encounterUpdate = jest.fn().mockImplementation(async () => {
      throw p2022HospitalEpisodeId("prisma.encounter.update()");
    });
    const { svc } = buildService({ update: encounterUpdate });

    try {
      await svc.createDirectAdmission("fac-1", "user-rn-1", {
        patientId: "pat-1",
        admissionSource: "DIRECT",
        admissionDiagnosis: "Pneumonia",
        reasonForAdmission: "IV antibiotics",
        admittingService: "INTERNAL_MEDICINE",
        requestedUnit: "MS",
        requestedLevelOfCare: "MEDICAL_SURGICAL",
        assignedBedKey: "MS:2",
        admittedAt: new Date().toISOString(),
        idempotencyKey: "idem-schema-code",
      });
      throw new Error("expected ServiceUnavailableException");
    } catch (e) {
      const err = e as { getStatus?: () => number; getResponse?: () => unknown };
      expect(err.getStatus?.()).toBe(503);
      const body = err.getResponse?.() as {
        errorCode?: string;
        code?: string;
        message?: string;
      };
      expect(body.errorCode ?? body.code).toBe("DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE");
      expect(String(body.message)).not.toMatch(/hospitalEpisodeId|P2022|prisma/i);
    }
  });

  it("11: EN/FR parity for DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE", () => {
    expect(DIRECT_ADMISSION_ERROR_MESSAGES_EN.DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE).toMatch(
      /compatibility update/i
    );
    expect(DIRECT_ADMISSION_ERROR_MESSAGES_FR.DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE).toMatch(
      /compatibilité/i
    );
    expect(DIRECT_ADMISSION_ERROR_MESSAGES_EN.DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE).not.toMatch(
      /hospitalEpisodeId|P2022/
    );
    expect(DIRECT_ADMISSION_ERROR_MESSAGES_FR.DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE).not.toMatch(
      /hospitalEpisodeId|P2022/
    );
  });

  it("12+13: ED physician SIGN must not create inpatient; direct-admission route is separate", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const controller = readFileSync(join(__dirname, "inpatient-operations.controller.ts"), "utf8");
    expect(controller).toContain('@Controller("inpatient-operations")');
    expect(controller).toContain('@Post("direct-admission")');
    expect(controller).toContain("async directAdmission(");

    const edDecision = readFileSync(join(__dirname, "encounters.service.ts"), "utf8");
    // SIGN path must not call createDirectAdmission
    expect(edDecision).not.toMatch(/createDirectAdmission\s*\(/);
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
    const { svc, prisma } = buildService({ transactionImpl: jest.fn() });

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
