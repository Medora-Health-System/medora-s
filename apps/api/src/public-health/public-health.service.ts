import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, DiseaseCaseStatus } from "@prisma/client";
import type {
  CreateVaccineCatalogDto,
  RecordVaccineAdministrationDto,
  ListPatientVaccinationsQuery,
  CreateDiseaseCaseReportDto,
  ListDiseaseCaseReportsQuery,
  DiseaseSummaryQuery,
} from "./dto";

const DUE_SOON_DAYS = 30;

const vaccinationInclude = {
  patient: {
    select: { id: true, firstName: true, lastName: true, mrn: true },
  },
  vaccineCatalog: { select: { id: true, code: true, name: true } },
  encounter: { select: { id: true, type: true, status: true } },
  administeredBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
};

@Injectable()
export class PublicHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async createVaccineCatalogItem(
    dto: CreateVaccineCatalogDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const existing = await this.prisma.vaccineCatalog.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(`Vaccine code already exists: ${dto.code}`);
    }
    const row = await this.prisma.vaccineCatalog.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? undefined,
        manufacturer: dto.manufacturer ?? undefined,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.log(AuditAction.CREATE, "VACCINE_CATALOG", {
      userId,
      entityId: row.id,
      ip,
      userAgent,
      metadata: { code: row.code, name: row.name },
    });
    return row;
  }

  async listVaccineCatalog(activeOnly = true) {
    return this.prisma.vaccineCatalog.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    });
  }

  async recordVaccineAdministration(
    facilityId: string,
    dto: RecordVaccineAdministrationDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, facilityId },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found in this facility");
    }

    const vaccine = await this.prisma.vaccineCatalog.findFirst({
      where: { id: dto.vaccineCatalogId, isActive: true },
    });
    if (!vaccine) {
      throw new NotFoundException("Vaccine catalog entry not found or inactive");
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
          "Encounter not found or does not match patient/facility"
        );
      }
    }

    const administeredAt = dto.administeredAt ?? new Date();

    const row = await this.prisma.vaccineAdministration.create({
      data: {
        patientId: dto.patientId,
        facilityId,
        encounterId: dto.encounterId ?? undefined,
        vaccineCatalogId: dto.vaccineCatalogId,
        doseNumber: dto.doseNumber ?? undefined,
        lotNumber: dto.lotNumber ?? undefined,
        administeredAt,
        administeredByUserId: userId,
        nextDueAt: dto.nextDueAt ?? undefined,
        notes: dto.notes ?? undefined,
      },
      include: vaccinationInclude,
    });

    await this.audit.log(AuditAction.CREATE, "VACCINE_ADMINISTRATION", {
      userId,
      facilityId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? undefined,
      entityId: row.id,
      ip,
      userAgent,
      metadata: {
        vaccineCode: vaccine.code,
        doseNumber: dto.doseNumber,
      },
    });

    return row;
  }

  async listPatientVaccines(
    patientId: string,
    facilityId: string,
    query: ListPatientVaccinationsQuery,
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

    const take = query.limit ?? 100;
    const rows = await this.prisma.vaccineAdministration.findMany({
      where: { patientId, facilityId },
      orderBy: { administeredAt: "desc" },
      take,
      include: vaccinationInclude,
    });

    await this.audit.log(AuditAction.VIEW, "VACCINE_ADMINISTRATION", {
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      metadata: { listPatientVaccines: true },
    });

    return rows;
  }

  async listVaccinesDueSoon(
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + DUE_SOON_DAYS);
    end.setHours(23, 59, 59, 999);

    const rows = await this.prisma.vaccineAdministration.findMany({
      where: {
        facilityId,
        nextDueAt: {
          not: null,
          gte: start,
          lte: end,
        },
      },
      orderBy: { nextDueAt: "asc" },
      include: vaccinationInclude,
    });

    await this.audit.log(AuditAction.VIEW, "VACCINE_ADMINISTRATION", {
      userId,
      facilityId,
      ip,
      userAgent,
      metadata: { dueSoon: true, days: DUE_SOON_DAYS },
    });

    return {
      dueWithinDays: DUE_SOON_DAYS,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      items: rows,
    };
  }

  async createDiseaseCaseReport(
    facilityId: string,
    dto: CreateDiseaseCaseReportDto,
    userId: string,
    ip?: string,
    userAgent?: string
  ) {
    if (dto.patientId) {
      const p = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, facilityId },
      });
      if (!p) {
        throw new NotFoundException("Patient not found in this facility");
      }
    }

    if (dto.encounterId) {
      const enc = await this.prisma.encounter.findFirst({
        where: {
          id: dto.encounterId,
          facilityId,
          ...(dto.patientId ? { patientId: dto.patientId } : {}),
        },
      });
      if (!enc) {
        throw new BadRequestException(
          "Encounter not found or does not match facility/patient"
        );
      }
    }

    const reportedAt = dto.reportedAt ?? new Date();

    const row = await this.prisma.diseaseCaseReport.create({
      data: {
        patientId: dto.patientId ?? undefined,
        facilityId,
        encounterId: dto.encounterId ?? undefined,
        diseaseCode: dto.diseaseCode,
        diseaseName: dto.diseaseName,
        status: dto.status as DiseaseCaseStatus,
        reportedAt,
        onsetDate: dto.onsetDate ?? undefined,
        commune: dto.commune ?? undefined,
        department: dto.department ?? undefined,
        notes: dto.notes ?? undefined,
        reportedByUserId: userId,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, mrn: true },
        },
        encounter: { select: { id: true } },
        reportedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await this.audit.log(AuditAction.CREATE, "DISEASE_CASE_REPORT", {
      userId,
      facilityId,
      patientId: dto.patientId ?? undefined,
      encounterId: dto.encounterId ?? undefined,
      entityId: row.id,
      ip,
      userAgent,
      metadata: {
        diseaseCode: dto.diseaseCode,
        status: dto.status,
        commune: dto.commune,
      },
    });

    return row;
  }

  async listDiseaseCaseReports(
    facilityId: string,
    query: ListDiseaseCaseReportsQuery,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const where: any = { facilityId };
    if (query.status) where.status = query.status;
    if (query.commune) where.commune = query.commune;
    if (query.diseaseCode) where.diseaseCode = query.diseaseCode;
    if (query.diseaseName) {
      where.diseaseName = { contains: query.diseaseName, mode: "insensitive" };
    }
    if (query.reportedFrom || query.reportedTo) {
      where.reportedAt = {};
      if (query.reportedFrom) where.reportedAt.gte = query.reportedFrom;
      if (query.reportedTo) where.reportedAt.lte = query.reportedTo;
    }

    const take = query.limit ?? 100;
    const skip = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.diseaseCaseReport.findMany({
        where,
        take,
        skip,
        orderBy: { reportedAt: "desc" },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, mrn: true },
          },
          encounter: { select: { id: true } },
          reportedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.diseaseCaseReport.count({ where }),
    ]);

    await this.audit.log(AuditAction.VIEW, "DISEASE_CASE_REPORT", {
      userId,
      facilityId,
      ip,
      userAgent,
      metadata: { list: true },
    });

    return { items, total };
  }

  async getDiseaseSummary(
    facilityId: string,
    query: DiseaseSummaryQuery,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const reportedTo = query.reportedTo ?? new Date();
    const reportedFrom =
      query.reportedFrom ??
      new Date(reportedTo.getTime() - 90 * 24 * 60 * 60 * 1000);

    const groups = await this.prisma.diseaseCaseReport.groupBy({
      by: ["diseaseName", "status", "commune"],
      where: {
        facilityId,
        reportedAt: { gte: reportedFrom, lte: reportedTo },
      },
      _count: { _all: true },
    });

    const breakdown = groups.map((g) => ({
      diseaseName: g.diseaseName,
      status: g.status,
      commune: g.commune ?? null,
      count: g._count._all,
    }));

    const totalReports = breakdown.reduce((s, r) => s + r.count, 0);

    await this.audit.log(AuditAction.VIEW, "DISEASE_CASE_REPORT", {
      userId,
      facilityId,
      ip,
      userAgent,
      metadata: { summary: true, reportedFrom, reportedTo },
    });

    return {
      facilityId,
      reportedFrom: reportedFrom.toISOString(),
      reportedTo: reportedTo.toISOString(),
      totalReports,
      breakdown,
    };
  }
}
