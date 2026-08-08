import "reflect-metadata";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { AdminUsersService } from "./admin-users.service";

describe("AdminUsersService (MEDUI.AUTH.ROLE.2)", () => {
  const facilityId = "11111111-1111-4111-8111-111111111111";
  const departmentId = "22222222-2222-4222-8222-222222222222";
  const userId = "33333333-3333-4333-8333-333333333333";

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      department: {
        count: jest.fn().mockResolvedValue(1),
      },
      role: {
        findMany: jest.fn().mockResolvedValue([
          { id: "role-rn", code: RoleCode.RN },
          { id: "role-lab", code: RoleCode.LAB },
        ]),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          user: {
            create: jest.fn().mockResolvedValue({ id: userId }),
          },
          userRole: {
            create: jest.fn(),
          },
        })
      ),
      ...overrides,
    };
    return { service: new AdminUsersService(prisma as never), prisma };
  }

  it("creates user with departmentId on UserRole", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findMany.mockResolvedValue([{ id: "role-lab", code: RoleCode.LAB }]);

    const txUserRoleCreate = jest.fn();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: {
          create: jest.fn().mockResolvedValue({ id: userId }),
        },
        userRole: {
          create: txUserRoleCreate,
        },
      })
    );

    prisma.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) => {
      if (where.id === userId) {
        return {
          id: userId,
          email: "tech@example.com",
          firstName: "Tech",
          lastName: "User",
          isActive: true,
          userRoles: [
            {
              isActive: true,
              departmentId,
              role: { code: RoleCode.LAB },
              department: { id: departmentId, code: "LAB", name: "Laboratoire" },
            },
          ],
        };
      }
      return null;
    });

    await service.create(
      facilityId,
      {
        firstName: "Tech",
        lastName: "User",
        email: "tech@example.com",
        password: "password1",
        facilityId,
        isActive: true,
        assignments: [{ roleCode: "LAB", departmentId }],
      },
      "actor"
    );

    expect(prisma.department.count).toHaveBeenCalledWith({
      where: { facilityId, id: { in: [departmentId] }, isActive: true },
    });
    expect(txUserRoleCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        facilityId,
        departmentId,
        isActive: true,
      }),
    });
  });

  it("rejects departmentId outside facility", async () => {
    const { service, prisma } = makeService();
    prisma.department.count.mockResolvedValue(0);
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        facilityId,
        {
          firstName: "Tech",
          lastName: "User",
          email: "tech@example.com",
          password: "password1",
          facilityId,
          isActive: true,
          assignments: [{ roleCode: "LAB", departmentId }],
        },
        "actor"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ["profile", (service: AdminUsersService) => service.updateProfile(facilityId, userId, { firstName: "Changed" }, "facility-admin")],
    ["password", (service: AdminUsersService) => service.resetPassword(facilityId, userId, "NewPassword123!", "facility-admin")],
    ["status", (service: AdminUsersService) => service.updateStatus(facilityId, userId, { isActive: false }, "facility-admin")],
    ["roles", (service: AdminUsersService) => service.updateRoles(facilityId, userId, { facilityId, roles: [RoleCode.ADMIN] }, "facility-admin")],
    ["billing", (service: AdminUsersService) => service.updateUserBillingIdentity(facilityId, userId, {
      billingNpi: null,
      billingTaxonomyCode: null,
      billingNameOverride: null,
    }, "facility-admin")],
  ])("blocks facility-admin %s mutation of an authoritative platform administrator", async (_name, mutate) => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      where.id === userId
        ? { id: userId, isActive: true, canCreateFacilities: true, userRoles: [{ id: "super" }] }
        : { id: where.id, isActive: true, canCreateFacilities: false, userRoles: [] }
    );
    await expect(mutate(service)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("still supports legacy roles[] payload without departmentId", async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findMany.mockResolvedValue([{ id: "role-rn", code: RoleCode.RN }]);

    const txUserRoleCreate = jest.fn();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: {
          create: jest.fn().mockResolvedValue({ id: userId }),
        },
        userRole: {
          create: txUserRoleCreate,
        },
      })
    );

    prisma.user.findUnique.mockImplementation(({ where }: { where: { id?: string } }) => {
      if (where.id === userId) {
        return {
          id: userId,
          email: "rn@example.com",
          firstName: "RN",
          lastName: "User",
          isActive: true,
          userRoles: [
            {
              isActive: true,
              departmentId: null,
              role: { code: RoleCode.RN },
              department: null,
            },
          ],
        };
      }
      return null;
    });

    await service.create(
      facilityId,
      {
        firstName: "RN",
        lastName: "User",
        email: "rn@example.com",
        password: "password1",
        facilityId,
        isActive: true,
        roles: ["RN"],
      },
      "actor"
    );

    expect(prisma.department.count).not.toHaveBeenCalled();
    expect(txUserRoleCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        departmentId: null,
      }),
    });
  });

  it("updateRoles persists departmentId on reactivation", async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue({ id: userId });
    prisma.userRole.findMany.mockResolvedValue([]);
    prisma.role.findMany.mockResolvedValue([{ id: "role-lab", code: RoleCode.LAB }]);
    prisma.userRole.findFirst.mockResolvedValue({ id: "ur-1" });

    const txUpdate = jest.fn();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        userRole: {
          updateMany: jest.fn(),
          findFirst: jest.fn().mockResolvedValue({ id: "ur-1" }),
          update: txUpdate,
          create: jest.fn(),
        },
      })
    );

    prisma.user.findUnique.mockResolvedValue({
      id: userId,
      email: "tech@example.com",
      firstName: "Tech",
      lastName: "User",
      isActive: true,
      userRoles: [
        {
          isActive: true,
          departmentId,
          role: { code: RoleCode.LAB },
          department: { id: departmentId, code: "LAB", name: "Laboratoire" },
        },
      ],
    });

    await service.updateRoles(
      facilityId,
      userId,
      {
        facilityId,
        assignments: [{ roleCode: "LAB", departmentId }],
      },
      "actor"
    );

    expect(txUpdate).toHaveBeenCalledWith({
      where: { id: "ur-1" },
      data: { isActive: true, departmentId },
    });
  });

  it("rejects duplicate same role with different departments", async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue({ id: userId });
    prisma.userRole.findMany.mockResolvedValue([]);

    await expect(
      service.updateRoles(
        facilityId,
        userId,
        {
          facilityId,
          assignments: [
            { roleCode: "LAB", departmentId: "44444444-4444-4444-8444-444444444444" },
            { roleCode: "LAB", departmentId: "55555555-5555-4555-8555-555555555555" },
          ],
        },
        "actor"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
