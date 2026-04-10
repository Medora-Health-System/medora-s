import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { AuditAction, DiseaseCaseStatus } from "@prisma/client";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { DiseaseCaseReviewStatus, ReviewerLevel } from "../mspp/mspp.constants";
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

  /**
   * Résout l’identifiant `GeoDepartment` pour rattacher une `DiseaseCaseReview` (circuit MSPP).
   * Priorité : lien `geoCommuneId` → département ; sinon correspondance du nom `department` (insensible à la casse).
   */
  private async resolveGeoDepartmentIdForMsppReview(params: {
    geoCommuneId?: string | null;
    department?: string | null;
  }): Promise<string | null> {
    if (params.geoCommuneId) {
      const gc = await this.prisma.geoCommune.findUnique({
        where: { id: params.geoCommuneId },
        select: { geoDepartmentId: true },
      });
      return gc?.geoDepartmentId ?? null;
    }
    const d = String(params.department ?? "").trim();
    if (!d) return null;
    const dept = await this.prisma.geoDepartment.findFirst({
      where: { name: { equals: d, mode: "insensitive" } },
      select: { id: true },
    });
    return dept?.id ?? null;
  }

  /**
   * Crée une revue MSPP en attente départementale lorsque le département géographique est connu.
   * N’interrompt pas la création de déclaration en cas d’échec (journalisation seulement).
   */
  private async tryEnqueueMsppReview(
    row: { id: string; geoCommuneId: string | null; department: string | null },
    userId: string,
    facilityId: string
  ): Promise<{ id: string; status: string } | null> {
    const existing = await this.prisma.diseaseCaseReview.findFirst({
      where: { diseaseCaseReportId: row.id },
      select: { id: true, status: true },
    });
    if (existing) return existing;

    const geoDeptId = await this.resolveGeoDepartmentIdForMsppReview({
      geoCommuneId: row.geoCommuneId,
      department: row.department,
    });
    if (!geoDeptId) return null;

    try {
      const created = await this.prisma.diseaseCaseReview.create({
        data: {
          diseaseCaseReportId: row.id,
          status: DiseaseCaseReviewStatus.PENDING_DEPARTMENT,
          reviewerLevel: ReviewerLevel.DEPARTMENT,
          departmentId: geoDeptId,
        },
        select: { id: true, status: true },
      });
      await this.audit.log(AuditAction.CREATE, "DiseaseCaseReview", {
        userId,
        facilityId,
        entityId: created.id,
        metadata: { diseaseCaseReportId: row.id, msppEnqueue: true },
      });
      return created;
    } catch (e) {
      console.error("[public-health] DiseaseCaseReview enqueue failed", e);
      return null;
    }
  }

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
      assertEncounterNotSigned(enc);
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
      assertEncounterNotSigned(enc);
    }

    let communeStr = dto.commune ?? undefined;
    let departmentStr = dto.department ?? undefined;
    let geoCommuneId: string | undefined;

    if (dto.geoCommuneId) {
      const gc = await this.prisma.geoCommune.findUnique({
        where: { id: dto.geoCommuneId },
        include: { department: { select: { id: true, name: true } } },
      });
      if (!gc) {
        throw new BadRequestException("Commune géographique invalide.");
      }
      geoCommuneId = gc.id;
      communeStr = gc.name;
      departmentStr = gc.department.name;
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
        commune: communeStr,
        department: departmentStr,
        geoCommuneId,
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
        commune: communeStr,
        geoCommuneId,
      },
    });

    const msppReview = await this.tryEnqueueMsppReview(
      { id: row.id, geoCommuneId: row.geoCommuneId, department: row.department },
      userId,
      facilityId
    );

    return { ...row, msppReview: msppReview ?? null };
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
    if (query.department) where.department = query.department;
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

    const [rows, total] = await Promise.all([
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

    const reportIds = rows.map((r) => r.id);
    const msppReviews =
      reportIds.length > 0
        ? await this.prisma.diseaseCaseReview.findMany({
            where: { diseaseCaseReportId: { in: reportIds } },
            select: { id: true, diseaseCaseReportId: true, status: true },
          })
        : [];
    const msppReviewByReportId = new Map<string, { id: string; status: string }>();
    for (const rev of msppReviews) {
      if (!rev.diseaseCaseReportId) continue;
      if (!msppReviewByReportId.has(rev.diseaseCaseReportId)) {
        msppReviewByReportId.set(rev.diseaseCaseReportId, { id: rev.id, status: rev.status });
      }
    }

    const items = rows.map((r) => {
      const deptOk = Boolean(String(r.department ?? "").trim());
      const comOk = Boolean(String(r.commune ?? "").trim());
      return {
        ...r,
        dataQuality: {
          geoCommuneLinked: Boolean(r.geoCommuneId),
          geoIncomplete: !deptOk || !comOk,
        },
        msppReview: msppReviewByReportId.get(r.id) ?? null,
      };
    });

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

  /**
   * Référentiel Haïti (GeoDepartment / GeoCommune) pour saisie standardisée des déclarations.
   * Lecture seule ; même périmètre RBAC que les déclarations maladies.
   */
  async listHaitiGeoReference(_facilityId: string) {
    const departments = await this.prisma.geoDepartment.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true },
    });
    const communes = await this.prisma.geoCommune.findMany({
      orderBy: { name: "asc" },
      select: { id: true, geoDepartmentId: true, code: true, name: true },
    });
    const communesByDepartmentId: Record<
      string,
      { id: string; code: string | null; name: string }[]
    > = {};
    for (const c of communes) {
      const list = communesByDepartmentId[c.geoDepartmentId] ?? [];
      list.push({ id: c.id, code: c.code, name: c.name });
      communesByDepartmentId[c.geoDepartmentId] = list;
    }
    return { departments, communesByDepartmentId };
  }
}
