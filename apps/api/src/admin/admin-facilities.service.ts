import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RoleCode } from "@prisma/client";
import { randomBytes } from "crypto";

/** Valeurs par défaut — le schéma Prisma exige country et timezone ; non exposés sur POST minimal (nom seul). */
const DEFAULT_NEW_FACILITY_COUNTRY = "Haiti";
const DEFAULT_NEW_FACILITY_TIMEZONE = "America/Port-au-Prince";

@Injectable()
export class AdminFacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { canCreateFacilities: true },
    });
    if (!actor?.canCreateFacilities) {
      throw new ForbiddenException("Création d’établissement non autorisée pour ce compte.");
    }

    const trimmed = name.trim();
    const code = `FAC-${randomBytes(6).toString("hex")}`;

    return this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          code,
          name: trimmed,
          country: DEFAULT_NEW_FACILITY_COUNTRY,
          timezone: DEFAULT_NEW_FACILITY_TIMEZONE,
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

      return { id: facility.id, name: facility.name };
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

  async list() {
    return this.prisma.facility.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }
}
