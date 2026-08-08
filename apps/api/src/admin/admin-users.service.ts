import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { RoleCode } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import {
  dedupeAdminUserAssignments,
  findDuplicateRoleCodeDepartmentConflict,
} from "@medora/shared";
import type {
  AdminUserAssignmentDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  UpdateAdminUserRolesDto,
  UpdateAdminUserStatusDto,
  UserBillingIdentityPatchDto,
} from "@medora/shared";
import {
  assertFacilityAdminFacilityScope,
  assertFacilityAdminMayMutateUser,
  type UserMutationClass,
} from "./user-mutation-boundary";

type ResolvedUserRoleAssignment = {
  roleCode: RoleCode;
  departmentId: string | null;
};

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly audit?: AuditService
  ) {}

  private async assertMayMutateTarget(
    actorUserId: string,
    targetUserId: string,
    facilityId: string,
    mutationClass: UserMutationClass
  ): Promise<void> {
    await assertFacilityAdminMayMutateUser({
      prisma: this.prisma,
      audit: this.audit,
      actorUserId,
      targetUserId,
      facilityId,
      mutationClass,
    });
  }

  private assertNoPlatformRoleAssignment(assignments: ResolvedUserRoleAssignment[]): void {
    if (assignments.some((a) => a.roleCode === RoleCode.MEDORA_SUPER_ADMIN)) {
      throw new ForbiddenException(
        "L’autorité administrateur plateforme ne peut pas être gérée depuis un établissement."
      );
    }
  }

  async listForFacility(facilityId: string, actorUserId: string) {
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityId);
    const users = await this.prisma.user.findMany({
      where: {
        userRoles: { some: { facilityId } },
        NOT: {
          isActive: true,
          canCreateFacilities: true,
          userRoles: { some: { isActive: true, role: { code: RoleCode.MEDORA_SUPER_ADMIN } } },
        },
      },
      include: {
        userRoles: {
          where: { facilityId },
          include: { role: true, department: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return {
      items: users.map((u) => this.mapUserListItem(u, facilityId)),
    };
  }

  async create(facilityIdHeader: string, dto: CreateAdminUserDto, actorUserId: string) {
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityIdHeader);
    if (dto.facilityId !== facilityIdHeader) {
      throw new BadRequestException("L’établissement doit correspondre à l’établissement actif.");
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Un utilisateur avec cet e-mail existe déjà.");
    }

    const passwordHash = await argon2.hash(dto.password);
    const resolvedAssignments = await this.resolveAssignmentsForFacility(facilityIdHeader, dto);
    this.assertNoPlatformRoleAssignment(resolvedAssignments);

    const roleRows = await this.prisma.role.findMany({
      where: { code: { in: resolvedAssignments.map((a) => a.roleCode) } },
    });
    if (roleRows.length !== resolvedAssignments.length) {
      throw new BadRequestException("Un ou plusieurs rôles sont invalides.");
    }

    const roleByCode = new Map(roleRows.map((r) => [r.code, r]));

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          passwordHash,
          isActive: dto.isActive !== false,
          ...(dto.billingNpi !== undefined && { billingNpi: dto.billingNpi }),
          ...(dto.billingTaxonomyCode !== undefined && { billingTaxonomyCode: dto.billingTaxonomyCode }),
          ...(dto.billingNameOverride !== undefined && { billingNameOverride: dto.billingNameOverride }),
        },
      });

      for (const assignment of resolvedAssignments) {
        const r = roleByCode.get(assignment.roleCode);
        if (!r) {
          throw new BadRequestException("Un ou plusieurs rôles sont invalides.");
        }
        await tx.userRole.create({
          data: {
            userId: created.id,
            roleId: r.id,
            facilityId: facilityIdHeader,
            departmentId: assignment.departmentId,
            isActive: true,
          },
        });
      }

      return created;
    });

    return this.getOneSummary(facilityIdHeader, user.id);
  }

  async updateProfile(
    facilityId: string,
    userId: string,
    dto: UpdateAdminUserDto,
    _actorUserId: string
  ) {
    await this.assertMayMutateTarget(_actorUserId, userId, facilityId, "GLOBAL_IDENTITY");
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { facilityId } },
      },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable pour cet établissement.");
    }

    const data: { firstName?: string; lastName?: string; email?: string } = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.email !== undefined) {
      const newEmail = dto.email.toLowerCase().trim();
      const taken = await this.prisma.user.findFirst({
        where: { email: newEmail, NOT: { id: userId } },
      });
      if (taken) {
        throw new ConflictException("Un utilisateur avec cet e-mail existe déjà.");
      }
      data.email = newEmail;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getOneSummary(facilityId, userId);
  }

  async updateRoles(
    facilityIdHeader: string,
    userId: string,
    dto: UpdateAdminUserRolesDto,
    _actorUserId: string
  ) {
    await this.assertMayMutateTarget(_actorUserId, userId, facilityIdHeader, "FACILITY_MEMBERSHIP");
    if (dto.facilityId !== facilityIdHeader) {
      throw new BadRequestException("L’établissement doit correspondre à l’établissement actif.");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { facilityId: facilityIdHeader } },
      },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable pour cet établissement.");
    }

    const activeAtFacility = await this.prisma.userRole.findMany({
      where: { userId, facilityId: facilityIdHeader, isActive: true },
      include: { role: true },
    });
    const hadActiveSuperAdmin = activeAtFacility.some((ur) => ur.role.code === RoleCode.MEDORA_SUPER_ADMIN);

    const resolvedAssignments = await this.resolveAssignmentsForFacility(facilityIdHeader, dto);
    this.assertNoPlatformRoleAssignment(resolvedAssignments);

    const mergedAssignments: ResolvedUserRoleAssignment[] = [...resolvedAssignments];
    const mergedRoleCodes: RoleCode[] = mergedAssignments.map((a) => a.roleCode);
    if (hadActiveSuperAdmin && !mergedRoleCodes.includes(RoleCode.MEDORA_SUPER_ADMIN)) {
      mergedAssignments.push({
        roleCode: RoleCode.MEDORA_SUPER_ADMIN,
        departmentId: null,
      });
      mergedRoleCodes.push(RoleCode.MEDORA_SUPER_ADMIN);
    }

    if (mergedRoleCodes.length === 0) {
      throw new BadRequestException("Sélectionnez au moins un rôle pour cet établissement.");
    }

    const roleRows = await this.prisma.role.findMany({
      where: { code: { in: mergedRoleCodes } },
    });
    if (roleRows.length !== mergedRoleCodes.length) {
      throw new BadRequestException("Un ou plusieurs rôles sont invalides.");
    }

    const assignmentByRole = new Map(
      mergedAssignments.map((a) => [a.roleCode, a.departmentId] as const)
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.updateMany({
        where: { userId, facilityId: facilityIdHeader },
        data: { isActive: false },
      });
      for (const r of roleRows) {
        const departmentId = assignmentByRole.get(r.code) ?? null;
        const existingUr = await tx.userRole.findFirst({
          where: { userId, facilityId: facilityIdHeader, roleId: r.id },
        });
        if (existingUr) {
          await tx.userRole.update({
            where: { id: existingUr.id },
            data: { isActive: true, departmentId },
          });
        } else {
          await tx.userRole.create({
            data: {
              userId,
              roleId: r.id,
              facilityId: facilityIdHeader,
              departmentId,
              isActive: true,
            },
          });
        }
      }
    });

    const remainingGlobal = await this.prisma.userRole.count({
      where: { userId, isActive: true },
    });
    if (remainingGlobal > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });
    }

    return this.getOneSummary(facilityIdHeader, userId);
  }

  async updateStatus(
    facilityId: string,
    userId: string,
    dto: UpdateAdminUserStatusDto,
    actorUserId: string
  ) {
    await this.assertMayMutateTarget(actorUserId, userId, facilityId, "GLOBAL_IDENTITY");
    if (userId === actorUserId && dto.isActive === false) {
      throw new ForbiddenException("Vous ne pouvez pas désactiver votre propre compte.");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { facilityId } },
      },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable pour cet établissement.");
    }

    if (!dto.isActive) {
      await this.prisma.$transaction(async (tx) => {
        await tx.userRole.updateMany({
          where: { userId, facilityId },
          data: { isActive: false },
        });
        const remaining = await tx.userRole.count({
          where: { userId, isActive: true },
        });
        if (remaining === 0) {
          await tx.user.update({
            where: { id: userId },
            data: { isActive: false },
          });
        }
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { isActive: true },
        });
        await tx.userRole.updateMany({
          where: { userId, facilityId },
          data: { isActive: true },
        });
      });
    }

    return this.getOneSummary(facilityId, userId);
  }

  async resetPassword(
    facilityId: string,
    userId: string,
    newPassword: string,
    actorUserId: string
  ) {
    await this.assertMayMutateTarget(actorUserId, userId, facilityId, "GLOBAL_SECURITY");
    if (userId === actorUserId) {
      throw new ForbiddenException("Utilisez le changement de mot de passe personnel.");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { facilityId } },
      },
    });

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: "Mot de passe réinitialisé" };
  }

  async getUserBillingIdentity(facilityId: string, userId: string, actorUserId: string) {
    await assertFacilityAdminFacilityScope(this.prisma, actorUserId, facilityId);
    const u = await this.prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { facilityId } },
      },
      select: {
        id: true,
        billingNpi: true,
        billingTaxonomyCode: true,
        billingNameOverride: true,
      },
    });
    if (!u) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    return u;
  }

  async updateUserBillingIdentity(
    facilityId: string,
    userId: string,
    dto: UserBillingIdentityPatchDto,
    _actorUserId: string
  ) {
    await this.assertMayMutateTarget(_actorUserId, userId, facilityId, "GLOBAL_BILLING");
    const exists = await this.prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { facilityId } },
      },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        billingNpi: dto.billingNpi,
        billingTaxonomyCode: dto.billingTaxonomyCode,
        billingNameOverride: dto.billingNameOverride,
      },
      select: {
        id: true,
        billingNpi: true,
        billingTaxonomyCode: true,
        billingNameOverride: true,
      },
    });
  }

  private mapUserListItem(
    u: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      userRoles: {
        isActive: boolean;
        departmentId: string | null;
        role: { code: RoleCode };
        department: { id: string; code: string; name: string } | null;
      }[];
    },
    facilityId: string
  ) {
    const facilityAccessActive = u.userRoles.some((ur) => ur.isActive);
    const activeRoles = u.userRoles.filter((ur) => ur.isActive);
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isActive: u.isActive,
      facilityAccessActive,
      roles: activeRoles.map((ur) => ur.role.code as RoleCode).sort(),
      rolesInactive: u.userRoles
        .filter((ur) => !ur.isActive)
        .map((ur) => ur.role.code as RoleCode),
      assignments: activeRoles.map((ur) => ({
        facilityId,
        roleCode: ur.role.code as RoleCode,
        departmentId: ur.departmentId ?? null,
        departmentCode: ur.department?.code ?? null,
        departmentName: ur.department?.name ?? null,
      })),
    };
  }

  private async resolveAssignmentsForFacility(
    facilityId: string,
    dto: { roles?: RoleCode[] | string[]; assignments?: AdminUserAssignmentDto[] }
  ): Promise<ResolvedUserRoleAssignment[]> {
    if (dto.assignments?.length) {
      const normalized = dedupeAdminUserAssignments(
        dto.assignments.map((row) => ({
          facilityId: row.facilityId ?? facilityId,
          roleCode: row.roleCode,
          departmentId: row.departmentId ?? null,
        }))
      );

      const conflict = findDuplicateRoleCodeDepartmentConflict(normalized);
      if (conflict) {
        throw new BadRequestException(
          `Le rôle ${conflict} ne peut pas être assigné à plusieurs départements dans le même établissement.`
        );
      }

      for (const row of normalized) {
        if (row.facilityId !== facilityId) {
          throw new BadRequestException(
            "Chaque affectation doit correspondre à l’établissement actif."
          );
        }
      }

      await this.assertDepartmentsBelongToFacility(
        facilityId,
        normalized.map((row) => row.departmentId)
      );

      return normalized.map((row) => ({
        roleCode: row.roleCode as RoleCode,
        departmentId: row.departmentId ?? null,
      }));
    }

    const legacyRoles = dto.roles ?? [];
    if (legacyRoles.length === 0) {
      throw new BadRequestException("Sélectionnez au moins un rôle pour cet établissement.");
    }

    return legacyRoles.map((roleCode) => ({
      roleCode: roleCode as RoleCode,
      departmentId: null,
    }));
  }

  private async assertDepartmentsBelongToFacility(
    facilityId: string,
    departmentIds: (string | null | undefined)[]
  ) {
    const ids = [
      ...new Set(
        departmentIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      ),
    ];
    if (ids.length === 0) {
      return;
    }
    const count = await this.prisma.department.count({
      where: { facilityId, id: { in: ids }, isActive: true },
    });
    if (count !== ids.length) {
      throw new BadRequestException(
        "Le département sélectionné n’appartient pas à cet établissement."
      );
    }
  }

  private async getOneSummary(facilityId: string, userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { facilityId },
          include: { role: true, department: true },
        },
      },
    });
    if (!u) throw new NotFoundException();
    return this.mapUserListItem(u, facilityId);
  }
}
