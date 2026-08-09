import { ForbiddenException } from "@nestjs/common";
import { AuditAction, MsppRoleCode } from "@prisma/client";
import { AdminMsppAccessService } from "./admin-mspp-access.service";

const actorId = "authenticated-actor-id";
const targetUserId = "target-user-id";
const assignmentId = "assignment-id";

function platformRow(id: string) {
  return {
    id,
    isActive: true,
    canCreateFacilities: true,
    userRoles: [{ id: "msa" }],
  };
}

function ordinaryRow(id: string) {
  return { id, isActive: true, canCreateFacilities: false, userRoles: [] };
}

function harness(
  options: {
    auditFails?: boolean;
    delegatedActor?: boolean;
    protectedTarget?: boolean;
  } = {},
) {
  const state = {
    firstName: "Before",
    lastName: "User",
    assignments: [] as Array<Record<string, unknown>>,
  };
  const audit = {
    log: jest.fn(async () => {
      if (options.auditFails) throw new Error("audit unavailable");
    }),
  };
  const user = {
    findUnique: jest.fn(
      async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.email === "target@example.com") {
          return {
            id: targetUserId,
            email: where.email,
            firstName: state.firstName,
            lastName: state.lastName,
          };
        }
        if (where.id === actorId)
          return options.delegatedActor
            ? ordinaryRow(actorId)
            : platformRow(actorId);
        if (where.id === targetUserId)
          return options.protectedTarget
            ? platformRow(targetUserId)
            : ordinaryRow(targetUserId);
        return null;
      },
    ),
    update: jest.fn(
      async ({ data }: { data: { firstName: string; lastName: string } }) => {
        state.firstName = data.firstName;
        state.lastName = data.lastName;
        return { id: targetUserId };
      },
    ),
    create: jest.fn(),
  };
  const msppUserRoleAssignment = {
    findFirst: jest.fn(
      async ({
        where,
      }: {
        where: { userId?: string; role?: MsppRoleCode };
      }) => {
        if (
          options.delegatedActor &&
          where.userId === actorId &&
          where.role === MsppRoleCode.MSPP_ADMIN
        ) {
          return { id: "delegated-admin" };
        }
        return null;
      },
    ),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: assignmentId, ...data };
      state.assignments.push(row);
      return row;
    }),
  };
  const prisma: any = { user, msppUserRoleAssignment };
  prisma.$transaction = jest.fn(async (work: (tx: any) => Promise<unknown>) => {
    const snapshot = JSON.parse(JSON.stringify(state));
    try {
      return await work(prisma);
    } catch (error) {
      state.firstName = snapshot.firstName;
      state.lastName = snapshot.lastName;
      state.assignments.splice(
        0,
        state.assignments.length,
        ...snapshot.assignments,
      );
      throw error;
    }
  });
  return {
    service: new AdminMsppAccessService(prisma, audit as never),
    prisma,
    audit,
    state,
  };
}

const onboardDto = {
  firstName: "After",
  lastName: "Name",
  email: "target@example.com",
  password: "NeverAuditThisPassword!",
  role: MsppRoleCode.MSPP_PUBLIC_HEALTH,
  msppAssignmentActive: true,
};

describe("D4SEC.1C.2B AdminMsppAccessService", () => {
  it("atomically onboards an existing user and emits exactly one authoritative grant event", async () => {
    const { service, prisma, audit, state } = harness();
    await expect(service.onboard(actorId, onboardDto)).resolves.toEqual({
      userId: targetUserId,
      assignmentId,
      userCreated: false,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(state.assignments).toHaveLength(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.CREATE,
      "MsppUserRoleAssignment",
      expect.objectContaining({
        userId: actorId,
        facilityId: undefined,
        entityId: assignmentId,
        critical: true,
        tx: prisma,
        metadata: expect.objectContaining({
          event: "MSPP_AUTHORITY_GRANTED",
          outcome: "SUCCESS",
          targetUserId,
        }),
      }),
    );
    const storedAudit = JSON.stringify((audit.log as jest.Mock).mock.calls);
    expect(storedAudit).not.toContain(onboardDto.password);
    expect(storedAudit).not.toMatch(/password|token|mfa|secret|authorization/i);
  });

  it("rolls back identity and MSPP authority when the required audit write fails", async () => {
    const { service, state } = harness({ auditFails: true });
    await expect(service.onboard(actorId, onboardDto)).rejects.toThrow(
      "audit unavailable",
    );
    expect(state).toEqual({
      firstName: "Before",
      lastName: "User",
      assignments: [],
    });
  });

  it("does not emit SUCCESS when validation fails before mutation", async () => {
    const { service, audit } = harness();
    await expect(
      service.onboard(actorId, {
        ...onboardDto,
        role: MsppRoleCode.MSPP_VALIDATOR_DEPT,
      } as never),
    ).rejects.toThrow(/Département géographique requis/);
    expect(
      (audit.log as jest.Mock).mock.calls.some(
        (call) => call[2]?.metadata?.outcome === "SUCCESS",
      ),
    ).toBe(false);
  });

  it("audits delegated-admin protected-target denial without changing authorization", async () => {
    const { service, audit, state } = harness({
      delegatedActor: true,
      protectedTarget: true,
    });
    await expect(service.onboard(actorId, onboardDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(state.assignments).toHaveLength(0);
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.UPDATE,
      "User",
      expect.objectContaining({
        userId: actorId,
        entityId: targetUserId,
        facilityId: undefined,
        metadata: expect.objectContaining({
          outcome: "DENIED",
          denialReason: "PLATFORM_PRINCIPAL_PROTECTED",
        }),
      }),
    );
  });
});
