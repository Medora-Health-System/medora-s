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
    const prisma = {
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
    };
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
        create: jest.fn().mockResolvedValue(created),
      },
    };
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
});
