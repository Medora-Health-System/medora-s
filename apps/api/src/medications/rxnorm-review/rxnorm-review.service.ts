import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service";
import {
  approveReviewCandidate,
  assignReviewCandidate,
  bulkReviewCandidates,
  deferReviewCandidate,
  getReviewCandidateDetail,
  getReviewDashboardMetrics,
  listReviewQueue,
  loadEmRealMappingPilotConfig,
  rejectReviewCandidate,
  retireReviewMapping,
  supersedeReviewMapping,
  type ReviewQueueFilters,
} from "./rxnorm-review-operations";
import {
  resolvePilotDuplicateAssessment,
} from "../pilot/medication-em-pilot.service";
import type {
  ReviewApproveBody,
  ReviewAssignBody,
  ReviewBulkBody,
  ReviewDeferBody,
  ReviewRejectBody,
  ReviewRetireBody,
  ReviewSupersedeBody,
} from "./dto/rxnorm-review.dto";

const pilotDuplicateResolveSchema = z.object({
  action: z.enum([
    "LINK_TO_EXISTING",
    "APPROVE_NEW_RECORD",
    "CONFIRM_DISTINCT",
    "REJECT_DUPLICATE",
    "DEFER",
    "REQUEST_CLARIFICATION",
  ]),
  rationale: z.string().min(1),
  /** Spoofed reviewer IDs are ignored — authenticated user is the actor. */
  reviewerUserId: z.string().optional(),
});

@Injectable()
export class RxNormReviewService {
  constructor(private readonly prisma: PrismaService) {}

  listCandidates(filters: ReviewQueueFilters) {
    return listReviewQueue(this.prisma, filters);
  }

  async listPilotDuplicates(filters: {
    pilotId?: string;
    classification?: string;
    resolutionStatus?: string;
    limit: number;
    offset: number;
  }) {
    const where = {
      ...(filters.pilotId ? { pilotId: filters.pilotId } : {}),
      ...(filters.classification ? { classification: filters.classification } : {}),
      ...(filters.resolutionStatus
        ? { resolutionStatus: filters.resolutionStatus }
        : {}),
    };
    const limit = Math.min(Math.max(filters.limit, 1), 200);
    const offset = Math.max(filters.offset, 0);
    const [total, rows] = await Promise.all([
      this.prisma.medicationDuplicateAssessment.count({ where }),
      this.prisma.medicationDuplicateAssessment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ resolutionStatus: "asc" }, { confidenceScore: "desc" }],
      }),
    ]);
    return { total, limit, offset, rows };
  }

  async resolvePilotDuplicate(
    assessmentId: string,
    body: unknown,
    authenticatedUserId: string,
    facilityId?: string
  ) {
    const parsed = pilotDuplicateResolveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.");
    }
    // Reject payload reviewer spoofing: only the authenticated JWT user may act.
    if (
      parsed.data.reviewerUserId &&
      parsed.data.reviewerUserId !== authenticatedUserId
    ) {
      throw new BadRequestException(
        "Payload reviewerUserId must match the authenticated user."
      );
    }

    const roleRows = facilityId
      ? await this.prisma.userRole.findMany({
          where: { userId: authenticatedUserId, facilityId, isActive: true },
          include: { role: true },
        })
      : [];
    const roles = roleRows.map((r) => r.role.code);

    try {
      return await resolvePilotDuplicateAssessment(this.prisma, {
        userId: authenticatedUserId,
        roles,
      }, {
        assessmentId,
        action: parsed.data.action,
        rationale: parsed.data.rationale,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Résolution doublon impossible."
      );
    }
  }

  async getCandidate(candidateId: string, actorUserId: string, actorRoleLabel?: string) {
    try {
      return await getReviewCandidateDetail(this.prisma, candidateId, {
        userId: actorUserId,
        roleLabel: actorRoleLabel,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw new NotFoundException("Candidat de revue introuvable.");
      }
      throw error;
    }
  }

  dashboard() {
    return getReviewDashboardMetrics(this.prisma);
  }

  pilotConfig() {
    return loadEmRealMappingPilotConfig();
  }

  async approve(body: ReviewApproveBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await approveReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        confirmVerify: true,
        rationaleNotes: body.rationaleNotes,
        reviewerUserId,
        actorRoleLabel,
        conflictOverrideAcknowledged: body.conflictOverrideAcknowledged,
        conflictOverrideReasons: body.conflictOverrideReasons,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Approbation impossible.");
    }
  }

  async reject(body: ReviewRejectBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await rejectReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        confirmReject: true,
        rejectionReasonCategory: body.rejectionReasonCategory,
        rationaleNotes: body.rationaleNotes,
        reviewerUserId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Rejet impossible.");
    }
  }

  async defer(body: ReviewDeferBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await deferReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        confirmDefer: true,
        deferredReason: body.deferredReason,
        reviewerUserId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Report impossible.");
    }
  }

  async assign(body: ReviewAssignBody, actorUserId: string, actorRoleLabel?: string) {
    try {
      return await assignReviewCandidate(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        assignedToUserId: body.assignedToUserId,
        actorUserId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Affectation impossible.");
    }
  }

  async retire(body: ReviewRetireBody, retiredByUserId: string, actorRoleLabel?: string) {
    try {
      return await retireReviewMapping(this.prisma, {
        verifiedMappingId: body.verifiedMappingId,
        confirmRetire: true,
        retireReason: body.retireReason,
        retiredByUserId,
        reviewerActorLabel: actorRoleLabel,
        candidateId: body.candidateId,
        actorRoleLabel,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Retrait impossible.");
    }
  }

  async supersede(body: ReviewSupersedeBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await supersedeReviewMapping(this.prisma, {
        candidateId: body.candidateId,
        expectedReviewVersion: body.expectedReviewVersion,
        previousVerifiedMappingId: body.previousVerifiedMappingId,
        confirmVerify: true,
        rationaleNotes: body.rationaleNotes,
        reviewerUserId,
        actorRoleLabel,
        conflictOverrideAcknowledged: body.conflictOverrideAcknowledged,
        conflictOverrideReasons: body.conflictOverrideReasons,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Remplacement impossible.");
    }
  }

  async bulk(body: ReviewBulkBody, reviewerUserId: string, actorRoleLabel?: string) {
    try {
      return await bulkReviewCandidates(this.prisma, {
        action: body.action,
        items: body.items,
        reviewerUserId,
        actorRoleLabel,
        rationaleNotes: body.rationaleNotes,
        confirmBulk: true,
        rejectionReasonCategory: body.rejectionReasonCategory,
        conflictOverrideAcknowledged: body.conflictOverrideAcknowledged,
        conflictOverrideReasons: body.conflictOverrideReasons,
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Revue en lot impossible.");
    }
  }
}
