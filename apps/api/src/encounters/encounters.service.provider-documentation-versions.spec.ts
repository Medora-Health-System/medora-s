import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuditAction, EncounterClinicalEventType, EncounterStatus, EncounterType, RoleCode } from "@prisma/client";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockEnterpriseAssignmentService } from "./encounters.service.test-enterprise-assignment.mock";
import { createMockEnterpriseLifecycleService } from "./encounters.service.test-enterprise-lifecycle.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";
import { ENCOUNTER_CONCURRENT_MODIFICATION_CODE } from "./encounter-concurrency.util";

type MutableState = {
  encounter: any;
  versions: any[];
  addenda: any[];
};

function buildService(options?: {
  encounterOverrides?: Record<string, unknown>;
  auditThrowsOnAction?: AuditAction;
  forceEncounterUpdateConflict?: boolean;
}) {
  const state: MutableState = {
    encounter: {
      id: "enc-1",
      facilityId: "fac-1",
      patientId: "pat-1",
      type: EncounterType.EMERGENCY,
      status: EncounterStatus.OPEN,
      workflowState: "IN_TREATMENT",
      version: 1,
      chiefComplaint: "Douleur abdominale",
      providerNote: "Initial impression",
      treatmentPlan: "Hydration and labs",
      followUpDate: null,
      nursingAssessment: { physicianEvalV1: { hpi: "HPI", ros: "ROS", physicalExam: "PE", mdm: "MDM" } },
      dischargeSummaryJson: { summary: "stable" },
      admissionSummaryJson: { indication: "observation" },
      providerDocumentationStatus: "DRAFT",
      providerDocumentationSignedAt: null,
      providerDocumentationSignedByUserId: null,
      providerDocumentationSignedBy: { firstName: "Alice", lastName: "Signer" },
      patient: { id: "pat-1", firstName: "Pat", lastName: "Ient", mrn: "MRN1", dob: null, sexAtBirth: null },
      physicianAssigned: null,
      nurseAssigned: null,
      providerAddenda: [],
      encounterNotes: [],
      clinicalDocumentationEntries: [],
      ...(options?.encounterOverrides ?? {}),
    },
    versions: [],
    addenda: [],
  };

  const auditLog = jest.fn(async (action: AuditAction) => {
    if (options?.auditThrowsOnAction && action === options.auditThrowsOnAction) {
      throw new Error("audit failure");
    }
  });

  const prisma: any = {
    encounter: {
      findFirst: jest.fn(async ({ where }: any) => {
        if (!where || where.id !== state.encounter.id || where.facilityId !== state.encounter.facilityId) return null;
        return state.encounter;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (options?.forceEncounterUpdateConflict) return { count: 0 };
        if (
          where.id !== state.encounter.id ||
          where.facilityId !== state.encounter.facilityId ||
          where.version !== state.encounter.version
        ) {
          return { count: 0 };
        }
        const next = { ...state.encounter };
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === "object" && v && "increment" in (v as any)) {
            next[k] = Number(next[k] ?? 0) + Number((v as any).increment ?? 0);
          } else {
            next[k] = v;
          }
        }
        state.encounter = next;
        return { count: 1 };
      }),
    },
    userRole: {
      findFirst: jest.fn(async () => ({ role: { code: RoleCode.PROVIDER }, isActive: true })),
    },
    encounterProviderDocumentationVersion: {
      findFirst: jest.fn(async (args: any) => {
        const items = state.versions.filter(
          (v) =>
            (!args?.where?.id || v.id === args.where.id) &&
            (!args?.where?.encounterId || v.encounterId === args.where.encounterId) &&
            (!args?.where?.facilityId || v.facilityId === args.where.facilityId)
        );
        if (!items.length) return null;
        const ordered = [...items].sort((a, b) => a.versionNumber - b.versionNumber);
        const row = args?.orderBy?.versionNumber === "desc" ? ordered[ordered.length - 1] : ordered[0];
        return row;
      }),
      findMany: jest.fn(async ({ where }: any) => {
        return state.versions
          .filter((v) => v.encounterId === where.encounterId && v.facilityId === where.facilityId)
          .sort((a, b) => a.versionNumber - b.versionNumber);
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `ver-${state.versions.length + 1}`,
          ...data,
          signedBy: { firstName: "Alice", lastName: "Signer" },
          unlockedBy: null,
        };
        state.versions.push(row);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        state.versions = state.versions.map((v) => {
          if (v.id === where.id && (where.unlockedAt === null ? v.unlockedAt == null : true)) {
            count += 1;
            return { ...v, ...data, unlockedBy: { firstName: "Bob", lastName: "Unlocker" } };
          }
          return v;
        });
        return { count };
      }),
    },
    encounterClinicalEvent: {
      create: jest.fn(async () => ({ id: `evt-${Date.now()}` })),
    },
    encounterProviderAddendum: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `add-${state.addenda.length + 1}`,
          ...data,
          createdAt: new Date("2026-01-01T12:00:00.000Z"),
          createdBy: { firstName: "Alice", lastName: "Signer" },
        };
        state.addenda.push(row);
        return row;
      }),
    },
    $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => {
      const snapshot = structuredClone(state);
      const tx = {
        encounter: {
          findFirst: prisma.encounter.findFirst,
          updateMany: prisma.encounter.updateMany,
        },
        encounterProviderDocumentationVersion: prisma.encounterProviderDocumentationVersion,
        encounterClinicalEvent: prisma.encounterClinicalEvent,
        encounterProviderAddendum: prisma.encounterProviderAddendum,
      };
      try {
        return await fn(tx);
      } catch (error) {
        state.encounter = snapshot.encounter;
        state.versions = snapshot.versions;
        state.addenda = snapshot.addenda;
        throw error;
      }
    }),
  };

  const service = new EncountersService(
    prisma,
    { log: auditLog } as never,
    {} as never,
    createMockBedBoardService() as never,
    createMockInternalPlacementService() as never,
    createMockEnterpriseAssignmentService() as never,
    createMockEnterpriseLifecycleService() as never
  );

  return { service, prisma, auditLog, state };
}

describe("EncountersService provider documentation immutable versions (MEDORA.RD.P0.1)", () => {
  it("IMM-01 signs and creates immutable version + audit + clinical event", async () => {
    const { service, state, auditLog, prisma } = buildService();
    await service.signProviderDocumentation("fac-1", "enc-1", "user-1");

    expect(state.encounter.providerDocumentationStatus).toBe("SIGNED");
    expect(state.encounter.providerDocumentationSignedByUserId).toBe("user-1");
    expect(state.versions).toHaveLength(1);
    expect(state.versions[0]?.versionNumber).toBe(1);
    expect(state.versions[0]?.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(auditLog).toHaveBeenCalledWith(
      AuditAction.PROVIDER_DOCUMENTATION_SIGN,
      "ENCOUNTER",
      expect.objectContaining({ critical: true })
    );
    expect(prisma.encounterClinicalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: EncounterClinicalEventType.PROVIDER_SIGNED }) })
    );
  });

  it("IMM-02 rejects normal clinical patch while signed", async () => {
    const { service } = buildService({ encounterOverrides: { providerDocumentationStatus: "SIGNED" } });
    await expect(
      service.update("fac-1", "enc-1", { treatmentPlan: "changed" } as any, "user-1")
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("IMM-03 rejects unlock without reason", async () => {
    const { service } = buildService({ encounterOverrides: { providerDocumentationStatus: "SIGNED" } });
    await expect(
      service.unlockProviderDocumentation("fac-1", "enc-1", { reason: "   " } as any, "user-1")
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("IMM-04 unlocks with reason, preserves immutable snapshot and records unlock metadata", async () => {
    const { service, state, prisma } = buildService();
    await service.signProviderDocumentation("fac-1", "enc-1", "user-1");
    const before = structuredClone(state.versions[0]);

    await service.unlockProviderDocumentation("fac-1", "enc-1", { reason: "Corrected medication history" } as any, "user-2");

    expect(state.encounter.providerDocumentationStatus).toBe("DRAFT");
    expect(state.versions[0]?.clinicalSnapshotJson).toEqual(before.clinicalSnapshotJson);
    expect(state.versions[0]?.snapshotHash).toBe(before.snapshotHash);
    expect(state.versions[0]?.unlockedByUserId).toBe("user-2");
    expect(state.versions[0]?.unlockReason).toBe("Corrected medication history");
    expect(prisma.encounterClinicalEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: EncounterClinicalEventType.PROVIDER_UNLOCKED }) })
    );
  });

  it("IMM-05 edits after unlock mutate working draft only", async () => {
    const { service, state } = buildService();
    await service.signProviderDocumentation("fac-1", "enc-1", "user-1");
    const firstHash = state.versions[0]?.snapshotHash;
    await service.unlockProviderDocumentation("fac-1", "enc-1", { reason: "Correction" } as any, "user-2");

    await service.update("fac-1", "enc-1", { treatmentPlan: "Updated after unlock" } as any, "user-2");

    expect(state.encounter.treatmentPlan).toBe("Updated after unlock");
    expect(state.versions[0]?.snapshotHash).toBe(firstHash);
  });

  it("IMM-06 re-sign creates incremented immutable version; prior version remains unchanged", async () => {
    const { service, state } = buildService();
    await service.signProviderDocumentation("fac-1", "enc-1", "user-1");
    const v1Hash = state.versions[0]?.snapshotHash;

    await service.unlockProviderDocumentation("fac-1", "enc-1", { reason: "Correction" } as any, "user-2");
    await service.update("fac-1", "enc-1", { treatmentPlan: "Revised plan" } as any, "user-2");
    await service.signProviderDocumentation("fac-1", "enc-1", "user-2");

    expect(state.versions).toHaveLength(2);
    expect(state.versions[0]?.versionNumber).toBe(1);
    expect(state.versions[1]?.versionNumber).toBe(2);
    expect(state.versions[0]?.snapshotHash).toBe(v1Hash);
    expect(state.versions[1]?.snapshotHash).not.toBe(v1Hash);
  });

  it("IMM-07 lists ordered version history", async () => {
    const { service } = buildService();
    await service.signProviderDocumentation("fac-1", "enc-1", "user-1");
    await service.unlockProviderDocumentation("fac-1", "enc-1", { reason: "Correction" } as any, "user-2");
    await service.update("fac-1", "enc-1", { treatmentPlan: "Plan B" } as any, "user-2");
    await service.signProviderDocumentation("fac-1", "enc-1", "user-2");

    const versions = (await service.listProviderDocumentationVersions("fac-1", "enc-1", "user-2")) as any[];
    expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);
  });

  it("IMM-08 retrieves historical Version 1 after Version 2 exists", async () => {
    const { service, state } = buildService();
    await service.signProviderDocumentation("fac-1", "enc-1", "user-1");
    const v1 = structuredClone(state.versions[0]);
    await service.unlockProviderDocumentation("fac-1", "enc-1", { reason: "Correction" } as any, "user-2");
    await service.update("fac-1", "enc-1", { treatmentPlan: "Plan B" } as any, "user-2");
    await service.signProviderDocumentation("fac-1", "enc-1", "user-2");

    const detail = await service.getProviderDocumentationVersion("fac-1", "enc-1", v1.id, "user-2");
    expect((detail as any).snapshotHash).toBe(v1.snapshotHash);
    expect((detail as any).clinicalSnapshotJson).toEqual(v1.clinicalSnapshotJson);
  });

  it("IMM-09 blocks cross-facility version history access", async () => {
    const { service } = buildService();
    await expect(service.listProviderDocumentationVersions("fac-2", "enc-1", "user-1")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("IMM-10a simulated stale write path returns canonical concurrency conflict without creating versions", async () => {
    const { service, state } = buildService({ forceEncounterUpdateConflict: true });
    await expect(service.signProviderDocumentation("fac-1", "enc-1", "user-1")).rejects.toMatchObject({
      status: 409,
      response: {
        statusCode: 409,
        code: ENCOUNTER_CONCURRENT_MODIFICATION_CODE,
        message: ENCOUNTER_CONCURRENT_MODIFICATION_CODE,
      },
    });
    expect(state.versions).toHaveLength(0);
  });

  it("IMM-11 audit failure rolls back sign transaction", async () => {
    const { service, state } = buildService({ auditThrowsOnAction: AuditAction.PROVIDER_DOCUMENTATION_SIGN });
    await expect(service.signProviderDocumentation("fac-1", "enc-1", "user-1")).rejects.toThrow("audit failure");
    expect(state.encounter.providerDocumentationStatus).toBe("DRAFT");
    expect(state.versions).toHaveLength(0);
  });

  it("IMM-12 addendum after sign does not mutate signed version snapshot", async () => {
    const { service, state } = buildService();
    await service.signProviderDocumentation("fac-1", "enc-1", "user-1");
    const before = structuredClone(state.versions[0]);

    await service.addProviderAddendum("fac-1", "enc-1", { text: "Supplemental note" } as any, "user-1");

    expect(state.addenda).toHaveLength(1);
    expect(state.versions[0]?.clinicalSnapshotJson).toEqual(before.clinicalSnapshotJson);
    expect(state.versions[0]?.snapshotHash).toBe(before.snapshotHash);
  });

  it("IMM-13 no application route updates/deletes immutable version snapshots", () => {
    expect((EncountersService.prototype as any).updateProviderDocumentationVersion).toBeUndefined();
    expect((EncountersService.prototype as any).deleteProviderDocumentationVersion).toBeUndefined();
  });
});
