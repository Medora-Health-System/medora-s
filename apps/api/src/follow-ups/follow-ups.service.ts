import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, Prisma } from "@prisma/client";
import { isFollowUpStatus } from "../common/utils/prisma-query-enum-guards";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import type {
  CreateFollowUpDto,
  ListPatientFollowUpsQuery,
  ListUpcomingFollowUpsQuery,
} from "./dto";

const followUpInclude = {
  patient: {
    select: { id: true, firstName: true, lastName: true, mrn: true },
  },
  facility: { select: { id: true, code: true, name: true } },
  encounter: {
    select: { id: true, type: true, status: true, createdAt: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
};

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    facilityId: string,
    dto: CreateFollowUpDto,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, facilityId },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found in this facility");
    }
    if (dto.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: {
          id: dto.encounterId,
          facilityId,
          patientId: dto.patientId,
        },
      });
      if (!enc) {
        throw new BadRequestException(
          "Encounter not found or does not match patient/facility",
        );
      }
      assertEncounterNotSigned(enc);
    }

    const row = await this.prisma.followUp.create({
      data: {
        patientId: dto.patientId,
        facilityId,
        encounterId: dto.encounterId ?? undefined,
        dueDate: dto.dueDate,
        reason: dto.reason.trim(),
        notes: dto.notes?.trim() || undefined,
        status: "OPEN",
        createdByUserId: userId ?? undefined,
      },
      include: followUpInclude,
    });

    await this.audit.log(AuditAction.CREATE, "FOLLOW_UP", {
      userId,
      facilityId,
      patientId: dto.patientId,
      ...(row.encounterId ? { encounterId: row.encounterId } : {}),
      entityId: row.id,
      ip,
      userAgent,
      metadata: { dueDate: dto.dueDate.toISOString() },
    });

    return row;
  }

  async findByPatient(
    patientId: string,
    facilityId: string,
    query: ListPatientFollowUpsQuery,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const where: Prisma.FollowUpWhereInput = {
      patientId,
      facilityId,
    };
    if (query.status !== undefined && isFollowUpStatus(query.status)) {
      where.status = query.status;
    }

    const take = query.limit ?? 50;
    const skip = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.followUp.findMany({
        where,
        orderBy: { dueDate: "desc" },
        take,
        skip,
        include: followUpInclude,
      }),
      this.prisma.followUp.count({ where }),
    ]);

    await this.audit.log(AuditAction.VIEW, "FOLLOW_UP", {
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      metadata: { listByPatient: true },
    });

    return { items, total };
  }

  async findUpcoming(
    facilityId: string,
    query: ListUpcomingFollowUpsQuery,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const from = query.from ?? new Date();
    const to = query.to ?? (() => {
      const t = new Date();
      t.setDate(t.getDate() + 90);
      return t;
    })();
    const take = query.limit ?? 100;

    const items = await this.prisma.followUp.findMany({
      where: {
        facilityId,
        status: "OPEN",
        dueDate: { gte: from, lte: to },
      },
      orderBy: { dueDate: "asc" },
      take,
      include: followUpInclude,
    });

    await this.audit.log(AuditAction.VIEW, "FOLLOW_UP", {
      userId,
      facilityId,
      ip,
      userAgent,
      metadata: { upcoming: true, from: from.toISOString(), to: to.toISOString() },
    });

    return { items };
  }

  async complete(
    id: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({
      where: { id, facilityId },
    });
    if (!existing) {
      throw new NotFoundException("Follow-up not found");
    }
    if (existing.status !== "OPEN") {
      throw new BadRequestException(
        `Follow-up is not open (status: ${existing.status})`,
      );
    }

    if (existing.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: {
          id: existing.encounterId,
          facilityId,
          patientId: existing.patientId,
        },
      });
      if (!enc) {
        throw new BadRequestException(
          "Encounter not found or does not match patient/facility",
        );
      }
      assertEncounterNotSigned(enc);
    }

    const completedAt = new Date();
    const row = await this.prisma.followUp.update({
      where: { id },
      data: { status: "COMPLETED", completedAt },
      include: followUpInclude,
    });

    await this.audit.log(AuditAction.UPDATE, "FOLLOW_UP", {
      userId,
      facilityId,
      patientId: existing.patientId,
      ...(existing.encounterId ? { encounterId: existing.encounterId } : {}),
      entityId: id,
      ip,
      userAgent,
      metadata: { action: "complete", completedAt: completedAt.toISOString() },
    });

    return row;
  }

  async cancel(
    id: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.followUp.findFirst({
      where: { id, facilityId },
    });
    if (!existing) {
      throw new NotFoundException("Follow-up not found");
    }
    if (existing.status !== "OPEN") {
      throw new BadRequestException(
        `Follow-up is not open (status: ${existing.status})`,
      );
    }

    if (existing.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: {
          id: existing.encounterId,
          facilityId,
          patientId: existing.patientId,
        },
      });
      if (!enc) {
        throw new BadRequestException(
          "Encounter not found or does not match patient/facility",
        );
      }
      assertEncounterNotSigned(enc);
    }

    const row = await this.prisma.followUp.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: followUpInclude,
    });

    await this.audit.log(AuditAction.UPDATE, "FOLLOW_UP", {
      userId,
      facilityId,
      patientId: existing.patientId,
      ...(existing.encounterId ? { encounterId: existing.encounterId } : {}),
      entityId: id,
      ip,
      userAgent,
      metadata: { action: "cancel" },
    });

    return row;
  }
}
