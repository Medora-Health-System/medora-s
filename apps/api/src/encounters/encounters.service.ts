import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import type { EncounterCreateDto, EncounterUpdateDto } from "@medora/shared";

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(patientId: string, facilityId: string, data: EncounterCreateDto, userId?: string, ip?: string, userAgent?: string) {
    // Verify patient exists and belongs to facility
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Check for existing OPEN encounter
    const existingOpen = await (this.prisma as any).encounter.findFirst({
      where: {
        patientId,
        facilityId,
        status: "OPEN",
      },
    });

    if (existingOpen) {
      throw new BadRequestException("Patient already has an open encounter");
    }

    const encounter = await (this.prisma as any).encounter.create({
      data: {
        patientId,
        facilityId,
        type: data.type,
        providerId: data.providerId || userId,
        notes: data.notes,
        status: "OPEN",
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log("ENCOUNTER_CREATE", "ENCOUNTER", {
      userId,
      facilityId,
      patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return encounter;
  }

  async findByPatient(patientId: string, facilityId: string, userId?: string, ip?: string, userAgent?: string) {
    const encounters = await (this.prisma as any).encounter.findMany({
      where: { patientId, facilityId },
      orderBy: { startAt: "desc" },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log("ENCOUNTER_VIEW", "ENCOUNTER", {
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
    });

    return encounters;
  }

  async findOne(facilityId: string, id: string, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await (this.prisma as any).encounter.findFirst({
      where: { id, facilityId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dob: true, sexAtBirth: true } },
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    await this.audit.log("ENCOUNTER_VIEW", "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return encounter;
  }

  async update(facilityId: string, id: string, data: EncounterUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await (this.prisma as any).encounter.findFirst({
      where: { id, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const updated = await this.prisma.encounter.update({
      where: { id },
      data: {
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log("ENCOUNTER_UPDATE", "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return updated;
  }

  async close(facilityId: string, id: string, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await (this.prisma as any).encounter.findFirst({
      where: { id, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.status !== "OPEN") {
      throw new BadRequestException("Only open encounters can be closed");
    }

    const updated = await (this.prisma as any).encounter.update({
      where: { id },
      data: {
        status: "CLOSED",
        endAt: new Date(),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log("ENCOUNTER_CLOSE", "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return updated;
  }
}

