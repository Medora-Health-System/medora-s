import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  AuditAction,
  DiseaseCaseStatus,
  MsppDiseaseReportFeedbackSeverity,
  MsppDiseaseReportFeedbackStatus,
  MsppLabEvidenceType,
  MsppRoleCode,
  Prisma,
} from "@prisma/client";
import { patientFullNameFromPatient, patientPrimaryIdentifierFromPatient } from "../common/patient-identity";
import { isPlatformPrincipalAdminEmail } from "../auth/platform-principal";
import { assertEncounterNotSigned } from "../encounters/encounter-sign-lock.util";
import { DiseaseCaseReviewStatus, ReviewerLevel } from "../mspp/mspp.constants";
import type {
  CreateVaccineCatalogDto,
  RecordVaccineAdministrationDto,
  ListPatientVaccinationsQuery,
  CreateDiseaseCaseReportDto,
  ListDiseaseCaseReportsQuery,
  DiseaseSummaryQuery,
  CreateMsppDiseaseReportFeedbackDto,
} from "./dto";
import {
  activeDiseaseNotifiableCatalog,
  type HaitiDiseaseNotifiableEntry,
} from "./haiti-disease-notifiable-catalog";
import { logBreakGlassAccessIfApplicable } from "../common/break-glass/break-glass-audit.helper";
import { createStructuredLogger } from "../common/logging/structured-logger";

const publicHealthLog = createStructuredLogger("PublicHealth");

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
   * Facility disease-report list: patient identity (name + NIR/MRN/global dossier) is revealed only when allowed.
   * - Platform principal (`atranchant@medora.local`) — operational oversight (same boundary as `canCreateFacilities` on `/auth/me`).
   * - Active MSPP assignments for national disease surveillance / validation (not generic clinical facility roles).
   * Pure Medora clinical roles at the facility without the above receive redacted list rows (see `listDiseaseCaseReports`).
   */
  async userMayViewPatientIdentityOnFacilityDiseaseReportList(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email && isPlatformPrincipalAdminEmail(user.email)) {
      return true;
    }
    const rows = await this.prisma.msppUserRoleAssignment.findMany({
      where: { userId, isActive: true },
      select: { role: true },
    });
    const allowed = new Set<MsppRoleCode>([
      MsppRoleCode.MSPP_ADMIN,
      MsppRoleCode.MSPP_DISEASE_REPORTS,
      MsppRoleCode.MSPP_VALIDATOR_DEPT,
      MsppRoleCode.MSPP_VALIDATOR_CENTRAL,
      MsppRoleCode.MSPP_EPIDEMIOLOGIE,
      MsppRoleCode.MSPP_MINISTRE,
    ]);
    return rows.some((row) => allowed.has(row.role));
  }

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
    userId: string | undefined,
    facilityId: string,
    options?: { isBackfill?: boolean }
  ): Promise<{ id: string; status: string; createdNew: boolean } | null> {
    const existing = await this.prisma.diseaseCaseReview.findFirst({
      where: { diseaseCaseReportId: row.id },
      select: { id: true, status: true },
    });
    if (existing) return { ...existing, createdNew: false };

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
        metadata: {
          diseaseCaseReportId: row.id,
          msppEnqueue: true,
          ...(options?.isBackfill ? { source: "backfill" as const } : {}),
        },
      });
      return { ...created, createdNew: true };
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "P2002"
      ) {
        const race = await this.prisma.diseaseCaseReview.findFirst({
          where: { diseaseCaseReportId: row.id },
          select: { id: true, status: true },
        });
        if (race) return { ...race, createdNew: false };
      }
      publicHealthLog.error("disease_case_review_enqueue_failed", {
        isPrismaError:
          typeof e === "object" &&
          e !== null &&
          "code" in e &&
          typeof (e as { code?: unknown }).code === "string",
      });
      return null;
    }
  }

  /**
   * Backfill manuel : crée des `DiseaseCaseReview` manquantes pour d’anciennes déclarations,
   * mêmes règles que la création en ligne (géo résolvable, pas de doublon).
   * Idempotent : sans effet si une revue existe déjà pour la déclaration.
   * Ne s’exécute pas au démarrage — appeler via script uniquement.
   */
  async backfillMissingMsppReviews(options?: { dryRun?: boolean }): Promise<{
    candidatesWithoutReview: number;
    dryRun: boolean;
    skippedUnresolvedGeo: number;
    skippedRaceExistingReview: number;
    /** Lignes réellement créées (dryRun = false uniquement). */
    created: number;
    /** Si dryRun : nombre de revues qui seraient créées. */
    wouldCreate?: number;
    failed: number;
  }> {
    const dryRun = options?.dryRun === true;

    const candidates = await this.prisma.$queryRaw<
      Array<{
        id: string;
        geoCommuneId: string | null;
        department: string | null;
        facilityId: string;
      }>
    >(Prisma.sql`
      SELECT dcr.id, dcr."geoCommuneId", dcr.department, dcr."facilityId"
      FROM "DiseaseCaseReport" dcr
      WHERE NOT EXISTS (
        SELECT 1 FROM "DiseaseCaseReview" r
        WHERE r."diseaseCaseReportId" = dcr.id
      )
    `);

    const candidatesWithoutReview = candidates.length;
    let skippedUnresolvedGeo = 0;
    let skippedRaceExistingReview = 0;
    let created = 0;
    let failed = 0;

    for (const r of candidates) {
      const geoDeptId = await this.resolveGeoDepartmentIdForMsppReview({
        geoCommuneId: r.geoCommuneId,
        department: r.department,
      });
      if (!geoDeptId) {
        skippedUnresolvedGeo++;
        continue;
      }

      if (dryRun) {
        created++;
        continue;
      }

      const pre = await this.prisma.diseaseCaseReview.findFirst({
        where: { diseaseCaseReportId: r.id },
        select: { id: true },
      });
      if (pre) {
        skippedRaceExistingReview++;
        continue;
      }

      const out = await this.tryEnqueueMsppReview(
        { id: r.id, geoCommuneId: r.geoCommuneId, department: r.department },
        undefined,
        r.facilityId,
        { isBackfill: true }
      );
      if (out?.createdNew) {
        created++;
      } else if (out && !out.createdNew) {
        skippedRaceExistingReview++;
      } else {
        failed++;
      }
    }

    if (dryRun) {
      const wouldCreateCount = created;
      return {
        candidatesWithoutReview,
        dryRun: true,
        skippedUnresolvedGeo,
        skippedRaceExistingReview: 0,
        created: 0,
        wouldCreate: wouldCreateCount,
        failed: 0,
      };
    }

    publicHealthLog.log("mspp_backfill_complete", {
      candidatesWithoutReview,
      skippedUnresolvedGeo,
      skippedRaceExistingReview,
      created,
      failed,
    });

    return {
      candidatesWithoutReview,
      dryRun: false,
      skippedUnresolvedGeo,
      skippedRaceExistingReview,
      created,
      failed,
    };
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

  /**
   * Catalogue national de maladies à déclaration (lecture seule, V1 — module source).
   * Chaque entrée inclut la gouvernance : `reportingCategory`, `surveillancePriority`,
   * et optionnellement `sanitarySignalProfile` / `reviewGuidanceProfile` (liaison moteurs signaux / revue).
   */
  listDiseaseNotifiableCatalog(): {
    generatedAt: string;
    source: string;
    items: HaitiDiseaseNotifiableEntry[];
  } {
    const rows = activeDiseaseNotifiableCatalog();
    rows.sort((a, b) => {
      const g = (x: HaitiDiseaseNotifiableEntry) =>
        x.surveillanceGroup === "IMMEDIATE" ? 0 : x.surveillanceGroup === "WEEKLY" ? 1 : 2;
      const o = g(a) - g(b);
      if (o !== 0) return o;
      return a.labelFr.localeCompare(b.labelFr, "fr");
    });
    const items: HaitiDiseaseNotifiableEntry[] = rows.map((e) => ({
      code: e.code,
      labelFr: e.labelFr,
      aliasesFr: e.aliasesFr,
      surveillanceGroup: e.surveillanceGroup,
      reportingCategory: e.reportingCategory,
      surveillancePriority: e.surveillancePriority,
      sanitarySignalProfile: e.sanitarySignalProfile,
      reviewGuidanceProfile: e.reviewGuidanceProfile,
      isActive: e.isActive,
    }));
    return {
      generatedAt: new Date().toISOString(),
      source: "haiti-disease-notifiable-catalog@v1",
      items,
    };
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
    userAgent?: string,
    breakGlassSessionId?: string
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

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      context: "patient_vaccinations_list",
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

    const gc = await this.prisma.geoCommune.findUnique({
      where: { id: dto.geoCommuneId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!gc) {
      throw new BadRequestException("Commune géographique invalide.");
    }
    const geoCommuneId = gc.id;
    const communeStr = gc.name;
    const departmentStr = gc.department.name;

    const reportedAt = dto.reportedAt;

    const notesTrim = dto.notes?.trim();
    const clinicalTrim = dto.clinicalSummary?.trim();
    const symptomDur = dto.symptomDuration?.trim();
    const outcomeTrim = dto.outcomeStatus?.trim();
    const travelTrim = dto.travelOrExposureContext?.trim();

    let labEvidenceType: MsppLabEvidenceType | undefined;
    if (dto.labConfirmed === false) {
      labEvidenceType = MsppLabEvidenceType.NONE;
    } else if (dto.labConfirmed === true) {
      labEvidenceType = dto.labEvidenceType;
    } else {
      labEvidenceType = dto.labEvidenceType ?? undefined;
    }

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
        notes: notesTrim || undefined,
        clinicalSummary: clinicalTrim || undefined,
        feverReported:
          typeof dto.feverReported === "boolean" ? dto.feverReported : undefined,
        symptomDuration: symptomDur || undefined,
        hospitalized:
          typeof dto.hospitalized === "boolean" ? dto.hospitalized : undefined,
        outcomeStatus: outcomeTrim || undefined,
        labConfirmed:
          typeof dto.labConfirmed === "boolean" ? dto.labConfirmed : undefined,
        labEvidenceType,
        epiLinkedCase:
          typeof dto.epiLinkedCase === "boolean" ? dto.epiLinkedCase : undefined,
        travelOrExposureContext: travelTrim || undefined,
        provisionalCaseClassification:
          dto.provisionalCaseClassification ?? undefined,
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

    const msppRaw = await this.tryEnqueueMsppReview(
      { id: row.id, geoCommuneId: row.geoCommuneId, department: row.department },
      userId,
      facilityId
    );
    const msppReview = msppRaw
      ? { id: msppRaw.id, status: msppRaw.status }
      : null;

    return { ...row, msppReview };
  }

  async listDiseaseCaseReports(
    facilityId: string,
    query: ListDiseaseCaseReportsQuery,
    userId?: string,
    ip?: string,
    userAgent?: string,
    listOptions?: { revealPatientIdentity: boolean }
  ) {
    const revealPatientIdentity = listOptions?.revealPatientIdentity === true;
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
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              nationalId: true,
              globalMrn: true,
            },
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

    const feedbackSummary = await this.feedbackSummaryForReportIds(reportIds);

    const items = rows.map((r) => {
      const { patient, ...reportRest } = r;
      const deptOk = Boolean(String(r.department ?? "").trim());
      const comOk = Boolean(String(r.commune ?? "").trim());
      let patientFullName: string | null = null;
      let patientPrimaryIdentifier: string | null = null;
      if (patient) {
        patientFullName = patientFullNameFromPatient(patient);
        patientPrimaryIdentifier = patientPrimaryIdentifierFromPatient(patient);
      }
      const fb = feedbackSummary.get(r.id) ?? { pending: 0, actionRequired: 0 };
      if (!revealPatientIdentity) {
        return {
          ...reportRest,
          patientFullName: null,
          patientPrimaryIdentifier: null,
          dataQuality: {
            geoCommuneLinked: Boolean(r.geoCommuneId),
            geoIncomplete: !deptOk || !comOk,
          },
          msppReview: msppReviewByReportId.get(r.id) ?? null,
          msppFeedback: {
            pendingCount: fb.pending,
            actionRequiredCount: fb.actionRequired,
          },
        };
      }
      return {
        ...reportRest,
        patientFullName,
        patientPrimaryIdentifier,
        dataQuality: {
          geoCommuneLinked: Boolean(r.geoCommuneId),
          geoIncomplete: !deptOk || !comOk,
        },
        msppReview: msppReviewByReportId.get(r.id) ?? null,
        msppFeedback: {
          pendingCount: fb.pending,
          actionRequiredCount: fb.actionRequired,
        },
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
   * Agrégat national (tous établissements) — réservé aux lectures MSPP nationales (`/mspp/public-health/*`).
   */
  async getDiseaseSummaryNational(
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
      ip,
      userAgent,
      metadata: {
        summary: true,
        nationalMsppRead: true,
        reportedFrom,
        reportedTo,
      },
    });

    return {
      facilityId: "NATIONAL",
      reportedFrom: reportedFrom.toISOString(),
      reportedTo: reportedTo.toISOString(),
      totalReports,
      breakdown,
    };
  }

  /**
   * Liste déclarations tous établissements — lectures MSPP nationales uniquement.
   */
  async listDiseaseCaseReportsNational(
    query: ListDiseaseCaseReportsQuery,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const where: Prisma.DiseaseCaseReportWhereInput = {};
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
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
              nationalId: true,
              globalMrn: true,
            },
          },
          encounter: { select: { id: true } },
          reportedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          facility: { select: { id: true, name: true, code: true } },
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

    const feedbackSummary = await this.feedbackSummaryForReportIds(reportIds);

    const items = rows.map((r) => {
      const deptOk = Boolean(String(r.department ?? "").trim());
      const comOk = Boolean(String(r.commune ?? "").trim());
      let patientFullName: string | null = null;
      let patientPrimaryIdentifier: string | null = null;
      if (r.patient) {
        patientFullName = patientFullNameFromPatient(r.patient);
        patientPrimaryIdentifier = patientPrimaryIdentifierFromPatient(r.patient);
      }
      const { facility, patient: _patient, ...rest } = r;
      const fb = feedbackSummary.get(r.id) ?? { pending: 0, actionRequired: 0 };
      return {
        ...rest,
        facilityName: facility?.name ?? null,
        patientFullName,
        patientPrimaryIdentifier,
        dataQuality: {
          geoCommuneLinked: Boolean(r.geoCommuneId),
          geoIncomplete: !deptOk || !comOk,
        },
        msppReview: msppReviewByReportId.get(r.id) ?? null,
        msppFeedback: {
          pendingCount: fb.pending,
          actionRequiredCount: fb.actionRequired,
        },
      };
    });

    await this.audit.log(AuditAction.VIEW, "DISEASE_CASE_REPORT", {
      userId,
      ip,
      userAgent,
      metadata: { list: true, nationalMsppRead: true },
    });

    return { items, total };
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

  private async feedbackSummaryForReportIds(
    reportIds: string[]
  ): Promise<Map<string, { pending: number; actionRequired: number }>> {
    const out = new Map<string, { pending: number; actionRequired: number }>();
    if (reportIds.length === 0) return out;
    for (const id of reportIds) {
      out.set(id, { pending: 0, actionRequired: 0 });
    }
    const [nonResolved, actionRequired] = await Promise.all([
      this.prisma.msppDiseaseReportFeedback.groupBy({
        by: ["diseaseCaseReportId"],
        where: {
          diseaseCaseReportId: { in: reportIds },
          status: { not: MsppDiseaseReportFeedbackStatus.RESOLVED },
        },
        _count: { _all: true },
      }),
      this.prisma.msppDiseaseReportFeedback.groupBy({
        by: ["diseaseCaseReportId"],
        where: {
          diseaseCaseReportId: { in: reportIds },
          status: { not: MsppDiseaseReportFeedbackStatus.RESOLVED },
          severity: MsppDiseaseReportFeedbackSeverity.ACTION_REQUIRED,
        },
        _count: { _all: true },
      }),
    ]);
    for (const g of nonResolved) {
      const cur = out.get(g.diseaseCaseReportId);
      if (cur) cur.pending = g._count._all;
    }
    for (const g of actionRequired) {
      const cur = out.get(g.diseaseCaseReportId);
      if (cur) cur.actionRequired = g._count._all;
    }
    return out;
  }

  /**
   * Retours MSPP structurés — création côté national uniquement (validateurs / direction).
   */
  async createMsppDiseaseReportFeedbackFromMspp(
    dto: CreateMsppDiseaseReportFeedbackDto,
    createdByUserId: string
  ) {
    const report = await this.prisma.diseaseCaseReport.findUnique({
      where: { id: dto.diseaseCaseReportId },
      select: { id: true },
    });
    if (!report) {
      throw new NotFoundException("Déclaration introuvable.");
    }
    if (dto.diseaseCaseReviewId) {
      const rev = await this.prisma.diseaseCaseReview.findFirst({
        where: {
          id: dto.diseaseCaseReviewId,
          diseaseCaseReportId: dto.diseaseCaseReportId,
        },
        select: { id: true },
      });
      if (!rev) {
        throw new BadRequestException("Revue MSPP non concordante avec la déclaration.");
      }
    }
    const row = await this.prisma.msppDiseaseReportFeedback.create({
      data: {
        diseaseCaseReportId: dto.diseaseCaseReportId,
        diseaseCaseReviewId: dto.diseaseCaseReviewId ?? null,
        category: dto.category,
        severity: dto.severity,
        feedbackText: dto.feedbackText,
        createdByUserId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    await this.audit.log(AuditAction.CREATE, "MsppDiseaseReportFeedback", {
      userId: createdByUserId,
      entityId: row.id,
      metadata: {
        diseaseCaseReportId: dto.diseaseCaseReportId,
        diseaseCaseReviewId: dto.diseaseCaseReviewId ?? null,
        category: dto.category,
        severity: dto.severity,
      },
    });
    return this.serializeMsppDiseaseReportFeedback(row);
  }

  private serializeMsppDiseaseReportFeedback(row: {
    id: string;
    diseaseCaseReportId: string;
    diseaseCaseReviewId: string | null;
    category: string;
    severity: string;
    feedbackText: string;
    status: MsppDiseaseReportFeedbackStatus;
    createdAt: Date;
    updatedAt: Date;
    facilityReviewedAt: Date | null;
    resolvedAt: Date | null;
    createdBy: { id: string; firstName: string; lastName: string };
    facilityReviewedBy?: { firstName: string; lastName: string } | null;
    resolvedBy?: { firstName: string; lastName: string } | null;
  }) {
    return {
      id: row.id,
      diseaseCaseReportId: row.diseaseCaseReportId,
      diseaseCaseReviewId: row.diseaseCaseReviewId,
      category: row.category,
      severity: row.severity,
      feedbackText: row.feedbackText,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdByDisplayName: `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim(),
      facilityReviewedAt: row.facilityReviewedAt?.toISOString() ?? null,
      facilityReviewedByDisplayName: row.facilityReviewedBy
        ? `${row.facilityReviewedBy.firstName} ${row.facilityReviewedBy.lastName}`.trim()
        : null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedByDisplayName: row.resolvedBy
        ? `${row.resolvedBy.firstName} ${row.resolvedBy.lastName}`.trim()
        : null,
    };
  }

  async listMsppDiseaseReportFeedbackForReport(
    reportId: string,
    opts: { facilityId?: string }
  ) {
    const report = await this.prisma.diseaseCaseReport.findUnique({
      where: { id: reportId },
      select: { id: true, facilityId: true },
    });
    if (!report) {
      throw new NotFoundException("Déclaration introuvable.");
    }
    if (opts.facilityId && report.facilityId !== opts.facilityId) {
      throw new NotFoundException("Déclaration introuvable.");
    }
    const rows = await this.prisma.msppDiseaseReportFeedback.findMany({
      where: { diseaseCaseReportId: reportId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        facilityReviewedBy: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });
    return {
      items: rows.map((r) => this.serializeMsppDiseaseReportFeedback(r)),
    };
  }

  async setMsppDiseaseReportFeedbackFacilityStatus(
    facilityId: string,
    reportId: string,
    feedbackId: string,
    actorUserId: string,
    next: "REVIEWED" | "RESOLVED"
  ) {
    const report = await this.prisma.diseaseCaseReport.findFirst({
      where: { id: reportId, facilityId },
      select: { id: true },
    });
    if (!report) {
      throw new NotFoundException("Déclaration introuvable.");
    }
    const fb = await this.prisma.msppDiseaseReportFeedback.findFirst({
      where: { id: feedbackId, diseaseCaseReportId: reportId },
    });
    if (!fb) {
      throw new NotFoundException("Retour introuvable.");
    }
    if (fb.status === MsppDiseaseReportFeedbackStatus.RESOLVED && next === "REVIEWED") {
      throw new BadRequestException("Ce retour est déjà résolu.");
    }
    const updated =
      next === "REVIEWED"
        ? await this.prisma.msppDiseaseReportFeedback.update({
            where: { id: feedbackId },
            data: {
              status: MsppDiseaseReportFeedbackStatus.REVIEWED,
              facilityReviewedAt: new Date(),
              facilityReviewedByUserId: actorUserId,
            },
            include: {
              createdBy: { select: { id: true, firstName: true, lastName: true } },
              facilityReviewedBy: { select: { firstName: true, lastName: true } },
              resolvedBy: { select: { firstName: true, lastName: true } },
            },
          })
        : await this.prisma.msppDiseaseReportFeedback.update({
            where: { id: feedbackId },
            data: {
              status: MsppDiseaseReportFeedbackStatus.RESOLVED,
              resolvedAt: new Date(),
              resolvedByUserId: actorUserId,
            },
            include: {
              createdBy: { select: { id: true, firstName: true, lastName: true } },
              facilityReviewedBy: { select: { firstName: true, lastName: true } },
              resolvedBy: { select: { firstName: true, lastName: true } },
            },
          });
    await this.audit.log(AuditAction.UPDATE, "MsppDiseaseReportFeedback", {
      userId: actorUserId,
      facilityId,
      entityId: feedbackId,
      metadata: { diseaseCaseReportId: reportId, facilityStatus: next },
    });
    return { ok: true as const, item: this.serializeMsppDiseaseReportFeedback(updated) };
  }
}
