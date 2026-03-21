import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { RoleCode } from "@prisma/client";
import type {
  CreateAdminUserDto,
  UpdateAdminUserDto,
  UpdateAdminUserRolesDto,
  UpdateAdminUserStatusDto,
} from "./dto/admin-user.dto";

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listForFacility(facilityId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        userRoles: { some: { facilityId } },
      },
      include: {
        userRoles: {
          where: { facilityId },
          include: { role: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return {
      items: users.map((u) => {
        const facilityAccessActive = u.userRoles.some((ur) => ur.isActive);
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          isActive: u.isActive,
          facilityAccessActive,
          roles: u.userRoles
            .filter((ur) => ur.isActive)
            .map((ur) => ur.role.code as RoleCode)
            .sort(),
          rolesInactive: u.userRoles
            .filter((ur) => !ur.isActive)
            .map((ur) => ur.role.code as RoleCode),
        };
      }),
    };
  }

  async create(facilityIdHeader: string, dto: CreateAdminUserDto, _actorUserId: string) {
    if (dto.facilityId !== facilityIdHeader) {
      throw new BadRequestException("L’établissement doit correspondre à l’établissement actif.");
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Un utilisateur avec cet e-mail existe déjà.");
    }

    const passwordHash = await argon2.hash(dto.password);

    const roleRows = await this.prisma.role.findMany({
      where: { code: { in: dto.roles } },
    });
    if (roleRows.length !== dto.roles.length) {
      throw new BadRequestException("Un ou plusieurs rôles sont invalides.");
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          passwordHash,
          isActive: dto.isActive !== false,
        },
      });

      for (const r of roleRows) {
        await tx.userRole.create({
          data: {
            userId: created.id,
            roleId: r.id,
            facilityId: facilityIdHeader,
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

    const roleRows = await this.prisma.role.findMany({
      where: { code: { in: dto.roles } },
    });
    if (roleRows.length !== dto.roles.length) {
      throw new BadRequestException("Un ou plusieurs rôles sont invalides.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.updateMany({
        where: { userId, facilityId: facilityIdHeader },
        data: { isActive: false },
      });
      for (const r of roleRows) {
        const existingUr = await tx.userRole.findFirst({
          where: { userId, facilityId: facilityIdHeader, roleId: r.id },
        });
        if (existingUr) {
          await tx.userRole.update({
            where: { id: existingUr.id },
            data: { isActive: true },
          });
        } else {
          await tx.userRole.create({
            data: {
              userId,
              roleId: r.id,
              facilityId: facilityIdHeader,
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

  private async getOneSummary(facilityId: string, userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { facilityId },
          include: { role: true },
        },
      },
    });
    if (!u) throw new NotFoundException();
    const facilityAccessActive = u.userRoles.some((ur) => ur.isActive);
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      isActive: u.isActive,
      facilityAccessActive,
      roles: u.userRoles
        .filter((ur) => ur.isActive)
        .map((ur) => ur.role.code as RoleCode)
        .sort(),
    };
  }
}
