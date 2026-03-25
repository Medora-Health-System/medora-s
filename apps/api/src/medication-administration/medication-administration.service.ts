import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { MedicationAdministrationCreateDto } from "@medora/shared";

@Injectable()
export class MedicationAdministrationService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEncounter(encounterId: string, facilityId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    return this.prisma.medicationAdministration.findMany({
      where: { encounterId, facilityId },
      orderBy: { administeredAt: "desc" },
      include: {
        administeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async create(
    encounterId: string,
    facilityId: string,
    administeredByUserId: string,
    data: MedicationAdministrationCreateDto
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    if (encounter.status !== "OPEN") {
      throw new BadRequestException("La consultation doit être ouverte pour enregistrer une administration.");
    }

    let orderItemId: string | null = data.orderItemId ?? null;
    if (orderItemId) {
      const item = await this.prisma.orderItem.findFirst({
        where: { id: orderItemId },
        include: { order: true },
      });
      if (!item) {
        throw new BadRequestException("Ligne d'ordre introuvable.");
      }
      if (item.order.encounterId !== encounterId) {
        throw new BadRequestException("La ligne n'appartient pas à cette consultation.");
      }
      if (item.order.facilityId !== facilityId) {
        throw new BadRequestException("Établissement invalide pour cette ligne.");
      }
      if (item.catalogItemType !== "MEDICATION") {
        throw new BadRequestException("La ligne doit être un médicament.");
      }
    }

    return this.prisma.medicationAdministration.create({
      data: {
        facilityId,
        patientId: encounter.patientId,
        encounterId,
        orderItemId,
        administeredAt: data.administeredAt ?? new Date(),
        administeredByUserId,
        notes: data.notes?.trim() ? data.notes.trim() : null,
      },
      include: {
        administeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
