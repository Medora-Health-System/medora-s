import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction } from "@prisma/client";
import { generateUniqueMrn } from "../utils/mrn";
import type { PatientCreateDto, PatientUpdateDto } from "@medora/shared";

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async search(facilityId: string, query: {
    q?: string;
    mrn?: string;
    phone?: string;
    dob?: string;
    limit?: number;
  }, userId?: string, ip?: string, userAgent?: string) {
    const limit = Math.min(query.limit || 25, 100);
    const where: any = { facilityId };

    if (query.mrn) {
      where.mrn = query.mrn;
    }
    if (query.phone) {
      where.phone = { contains: query.phone };
    }
    if (query.dob) {
      where.dob = new Date(query.dob);
    }
    if (query.q) {
      where.OR = [
        { firstName: { contains: query.q, mode: "insensitive" } },
        { lastName: { contains: query.q, mode: "insensitive" } },
        { mrn: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q } },
      ];
    }

    const patients = await this.prisma.patient.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mrn: true,
        globalMrn: true,
        firstName: true,
        lastName: true,
        dob: true,
        phone: true,
        email: true,
        sexAtBirth: true,
        createdAt: true,
      },
    });

    // Audit view
    await this.audit.log(AuditAction.PATIENT_VIEW, "PATIENT", {
      userId,
      facilityId,
      ip,
      userAgent,
      metadata: { searchQuery: query },
    });

    return patients;
  }

  async create(facilityId: string, data: PatientCreateDto, userId?: string, ip?: string, userAgent?: string) {
    // Enforce facilityId from scope
    const createData: any = {
      ...data,
      facilityId,
      registeredAtFacilityId: facilityId,
    };

    // Generate MRN if missing
    if (!createData.mrn) {
      createData.mrn = await generateUniqueMrn(this.prisma);
    }

    // Generate global MRN
    createData.globalMrn = await generateUniqueMrn(this.prisma);

    const patient = await this.prisma.patient.create({
      data: createData,
    });

    // Audit create
    await this.audit.log(AuditAction.PATIENT_CREATE, "PATIENT", {
      userId,
      facilityId,
      patientId: patient.id,
      entityId: patient.id,
      ip,
      userAgent,
      metadata: { mrn: patient.mrn },
    });

    return patient;
  }

  async findOne(facilityId: string, id: string, userId?: string, ip?: string, userAgent?: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Audit chart open
    await this.audit.log(AuditAction.CHART_OPEN, "PATIENT", {
      userId,
      facilityId,
      patientId: patient.id,
      entityId: patient.id,
      ip,
      userAgent,
    });

    return patient;
  }

  async update(facilityId: string, id: string, data: PatientUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const updateData: any = {};
    Object.keys(data).forEach((key) => {
      if (data[key as keyof PatientUpdateDto] !== undefined) {
        updateData[key] = data[key as keyof PatientUpdateDto];
      }
    });

    const updated = await this.prisma.patient.update({
      where: { id },
      data: updateData,
    });

    // Audit update
    await this.audit.log(AuditAction.PATIENT_UPDATE, "PATIENT", {
      userId,
      facilityId,
      patientId: patient.id,
      entityId: patient.id,
      ip,
      userAgent,
      metadata: { changes: Object.keys(updateData) },
    });

    return updated;
  }
}

