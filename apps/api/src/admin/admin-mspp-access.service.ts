import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { AuditAction, MsppRoleCode, type Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { logSecurityAdminAudit } from "../common/services/security-admin-audit";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import type {
  CreateMsppAccessDto,
  MsppOnboardDto,
  PatchMsppAccessDto,
} from "./dto/admin-mspp-access.dto";

function resolvedGeoIdForRole(
  role: MsppRoleCode,
  geoDepartmentId: string | null | undefined,
): string | null {
  if (role === MsppRoleCode.MSPP_VALIDATOR_DEPT) {
    return geoDepartmentId ?? null;
  }
  return null;
}

@Injectable()
export class AdminMsppAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async isPlatformPrincipal(userId: string): Promise<boolean> {
    return (await resolvePlatformAuthority(this.prisma, userId)).granted;
  }

  private async hasActiveMsppAdminRole(userId: string): Promise<boolean> {
    const row = await this.prisma.msppUserRoleAssignment.findFirst({
      where: { userId, role: MsppRoleCode.MSPP_ADMIN, isActive: true },
      select: { id: true },
    });
    return Boolean(row);
  }

  /** Authoritative platform principal or active `MSPP_ADMIN` assignment. */
  private async assertCanManageMsppAccess(actorId: string): Promise<void> {
    if (await this.isPlatformPrincipal(actorId)) return;
    if (await this.hasActiveMsppAdminRole(actorId)) return;
    throw new ForbiddenException(
      "Action réservée aux administrateurs de la plateforme ou aux délégués MSPP (administration des accès).",
    );
  }

  /** Delegated MSPP admins must not mutate assignments for platform principal accounts. */
  private async assertDelegatedMayTouchTargetUser(
    actorId: string,
    targetUserId: string,
    sourceOperation: string,
  ): Promise<void> {
    if (await this.isPlatformPrincipal(actorId)) return;
    if (await this.isPlatformPrincipal(targetUserId)) {
      await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, {
        event: "MSPP_AUTHORITY_MUTATION_DENIED",
        actorUserId: actorId,
        entityType: "User",
        entityId: targetUserId,
        severity: "HIGH",
        outcome: "DENIED",
        sourceOperation,
        denialReason: "PLATFORM_PRINCIPAL_PROTECTED",
        evidence: { authorityDomain: "MSPP" },
      });
      throw new ForbiddenException(
        "Les comptes administrateurs plateforme ne peuvent pas être modifiés par un délégué MSPP.",
      );
    }
  }

  /**
   * Creates one MSPP assignment; enforces GeoDepartment rules and duplicate semantics.
   * For `MSPP_VALIDATOR_DEPT`: either `allGeoDepartments` or exactly one `geoDepartmentId`.
   */
  private async addMsppAssignmentForUser(
    userId: string,
    role: MsppRoleCode,
    geoDepartmentId: string | null | undefined,
    allGeoDepartments: boolean | undefined,
    isActive: boolean,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ id: string }> {
    const allNational = allGeoDepartments === true;
    const geoResolved =
      role === MsppRoleCode.MSPP_VALIDATOR_DEPT && !allNational
        ? resolvedGeoIdForRole(role, geoDepartmentId ?? null)
        : null;

    if (role === MsppRoleCode.MSPP_VALIDATOR_DEPT) {
      if (
        allNational &&
        geoDepartmentId != null &&
        String(geoDepartmentId).trim() !== ""
      ) {
        throw new BadRequestException(
          "Ne pas renseigner de département précis lorsque l’accès couvre tous les départements.",
        );
      }
      if (!allNational && !geoResolved) {
        throw new BadRequestException(
          "Département géographique requis pour ce rôle (ou accès national départemental).",
        );
      }
      if (allNational && geoResolved) {
        throw new BadRequestException(
          "Choix invalide : département précis et tous départements.",
        );
      }
      if (geoResolved) {
        const geo = await db.geoDepartment.findUnique({
          where: { id: geoResolved },
          select: { id: true },
        });
        if (!geo) {
          throw new BadRequestException("Département géographique invalide.");
        }
      }
    } else {
      if (allNational || (geoDepartmentId != null && geoDepartmentId !== "")) {
        throw new BadRequestException(
          "Ce rôle ne prend pas de département géographique.",
        );
      }
    }

    if (role === MsppRoleCode.MSPP_VALIDATOR_DEPT && allNational) {
      const dupAll = await db.msppUserRoleAssignment.findFirst({
        where: {
          userId,
          role: MsppRoleCode.MSPP_VALIDATOR_DEPT,
          allGeoDepartments: true,
        },
      });
      if (dupAll) {
        throw new ConflictException(
          "Un accès « tous les départements » existe déjà pour cet utilisateur.",
        );
      }
    }

    if (role === MsppRoleCode.MSPP_VALIDATOR_DEPT && geoResolved) {
      const dup = await db.msppUserRoleAssignment.findFirst({
        where: {
          userId,
          role: MsppRoleCode.MSPP_VALIDATOR_DEPT,
          geoDepartmentId: geoResolved,
          allGeoDepartments: false,
        },
      });
      if (dup) {
        throw new ConflictException(
          "Cet accès MSPP existe déjà pour cet utilisateur.",
        );
      }
    }

    if (role !== MsppRoleCode.MSPP_VALIDATOR_DEPT) {
      const dup = await db.msppUserRoleAssignment.findFirst({
        where: {
          userId,
          role,
          geoDepartmentId: null,
        },
      });
      if (dup) {
        throw new ConflictException(
          "Cet accès MSPP existe déjà pour cet utilisateur.",
        );
      }
    }

    const created = await db.msppUserRoleAssignment.create({
      data: {
        userId,
        role,
        geoDepartmentId: geoResolved,
        allGeoDepartments:
          role === MsppRoleCode.MSPP_VALIDATOR_DEPT ? allNational : false,
        isActive,
      },
    });

    return { id: created.id };
  }

  async listGeoDepartments(actorId: string) {
    await this.assertCanManageMsppAccess(actorId);
    const rows = await this.prisma.geoDepartment.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true },
    });
    return { items: rows };
  }

  async listAssignments(actorId: string) {
    await this.assertCanManageMsppAccess(actorId);
    const rows = await this.prisma.msppUserRoleAssignment.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });
    const geoIds = [
      ...new Set(
        rows
          .map((r) => r.geoDepartmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const geoById =
      geoIds.length === 0
        ? new Map<string, { name: string; code: string }>()
        : new Map(
            (
              await this.prisma.geoDepartment.findMany({
                where: { id: { in: geoIds } },
                select: { id: true, name: true, code: true },
              })
            ).map((g) => [g.id, { name: g.name, code: g.code }]),
          );

    return {
      items: await Promise.all(
        rows.map(async (r) => ({
          id: r.id,
          userId: r.userId,
          userEmail: r.user.email,
          userFirstName: r.user.firstName,
          userLastName: r.user.lastName,
          userAccountActive: r.user.isActive,
          role: r.role,
          geoDepartmentId: r.geoDepartmentId,
          allGeoDepartments: r.allGeoDepartments,
          geoDepartmentName: r.geoDepartmentId
            ? (geoById.get(r.geoDepartmentId)?.name ?? null)
            : null,
          geoDepartmentCode: r.geoDepartmentId
            ? (geoById.get(r.geoDepartmentId)?.code ?? null)
            : null,
          isActive: r.isActive,
          userIsPlatformPrincipal: await this.isPlatformPrincipal(r.userId),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      ),
    };
  }

  async createAssignment(actorId: string, dto: CreateMsppAccessDto) {
    await this.assertCanManageMsppAccess(actorId);
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(
        "Utilisateur introuvable. Créez d’abord le compte (ex. via Utilisateurs et accès à l’établissement).",
      );
    }
    await this.assertDelegatedMayTouchTargetUser(
      actorId,
      user.id,
      "AdminMsppAccessService.createAssignment",
    );

    return this.prisma.$transaction(async (tx) => {
      const assignment = await this.addMsppAssignmentForUser(
        user.id,
        dto.role,
        dto.geoDepartmentId ?? null,
        dto.allGeoDepartments,
        true,
        tx,
      );
      await logSecurityAdminAudit(this.audit, AuditAction.CREATE, {
        event: "MSPP_AUTHORITY_GRANTED",
        actorUserId: actorId,
        entityType: "MsppUserRoleAssignment",
        entityId: assignment.id,
        severity: "HIGH",
        outcome: "SUCCESS",
        sourceOperation: "AdminMsppAccessService.createAssignment",
        evidence: { targetUserId: user.id, role: dto.role, isActive: true },
        tx,
      });
      return assignment;
    });
  }

  /**
   * Crée le compte si le courriel est nouveau, met à jour le nom si le compte existe, puis crée l’accès MSPP.
   * Ne crée jamais de second utilisateur pour le même courriel.
   */
  async onboard(actorId: string, dto: MsppOnboardDto) {
    await this.assertCanManageMsppAccess(actorId);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    const msppActive = dto.msppAssignmentActive !== false;

    if (existing) {
      await this.assertDelegatedMayTouchTargetUser(
        actorId,
        existing.id,
        "AdminMsppAccessService.onboard",
      );
      return this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
          },
        });
        const assignment = await this.addMsppAssignmentForUser(
          existing.id,
          dto.role,
          dto.geoDepartmentId ?? null,
          dto.allGeoDepartments,
          msppActive,
          tx,
        );
        await this.auditMsppOnboarding(
          tx,
          actorId,
          existing.id,
          assignment.id,
          dto,
          msppActive,
          false,
        );
        return {
          userId: existing.id,
          assignmentId: assignment.id,
          userCreated: false,
        };
      });
    }

    const pwd = dto.password?.trim() ?? "";
    if (pwd.length < 8) {
      throw new BadRequestException(
        "Mot de passe requis (au moins 8 caractères) pour créer un nouveau compte.",
      );
    }

    const passwordHash = await argon2.hash(pwd);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          passwordHash,
          isActive: true,
        },
      });
      const assignment = await this.addMsppAssignmentForUser(
        user.id,
        dto.role,
        dto.geoDepartmentId ?? null,
        dto.allGeoDepartments,
        msppActive,
        tx,
      );
      await this.auditMsppOnboarding(
        tx,
        actorId,
        user.id,
        assignment.id,
        dto,
        msppActive,
        true,
      );
      return {
        userId: user.id,
        assignmentId: assignment.id,
        userCreated: true,
      };
    });
  }

  private async auditMsppOnboarding(
    tx: Prisma.TransactionClient,
    actorId: string,
    targetUserId: string,
    assignmentId: string,
    dto: MsppOnboardDto,
    isActive: boolean,
    userCreated: boolean,
  ): Promise<void> {
    await logSecurityAdminAudit(this.audit, AuditAction.CREATE, {
      event: isActive
        ? "MSPP_AUTHORITY_GRANTED"
        : "MSPP_AUTHORITY_ASSIGNMENT_CREATED_INACTIVE",
      actorUserId: actorId,
      entityType: "MsppUserRoleAssignment",
      entityId: assignmentId,
      severity: "HIGH",
      outcome: "SUCCESS",
      sourceOperation: "AdminMsppAccessService.onboard",
      evidence: {
        targetUserId,
        role: dto.role,
        isActive,
        userCreated,
        geoDepartmentId: dto.geoDepartmentId ?? null,
        allGeoDepartments: dto.allGeoDepartments === true,
      },
      tx,
    });
  }

  async patchAssignment(
    actorId: string,
    assignmentId: string,
    dto: PatchMsppAccessDto,
  ) {
    await this.assertCanManageMsppAccess(actorId);
    const existing = await this.prisma.msppUserRoleAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!existing) {
      throw new NotFoundException("Accès MSPP introuvable.");
    }
    await this.assertDelegatedMayTouchTargetUser(
      actorId,
      existing.userId,
      "AdminMsppAccessService.patchAssignment",
    );

    let nextRole = dto.role ?? existing.role;
    let nextGeo: string | null = existing.geoDepartmentId;
    let nextAll = existing.allGeoDepartments;

    if (dto.role !== undefined) {
      nextRole = dto.role;
      if (dto.role !== MsppRoleCode.MSPP_VALIDATOR_DEPT) {
        nextGeo = null;
        nextAll = false;
      }
    }

    if (nextRole === MsppRoleCode.MSPP_VALIDATOR_DEPT) {
      if (dto.allGeoDepartments === true) {
        nextAll = true;
        nextGeo = null;
      } else if (dto.allGeoDepartments === false) {
        nextAll = false;
        if (dto.geoDepartmentId !== undefined) {
          nextGeo = dto.geoDepartmentId;
        }
      } else if (dto.geoDepartmentId !== undefined) {
        nextGeo = dto.geoDepartmentId;
        nextAll = false;
      }
    }

    if (nextRole === MsppRoleCode.MSPP_VALIDATOR_DEPT) {
      if (nextAll && nextGeo) {
        throw new BadRequestException(
          "Choix invalide : département précis et tous départements.",
        );
      }
      if (!nextAll && !nextGeo) {
        throw new BadRequestException(
          "Département géographique requis pour ce rôle (ou accès national départemental).",
        );
      }
      if (!nextAll && nextGeo) {
        const geo = await this.prisma.geoDepartment.findUnique({
          where: { id: nextGeo },
          select: { id: true },
        });
        if (!geo) {
          throw new BadRequestException("Département géographique invalide.");
        }
      }
    } else {
      if (nextGeo || nextAll) {
        throw new BadRequestException(
          "Ce rôle ne prend pas de département géographique.",
        );
      }
    }

    const willCheckDup =
      dto.isActive !== undefined ||
      dto.role !== undefined ||
      dto.geoDepartmentId !== undefined ||
      dto.allGeoDepartments !== undefined;

    if (willCheckDup) {
      if (nextRole === MsppRoleCode.MSPP_VALIDATOR_DEPT && nextAll) {
        const dup = await this.prisma.msppUserRoleAssignment.findFirst({
          where: {
            userId: existing.userId,
            role: MsppRoleCode.MSPP_VALIDATOR_DEPT,
            allGeoDepartments: true,
            NOT: { id: assignmentId },
          },
        });
        if (dup) {
          throw new ConflictException(
            "Un accès « tous les départements » existe déjà pour cet utilisateur.",
          );
        }
      }
      if (
        nextRole === MsppRoleCode.MSPP_VALIDATOR_DEPT &&
        !nextAll &&
        nextGeo
      ) {
        const dup = await this.prisma.msppUserRoleAssignment.findFirst({
          where: {
            userId: existing.userId,
            role: MsppRoleCode.MSPP_VALIDATOR_DEPT,
            geoDepartmentId: nextGeo,
            allGeoDepartments: false,
            NOT: { id: assignmentId },
          },
        });
        if (dup) {
          throw new ConflictException(
            "Cet accès MSPP existe déjà pour cet utilisateur.",
          );
        }
      }
      if (nextRole !== MsppRoleCode.MSPP_VALIDATOR_DEPT) {
        const dup = await this.prisma.msppUserRoleAssignment.findFirst({
          where: {
            userId: existing.userId,
            role: nextRole,
            geoDepartmentId: null,
            NOT: { id: assignmentId },
          },
        });
        if (dup) {
          throw new ConflictException(
            "Cet accès MSPP existe déjà pour cet utilisateur.",
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.msppUserRoleAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.geoDepartmentId !== undefined ||
          dto.role !== undefined ||
          dto.allGeoDepartments !== undefined
            ? { geoDepartmentId: nextGeo, allGeoDepartments: nextAll }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      await logSecurityAdminAudit(this.audit, AuditAction.UPDATE, {
        event: updated.isActive
          ? "MSPP_AUTHORITY_CHANGED"
          : "MSPP_AUTHORITY_REVOKED",
        actorUserId: actorId,
        entityType: "MsppUserRoleAssignment",
        entityId: assignmentId,
        severity: "HIGH",
        outcome: "SUCCESS",
        sourceOperation: "AdminMsppAccessService.patchAssignment",
        evidence: {
          targetUserId: existing.userId,
          before: {
            role: existing.role,
            isActive: existing.isActive,
            geoDepartmentId: existing.geoDepartmentId,
            allGeoDepartments: existing.allGeoDepartments,
          },
          after: {
            role: updated.role,
            isActive: updated.isActive,
            geoDepartmentId: updated.geoDepartmentId,
            allGeoDepartments: updated.allGeoDepartments,
          },
        },
        tx,
      });
      return { id: updated.id };
    });
  }
}
