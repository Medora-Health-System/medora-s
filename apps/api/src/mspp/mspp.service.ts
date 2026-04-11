import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, MsppRoleCode, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { DiseaseCaseReviewStatus, NATIONAL_MSPP_ROLES, ReviewerLevel } from "./mspp.constants";
import type { MsppRequestContext } from "./guards/mspp-roles.guard";
import type { MsppReviewActionDto } from "./dto/review-action.dto";

function hasNationalScope(assignments: MsppRequestContext["msppAssignments"]): boolean {
  return assignments.some((a) => NATIONAL_MSPP_ROLES.includes(a.role));
}

function deptGeoIds(assignments: MsppRequestContext["msppAssignments"]): string[] {
  return assignments
    .filter((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_DEPT && a.geoDepartmentId)
    .map((a) => a.geoDepartmentId as string);
}

/** Reviews visible to this MSPP user (department validators are scoped; national roles see all). */
function reviewWhereForContext(ctx: MsppRequestContext): Prisma.DiseaseCaseReviewWhereInput {
  if (hasNationalScope(ctx.msppAssignments)) {
    return {};
  }
  const ids = deptGeoIds(ctx.msppAssignments);
  if (ids.length === 0) {
    throw new ForbiddenException("Department validator requires geoDepartmentId on assignment.");
  }
  return { departmentId: { in: ids } };
}

function reportingWhereForContext(ctx: MsppRequestContext): Prisma.DiseaseCaseReviewWhereInput {
  const base: Prisma.DiseaseCaseReviewWhereInput = {
    status: DiseaseCaseReviewStatus.CENTRAL_APPROVED,
  };
  if (hasNationalScope(ctx.msppAssignments)) {
    return base;
  }
  const ids = deptGeoIds(ctx.msppAssignments);
  if (ids.length === 0) {
    throw new ForbiddenException("Department validator requires geoDepartmentId on assignment.");
  }
  return { ...base, departmentId: { in: ids } };
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
      select: {
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
      },
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
              department: true,
              commune: true,
              geoCommuneId: true,
              diseaseCode: true,
              diseaseName: true,
              facility: { select: { name: true } },
              reportedBy: { select: { firstName: true, lastName: true } },
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
      if (rep) {
        facilityName = rep.facility.name;
        if (rep.reportedBy) {
          const rn = `${rep.reportedBy.firstName} ${rep.reportedBy.lastName}`.trim();
          reporterName = rn || null;
        }
        if (rep.reportedByUserId) {
          reporterRole = reporterRoleByPair.get(pairKey(rep.reportedByUserId, rep.facilityId)) ?? null;
        }
      }

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
        dataQuality: {
          geoIncomplete: rep ? !deptOk || !comOk : false,
          geoCommuneLinked: Boolean(rep?.geoCommuneId),
        },
      };
    });

    return { reviews };
  }

  async departmentApprove(reviewId: string, ctx: MsppRequestContext, dto: MsppReviewActionDto) {
    const allowed = ctx.msppAssignments.some((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_DEPT);
    if (!allowed) {
      throw new ForbiddenException("Only MSPP_VALIDATOR_DEPT can department-approve.");
    }
    const review = await this.prisma.diseaseCaseReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException("Review not found");
    }
    const deptIds = deptGeoIds(ctx.msppAssignments);
    if (!deptIds.includes(review.departmentId)) {
      throw new ForbiddenException("Not authorized for this department.");
    }
    if (review.status !== DiseaseCaseReviewStatus.PENDING_DEPARTMENT) {
      throw new BadRequestException(
        `Invalid status for department approve: expected ${DiseaseCaseReviewStatus.PENDING_DEPARTMENT}`
      );
    }
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
        validationFever: dto.fever,
        validationDuration: dto.duration,
        validationLabConfirmed: dto.labConfirmed,
        validationExposureRisk: dto.exposureRisk,
      },
      select: {
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
      },
    });
    await this.audit.log(AuditAction.UPDATE, "DiseaseCaseReview", {
      userId: ctx.userId,
      entityId: reviewId,
      metadata: { msppAction: "department_approve", diseaseCaseReportId: review.diseaseCaseReportId },
    });
    return { review: updated };
  }

  async departmentReject(reviewId: string, ctx: MsppRequestContext, dto: MsppReviewActionDto) {
    const allowed = ctx.msppAssignments.some((a) => a.role === MsppRoleCode.MSPP_VALIDATOR_DEPT);
    if (!allowed) {
      throw new ForbiddenException("Only MSPP_VALIDATOR_DEPT can department-reject.");
    }
    const review = await this.prisma.diseaseCaseReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException("Review not found");
    }
    const deptIds = deptGeoIds(ctx.msppAssignments);
    if (!deptIds.includes(review.departmentId)) {
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
        validationFever: dto.fever,
        validationDuration: dto.duration,
        validationLabConfirmed: dto.labConfirmed,
        validationExposureRisk: dto.exposureRisk,
      },
      select: {
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
      },
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
        validationFever: dto.fever,
        validationDuration: dto.duration,
        validationLabConfirmed: dto.labConfirmed,
        validationExposureRisk: dto.exposureRisk,
      },
      select: {
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
      },
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
        validationFever: dto.fever,
        validationDuration: dto.duration,
        validationLabConfirmed: dto.labConfirmed,
        validationExposureRisk: dto.exposureRisk,
      },
      select: {
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
      },
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

  private validationAuditLine(actionLabel: string, dto: MsppReviewActionDto): string {
    const fever = dto.fever ? "oui" : "non";
    const lab = dto.labConfirmed ? "oui" : "non";
    return `[MSPP ${actionLabel}] Fièvre: ${fever}; Durée des signes: ${dto.duration}; Confirmation biologique: ${lab}; Risque d'exposition: ${dto.exposureRisk}. Commentaire: ${dto.comment}`;
  }

}
