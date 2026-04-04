import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateFacilityDto } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RoleCode } from "@prisma/client";
import { randomBytes } from "crypto";

/** Valeurs par défaut — le schéma Prisma exige country et timezone ; non exposés sur POST minimal (nom seul). */
const DEFAULT_NEW_FACILITY_COUNTRY = "Haiti";
const DEFAULT_NEW_FACILITY_TIMEZONE = "America/Port-au-Prince";

@Injectable()
export class AdminFacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFacilityDto, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { canCreateFacilities: true },
    });
    if (!actor?.canCreateFacilities) {
      throw new ForbiddenException("Création d’établissement non autorisée pour ce compte.");
    }

    const trimmed = dto.name.trim();
    const code = `FAC-${randomBytes(6).toString("hex")}`;

    return this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          code,
          name: trimmed,
          country: DEFAULT_NEW_FACILITY_COUNTRY,
          timezone: DEFAULT_NEW_FACILITY_TIMEZONE,
          defaultLanguage: dto.defaultLanguage ?? "fr",
        },
      });

      const adminRole = await tx.role.findUnique({
        where: { code: RoleCode.ADMIN },
      });
      if (!adminRole) {
        throw new NotFoundException("Rôle ADMIN introuvable.");
      }

      await tx.userRole.create({
        data: {
          userId,
          facilityId: facility.id,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      return {
        id: facility.id,
        name: facility.name,
        defaultLanguage: facility.defaultLanguage as "fr" | "en",
      };
    });
  }

  /**
   * Platform principals (`canCreateFacilities`) may list all facilities without per-facility ADMIN.
   * Facility-level ADMIN at the active `x-facility-id` retains the previous list access (global rows).
   */
  async assertCanListFacilities(userId: string, facilityIdHeader: string | undefined) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { canCreateFacilities: true },
    });
    if (user?.canCreateFacilities) {
      return;
    }

    if (!facilityIdHeader) {
      throw new BadRequestException("Établissement requis");
    }

    const hasAdminHere = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId: facilityIdHeader,
        isActive: true,
        role: { code: RoleCode.ADMIN },
      },
    });
    if (!hasAdminHere) {
      throw new ForbiddenException("Liste des établissements non autorisée pour ce compte.");
    }
  }

  /**
   * @param includeInactive — If true, only `canCreateFacilities` users may list all facilities (with `isActive`).
   * Otherwise active facilities are returned: all for principals (`canCreateFacilities`), or only those the user belongs to.
   */
  async list(userId: string, includeInactive: boolean) {
    if (includeInactive) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { canCreateFacilities: true },
      });
      if (!user?.canCreateFacilities) {
        throw new ForbiddenException("Liste complète des établissements non autorisée pour ce compte.");
      }
      return this.prisma.facility.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, isActive: true, defaultLanguage: true },
      });
    }
    const principal = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { canCreateFacilities: true },
    });
    if (principal?.canCreateFacilities) {
      return this.prisma.facility.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, defaultLanguage: true },
      });
    }
    const roles = await this.prisma.userRole.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { facilityId: true },
    });
    const facilityIds = roles.map((r) => r.facilityId);
    return this.prisma.facility.findMany({
      where: {
        isActive: true,
        id: { in: facilityIds },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultLanguage: true },
    });
  }

  async setFacilityLanguage(id: string, defaultLanguage: "fr" | "en", userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { canCreateFacilities: true },
    });
    if (!actor?.canCreateFacilities) {
      throw new ForbiddenException("Modification de l’établissement non autorisée pour ce compte.");
    }

    const existing = await this.prisma.facility.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Établissement introuvable.");
    }

    return this.prisma.facility.update({
      where: { id },
      data: { defaultLanguage },
      select: { id: true, name: true, defaultLanguage: true },
    });
  }

  async setFacilityActive(id: string, isActive: boolean, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { canCreateFacilities: true },
    });
    if (!actor?.canCreateFacilities) {
      throw new ForbiddenException("Modification de l’établissement non autorisée pour ce compte.");
    }

    const existing = await this.prisma.facility.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Établissement introuvable.");
    }

    return this.prisma.facility.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true, isActive: true, defaultLanguage: true },
    });
  }
}
