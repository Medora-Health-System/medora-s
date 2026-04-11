import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, MsppLabEvidenceType, MsppRoleCode, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { DiseaseCaseReviewStatus, NATIONAL_MSPP_ROLES, ReviewerLevel } from "./mspp.constants";
import type { MsppRequestContext } from "./guards/mspp-roles.guard";
import type { MsppReviewActionDto } from "./dto/review-action.dto";

/** Champs alignés sur la revue / le corps de décision MSPP (fièvre, labo, exposition, durée). */
export type MsppCaseQualityInput = {
  validationFever: boolean | null | undefined;
  validationLabConfirmed: boolean | null | undefined;
  validationExposureRisk: string | null | undefined;
  validationDuration: string | null | undefined;
};

/** Texte de durée généré côté client quand le dossier ne précise pas la durée — ne doit pas compter comme « renseigné ». */
function isPlaceholderDurationText(value: string | null | undefined): boolean {
  const t = String(value ?? "").trim().toLowerCase();
  if (!t) return true;
  return t.includes("non précisé") && t.includes("dossier");
}

/**
 * Score automatique de complétude pour la décision de validation (surveillance).
 * Utilisé avant approbation départementale ou centrale.
 */
export function evaluateCaseQuality(review: MsppCaseQualityInput): number {
  let score = 0;
  if (review.validationFever) score += 1;
  if (review.validationLabConfirmed) score += 2;
  if (review.validationExposureRisk === "HIGH") score += 2;
  if (review.validationDuration?.trim() && !isPlaceholderDurationText(review.validationDuration)) {
    score += 1;
  }
  return score;
}

/** Sous-ensemble `DiseaseCaseReport` pour la complétude dossier (chaîne établissement → MSPP). */
export type MsppFacilityReportQualitySlice = {
  clinicalSummary: string | null;
  notes: string | null;
  feverReported: boolean | null;
  symptomDuration: string | null;
  hospitalized: boolean | null;
  outcomeStatus: string | null;
  labConfirmed: boolean | null;
  labEvidenceType: string | null;
  epiLinkedCase: boolean | null;
  travelOrExposureContext: string | null;
  provisionalCaseClassification: string | null;
  onsetDate: Date | null;
};

/**
 * Complétude du dossier initial établissement (0+). Aligné sur les champs saisis dans la déclaration Medora.
 * Utilisé en complément du score « checklist » lorsque celui-ci reste bas (ex. exposureRisk UNKNOWN côté payload fusionné).
 */
export function evaluateFacilityDossierCompletenessScore(
  rep: MsppFacilityReportQualitySlice
): number {
  let score = 0;
  const clinical = rep.clinicalSummary?.trim() ?? "";
  const notes = rep.notes?.trim() ?? "";
  if (clinical.length >= 40) score += 2;
  else if (clinical.length >= 15) score += 1;
  if (notes.length >= 40 && clinical.length < 15) score += 1;

  if (rep.feverReported === true) score += 1;
  if (rep.labConfirmed === true) score += 2;
  if (rep.labEvidenceType && rep.labEvidenceType !== MsppLabEvidenceType.NONE) score += 1;

  const dur = rep.symptomDuration?.trim() ?? "";
  if (dur.length >= 2 && !isPlaceholderDurationText(dur)) score += 1;

  const out = rep.outcomeStatus?.trim() ?? "";
  if (out.length >= 2 && !/non précisé/i.test(out)) score += 1;

  const tr = rep.travelOrExposureContext?.trim() ?? "";
  if (tr.length >= 15 && !/^non précisé/i.test(tr)) score += 1;

  if (rep.epiLinkedCase === true) score += 1;
  if (rep.provisionalCaseClassification != null) score += 1;
  if (rep.onsetDate != null) score += 1;
  if (rep.hospitalized !== null && rep.hospitalized !== undefined) score += 1;

  return score;
}

const MSPP_APPROVAL_LEGACY_PASS = 2;
const MSPP_APPROVAL_FACILITY_ALONE_PASS = 4;
const MSPP_APPROVAL_COMBINED_PASS = 4;

function assertMsppApprovalQuality(
  dto: MsppReviewActionDto,
  facilityReport: MsppFacilityReportQualitySlice | null
): void {
  const legacy = evaluateCaseQuality({
    validationFever: dto.fever,
    validationLabConfirmed: dto.labConfirmed,
    validationExposureRisk: dto.exposureRisk,
    validationDuration: dto.duration,
  });
  if (legacy >= MSPP_APPROVAL_LEGACY_PASS) return;

  const facility = facilityReport ? evaluateFacilityDossierCompletenessScore(facilityReport) : 0;
  if (facility >= MSPP_APPROVAL_FACILITY_ALONE_PASS) return;
  if (legacy + facility >= MSPP_APPROVAL_COMBINED_PASS) return;

  throw new BadRequestException("Dossier insuffisant pour validation MSPP");
}

function hasNationalScope(assignments: MsppRequestContext["msppAssignments"]): boolean {
  return assignments.some((a) => NATIONAL_MSPP_ROLES.includes(a.role));
}

function hasDeptValidatorNationalScope(ctx: MsppRequestContext): boolean {
  return ctx.deptValidatorAllGeoDepartments === true;
}

/** Central validators may act on any geo department for department-level MSPP steps. */
function hasCentralValidatorRole(assignments: MsppRequestContext["msppAssignments"]): boolean {
  return assignments.some((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_CENTRAL);
}

/** NIN (nationalId) preferred, then facility MRN, then global dossier number. */
function patientPrimaryIdentifierFrom(p: {
  nationalId: string | null;
  mrn: string | null;
  globalMrn: string;
}): string {
  const n = p.nationalId?.trim();
  if (n) return n;
  const m = p.mrn?.trim();
  if (m) return m;
  return p.globalMrn.trim();
}

function patientFullNameFrom(p: { firstName: string; lastName: string }): string | null {
  const s = `${p.firstName} ${p.lastName}`.trim();
  return s || null;
}

function ageInFullYearsAtReference(dob: Date, ref: Date): number | null {
  if (Number.isNaN(dob.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getUTCFullYear() - dob.getUTCFullYear();
  const md = ref.getUTCMonth() - dob.getUTCMonth();
  if (md < 0 || (md === 0 && ref.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

/** Champs persistés pour une décision MSPP (liste + réponse des mutations). */
const DISEASE_CASE_REVIEW_DECISION_FIELDS_SELECT = {
  id: true,
  diseaseCaseReportId: true,
  status: true,
  reviewerLevel: true,
  departmentId: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  validationFever: true,
  validationDuration: true,
  validationLabConfirmed: true,
  validationExposureRisk: true,
  caseClassification: true,
  inclusionCriteriaSummary: true,
  exclusionCriteriaSummary: true,
  symptomOnsetDate: true,
  hospitalized: true,
  outcomeStatus: true,
  labEvidenceType: true,
  epiLinkedCase: true,
  travelOrExposureContext: true,
  finalDecisionRationale: true,
} satisfies Prisma.DiseaseCaseReviewSelect;

/** Reviews visible to this MSPP user (department validators are scoped; national roles see all). */
function reviewWhereForContext(ctx: MsppRequestContext): Prisma.DiseaseCaseReviewWhereInput {
  if (hasNationalScope(ctx.msppAssignments)) {
    return {};
  }
  if (hasDeptValidatorNationalScope(ctx)) {
    return {};
  }
  if (ctx.allowedDepartments.length === 0) {
    throw new ForbiddenException("Department validator requires geoDepartmentId on assignment.");
  }
  return { departmentId: { in: ctx.allowedDepartments } };
}

function reportingWhereForContext(ctx: MsppRequestContext): Prisma.DiseaseCaseReviewWhereInput {
  const base: Prisma.DiseaseCaseReviewWhereInput = {
    status: DiseaseCaseReviewStatus.CENTRAL_APPROVED,
  };
  if (hasNationalScope(ctx.msppAssignments)) {
    return base;
  }
  if (hasDeptValidatorNationalScope(ctx)) {
    return base;
  }
  if (ctx.allowedDepartments.length === 0) {
    throw new ForbiddenException("Department validator requires geoDepartmentId on assignment.");
  }
  return { ...base, departmentId: { in: ctx.allowedDepartments } };
}

@Injectable()
export class MsppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listReviews(ctx: MsppRequestContext) {
    const where = reviewWhereForContext(ctx);
    const rows = await this.prisma.diseaseCaseReview.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: DISEASE_CASE_REVIEW_DECISION_FIELDS_SELECT,
    });
    const reportIds = [
      ...new Set(rows.map((r) => r.diseaseCaseReportId).filter((id): id is string => Boolean(id))),
    ];
    const reports =
      reportIds.length === 0
        ? []
        : await this.prisma.diseaseCaseReport.findMany({
            where: { id: { in: reportIds } },
            select: {
              id: true,
              facilityId: true,
              reportedByUserId: true,
              reportedAt: true,
              status: true,
              department: true,
              commune: true,
              geoCommuneId: true,
              diseaseCode: true,
              diseaseName: true,
              onsetDate: true,
              notes: true,
              clinicalSummary: true,
              feverReported: true,
              symptomDuration: true,
              hospitalized: true,
              outcomeStatus: true,
              labConfirmed: true,
              labEvidenceType: true,
              epiLinkedCase: true,
              travelOrExposureContext: true,
              provisionalCaseClassification: true,
              facility: { select: { name: true } },
              reportedBy: { select: { firstName: true, lastName: true } },
              patient: {
                select: {
                  firstName: true,
                  lastName: true,
                  mrn: true,
                  nationalId: true,
                  globalMrn: true,
                  dob: true,
                  sex: true,
                },
              },
              encounter: { select: { roomLabel: true } },
            },
          });
    const reportById = new Map(reports.map((rep) => [rep.id, rep]));

    const geoDeptIds = [...new Set(rows.map((r) => r.departmentId))];
    const geoDepartments =
      geoDeptIds.length === 0
        ? []
        : await this.prisma.geoDepartment.findMany({
            where: { id: { in: geoDeptIds } },
            select: { id: true, name: true, code: true },
          });
    const geoDeptById = new Map(geoDepartments.map((g) => [g.id, g]));

    const reporterPairs = reports
      .filter((rep): rep is (typeof rep & { reportedByUserId: string }) => Boolean(rep.reportedByUserId))
      .map((rep) => ({ userId: rep.reportedByUserId, facilityId: rep.facilityId }));
    const pairKey = (userId: string, facilityId: string) => `${userId}|${facilityId}`;
    const uniqueReporterPairs = Array.from(
      new Map(reporterPairs.map((p) => [pairKey(p.userId, p.facilityId), p])).values()
    );

    const roleRows =
      uniqueReporterPairs.length === 0
        ? []
        : await this.prisma.userRole.findMany({
            where: {
              isActive: true,
              OR: uniqueReporterPairs.map((p) => ({
                userId: p.userId,
                facilityId: p.facilityId,
              })),
            },
            select: {
              userId: true,
              facilityId: true,
              role: { select: { name: true } },
            },
          });

    const reporterRoleByPair = new Map<string, string>();
    const roleNamesByPair = new Map<string, string[]>();
    for (const ur of roleRows) {
      const k = pairKey(ur.userId, ur.facilityId);
      const arr = roleNamesByPair.get(k) ?? [];
      arr.push(ur.role.name);
      roleNamesByPair.set(k, arr);
    }
    for (const [k, names] of roleNamesByPair) {
      reporterRoleByPair.set(k, [...new Set(names)].join(", "));
    }

    const reviews = rows.map((r) => {
      const rep = r.diseaseCaseReportId ? reportById.get(r.diseaseCaseReportId) : undefined;
      const deptOk = Boolean(String(rep?.department ?? "").trim());
      const comOk = Boolean(String(rep?.commune ?? "").trim());
      const geoMeta = geoDeptById.get(r.departmentId);
      const departmentName = geoMeta?.name ?? null;

      let facilityName: string | null = null;
      let reporterName: string | null = null;
      let reporterRole: string | null = null;
      let patientFullName: string | null = null;
      let patientPrimaryIdentifier: string | null = null;
      let patientSex: string | null = null;
      let patientAgeYears: number | null = null;
      let reportEncounterRoomLabel: string | null = null;
      let reportedAt: string | null = null;

      if (rep) {
        facilityName = rep.facility.name;
        reportedAt = rep.reportedAt.toISOString();
        const room = rep.encounter?.roomLabel?.trim();
        reportEncounterRoomLabel = room || null;
        if (rep.reportedBy) {
          const rn = `${rep.reportedBy.firstName} ${rep.reportedBy.lastName}`.trim();
          reporterName = rn || null;
        }
        if (rep.reportedByUserId) {
          reporterRole = reporterRoleByPair.get(pairKey(rep.reportedByUserId, rep.facilityId)) ?? null;
        }
        if (rep.patient) {
          patientFullName = patientFullNameFrom(rep.patient);
          patientPrimaryIdentifier = patientPrimaryIdentifierFrom(rep.patient);
          patientSex = rep.patient.sex;
          if (rep.patient.dob) {
            patientAgeYears = ageInFullYearsAtReference(rep.patient.dob, rep.reportedAt);
          }
        }
      }

      /** Données structurées de la revue telles qu’enregistrées (après département : revue départementale ; affichage central en lecture seule). */
      const departmentReview = {
        validationFever: r.validationFever,
        validationDuration: r.validationDuration,
        validationLabConfirmed: r.validationLabConfirmed,
        validationExposureRisk: r.validationExposureRisk,
        caseClassification: r.caseClassification,
        inclusionCriteriaSummary: r.inclusionCriteriaSummary,
        exclusionCriteriaSummary: r.exclusionCriteriaSummary,
        symptomOnsetDate: r.symptomOnsetDate ? r.symptomOnsetDate.toISOString() : null,
        hospitalized: r.hospitalized,
        outcomeStatus: r.outcomeStatus,
        labEvidenceType: r.labEvidenceType,
        epiLinkedCase: r.epiLinkedCase,
        travelOrExposureContext: r.travelOrExposureContext,
        finalDecisionRationale: r.finalDecisionRationale,
        reviewerLevel: r.reviewerLevel,
        reviewStatus: r.status,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };

      const facilityDossier = rep
        ? {
            diseaseCaseReportId: rep.id,
            reportCaseStatus: rep.status,
            diseaseCode: rep.diseaseCode,
            diseaseName: rep.diseaseName,
            reportedAt: rep.reportedAt.toISOString(),
            onsetDate: rep.onsetDate ? rep.onsetDate.toISOString() : null,
            department: rep.department,
            commune: rep.commune,
            geoCommuneId: rep.geoCommuneId,
            notes: rep.notes,
            clinicalSummary: rep.clinicalSummary,
            feverReported: rep.feverReported,
            symptomDuration: rep.symptomDuration,
            hospitalized: rep.hospitalized,
            outcomeStatus: rep.outcomeStatus,
            labConfirmed: rep.labConfirmed,
            labEvidenceType: rep.labEvidenceType,
            epiLinkedCase: rep.epiLinkedCase,
            travelOrExposureContext: rep.travelOrExposureContext,
            provisionalCaseClassification: rep.provisionalCaseClassification,
            facilityName: rep.facility.name,
            patientFullName,
            patientPrimaryIdentifier,
            reporterName,
            reporterRole,
            patientSex,
            patientAgeYears,
            reportEncounterRoomLabel,
          }
        : null;

      return {
        ...r,
        departmentName,
        facilityName,
        reporterName,
        reporterRole,
        reportDepartment: rep?.department ?? null,
        reportCommune: rep?.commune ?? null,
        reportDiseaseCode: rep?.diseaseCode ?? null,
        reportDiseaseName: rep?.diseaseName ?? null,
        patientFullName,
        patientPrimaryIdentifier,
        patientSex,
        patientAgeYears,
        /** Clinical location hint when the declaration is linked to an encounter (salle, etc.). */
        reportEncounterRoomLabel,
        reportedAt,
        /** Dossier initial tel que saisi à l’établissement (lecture seule côté revue départementale). */
        facilityDossier,
        /** Synthèse des champs de revue enregistrés (chaîne département → central). */
        departmentReview,
        dataQuality: {
          geoIncomplete: rep ? !deptOk || !comOk : false,
          geoCommuneLinked: Boolean(rep?.geoCommuneId),
        },
      };
    });

    return { reviews };
  }

  async departmentApprove(reviewId: string, ctx: MsppRequestContext, dto: MsppReviewActionDto) {
    const isDeptValidator = ctx.msppAssignments.some((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_DEPT);
    const isCentralValidator = hasCentralValidatorRole(ctx.msppAssignments);
    if (!isDeptValidator && !isCentralValidator) {
      throw new ForbiddenException("Only MSPP_VALIDATOR_DEPT or MSPP_VALIDATOR_CENTRAL can department-approve.");
    }
    const review = await this.prisma.diseaseCaseReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException("Review not found");
    }
    if (
      !isCentralValidator &&
      !ctx.deptValidatorAllGeoDepartments &&
      !ctx.allowedDepartments.includes(review.departmentId)
    ) {
      throw new ForbiddenException("Not authorized for this department.");
    }
    if (review.status !== DiseaseCaseReviewStatus.PENDING_DEPARTMENT) {
      throw new BadRequestException(
        `Invalid status for department approve: expected ${DiseaseCaseReviewStatus.PENDING_DEPARTMENT}`
      );
    }
    const facilityReport = await this.loadFacilityReportQualitySlice(review.diseaseCaseReportId);
    assertMsppApprovalQuality(dto, facilityReport);
    const notes = this.appendNote(
      review.notes,
      this.validationAuditLine("Validation département — approbation", dto)
    );
    const updated = await this.prisma.diseaseCaseReview.update({
      where: { id: reviewId },
      data: {
        status: DiseaseCaseReviewStatus.DEPARTMENT_APPROVED,
        reviewerLevel: ReviewerLevel.DEPARTMENT,
        reviewerUserId: ctx.userId,
        reviewedAt: new Date(),
        notes,
        ...this.reviewStructuredFields(dto),
      },
      select: DISEASE_CASE_REVIEW_DECISION_FIELDS_SELECT,
    });
    await this.audit.log(AuditAction.UPDATE, "DiseaseCaseReview", {
      userId: ctx.userId,
      entityId: reviewId,
      metadata: { msppAction: "department_approve", diseaseCaseReportId: review.diseaseCaseReportId },
    });
    return { review: updated };
  }

  async departmentReject(reviewId: string, ctx: MsppRequestContext, dto: MsppReviewActionDto) {
    const isDeptValidator = ctx.msppAssignments.some((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_DEPT);
    const isCentralValidator = hasCentralValidatorRole(ctx.msppAssignments);
    if (!isDeptValidator && !isCentralValidator) {
      throw new ForbiddenException("Only MSPP_VALIDATOR_DEPT or MSPP_VALIDATOR_CENTRAL can department-reject.");
    }
    const review = await this.prisma.diseaseCaseReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException("Review not found");
    }
    if (
      !isCentralValidator &&
      !ctx.deptValidatorAllGeoDepartments &&
      !ctx.allowedDepartments.includes(review.departmentId)
    ) {
      throw new ForbiddenException("Not authorized for this department.");
    }
    if (review.status !== DiseaseCaseReviewStatus.PENDING_DEPARTMENT) {
      throw new BadRequestException(
        `Invalid status for department reject: expected ${DiseaseCaseReviewStatus.PENDING_DEPARTMENT}`
      );
    }
    const notes = this.appendNote(
      review.notes,
      this.validationAuditLine("Validation département — rejet", dto)
    );
    const updated = await this.prisma.diseaseCaseReview.update({
      where: { id: reviewId },
      data: {
        status: DiseaseCaseReviewStatus.DEPARTMENT_REJECTED,
        reviewerLevel: ReviewerLevel.DEPARTMENT,
        reviewerUserId: ctx.userId,
        reviewedAt: new Date(),
        notes,
        ...this.reviewStructuredFields(dto),
      },
      select: DISEASE_CASE_REVIEW_DECISION_FIELDS_SELECT,
    });
    await this.audit.log(AuditAction.UPDATE, "DiseaseCaseReview", {
      userId: ctx.userId,
      entityId: reviewId,
      metadata: { msppAction: "department_reject", diseaseCaseReportId: review.diseaseCaseReportId },
    });
    return { review: updated };
  }

  async centralApprove(reviewId: string, ctx: MsppRequestContext, dto: MsppReviewActionDto) {
    const allowed = ctx.msppAssignments.some((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_CENTRAL);
    if (!allowed) {
      throw new ForbiddenException("Only MSPP_VALIDATOR_CENTRAL can central-approve.");
    }
    const review = await this.prisma.diseaseCaseReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException("Review not found");
    }
    const ok =
      review.status === DiseaseCaseReviewStatus.DEPARTMENT_APPROVED ||
      review.status === DiseaseCaseReviewStatus.PENDING_CENTRAL;
    if (!ok) {
      throw new BadRequestException(
        `Invalid status for central approve: expected ${DiseaseCaseReviewStatus.DEPARTMENT_APPROVED} or ${DiseaseCaseReviewStatus.PENDING_CENTRAL}`
      );
    }
    const facilityReport = await this.loadFacilityReportQualitySlice(review.diseaseCaseReportId);
    assertMsppApprovalQuality(dto, facilityReport);
    const notes = this.appendNote(
      review.notes,
      this.validationAuditLine("Validation centrale — approbation", dto)
    );
    const updated = await this.prisma.diseaseCaseReview.update({
      where: { id: reviewId },
      data: {
        status: DiseaseCaseReviewStatus.CENTRAL_APPROVED,
        reviewerLevel: ReviewerLevel.CENTRAL,
        reviewerUserId: ctx.userId,
        reviewedAt: new Date(),
        notes,
        ...this.reviewStructuredFields(dto),
      },
      select: DISEASE_CASE_REVIEW_DECISION_FIELDS_SELECT,
    });
    await this.audit.log(AuditAction.UPDATE, "DiseaseCaseReview", {
      userId: ctx.userId,
      entityId: reviewId,
      metadata: { msppAction: "central_approve", diseaseCaseReportId: review.diseaseCaseReportId },
    });
    return { review: updated };
  }

  async centralReject(reviewId: string, ctx: MsppRequestContext, dto: MsppReviewActionDto) {
    const allowed = ctx.msppAssignments.some((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_CENTRAL);
    if (!allowed) {
      throw new ForbiddenException("Only MSPP_VALIDATOR_CENTRAL can central-reject.");
    }
    const review = await this.prisma.diseaseCaseReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException("Review not found");
    }
    const ok =
      review.status === DiseaseCaseReviewStatus.DEPARTMENT_APPROVED ||
      review.status === DiseaseCaseReviewStatus.PENDING_CENTRAL;
    if (!ok) {
      throw new BadRequestException(
        `Invalid status for central reject: expected ${DiseaseCaseReviewStatus.DEPARTMENT_APPROVED} or ${DiseaseCaseReviewStatus.PENDING_CENTRAL}`
      );
    }
    const notes = this.appendNote(
      review.notes,
      this.validationAuditLine("Validation centrale — rejet", dto)
    );
    const updated = await this.prisma.diseaseCaseReview.update({
      where: { id: reviewId },
      data: {
        status: DiseaseCaseReviewStatus.CENTRAL_REJECTED,
        reviewerLevel: ReviewerLevel.CENTRAL,
        reviewerUserId: ctx.userId,
        reviewedAt: new Date(),
        notes,
        ...this.reviewStructuredFields(dto),
      },
      select: DISEASE_CASE_REVIEW_DECISION_FIELDS_SELECT,
    });
    await this.audit.log(AuditAction.UPDATE, "DiseaseCaseReview", {
      userId: ctx.userId,
      entityId: reviewId,
      metadata: { msppAction: "central_reject", diseaseCaseReportId: review.diseaseCaseReportId },
    });
    return { review: updated };
  }

  async summary(ctx: MsppRequestContext) {
    const where = reportingWhereForContext(ctx);
    const totalApproved = await this.prisma.diseaseCaseReview.count({ where });
    const byDepartment = await this.prisma.diseaseCaseReview.groupBy({
      by: ["departmentId"],
      where,
      _count: { _all: true },
    });
    const deptMeta = await this.prisma.geoDepartment.findMany({
      where: { id: { in: byDepartment.map((b) => b.departmentId) } },
      select: { id: true, code: true, name: true },
    });
    const deptMap = new Map(deptMeta.map((d) => [d.id, d]));
    return {
      totalApproved,
      byDepartment: byDepartment.map((b) => ({
        departmentId: b.departmentId,
        departmentCode: deptMap.get(b.departmentId)?.code ?? null,
        departmentName: deptMap.get(b.departmentId)?.name ?? null,
        count: b._count._all,
      })),
    };
  }

  async trends(ctx: MsppRequestContext) {
    const where = reportingWhereForContext(ctx);
    const rows = await this.prisma.diseaseCaseReview.findMany({
      where: { ...where, reviewedAt: { not: null } },
      select: { reviewedAt: true },
    });
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      if (!r.reviewedAt) continue;
      const key = `${r.reviewedAt.getUTCFullYear()}-${String(r.reviewedAt.getUTCMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return {
      buckets: Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
    };
  }

  async geography(ctx: MsppRequestContext) {
    const where = reportingWhereForContext(ctx);
    const byDepartment = await this.prisma.diseaseCaseReview.groupBy({
      by: ["departmentId"],
      where,
      _count: { _all: true },
    });
    const deptMeta = await this.prisma.geoDepartment.findMany({
      where: { id: { in: byDepartment.map((b) => b.departmentId) } },
      select: { id: true, code: true, name: true },
    });
    const deptMap = new Map(deptMeta.map((d) => [d.id, d]));
    return {
      regions: byDepartment.map((b) => ({
        departmentId: b.departmentId,
        departmentCode: deptMap.get(b.departmentId)?.code ?? null,
        departmentName: deptMap.get(b.departmentId)?.name ?? null,
        approvedCount: b._count._all,
      })),
    };
  }

  async diseases(ctx: MsppRequestContext) {
    const where = reportingWhereForContext(ctx);
    const reviews = await this.prisma.diseaseCaseReview.findMany({
      where: { ...where, diseaseCaseReportId: { not: null } },
      select: { diseaseCaseReportId: true },
    });
    const reportIds = [...new Set(reviews.map((r) => r.diseaseCaseReportId).filter(Boolean))] as string[];
    if (reportIds.length === 0) {
      return { diseases: [] as Array<{ diseaseCode: string; diseaseName: string; count: number }> };
    }
    const reports = await this.prisma.diseaseCaseReport.findMany({
      where: { id: { in: reportIds } },
      select: { id: true, diseaseCode: true, diseaseName: true },
    });
    const reportById = new Map(reports.map((r) => [r.id, r]));
    const agg = new Map<string, { diseaseCode: string; diseaseName: string; count: number }>();
    for (const rev of reviews) {
      const rid = rev.diseaseCaseReportId;
      if (!rid) continue;
      const rep = reportById.get(rid);
      if (!rep) continue;
      const key = rep.diseaseCode;
      const prev = agg.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        agg.set(key, { diseaseCode: rep.diseaseCode, diseaseName: rep.diseaseName, count: 1 });
      }
    }
    return { diseases: [...agg.values()].sort((a, b) => b.count - a.count) };
  }

  private async loadFacilityReportQualitySlice(
    diseaseCaseReportId: string | null | undefined
  ): Promise<MsppFacilityReportQualitySlice | null> {
    if (!diseaseCaseReportId) return null;
    return this.prisma.diseaseCaseReport.findUnique({
      where: { id: diseaseCaseReportId },
      select: {
        clinicalSummary: true,
        notes: true,
        feverReported: true,
        symptomDuration: true,
        hospitalized: true,
        outcomeStatus: true,
        labConfirmed: true,
        labEvidenceType: true,
        epiLinkedCase: true,
        travelOrExposureContext: true,
        provisionalCaseClassification: true,
        onsetDate: true,
      },
    });
  }

  private appendNote(existing: string | null, reason?: string): string | undefined {
    if (!reason?.trim()) {
      return existing ?? undefined;
    }
    const line = reason.trim();
    if (!existing?.trim()) {
      return line;
    }
    return `${existing}\n${line}`;
  }

  private reviewStructuredFields(dto: MsppReviewActionDto): Prisma.DiseaseCaseReviewUpdateInput {
    return {
      validationFever: dto.fever,
      validationDuration: dto.duration,
      validationLabConfirmed: dto.labConfirmed,
      validationExposureRisk: dto.exposureRisk,
      caseClassification: dto.caseClassification,
      inclusionCriteriaSummary: dto.inclusionCriteriaSummary,
      exclusionCriteriaSummary: dto.exclusionCriteriaSummary,
      symptomOnsetDate: dto.symptomOnsetDate
        ? new Date(`${dto.symptomOnsetDate}T12:00:00.000Z`)
        : null,
      hospitalized: dto.hospitalized,
      outcomeStatus: dto.outcomeStatus,
      labEvidenceType: dto.labEvidenceType,
      epiLinkedCase: dto.epiLinkedCase,
      travelOrExposureContext: dto.travelOrExposureContext,
      finalDecisionRationale: dto.finalDecisionRationale,
    };
  }

  private validationAuditLine(actionLabel: string, dto: MsppReviewActionDto): string {
    const fever = dto.fever ? "oui" : "non";
    const lab = dto.labConfirmed ? "oui" : "non";
    const hosp = dto.hospitalized ? "oui" : "non";
    const epi = dto.epiLinkedCase ? "oui" : "non";
    const onset = dto.symptomOnsetDate ?? "—";
    return [
      `[MSPP ${actionLabel}] Vérifications initiales — Fièvre: ${fever}; durée des signes: ${dto.duration}; confirmation biologique: ${lab}; risque d’exposition: ${dto.exposureRisk}.`,
      `Critères de cas — Classification: ${dto.caseClassification}; début des signes: ${onset}; hospitalisé: ${hosp}; évolution: ${dto.outcomeStatus}; preuve labo: ${dto.labEvidenceType}; cas lié épidémiologiquement: ${epi}.`,
      `Contexte voyage / exposition: ${dto.travelOrExposureContext}`,
      `Critères d’inclusion: ${dto.inclusionCriteriaSummary}`,
      `Critères d’exclusion: ${dto.exclusionCriteriaSummary}`,
      `Commentaire validateur: ${dto.comment}`,
      `Justification finale: ${dto.finalDecisionRationale}`,
    ].join("\n");
  }

}
