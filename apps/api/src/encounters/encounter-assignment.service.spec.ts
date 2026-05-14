/**
 * Phase 10A — operational ER ownership service tests.
 *
 * Exercised invariants (provider + nurse self-assignment):
 *   * OPEN encounter, correct role at facility → success, persists user id +
 *     assignment timestamp, audit logged with PHI-safe metadata only.
 *   * CLOSED encounter (status or workflowState) → BadRequestException,
 *     no DB write, no audit.
 *   * Caller does not hold the active role at the facility → BadRequestException.
 *   * Cross-facility encounter → NotFoundException (no leak).
 *   * Re-assigning to the same actor is a no-op (no version increment, no audit).
 *   * Audit metadata never includes patient name / MRN / chief complaint.
 */

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { EncountersService } from "./encounters.service";

type AnyMock = jest.Mock;

function buildPrismaMock(opts: {
  encounter?: Partial<Record<string, unknown>> | null;
  membershipForActor?: { role: { code: string } } | null;
  updateManyCount?: number;
}) {
  const encounter = opts.encounter === null ? null : { ...defaultEncounter, ...(opts.encounter ?? {}) };
  const findFirst = jest.fn().mockResolvedValueOnce(encounter).mockResolvedValueOnce(encounter);
  const updateMany = jest.fn().mockResolvedValue({ count: opts.updateManyCount ?? 1 });
  return {
    encounter: {
      findFirst,
      updateMany,
    },
    userRole: {
      findFirst: jest.fn().mockResolvedValue(opts.membershipForActor ?? null),
    },
  } as unknown;
}

const defaultEncounter = {
  id: "enc-1",
  facilityId: "facility-A",
  patientId: "patient-1",
  status: "OPEN",
  workflowState: "PROVIDER",
  version: 3,
  physicianAssignedUserId: null,
  nurseAssignedUserId: null,
  // hydrated row returned by the second findFirst (post-update read)
  physicianAssigned: null,
  nurseAssigned: null,
  patient: { id: "patient-1", firstName: "Jean", lastName: "Patient", mrn: "MRN-1" },
  chiefComplaint: "Confidential complaint",
};

function buildAuditMock() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeService(prisma: unknown, audit: unknown) {
  const trackboard = {
    getOperationalAggregatesForEncounterIds: jest.fn().mockResolvedValue(new Map()),
  };
  return new EncountersService(prisma as never, audit as never, trackboard as never);
}

describe("EncountersService — Phase 10A self-assignment", () => {
  describe("selfAssignProvider", () => {
    it("assigns OPEN encounter to a PROVIDER caller and audits with PHI-safe metadata", async () => {
      const prisma = buildPrismaMock({
        membershipForActor: { role: { code: "PROVIDER" } },
      });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);

      const res = await svc.selfAssignProvider("facility-A", "enc-1", "user-1");

      expect((prisma as { encounter: { updateMany: AnyMock } }).encounter.updateMany).toHaveBeenCalledTimes(1);
      const updateCall = (prisma as { encounter: { updateMany: AnyMock } }).encounter.updateMany.mock.calls[0]?.[0];
      expect(updateCall.where).toMatchObject({ id: "enc-1", facilityId: "facility-A", version: 3 });
      /**
       * Phase 10A patch — `updateMany` only accepts scalar updates.
       * The nested-relation form (`physicianAssigned: { connect: ... }`) is invalid
       * at runtime and previously caused a 500 (`PrismaClientValidationError`).
       * Lock in the scalar form so this regression cannot return.
       */
      const data = updateCall.data as Record<string, unknown>;
      expect(data.physicianAssignedUserId).toBe("user-1");
      expect(data.physicianAssignedAt).toBeInstanceOf(Date);
      expect(data).not.toHaveProperty("physicianAssigned");
      expect(data.version).toEqual({ increment: 1 });

      expect(audit.log).toHaveBeenCalledTimes(1);
      const auditArgs = audit.log.mock.calls[0]!;
      expect(auditArgs[0]).toBe(AuditAction.ENCOUNTER_ASSIGN_PROVIDER);
      expect(auditArgs[1]).toBe("ENCOUNTER");
      const meta = auditArgs[2]?.metadata as Record<string, unknown>;
      expect(meta).toMatchObject({
        source: "SELF_ASSIGN",
        kind: "provider",
        assignedProviderUserId: "user-1",
        previousProviderUserId: null,
      });
      const blob = JSON.stringify(meta).toLowerCase();
      expect(blob).not.toContain("jean");
      expect(blob).not.toContain("patient");
      expect(blob).not.toContain("mrn");
      expect(blob).not.toContain("complaint");
      expect(res).toBeTruthy();
    });

    it("rejects when the caller is not a PROVIDER at the facility", async () => {
      const prisma = buildPrismaMock({ membershipForActor: null });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);
      await expect(svc.selfAssignProvider("facility-A", "enc-1", "user-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect((prisma as { encounter: { updateMany: AnyMock } }).encounter.updateMany).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("rejects when the encounter is CLOSED (status)", async () => {
      const prisma = buildPrismaMock({
        encounter: { status: "CLOSED" },
        membershipForActor: { role: { code: "PROVIDER" } },
      });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);
      await expect(svc.selfAssignProvider("facility-A", "enc-1", "user-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect((prisma as { encounter: { updateMany: AnyMock } }).encounter.updateMany).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("rejects when workflowState is CLOSED even if status is OPEN (defense-in-depth)", async () => {
      const prisma = buildPrismaMock({
        encounter: { status: "OPEN", workflowState: "CLOSED" },
        membershipForActor: { role: { code: "PROVIDER" } },
      });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);
      await expect(svc.selfAssignProvider("facility-A", "enc-1", "user-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("returns 404 for a cross-facility encounter (no leak)", async () => {
      const prisma = buildPrismaMock({ encounter: null });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);
      await expect(svc.selfAssignProvider("facility-A", "enc-1", "user-1")).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("is a no-op when the caller is already the assigned provider", async () => {
      const prisma = buildPrismaMock({
        encounter: { physicianAssignedUserId: "user-1" },
        membershipForActor: { role: { code: "PROVIDER" } },
      });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);

      await svc.selfAssignProvider("facility-A", "enc-1", "user-1");

      expect((prisma as { encounter: { updateMany: AnyMock } }).encounter.updateMany).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe("selfAssignNurse", () => {
    it("assigns OPEN encounter to an RN caller and audits with PHI-safe metadata", async () => {
      const prisma = buildPrismaMock({
        membershipForActor: { role: { code: "RN" } },
      });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);

      await svc.selfAssignNurse("facility-A", "enc-1", "rn-1");

      const updateCall = (prisma as { encounter: { updateMany: AnyMock } }).encounter.updateMany.mock.calls[0]?.[0];
      const data = updateCall.data as Record<string, unknown>;
      expect(data.nurseAssignedUserId).toBe("rn-1");
      expect(data.nurseAssignedAt).toBeInstanceOf(Date);
      expect(data).not.toHaveProperty("nurseAssigned");
      expect(data.version).toEqual({ increment: 1 });

      expect(audit.log).toHaveBeenCalledTimes(1);
      const auditArgs = audit.log.mock.calls[0]!;
      expect(auditArgs[0]).toBe(AuditAction.ENCOUNTER_ASSIGN_NURSE);
      const meta = auditArgs[2]?.metadata as Record<string, unknown>;
      expect(meta).toMatchObject({
        source: "SELF_ASSIGN",
        kind: "nurse",
        assignedNurseUserId: "rn-1",
        previousNurseUserId: null,
      });
      const blob = JSON.stringify(meta).toLowerCase();
      expect(blob).not.toContain("jean");
      expect(blob).not.toContain("complaint");
    });

    it("rejects when the caller is not an active RN at the facility", async () => {
      const prisma = buildPrismaMock({ membershipForActor: null });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);
      await expect(svc.selfAssignNurse("facility-A", "enc-1", "rn-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
      expect(audit.log).not.toHaveBeenCalled();
    });

    it("rejects when the encounter is CLOSED", async () => {
      const prisma = buildPrismaMock({
        encounter: { status: "CLOSED" },
        membershipForActor: { role: { code: "RN" } },
      });
      const audit = buildAuditMock();
      const svc = makeService(prisma, audit);
      await expect(svc.selfAssignNurse("facility-A", "enc-1", "rn-1")).rejects.toBeInstanceOf(
        BadRequestException
      );
    });
  });
});
