import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction } from "@prisma/client";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import type {
  CreateDiagnosisDto,
  UpdateDiagnosisDto,
  ListDiagnosesQuery,
} from "./dto";

const diagnosisInclude = {
  patient: {
    select: { id: true, firstName: true, lastName: true, mrn: true },
  },
  encounter: {
    select: { id: true, type: true, status: true, createdAt: true },
  },
  facility: { select: { id: true, code: true, name: true } },
};

@Injectable()
export class DiagnosesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(
    encounterId: string,
    facilityId: string,
    dto: CreateDiagnosisDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: { patient: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    assertEncounterNotSigned(encounter);

    const row = await this.prisma.diagnosis.create({
      data: {
        patientId: encounter.patientId,
        encounterId,
        facilityId,
        code: dto.code,
        description: dto.description ?? undefined,
        onsetDate: dto.onsetDate ?? undefined,
        notes: dto.notes ?? undefined,
        status: "ACTIVE",
      },
      include: diagnosisInclude,
    });

    await this.audit.log(AuditAction.CREATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: row.id,
      ip,
      userAgent,
      metadata: { code: dto.code },
    });

    return row;
  }

  async findByPatient(
    patientId: string,
    facilityId: string,
    query: ListDiagnosesQuery,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const where: any = { patientId, facilityId };
    if (query.status) where.status = query.status;

    const take = query.limit ?? 100;
    const skip = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.diagnosis.findMany({
        where,
        take,
        skip,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        include: diagnosisInclude,
      }),
      this.prisma.diagnosis.count({ where }),
    ]);

    await this.audit.log(AuditAction.VIEW, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      metadata: { listByPatient: true },
    });

    return { items, total };
  }

  async update(
    id: string,
    facilityId: string,
    dto: UpdateDiagnosisDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const existing = await this.prisma.diagnosis.findFirst({
      where: { id, facilityId },
    });
    if (!existing) {
      throw new NotFoundException("Diagnosis not found");
    }
    if (existing.status === "RESOLVED") {
      throw new BadRequestException("Cannot update a resolved diagnosis");
    }

    const enc = await this.prisma.encounter.findFirst({
      where: { id: existing.encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(enc);

    const data: any = {};
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.onsetDate !== undefined) data.onsetDate = dto.onsetDate;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const row = await this.prisma.diagnosis.update({
      where: { id },
      data,
      include: diagnosisInclude,
    });

    await this.audit.log(AuditAction.UPDATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: existing.patientId,
      encounterId: existing.encounterId,
      entityId: id,
      ip,
      userAgent,
      metadata: { fields: Object.keys(data) },
    });

    return row;
  }

  async resolve(
    id: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const existing = await this.prisma.diagnosis.findFirst({
      where: { id, facilityId },
    });
    if (!existing) {
      throw new NotFoundException("Diagnosis not found");
    }
    if (existing.status === "RESOLVED") {
      throw new BadRequestException("Diagnosis is already resolved");
    }

    const enc = await this.prisma.encounter.findFirst({
      where: { id: existing.encounterId, facilityId },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(enc);

    const resolvedDate = new Date();

    const row = await this.prisma.diagnosis.update({
      where: { id },
      data: { status: "RESOLVED", resolvedDate },
      include: diagnosisInclude,
    });

    await this.audit.log(AuditAction.UPDATE, "DIAGNOSIS", {
      userId,
      facilityId,
      patientId: existing.patientId,
      encounterId: existing.encounterId,
      entityId: id,
      ip,
      userAgent,
      metadata: { action: "resolve", resolvedDate: resolvedDate.toISOString() },
    });

    return row;
  }
}
