import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuditAction, RoleCode } from "@prisma/client";
import {
  ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE_CERTIFICATION_ID,
  applyClinicalAttendingMutation,
  emptyHospitalAssignmentBag,
  readHospitalAssignmentBag,
} from "@medora/shared";
import { EnterpriseAssignmentService } from "./enterprise-assignment.service";

describe("EnterpriseAssignmentService — D4A.3.0-H1", () => {
  function buildPrisma(opts: {
    encounter?: Record<string, unknown> | null;
    membership?: { role: { code: string } } | null;
    membershipByCode?: Record<string, { role: { code: string } } | null>;
    updateManyCount?: number;
  }) {
    const encounter =
      opts.encounter === null
        ? null
        : {
            id: "enc-h1",
            patientId: "pat-1",
            status: "OPEN",
            workflowState: "IN_TREATMENT",
            type: "INPATIENT",
            version: 1,
            admissionSummaryJson: {
              requestedEncounterType: "INPATIENT",
            },
            physicianAssignedUserId: "ed-md-should-not-copy",
            nurseAssignedUserId: "ed-rn-should-not-copy",
            ...(opts.encounter ?? {}),
          };
    return {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
        updateMany: jest.fn().mockResolvedValue({ count: opts.updateManyCount ?? 1 }),
      },
      userRole: {
        findFirst: jest.fn().mockImplementation(
          async (args: { where?: { role?: { code?: { in?: string[] } | string } } }) => {
            const codes = args?.where?.role?.code;
            const requested: string[] =
              typeof codes === "object" && codes && "in" in codes
                ? (codes.in ?? []).map(String)
                : codes
                  ? [String(codes)]
                  : [];
            if (opts.membershipByCode) {
              for (const c of requested) {
                if (opts.membershipByCode[c]) return opts.membershipByCode[c];
              }
              return null;
            }
            const membership = opts.membership ?? { role: { code: "PROVIDER" } };
            if (requested.length === 0) return membership;
            return requested.includes(membership.role.code) ? membership : null;
          }
        ),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: "Ada", lastName: "Lovelace" }),
      },
    };
  }

  it("hospital ASSIGN_ME writes bag only (not ED columns) and audits", async () => {
    const prisma = buildPrisma({});
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new EnterpriseAssignmentService(prisma as never, audit as never);

    const res = await svc.mutateHospitalAssignment({
      facilityId: "fac-1",
      encounterId: "enc-h1",
      actorUserId: "user-md",
      role: "PROVIDER",
      action: "ASSIGN_ME",
    });

    expect(res.certification).toBe(ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE_CERTIFICATION_ID);
    expect(res.projection.providerUserId).toBe("user-md");
    expect(res.projection.providerName).toBe("Ada Lovelace");
    const data = prisma.encounter.updateMany.mock.calls[0]![0].data as {
      admissionSummaryJson: Record<string, unknown>;
      physicianAssignedUserId?: string;
    };
    expect(data.physicianAssignedUserId).toBeUndefined();
    const bag = data.admissionSummaryJson.enterpriseHospitalAssignmentV1 as {
      workflow: { PRIMARY_PROVIDER: { userId: string } | null };
      slots: { PROVIDER: { userId: string } | null };
    };
    expect(bag.workflow.PRIMARY_PROVIDER?.userId).toBe("user-md");
    expect(bag.slots.PROVIDER?.userId).toBe("user-md");
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_UPDATE,
      "ENCOUNTER",
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: "ENTERPRISE_HOSPITAL_ASSIGNMENT",
          role: "PROVIDER",
          action: "ASSIGN_ME",
        }),
      })
    );
  });

  it("PATIENT_CARE_TECH can populate TECHNICIAN / PATIENT_CARE_TECH slot", async () => {
    const prisma = buildPrisma({
      membership: { role: { code: RoleCode.PATIENT_CARE_TECH } },
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new EnterpriseAssignmentService(prisma as never, audit as never);
    const res = await svc.mutateHospitalAssignment({
      facilityId: "fac-1",
      encounterId: "enc-h1",
      actorUserId: "user-pct",
      role: "TECHNICIAN",
      action: "ASSIGN_ME",
    });
    expect(res.projection.technicianUserId).toBe("user-pct");
    const data = prisma.encounter.updateMany.mock.calls[0]![0].data as {
      admissionSummaryJson: { enterpriseHospitalAssignmentV1: { workflow: { PATIENT_CARE_TECH: { userId: string } } } };
    };
    expect(
      data.admissionSummaryJson.enterpriseHospitalAssignmentV1.workflow.PATIENT_CARE_TECH.userId
    ).toBe("user-pct");
  });

  it("LAB and RADIOLOGY cannot populate hospital technician slot", async () => {
    for (const code of [RoleCode.LAB, RoleCode.RADIOLOGY] as const) {
      const prisma = buildPrisma({ membership: { role: { code } } });
      const svc = new EnterpriseAssignmentService(prisma as never, { log: jest.fn() } as never);
      await expect(
        svc.mutateHospitalAssignment({
          facilityId: "fac-1",
          encounterId: "enc-h1",
          actorUserId: "user-lab",
          role: "TECHNICIAN",
          action: "ASSIGN_ME",
        })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.encounter.updateMany).not.toHaveBeenCalled();
    }
  });

  it("PROVIDER alone cannot occupy TECHNICIAN slot", async () => {
    const prisma = buildPrisma({ membership: { role: { code: RoleCode.PROVIDER } } });
    const svc = new EnterpriseAssignmentService(prisma as never, { log: jest.fn() } as never);
    await expect(
      svc.mutateHospitalAssignment({
        facilityId: "fac-1",
        encounterId: "enc-h1",
        actorUserId: "user-md",
        role: "TECHNICIAN",
        action: "ASSIGN_ME",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("covering workflow does not overwrite attending or primary provider", async () => {
    let seed = emptyHospitalAssignmentBag("INPATIENT");
    seed = applyClinicalAttendingMutation(seed, {
      actorUserId: "admin",
      attendingProviderUserId: "attend-1",
      attendingProviderDisplayName: "Attending",
    });
    seed = {
      ...seed,
      workflow: {
        ...seed.workflow,
        PRIMARY_PROVIDER: {
          userId: "prim-1",
          assignedAt: "2026-01-01T00:00:00.000Z",
          source: "SELF_ASSIGN",
          displayName: "Primary",
        },
      },
      slots: {
        ...seed.slots,
        PROVIDER: {
          userId: "prim-1",
          assignedAt: "2026-01-01T00:00:00.000Z",
          source: "SELF_ASSIGN",
          displayName: "Primary",
        },
      },
    };
    const prisma = buildPrisma({
      encounter: { admissionSummaryJson: { enterpriseHospitalAssignmentV1: seed } },
      membership: { role: { code: RoleCode.PROVIDER } },
    });
    const svc = new EnterpriseAssignmentService(prisma as never, { log: jest.fn() } as never);
    const res = await svc.mutateHospitalWorkflowSlot({
      facilityId: "fac-1",
      encounterId: "enc-h1",
      actorUserId: "cov-1",
      slot: "COVERING_PROVIDER",
      action: "ASSIGN_ME",
    });
    expect(res.projection.providerUserId).toBe("prim-1");
    expect(res.projection.clinicalAttendingUserId).toBe("attend-1");
    expect(res.projection.coveringProviderUserId).toBe("cov-1");
    const bag = readHospitalAssignmentBag(
      (prisma.encounter.updateMany.mock.calls[0]![0].data as { admissionSummaryJson: unknown })
        .admissionSummaryJson
    );
    expect(bag?.clinical.attendingProviderUserId).toBe("attend-1");
    expect(bag?.workflow.PRIMARY_PROVIDER?.userId).toBe("prim-1");
  });

  it("getHospitalBoardProjection ignores ED columns when bag empty", async () => {
    const prisma = buildPrisma({
      encounter: {
        admissionSummaryJson: {},
        physicianAssignedUserId: "ed-md",
        nurseAssignedUserId: "ed-rn",
      },
    });
    const svc = new EnterpriseAssignmentService(prisma as never, { log: jest.fn() } as never);
    const res = await svc.getHospitalBoardProjection("fac-1", "enc-h1");
    expect(res.projection.providerUnassigned).toBe(true);
    expect(res.projection.nurseUnassigned).toBe(true);
  });

  it("ED mutateEmergencySelfAssignment still writes columns (regression)", async () => {
    const prisma = buildPrisma({
      encounter: {
        physicianAssignedUserId: null,
        nurseAssignedUserId: null,
      },
      membership: { role: { code: "PROVIDER" } },
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new EnterpriseAssignmentService(prisma as never, audit as never);
    const res = await svc.mutateEmergencySelfAssignment({
      kind: "provider",
      facilityId: "fac-1",
      encounterId: "enc-h1",
      actorUserId: "user-md",
    });
    expect(res.unchanged).toBe(false);
    const data = prisma.encounter.updateMany.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data.physicianAssignedUserId).toBe("user-md");
    expect(audit.log.mock.calls[0]![0]).toBe(AuditAction.ENCOUNTER_ASSIGN_PROVIDER);
  });

  it("rejects closed hospital encounter", async () => {
    const prisma = buildPrisma({ encounter: { status: "CLOSED" } });
    const svc = new EnterpriseAssignmentService(prisma as never, { log: jest.fn() } as never);
    await expect(
      svc.mutateHospitalAssignment({
        facilityId: "fac-1",
        encounterId: "enc-h1",
        actorUserId: "user-md",
        role: "PROVIDER",
        action: "ASSIGN_ME",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("404 on missing encounter", async () => {
    const prisma = buildPrisma({ encounter: null });
    const svc = new EnterpriseAssignmentService(prisma as never, { log: jest.fn() } as never);
    await expect(svc.getHospitalBoardProjection("fac-1", "missing")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("seedEmptyHospitalAssignmentSummary clears slots and workflow", () => {
    const prisma = buildPrisma({});
    const svc = new EnterpriseAssignmentService(prisma as never, { log: jest.fn() } as never);
    const seeded = svc.seedEmptyHospitalAssignmentSummary(
      {
        enterpriseHospitalAssignmentV1: {
          v: 1,
          careSetting: "INPATIENT",
          clinical: { attendingProviderUserId: "x", attendingProviderDisplayName: "X" },
          workflow: {
            PRIMARY_PROVIDER: {
              userId: "x",
              assignedAt: "2026-01-01T00:00:00.000Z",
              source: "SELF_ASSIGN",
            },
          },
          slots: {
            PROVIDER: {
              userId: "x",
              assignedAt: "2026-01-01T00:00:00.000Z",
              source: "SELF_ASSIGN",
            },
          },
          history: [],
        },
      },
      "INPATIENT"
    );
    const bag = readHospitalAssignmentBag(seeded);
    expect(bag?.slots.PROVIDER).toBeNull();
    expect(bag?.workflow.PRIMARY_PROVIDER).toBeNull();
    expect(bag?.clinical.attendingProviderUserId).toBeNull();
  });
});
