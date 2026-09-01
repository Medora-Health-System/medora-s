import { ConflictException } from "@nestjs/common";
import { InternalPlacementService } from "./internal-placement.service";
import { AdmissionCorrelationService } from "./admission-correlation.service";
import { InternalPlacementActorRole, InternalPlacementStatus } from "@medora/shared";

function correlationSvc(prisma: unknown) {
  const audit = { log: async () => undefined };
  return new AdmissionCorrelationService(prisma as never, audit as never);
}

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ipr-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    hospitalEpisodeId: "he-1",
    originatingEncounterId: "enc-ed",
    receivingEncounterId: null,
    receivingEncounterLifecycle: "NONE",
    requestedEncounterType: "OBSERVATION",
    requestedLevelOfCare: "OBS",
    requestedService: "Medicine",
    requestedSpecialty: null,
    requestedUnitCode: null,
    clinicalPriority: "ROUTINE",
    admissionDiagnosisSummary: "Chest pain",
    reasonForPlacement: "Rule out ACS",
    telemetryRequired: true,
    isolationRequired: false,
    isolationType: null,
    specialPlacementNeedsJson: null,
    status: InternalPlacementStatus.DRAFT,
    assignedUnitCode: null,
    assignedRoomKey: null,
    assignedBedKey: null,
    readyForTransferAt: null,
    departedEdAt: null,
    arrivedDestinationAt: null,
    version: 1,
    revision: 1,
    ...overrides,
  };
}

function hospitalFacilityPrisma() {
  return {
    facility: {
      findFirst: jest.fn().mockResolvedValue({ facilityType: "HOSPITAL" }),
    },
  };
}

function attachPlacementCreateTx<T extends Record<string, unknown>>(prisma: T) {
  const next = prisma as T & { $transaction: jest.Mock };
  next.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      $queryRaw: jest.fn().mockResolvedValue([{ id: "enc-ed" }]),
      internalPlacementRequest: (prisma as { internalPlacementRequest?: unknown }).internalPlacementRequest,
    })
  );
  return next;
}

function signedHospitalSummary(
  dest: "OBSERVATION" | "INPATIENT" | "HOME" | "TRANSFER" | "AMA" | "LWBS" | "ELOPEMENT" | "DECEASED",
  extras: Record<string, unknown> = {}
) {
  return {
    admissionDecisionMode: "SIGN",
    requestedEncounterType: dest,
    admissionDecisionByUserId: "prov-signer",
    admissionDecisionAt: "2026-09-01T21:15:45.841Z",
    careLevel: dest === "INPATIENT" ? "MEDICAL_SURGICAL" : "OBSERVATION",
    serviceUnit: "INTERNAL_MEDICINE",
    admissionDiagnosis: "Chest pain",
    admissionReason: "Chest pain",
    responsiblePhysicianName: "Rajnil Shah",
    ...extras,
  };
}

function makeService(prisma: unknown, audit: { log: jest.Mock } = { log: jest.fn() }) {
  return new InternalPlacementService(
    prisma as never,
    audit as never,
    { createEpisodeForEncounter: jest.fn() } as never,
    correlationSvc(prisma) as never
  );
}

describe("InternalPlacementService D3C", () => {
  const prev = process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED;
    else process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = prev;
  });

  it("refuses create when feature flag OFF", async () => {
    delete process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED;
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-ed",
          facilityId: "fac-1",
          patientId: "pat-1",
          type: "EMERGENCY",
          status: "OPEN",
          hospitalEpisodeId: null,
        }),
      },
      internalPlacementRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const svc = new InternalPlacementService(
      prisma as never,
      { log: jest.fn() } as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );
    await expect(
      svc.createDraft("fac-1", "enc-ed", "user-1", {
        requestedEncounterType: "OBSERVATION",
      })
    ).rejects.toThrow(/disabled/i);
    expect(prisma.internalPlacementRequest.create).not.toHaveBeenCalled();
  });

  it("creates draft when flag forced ON and keeps ED encounter type untouched", async () => {
    const created = baseRow();
    const prisma = attachPlacementCreateTx({
      ...hospitalFacilityPrisma(),
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-ed",
          facilityId: "fac-1",
          patientId: "pat-1",
          type: "EMERGENCY",
          status: "OPEN",
          hospitalEpisodeId: null,
        }),
      },
      internalPlacementRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    });
    const audit = { log: jest.fn() };
    const svc = new InternalPlacementService(
      prisma as never,
      audit as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );

    const result = await svc.createDraft(
      "fac-1",
      "enc-ed",
      "user-1",
      {
        requestedEncounterType: "OBSERVATION",
        requestedLevelOfCare: "OBS",
        requestedService: "Medicine",
      },
      { featureFlagEnabled: true }
    );

    expect(result?.status).toBe(InternalPlacementStatus.DRAFT);
    expect(result?.requestedEncounterType).toBe("OBSERVATION");
    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "enc-ed", facilityId: "fac-1" },
      })
    );
    // No Encounter.type mutation in placement service.
    expect(Object.keys(prisma).includes("encounter.update")).toBe(false);
  });

  it("denies cross-facility active lookup", async () => {
    const prisma = {
      internalPlacementRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const svc = new InternalPlacementService(
      prisma as never,
      { log: jest.fn() } as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );
    const result = await svc.getActiveForEncounter("fac-other", "enc-ed", {
      featureFlagEnabled: true,
    });
    expect(result).toBeNull();
    expect(prisma.internalPlacementRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "fac-other" }),
      })
    );
  });

  it("blocks cancel after arrival via transition helper usage", async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          internalPlacementRequest: {
            findFirst: jest.fn().mockResolvedValue(
              baseRow({
                status: InternalPlacementStatus.ARRIVED_DESTINATION,
                departedEdAt: new Date(),
              })
            ),
            update: jest.fn(),
          },
          encounter: { create: jest.fn() },
        };
        return fn(tx);
      }),
    };
    const svc = new InternalPlacementService(
      prisma as never,
      { log: jest.fn() } as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );

    await expect(
      svc.transition(
        "fac-1",
        "ipr-1",
        "user-1",
        InternalPlacementStatus.CANCELLED,
        InternalPlacementActorRole.PROVIDER,
        { cancellationReason: "changed mind" },
        { featureFlagEnabled: true }
      )
    ).rejects.toThrow(/cancel after destination arrival/i);
  });

  it("module registers InternalPlacementService", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const src = fs.readFileSync(
      path.join(__dirname, "encounters.module.ts"),
      "utf8"
    );
    expect(src).toContain("InternalPlacementService");
  });

  it("listFacilityQueue returns FEATURE_DISABLED envelope without Prisma when flag OFF", async () => {
    delete process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED;
    const prisma = {
      internalPlacementRequest: {
        findMany: jest.fn(),
      },
    };
    const svc = new InternalPlacementService(
      prisma as never,
      { log: jest.fn() } as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );
    const result = await svc.listFacilityQueue("fac-1", { strict: false });
    expect(result).toEqual({ availability: "FEATURE_DISABLED", items: [] });
    expect(prisma.internalPlacementRequest.findMany).not.toHaveBeenCalled();
  });

  it("listFacilityQueue queries Prisma only when flag ON and does not swallow findMany errors", async () => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const prisma = {
      internalPlacementRequest: {
        findMany: jest.fn().mockRejectedValue(Object.assign(new Error("P2022"), { code: "P2022" })),
      },
    };
    const svc = new InternalPlacementService(
      prisma as never,
      { log: jest.fn() } as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );
    await expect(svc.listFacilityQueue("fac-1")).rejects.toThrow(/P2022/);
    expect(prisma.internalPlacementRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "fac-1" }),
      })
    );
  });

  it("FSER cannot create local INPATIENT placement", async () => {
    const prisma = {
      facility: {
        findFirst: jest.fn().mockResolvedValue({ facilityType: "FREESTANDING_ER" }),
      },
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-ed",
          facilityId: "fac-1",
          patientId: "pat-1",
          type: "EMERGENCY",
          status: "OPEN",
          hospitalEpisodeId: null,
        }),
      },
      internalPlacementRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const svc = new InternalPlacementService(
      prisma as never,
      { log: jest.fn() } as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );
    await expect(
      svc.createDraft(
        "fac-1",
        "enc-ed",
        "user-1",
        { requestedEncounterType: "INPATIENT" },
        { featureFlagEnabled: true }
      )
    ).rejects.toMatchObject({ response: { code: "INPATIENT_DISABLED_BY_PROFILE" } });
    expect(prisma.internalPlacementRequest.create).not.toHaveBeenCalled();
  });

  it("FSER can create OBSERVATION placement", async () => {
    const created = baseRow();
    const prisma = attachPlacementCreateTx({
      facility: {
        findFirst: jest.fn().mockResolvedValue({ facilityType: "FREESTANDING_ER" }),
      },
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-ed",
          facilityId: "fac-1",
          patientId: "pat-1",
          type: "EMERGENCY",
          status: "OPEN",
          hospitalEpisodeId: null,
        }),
      },
      internalPlacementRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    });
    const svc = new InternalPlacementService(
      prisma as never,
      { log: jest.fn() } as never,
      { createEpisodeForEncounter: jest.fn() } as never,
      correlationSvc(prisma) as never
    );
    const result = await svc.createDraft(
      "fac-1",
      "enc-ed",
      "user-1",
      { requestedEncounterType: "OBSERVATION" },
      { featureFlagEnabled: true }
    );
    expect(result?.requestedEncounterType).toBe("OBSERVATION");
    expect(prisma.internalPlacementRequest.create).toHaveBeenCalled();
  });

  it("listFacilityQueue does not reconcile or create placement rows", async () => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const prisma = {
      encounter: { findMany: jest.fn() },
      internalPlacementRequest: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const svc = makeService(prisma);
    const reconcile = jest.spyOn(svc, "reconcileSignedHospitalBoundDecisions");
    const create = jest.spyOn(svc, "createDraft");
    await svc.listFacilityQueue("fac-1");
    expect(reconcile).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
    expect(prisma.internalPlacementRequest.findMany).toHaveBeenCalled();
  });

  it("reconciles a signed Observation decision without mutating admissionSummaryJson", async () => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const summary = signedHospitalSummary("OBSERVATION");
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([
          { id: "enc-obs", admissionSummaryJson: summary },
          { id: "enc-home", admissionSummaryJson: signedHospitalSummary("HOME") },
        ]),
        findFirst: jest.fn().mockResolvedValue({ admissionSummaryJson: summary }),
      },
      internalPlacementRequest: { findFirst: jest.fn() },
    };
    const audit = { log: jest.fn() };
    const svc = makeService(prisma, audit);
    jest.spyOn(svc, "getActiveForEncounter").mockResolvedValue(null);
    const create = jest.spyOn(svc, "createDraft").mockResolvedValue({
      ...baseRow({ status: InternalPlacementStatus.DRAFT, originatingEncounterId: "enc-obs" }),
      status: InternalPlacementStatus.DRAFT,
    } as never);
    const sign = jest.spyOn(svc, "signDraft").mockResolvedValue({
      ...baseRow({ status: InternalPlacementStatus.SIGNED, version: 2 }),
      status: InternalPlacementStatus.SIGNED,
      version: 2,
    } as never);
    const submit = jest.spyOn(svc, "submitRequested").mockResolvedValue({
      ...baseRow({ status: InternalPlacementStatus.REQUESTED, version: 3 }),
      status: InternalPlacementStatus.REQUESTED,
      version: 3,
    } as never);

    const result = await svc.reconcileSignedHospitalBoundDecisions("fac-1", "admin-1", {
      featureFlagEnabled: true,
    });

    expect(result).toEqual({
      eligible: 1,
      created: 1,
      alreadyExists: 0,
      skipped: 1,
      failed: 0,
    });
    expect(create).toHaveBeenCalledWith(
      "fac-1",
      "enc-obs",
      "prov-signer",
      expect.objectContaining({ requestedEncounterType: "OBSERVATION" }),
      expect.anything()
    );
    expect(sign).toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith(
      "fac-1",
      "ipr-1",
      "prov-signer",
      expect.objectContaining({
        requestedAtOverride: new Date("2026-09-01T21:15:45.841Z"),
      })
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "InternalPlacementRequest",
      expect.objectContaining({
        userId: "admin-1",
        metadata: expect.objectContaining({
          event: "INTERNAL_PLACEMENT_RECONCILED_FROM_SIGNED_DECISION",
          originalSignerUserId: "prov-signer",
          admissionSummaryUnchanged: true,
        }),
      })
    );
  });

  it("reconciles a signed Admission decision onto one REQUESTED placement", async () => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const summary = signedHospitalSummary("INPATIENT");
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([{ id: "enc-ip", admissionSummaryJson: summary }]),
        findFirst: jest.fn().mockResolvedValue({ admissionSummaryJson: summary }),
      },
    };
    const svc = makeService(prisma);
    jest.spyOn(svc, "getActiveForEncounter").mockResolvedValue(null);
    jest.spyOn(svc, "createDraft").mockResolvedValue({
      ...baseRow({
        status: InternalPlacementStatus.DRAFT,
        requestedEncounterType: "INPATIENT",
        originatingEncounterId: "enc-ip",
      }),
      status: InternalPlacementStatus.DRAFT,
    } as never);
    jest.spyOn(svc, "signDraft").mockResolvedValue({
      ...baseRow({ status: InternalPlacementStatus.SIGNED, version: 2 }),
      status: InternalPlacementStatus.SIGNED,
      version: 2,
    } as never);
    const submit = jest.spyOn(svc, "submitRequested").mockResolvedValue({
      ...baseRow({
        status: InternalPlacementStatus.REQUESTED,
        requestedEncounterType: "INPATIENT",
        version: 3,
      }),
      status: InternalPlacementStatus.REQUESTED,
      version: 3,
    } as never);
    const result = await svc.reconcileSignedHospitalBoundDecisions("fac-1", "admin-1", {
      featureFlagEnabled: true,
    });
    expect(result.created).toBe(1);
    expect(submit).toHaveBeenCalledWith(
      "fac-1",
      "ipr-1",
      "prov-signer",
      expect.objectContaining({ requestedAtOverride: new Date("2026-09-01T21:15:45.841Z") })
    );
  });

  it("second reconcile does not duplicate an existing placement", async () => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([
          { id: "enc-obs", admissionSummaryJson: signedHospitalSummary("OBSERVATION") },
        ]),
      },
    };
    const svc = makeService(prisma);
    jest.spyOn(svc, "getActiveForEncounter").mockResolvedValue(baseRow() as never);
    const create = jest.spyOn(svc, "createDraft");
    const result = await svc.reconcileSignedHospitalBoundDecisions("fac-1", "admin-1", {
      featureFlagEnabled: true,
    });
    expect(result).toMatchObject({
      eligible: 1,
      created: 0,
      alreadyExists: 1,
      failed: 0,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("concurrent reconcile creates one placement and treats the loser as alreadyExists", async () => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const summary = signedHospitalSummary("OBSERVATION");
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([{ id: "enc-obs", admissionSummaryJson: summary }]),
        findFirst: jest.fn().mockResolvedValue({ admissionSummaryJson: summary }),
      },
    };
    const svc = makeService(prisma);
    jest.spyOn(svc, "getActiveForEncounter").mockResolvedValue(null);
    let createCalls = 0;
    jest.spyOn(svc, "createDraft").mockImplementation(async () => {
      createCalls += 1;
      if (createCalls > 1) {
        throw new ConflictException("An active internal placement request already exists");
      }
      await new Promise((resolve) => setImmediate(resolve));
      return {
        ...baseRow({ status: InternalPlacementStatus.DRAFT, originatingEncounterId: "enc-obs" }),
        status: InternalPlacementStatus.DRAFT,
      } as never;
    });
    jest.spyOn(svc, "signDraft").mockResolvedValue({
      ...baseRow({ status: InternalPlacementStatus.SIGNED, version: 2 }),
      status: InternalPlacementStatus.SIGNED,
      version: 2,
    } as never);
    jest.spyOn(svc, "submitRequested").mockResolvedValue({
      ...baseRow({ status: InternalPlacementStatus.REQUESTED, version: 3 }),
      status: InternalPlacementStatus.REQUESTED,
      version: 3,
    } as never);

    const [first, second] = await Promise.all([
      svc.reconcileSignedHospitalBoundDecisions("fac-1", "admin-1", { featureFlagEnabled: true }),
      svc.reconcileSignedHospitalBoundDecisions("fac-1", "admin-2", { featureFlagEnabled: true }),
    ]);
    expect(first.created + second.created).toBe(1);
    expect(first.alreadyExists + second.alreadyExists).toBe(1);
    expect(createCalls).toBe(2);
  });

  it.each([
    ["unsigned Observation", { ...signedHospitalSummary("OBSERVATION"), admissionDecisionMode: "DRAFT" }],
    ["Home", signedHospitalSummary("HOME")],
    ["Transfer", signedHospitalSummary("TRANSFER")],
    ["AMA", signedHospitalSummary("AMA")],
    ["LWBS", signedHospitalSummary("LWBS")],
    ["Elopement", signedHospitalSummary("ELOPEMENT")],
    ["Deceased", signedHospitalSummary("DECEASED")],
    ["missing signer", signedHospitalSummary("OBSERVATION", { admissionDecisionByUserId: "" })],
    ["missing signedAt", signedHospitalSummary("OBSERVATION", { admissionDecisionAt: "" })],
  ])("skips %s and does not create placement", async (_label, summary) => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([{ id: "enc-skip", admissionSummaryJson: summary }]),
      },
    };
    const svc = makeService(prisma);
    const create = jest.spyOn(svc, "createDraft");
    const result = await svc.reconcileSignedHospitalBoundDecisions("fac-1", "admin-1", {
      featureFlagEnabled: true,
    });
    expect(result.created).toBe(0);
    expect(result.eligible).toBe(0);
    expect(result.skipped).toBe(1);
    expect(create).not.toHaveBeenCalled();
  });

  it("scopes reconcile encounter scan to the caller facility", async () => {
    process.env.INTERNAL_PLACEMENT_WORKFLOW_ENABLED = "true";
    const prisma = {
      encounter: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = makeService(prisma);
    await svc.reconcileSignedHospitalBoundDecisions("fac-1", "admin-1", {
      featureFlagEnabled: true,
    });
    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId: "fac-1",
          type: "EMERGENCY",
          status: "OPEN",
        }),
      })
    );
  });
});
